/**
 * POST /api/servers/[id]/edit
 *
 * Allows the server owner to update their server listing's editable fields:
 *   short   - short description (tagline shown on cards)
 *   desc    - full Markdown description
 *   slug    - optional vanity URL slug
 *
 * Auth: Discord OAuth2 token via cookie "key", Authorization header, or
 *       query param "key" (same pattern as bot edit endpoint).
 *
 * Ownership: only Servers.owner === caller's Discord ID may edit.
 *
 * Validated fields:
 *   short  - 11–150 chars, required
 *   desc   - 100–10 000 chars, required
 *   slug   - optional; lowercase letters/numbers/hyphens only, 2–32 chars, unique
 *
 * Errors (returned as { err: string }):
 *   not_logged_in    - no auth token supplied
 *   invalid_key      - Discord OAuth rejected the token
 *   missing_id       - params.id absent
 *   no_server_found  - server doesn't exist in DB
 *   not_owner        - caller is not the server owner
 *   invalid_body     - request body is not valid JSON
 *   short_too_short  - short < 11 chars
 *   short_too_long   - short > 150 chars
 *   desc_too_short   - desc < 100 chars
 *   desc_too_long    - desc > 10 000 chars
 *   slug_invalid     - slug doesn't match [a-z0-9-]{2,32}
 *   slug_taken       - another server already uses that slug
 *   db_update_failed - database write error
 */

import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import DiscordOauth2 from "discord-oauth2";
import { env } from "$env/dynamic/private";
import { getDb } from "$lib/db";
import { Servers, Users } from "$lib/db/schema";
import { eq, or, and, ne } from "drizzle-orm";
import SendLog from "@/bot/log";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveKey(
	request: Request,
	cookies: { get(name: string): string | undefined }
): string | null {
	const url = new URL(request.url);
	return (
		url.searchParams.get("key") ??
		request.headers.get("authorization") ??
		request.headers.get("rdl-key") ??
		cookies.get("key") ??
		null
	);
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const POST: RequestHandler = async ({ params, request, cookies }) => {
	// ── Auth ──────────────────────────────────────────────────────────────────
	const key = resolveKey(request, cookies);
	if (!key) {
		return json({ err: "not_logged_in" }, { status: 400 });
	}

	// ── Param ─────────────────────────────────────────────────────────────────
	const idOrSlug = params.id?.trim();
	if (!idOrSlug) {
		return json({ err: "missing_id" }, { status: 400 });
	}

	// ── Verify Discord token ──────────────────────────────────────────────────
	const oauth = new DiscordOauth2({
		clientId: env.DISCORD_BOT_ID!,
		clientSecret: env.DISCORD_SECRET!,
		redirectUri: (env.DOMAIN ?? "http://localhost:5173") + "/api/auth"
	});

	let userData: any;
	try {
		userData = await oauth.getUser(key);
	} catch {
		try {
			cookies.delete?.("key", { path: "/" });
		} catch {}
		return json({ err: "invalid_key" }, { status: 400 });
	}

	if (!userData?.id) {
		return json({ err: "invalid_key" }, { status: 400 });
	}

	const db = getDb();

	// User row must exist
	const userRows = await db
		.select({ id: Users.id })
		.from(Users)
		.where(eq(Users.id, userData.id))
		.limit(1);
	if (!userRows || userRows.length === 0) {
		return json({ err: "invalid_key" }, { status: 400 });
	}

	// ── Fetch server row ──────────────────────────────────────────────────────
	const serverRows = await db
		.select({
			id: Servers.id,
			name: Servers.name,
			icon: Servers.icon,
			owner: Servers.owner,
			short: Servers.short,
			desc: Servers.desc,
			slug: Servers.slug
		})
		.from(Servers)
		.where(or(eq(Servers.id, idOrSlug), eq(Servers.slug, idOrSlug)))
		.limit(1);

	const server = serverRows && serverRows.length > 0 ? (serverRows[0] as any) : null;
	if (!server) {
		return json({ err: "no_server_found" }, { status: 404 });
	}

	// ── Ownership check ───────────────────────────────────────────────────────
	if (server.owner !== userData.id) {
		return json({ err: "not_owner" }, { status: 403 });
	}

	// ── Parse body ────────────────────────────────────────────────────────────
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json({ err: "invalid_body" }, { status: 400 });
	}

	// ── Validate: short ───────────────────────────────────────────────────────
	const short =
		typeof body.short === "string" ? body.short.trim() : String(server.short ?? "").trim();
	if (short.length < 11) return json({ err: "short_too_short" }, { status: 400 });
	if (short.length > 150) return json({ err: "short_too_long" }, { status: 400 });

	// ── Validate: desc ────────────────────────────────────────────────────────
	const desc = typeof body.desc === "string" ? body.desc.trim() : String(server.desc ?? "").trim();
	if (desc.length < 100) return json({ err: "desc_too_short" }, { status: 400 });
	if (desc.length > 10000) return json({ err: "desc_too_long" }, { status: 400 });

	// ── Validate: slug ────────────────────────────────────────────────────────
	let slug: string | null = server.slug ?? null;

	if (typeof body.slug === "string") {
		const rawSlug = body.slug.trim().toLowerCase();
		if (rawSlug === "") {
			// Explicitly clearing the slug
			slug = null;
		} else {
			if (!/^[a-z0-9-]{2,32}$/.test(rawSlug)) {
				return json({ err: "slug_invalid" }, { status: 400 });
			}
			// Uniqueness - exclude the server being edited
			const taken = await db
				.select({ id: Servers.id })
				.from(Servers)
				.where(and(eq(Servers.slug, rawSlug), ne(Servers.id, server.id)))
				.limit(1);
			if (taken && taken.length > 0) {
				return json({ err: "slug_taken" }, { status: 400 });
			}
			slug = rawSlug;
		}
	}

	// ── Write ─────────────────────────────────────────────────────────────────
	try {
		await db
			.update(Servers)
			.set({
				short,
				desc,
				slug: slug ?? ""
			})
			.where(eq(Servers.id, server.id));
	} catch (err) {
		console.error("[api/servers/[id]/edit] DB update error:", err);
		return json({ err: "db_update_failed" }, { status: 500 });
	}

	// ── Best-effort audit log ─────────────────────────────────────────────────
	try {
		await SendLog({
			env: {
				DOMAIN: env.DOMAIN ?? "",
				FAILED_DMS_LOGS_CHANNEL_ID: env.FAILED_DMS_LOGS_CHANNEL_ID ?? "",
				LOGS_CHANNEL_ID: env.LOGS_CHANNEL_ID ?? "",
				DISCORD_TOKEN: env.DISCORD_TOKEN ?? ""
			},
			body: {
				title: `Server "${server.name}" updated`,
				desc: `Server listing updated by ${(userData as any).global_name ?? (userData as any).username}`,
				color: "#57F287",
				img: server.icon
					? `https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png?size=128`
					: undefined,
				url: `${env.DOMAIN ?? ""}/servers/${slug ?? server.id}`,
				owners: [server.owner]
			}
		});
	} catch {
		// Logging is non-fatal
	}

	return json({ success: true, slug: slug ?? server.id }, { status: 200 });
};
