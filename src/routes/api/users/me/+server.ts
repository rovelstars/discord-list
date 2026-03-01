import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import DiscordOauth2 from "discord-oauth2";
import { getDb } from "$lib/db";
import { Users } from "$lib/db/schema";
import { eq } from "drizzle-orm";
import { env } from "$env/dynamic/private";

/**
 * PATCH /api/users/me
 *
 * Updates the authenticated user's editable profile fields.
 * Currently supports: `bio` (string) and `banner` (URL string | null).
 *
 * Auth:
 *   - Accepts access token in query `key`, Authorization header, RDL-key header, or `key` cookie.
 *
 * Body (all fields optional):
 *   { bio?: string, banner?: string | null }
 *
 * Constraints:
 *   - bio: max 200 characters, stripped of leading/trailing whitespace
 *   - banner: must be a valid http/https URL if provided, or null/empty to clear
 *
 * Response:
 *   200  { success: true }
 *   400  { err: 'not_logged_in' | 'invalid_key' | 'invalid_body' | 'bio_too_long' | 'invalid_banner' }
 *   404  { err: 'user_not_found' }
 *   500  { err: 'db_update_failed' | 'server_error' }
 */
export const PATCH: RequestHandler = async ({ request, cookies }) => {
	try {
		// ------------------------------------------------------------------
		// Auth
		// ------------------------------------------------------------------
		const url = new URL(request.url);
		const paramKey = url.searchParams.get("key");
		const headerAuth = request.headers.get("authorization") ?? request.headers.get("RDL-key");
		const cookieKey = cookies.get("key");

		const key = paramKey ?? headerAuth ?? cookieKey;
		if (!key) {
			return json({ err: "not_logged_in" }, { status: 400 });
		}

		const oauth2 = new DiscordOauth2({
			clientId: env.DISCORD_BOT_ID,
			clientSecret: env.DISCORD_SECRET,
			redirectUri: (env.DOMAIN ?? "http://localhost:5173") + "/api/auth"
		});

		let userData: any;
		try {
			userData = await oauth2.getUser(String(key));
		} catch {
			try {
				cookies.delete("key", { path: "/" });
			} catch {
				/* noop */
			}
			return json({ err: "invalid_key" }, { status: 400 });
		}

		if (!userData?.id) {
			return json({ err: "invalid_key" }, { status: 400 });
		}

		// ------------------------------------------------------------------
		// Parse body
		// ------------------------------------------------------------------
		let body: any;
		try {
			body = await request.json();
		} catch {
			return json({ err: "invalid_body" }, { status: 400 });
		}

		if (!body || typeof body !== "object") {
			return json({ err: "invalid_body" }, { status: 400 });
		}

		// ------------------------------------------------------------------
		// Validate fields
		// ------------------------------------------------------------------
		const updates: { bio?: string; banner?: string | null } = {};

		if ("bio" in body) {
			const bio = body.bio == null ? "" : String(body.bio).trim();
			if (bio.length > 200) {
				return json({ err: "bio_too_long" }, { status: 400 });
			}
			updates.bio = bio || "The user doesn't have bio set!";
		}

		if ("banner" in body) {
			const banner = body.banner == null ? null : String(body.banner).trim();
			if (banner) {
				// Must be a valid http/https URL
				try {
					const u = new URL(banner);
					if (u.protocol !== "http:" && u.protocol !== "https:") {
						return json({ err: "invalid_banner" }, { status: 400 });
					}
				} catch {
					return json({ err: "invalid_banner" }, { status: 400 });
				}
			}
			updates.banner = banner || null;
		}

		// Nothing to update — treat as success
		if (Object.keys(updates).length === 0) {
			return json({ success: true }, { status: 200 });
		}

		// ------------------------------------------------------------------
		// Confirm user row exists
		// ------------------------------------------------------------------
		const db = getDb();

		const rows = await db
			.select({ id: Users.id })
			.from(Users)
			.where(eq(Users.id, userData.id))
			.limit(1);

		if (!rows || rows.length === 0) {
			return json({ err: "user_not_found" }, { status: 404 });
		}

		// ------------------------------------------------------------------
		// Write changes
		// ------------------------------------------------------------------
		try {
			await db.update(Users).set(updates).where(eq(Users.id, userData.id));
		} catch (err) {
			console.error("[PATCH /api/users/me] DB update failed:", err);
			return json({ err: "db_update_failed" }, { status: 500 });
		}

		return json({ success: true }, { status: 200 });
	} catch (err) {
		console.error("[PATCH /api/users/me] Unexpected error:", err);
		return json(
			{ err: "server_error", message: err instanceof Error ? err.message : String(err) },
			{ status: 500 }
		);
	}
};
