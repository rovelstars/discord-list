// discord-list/src/routes/api/bots/[id]/edit/+server.ts
import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import DiscordOauth2 from "discord-oauth2";
import { getDb } from "$lib/db";
import { Bots, Users } from "$lib/db/schema";
import { eq, or } from "drizzle-orm";
import SendLog from "@/bot/log";
import { formSchema as BotFormSchema } from "$lib/components/bot-form-schema";
import isValidHttpUrl from "$lib/functions/valid-url";
import UserAccountFetch from "$lib/functions/user-bot";

import { env } from "$env/dynamic/private";

/**
 * POST /api/bots/[id]/edit
 *
 * Request must include an auth token (same places as other endpoints):
 *  - query param `key`
 *  - Authorization header
 *  - RDL-key header
 *  - cookie `key`
 *
 * Body: JSON matching the bot form schema.
 *
 * Behavior:
 *  - Validates token and ensures the caller is an owner.
 *  - Validates incoming fields (URLs, slug uniqueness, owners array constraints).
 *  - Updates the bot row in the DB.
 *  - Triggers the internal bot update (legacy endpoint) if available (best-effort).
 *  - Sends a best-effort SendLog on successful update.
 */
export const POST: RequestHandler = async ({ params, request, cookies }) => {
	const db = getDb();

	try {
		const url = new URL(request.url);
		const paramKey = url.searchParams.get("key");
		const headerAuth = request.headers.get("authorization") ?? request.headers.get("RDL-key");
		const cookieKey = cookies.get("key");

		const key = paramKey ?? headerAuth ?? cookieKey;
		if (!key) {
			return json({ err: "not_logged_in" }, { status: 400 });
		}

		const id = params.id;
		if (!id) {
			return json({ err: "missing_bot_id" }, { status: 400 });
		}

		// Validate token via Discord OAuth
		const oauth2 = new DiscordOauth2({
			clientId: env.DISCORD_BOT_ID,
			clientSecret: env.DISCORD_SECRET,
			redirectUri: (env.DOMAIN ?? "http://localhost:5173") + "/api/auth"
		});

		let userData: any;
		try {
			userData = await oauth2.getUser(String(key));
		} catch (e) {
			try {
				cookies.delete("key", { path: "/" });
			} catch {}
			return json({ err: "invalid_key" }, { status: 400 });
		}

		// Ensure user exists in Users table (basic parity with old behavior)
		const userRows = await db
			.select({ bal: Users.bal, votes: Users.votes })
			.from(Users)
			.where(eq(Users.id, userData.id))
			.limit(1);

		if (!userRows || userRows.length === 0) {
			return json({ err: "invalid_key" }, { status: 400 });
		}

		// Fetch current bot snapshot
		const botRows = await db
			.select({
				id: Bots.id,
				slug: Bots.slug,
				avatar: Bots.avatar,
				username: Bots.username,
				discriminator: Bots.discriminator,
				short: Bots.short,
				invite: Bots.invite,
				bg: Bots.bg,
				owners: Bots.owners,
				lib: Bots.lib,
				prefix: Bots.prefix,
				desc: Bots.desc,
				source_repo: Bots.source_repo,
				support: Bots.support,
				website: Bots.website,
				webhook: Bots.webhook,
				donate: Bots.donate
			})
			.from(Bots)
			.where(or(eq(Bots.id, id), eq(Bots.slug, id)))
			.limit(1);

		const bot = botRows && botRows.length > 0 ? (botRows[0] as any) : null;
		if (!bot) {
			return json({ err: "no_bot_found" }, { status: 404 });
		}

		// Ensure requestor is an owner
		// owners is stored as serialised JSON text in the DB — parse it before checking.
		const parsedOwners: string[] = (() => {
			if (Array.isArray(bot.owners)) return bot.owners;
			if (typeof bot.owners === "string") {
				try {
					return JSON.parse(bot.owners);
				} catch {
					return [];
				}
			}
			return [];
		})();
		bot.owners = parsedOwners;

		if (!parsedOwners.includes(userData.id)) {
			return json({ err: "not_owner" }, { status: 403 });
		}

		// Parse and validate body
		const body = await request.json().catch(() => null);
		if (!body) {
			return json({ err: "invalid_body" }, { status: 400 });
		}

		// Validate shape with the legacy schema validator (best-effort)
		try {
			const validation = (BotFormSchema as any).safeParse
				? (BotFormSchema as any).safeParse(body)
				: { success: true };
			if (!validation.success) {
				const errMsg =
					validation.error &&
					validation.error.errors &&
					validation.error.errors[0] &&
					validation.error.errors[0].message
						? validation.error.errors[0].message
						: "validation_failed";
				return json({ err: errMsg }, { status: 400 });
			}
		} catch {
			// If validator absent or throws, continue with manual checks below
		}

		// Slug uniqueness check (if changed)
		if (body.slug && body.slug !== bot.slug) {
			const existing = await db
				.select({ id: Bots.id })
				.from(Bots)
				.where(eq(Bots.slug, body.slug))
				.limit(1);
			if (existing && existing.length > 0) {
				return json({ err: "slug_taken" }, { status: 400 });
			}
		}

		// Owners update rules:
		// - owners must be array
		// - only main owner (owners[0]) can change owners
		if (body.owners && JSON.stringify(body.owners) !== JSON.stringify(bot.owners)) {
			if (!Array.isArray(body.owners)) return json({ err: "owners_not_array" }, { status: 400 });
			if (bot.owners[0] !== userData.id) return json({ err: "not_main_owner" }, { status: 403 });
			if (body.owners[0] !== userData.id)
				return json({ err: "main_owner_cant_be_changed" }, { status: 403 });
		}

		// Validate URLs if present
		const urlFields = ["webhook", "source_repo", "website", "donate", "bg", "invite"];
		for (const f of urlFields) {
			if (body[f] && body[f] !== bot[f]) {
				if (!isValidHttpUrl(body[f])) {
					return json({ err: `invalid_${f}` }, { status: 400 });
				}
			}
		}

		// Special handling for support invite: if it's a URL, normalize to invite code
		if (body.support && body.support !== bot.support) {
			if (isValidHttpUrl(body.support)) {
				try {
					const u = new URL(body.support);
					if (u.hostname === "discord.gg") body.support = u.pathname.slice(1);
					else if (u.hostname === "discord.com") body.support = u.pathname.split("/")[2];
					else return json({ err: "invalid_support" }, { status: 400 });
				} catch {
					return json({ err: "invalid_support" }, { status: 400 });
				}
			}
			// Validate invite exists via Discord API
			try {
				const inviteResp = await fetch(`https://discord.com/api/invites/${body.support}`);
				const inviteJson = await inviteResp.json();
				if (inviteJson && inviteJson.message === "Unknown Invite") {
					return json({ err: "expired_support" }, { status: 400 });
				}
			} catch {
				// If Discord API fails, best-effort — don't block the update for temporary Discord API failures.
			}
		}

		// Validate lib length if provided
		if (body.lib && body.lib !== bot.lib) {
			if (String(body.lib).length > 20) return json({ err: "lib_too_long" }, { status: 400 });
		}

		// All validations passed — perform the DB update
		const updateValues: any = {
			lib: body.lib ?? bot.lib,
			// owners stored as serialized JSON TEXT in the schema — stringify on writes.
			owners: body.owners ? JSON.stringify(body.owners) : bot.owners,
			prefix: body.prefix ?? bot.prefix,
			short: body.short ?? bot.short,
			desc: body.desc ?? bot.desc,
			support: body.support ?? bot.support,
			source_repo: body.source_repo ?? bot.source_repo,
			website: body.website ?? bot.website,
			webhook: body.webhook ?? bot.webhook,
			bg: body.bg ?? bot.bg,
			donate: body.donate ?? bot.donate,
			invite: body.invite ?? bot.invite,
			slug: body.slug ? String(body.slug).toLowerCase() : bot.slug,
			opted_coins:
				typeof body.opted_coins === "boolean" ? body.opted_coins : Boolean(bot.opted_coins)
		};

		try {
			await db.update(Bots).set(updateValues).where(eq(Bots.id, bot.id));
		} catch (e) {
			console.error("DB update error in /api/bots/[id]/edit:", e);
			return json({ err: "db_update_failed" }, { status: 500 });
		}

		// Best-effort: trigger legacy internal update flow if available.
		// The legacy code called an internal update endpoint. We attempt to call it here,
		// but if it doesn't exist or fails we don't treat it as fatal.
		try {
			const internalUrl =
				(env.DOMAIN ?? "") + `/api/internals/update/bot/${bot.id}?modified=${userData.id}`;
			// If DOMAIN isn't configured, call local relative path (works in dev)
			const target = env.DOMAIN
				? internalUrl
				: `/api/internals/update/bot/${bot.id}?modified=${userData.id}`;
			// Do not await too long — fire-and-forget style:
			fetch(target).catch(() => {});
		} catch {
			// ignore
		}

		// Send a best-effort admin log
		try {
			await SendLog({
				env: {
					DOMAIN: env.DOMAIN ?? "",
					FAILED_DMS_LOGS_CHANNEL_ID: env.FAILED_DMS_LOGS_CHANNEL_ID ?? "",
					LOGS_CHANNEL_ID: env.LOGS_CHANNEL_ID ?? "",
					DISCORD_TOKEN: env.DISCORD_TOKEN ?? ""
				},
				body: {
					title: `Bot ${bot.username} updated!`,
					desc: `Bot ${bot.username}#${bot.discriminator} updated by ${(userData as any).global_name || (userData as any).username}`,
					color: "#57F287",
					img: bot.avatar
						? `https://cdn.discordapp.com/avatars/${bot.id}/${bot.avatar}?size=128`
						: undefined,
					url: `${env.DOMAIN ?? ""}/bots/${bot.id}`,
					owners: bot.owners ?? []
				}
			});
		} catch {
			// Logging is non-fatal
		}

		return json({ success: true }, { status: 200 });
	} catch (err) {
		console.error("/api/bots/[id]/edit error:", err);
		return json(
			{ err: "server_error", message: err instanceof Error ? err.message : String(err) },
			{ status: 500 }
		);
	}
};
