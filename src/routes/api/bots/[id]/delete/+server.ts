// discord-list/src/routes/api/bots/[id]/delete/+server.ts
import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import DiscordOauth2 from "discord-oauth2";
import { withDb } from "$lib/db";
import { Bots, Users } from "$lib/db/schema";
import { eq, or } from "drizzle-orm";
import SendLog from "@/bot/log";
import { notifyBotChanged } from "$lib/indexnow";
import { isAdmin } from "$lib/is-admin";
import { env } from "$env/dynamic/private";

/**
 * POST /api/bots/[id]/delete
 *
 * Owner-initiated soft delete with a reversible 7-day grace period.
 *
 * Body: { action: "blacklist" | "restore" }
 *   - "blacklist": flags the bot as pending deletion. It immediately disappears
 *     from every public listing/detail page (the query layer filters
 *     `blacklisted = false`) but stays visible in the owner's dashboard so they
 *     can change their mind. A scheduled job permanently removes it 7 days after
 *     `blacklisted_at`.
 *   - "restore": clears the flag before the 7-day window elapses.
 *
 * Auth + ownership mirror /api/bots/[id]/edit: a valid Discord key whose user is
 * listed in the bot's `owners` array (or an admin).
 *
 * Responses:
 *   200 { success, action, blacklisted, blacklisted_at }
 *   400 not_logged_in | missing_bot_id | invalid_key | invalid_action
 *   403 not_owner
 *   404 no_bot_found
 *   500 db_update_failed | server_error
 */
export const POST: RequestHandler = async ({ params, request, cookies }) => {
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

		const body = await request.json().catch(() => null);
		const action = body?.action;
		if (action !== "blacklist" && action !== "restore") {
			return json({ err: "invalid_action" }, { status: 400 });
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
		} catch {
			try {
				cookies.delete("key", { path: "/" });
			} catch {
				/* noop */
			}
			return json({ err: "invalid_key" }, { status: 400 });
		}

		const userRows = await withDb((db) =>
			db.select({ id: Users.id }).from(Users).where(eq(Users.id, userData.id)).limit(1)
		);
		if (!userRows || userRows.length === 0) {
			return json({ err: "invalid_key" }, { status: 400 });
		}

		// Fetch the bot (by id or slug). Note: this endpoint must find blacklisted
		// bots too, so it queries the table directly rather than getBotByIdOrSlug.
		const botRows = await withDb((db) =>
			db
				.select({
					id: Bots.id,
					slug: Bots.slug,
					username: Bots.username,
					owners: Bots.owners,
					blacklisted: Bots.blacklisted,
					blacklisted_at: Bots.blacklisted_at
				})
				.from(Bots)
				.where(or(eq(Bots.id, id), eq(Bots.slug, id)))
				.limit(1)
		);

		const bot = botRows && botRows.length > 0 ? (botRows[0] as any) : null;
		if (!bot) {
			return json({ err: "no_bot_found" }, { status: 404 });
		}

		// Ownership check (parse owners JSON text)
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

		if (!parsedOwners.includes(userData.id) && !isAdmin(userData.id)) {
			return json({ err: "not_owner" }, { status: 403 });
		}

		const nowIso = new Date().toISOString();
		const updates =
			action === "blacklist"
				? { blacklisted: true, blacklisted_at: nowIso }
				: { blacklisted: false, blacklisted_at: null };

		try {
			await withDb((db) => db.update(Bots).set(updates).where(eq(Bots.id, bot.id)));
		} catch (err) {
			console.error(`[POST /api/bots/${id}/delete] DB update failed:`, err);
			return json({ err: "db_update_failed" }, { status: 500 });
		}

		// Best-effort: log + ping IndexNow so search engines drop/re-add the URL.
		try {
			const blacklisting = action === "blacklist";
			await SendLog({
				env: {
					DOMAIN: env.DOMAIN ?? "",
					FAILED_DMS_LOGS_CHANNEL_ID: env.FAILED_DMS_LOGS_CHANNEL_ID ?? "",
					LOGS_CHANNEL_ID: env.LOGS_CHANNEL_ID ?? "",
					DISCORD_TOKEN: env.DISCORD_TOKEN ?? ""
				},
				body: {
					title: blacklisting
						? `Bot ${bot.username} scheduled for deletion`
						: `Bot ${bot.username} restored`,
					desc: blacklisting
						? `Bot ${bot.username} (${bot.id}) was blacklisted (pending 7-day deletion) by ${(userData as any).global_name || (userData as any).username}`
						: `Bot ${bot.username} (${bot.id}) was restored from deletion by ${(userData as any).global_name || (userData as any).username}`,
					color: blacklisting ? "#ED4245" : "#57F287",
					url: `${env.DOMAIN ?? ""}/bots/${bot.slug ?? bot.id}`,
					owners: parsedOwners
				}
			});
		} catch {
			/* logging is non-fatal */
		}
		try {
			if (bot.slug) notifyBotChanged(bot.slug);
		} catch {
			/* noop */
		}

		return json(
			{
				success: true,
				action,
				blacklisted: action === "blacklist",
				blacklisted_at: action === "blacklist" ? nowIso : null
			},
			{ status: 200 }
		);
	} catch (err) {
		console.error("[POST /api/bots/[id]/delete] Unexpected error:", err);
		return json(
			{ err: "server_error", message: err instanceof Error ? err.message : String(err) },
			{ status: 500 }
		);
	}
};
