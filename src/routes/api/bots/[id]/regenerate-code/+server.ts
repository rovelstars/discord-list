import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import DiscordOauth2 from "discord-oauth2";
import { getDb } from "$lib/db";
import { Bots } from "$lib/db/schema";
import { eq, or } from "drizzle-orm";
import SendLog from "@/bot/log";
import getAvatarURL from "@/lib/get-avatar-url";
import { env } from "$env/dynamic/private";

/**
 * POST /api/bots/[id]/regenerate-code
 *
 * Generates a new secret `code` (API token) for a bot and persists it.
 * The code is used by bot developers to authenticate webhook calls to:
 *   - POST /api/bots/[id]/servers  (update server count)
 *   - GET  /api/bots/info          (fetch bot info)
 *   - Webhook vote notifications   (sent as Authorization header + ?code= param)
 *
 * Auth:
 *   - Accepts access token in query `key`, Authorization header, RDL-key header, or `key` cookie.
 *   - The caller must be listed in the bot's owners array.
 *
 * Security:
 *   - Only owners can regenerate. The new code is returned once in the response —
 *     it is never stored in plaintext anywhere else, so callers should save it immediately.
 *   - The old code is invalidated the moment the DB write succeeds.
 *
 * Response JSON:
 *   200  { success: true, code: string }           — new code, show it to the user once
 *   400  { err: 'not_logged_in' | 'invalid_key' | 'missing_bot_id' }
 *   403  { err: 'not_owner' }
 *   404  { err: 'no_bot_found' }
 *   500  { err: 'db_update_failed' | 'server_error' }
 */
export const POST: RequestHandler = async ({ params, request, cookies }) => {
	try {
		// ------------------------------------------------------------------
		// Auth: resolve access token from all the usual places
		// ------------------------------------------------------------------
		const url = new URL(request.url);
		const paramKey = url.searchParams.get("key");
		const headerAuth = request.headers.get("authorization") ?? request.headers.get("RDL-key");
		const cookieKey = cookies.get("key");

		const key = paramKey ?? headerAuth ?? cookieKey;
		if (!key) {
			return json({ err: "not_logged_in" }, { status: 400 });
		}

		const botId = params.id?.trim();
		if (!botId) {
			return json({ err: "missing_bot_id" }, { status: 400 });
		}

		// ------------------------------------------------------------------
		// Validate token via Discord OAuth
		// ------------------------------------------------------------------
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
		// Load the bot row — need owners + identity for the log message
		// ------------------------------------------------------------------
		const db = getDb();

		const rows = await db
			.select({
				id: Bots.id,
				username: Bots.username,
				discriminator: Bots.discriminator,
				avatar: Bots.avatar,
				owners: Bots.owners
			})
			.from(Bots)
			.where(or(eq(Bots.id, botId), eq(Bots.slug, botId)))
			.limit(1);

		if (!rows || rows.length === 0) {
			return json({ err: "no_bot_found" }, { status: 404 });
		}

		const bot = rows[0];

		// ------------------------------------------------------------------
		// Ownership check
		// ------------------------------------------------------------------
		let owners: string[] = [];
		try {
			const parsed = JSON.parse((bot.owners as string) ?? "[]");
			owners = Array.isArray(parsed) ? parsed : [];
		} catch {
			owners = [];
		}

		if (!owners.includes(userData.id)) {
			return json({ err: "not_owner" }, { status: 403 });
		}

		// ------------------------------------------------------------------
		// Generate a new code and write it to the DB
		// The old code is implicitly invalidated the moment this write lands.
		// crypto.randomUUID() produces a cryptographically strong v4 UUID.
		// ------------------------------------------------------------------
		const newCode = crypto.randomUUID();

		try {
			await db.update(Bots).set({ code: newCode }).where(eq(Bots.id, bot.id));
		} catch (err) {
			console.error("[regenerate-code] DB update failed for bot", bot.id, err);
			return json({ err: "db_update_failed" }, { status: 500 });
		}

		// ------------------------------------------------------------------
		// Send a Discord log notification (best-effort, non-fatal)
		// ------------------------------------------------------------------
		try {
			await SendLog({
				env: {
					DOMAIN: env.DOMAIN ?? "",
					FAILED_DMS_LOGS_CHANNEL_ID: env.FAILED_DMS_LOGS_CHANNEL_ID ?? "",
					LOGS_CHANNEL_ID: env.LOGS_CHANNEL_ID ?? "",
					DISCORD_TOKEN: env.DISCORD_TOKEN ?? ""
				},
				body: {
					title: `Bot ${bot.username}#${bot.discriminator} — API token regenerated`,
					desc: [
						`The API token (bot code) for **${bot.username}** (\`${bot.id}\`) was regenerated by <@!${userData.id}>.`,
						"",
						"The previous token has been **immediately invalidated**. Any integrations using the old token (webhooks, server count updates) must be updated."
					].join("\n"),
					color: "#FEE75C",
					img: getAvatarURL(bot.id, bot.avatar ?? "0"),
					url: `${env.DOMAIN ?? ""}/bots/${bot.id}`,
					owners
				}
			});
		} catch (logErr) {
			// Non-fatal — the DB write already succeeded.
			console.warn("[regenerate-code] SendLog failed (non-fatal):", logErr);
		}

		console.log(`[regenerate-code] New code issued for bot ${bot.id} by user ${userData.id}`);

		// Return the new code once. The client must display and save it —
		// subsequent reads of the edit page will show it blurred as usual.
		return json({ success: true, code: newCode }, { status: 200 });
	} catch (err) {
		console.error("[regenerate-code] Unexpected error:", err);
		return json(
			{ err: "server_error", message: err instanceof Error ? err.message : String(err) },
			{ status: 500 }
		);
	}
};
