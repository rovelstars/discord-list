import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import DiscordOauth2 from "discord-oauth2";
import { getDb } from "$lib/db";
import { Users, Servers } from "$lib/schema";
import { eq } from "drizzle-orm";
import SendLog from "@/bot/log";
import { env } from "$env/dynamic/private";
import { recordVote } from "$lib/db/queries/referrals";

/**
 * POST /api/servers/[id]/vote
 *
 * Auth:
 *  - Accepts access token in query `key`, Authorization header, RDL-key header or `key` cookie.
 *
 * Behavior:
 *  - Enforces a 24-hour cooldown per (user, server) pair, stored in Users.votes as
 *    { server: string; at: number }[] entries alongside the existing { bot: string; at: number }[]
 *    entries in the same JSON array.
 *  - Increments Servers.votes by 1 on success.
 *  - Sends a best-effort Discord log via SendLog.
 */
export const POST: RequestHandler = async ({ request, params, cookies }) => {
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
			return json({ err: "missing_server_id" }, { status: 400 });
		}

		// Resolve Discord user from token
		const oauth = new DiscordOauth2({
			clientId: env.DISCORD_BOT_ID,
			clientSecret: env.DISCORD_SECRET,
			redirectUri: (env.DOMAIN ?? "http://localhost:5173") + "/api/auth"
		});

		let userData: any;
		try {
			userData = await oauth.getUser(String(key));
		} catch {
			try {
				cookies.delete("key", { path: "/" });
			} catch {}
			return json({ err: "invalid_key" }, { status: 400 });
		}

		// Fetch user record
		const userRows = await db
			.select({ bal: Users.bal, votes: Users.votes })
			.from(Users)
			.where(eq(Users.id, userData.id))
			.limit(1);

		if (!userRows || userRows.length === 0) {
			return json({ err: "invalid_key" }, { status: 400 });
		}

		const userRow = userRows[0] as any;

		// Parse the shared votes array — entries can be { bot } or { server }
		let votesArr: Array<{ bot?: string; server?: string; at: number }> = [];
		try {
			if (!userRow.votes) votesArr = [];
			else if (typeof userRow.votes === "string") votesArr = JSON.parse(userRow.votes);
			else votesArr = Array.isArray(userRow.votes) ? userRow.votes : [];
		} catch {
			votesArr = [];
		}
		if (!Array.isArray(votesArr)) votesArr = [];

		// Fetch server record
		const serverRows = await db
			.select({
				id: Servers.id,
				name: Servers.name,
				icon: Servers.icon,
				slug: Servers.slug,
				votes: Servers.votes,
				owner: Servers.owner
			})
			.from(Servers)
			.where(eq(Servers.id, id))
			.limit(1);

		if (!serverRows || serverRows.length === 0) {
			return json({ err: "no_server_found" }, { status: 400 });
		}

		const server = serverRows[0] as any;

		// Cooldown check — 24 hours
		const lastVote = votesArr.find((v) => v.server === id);
		if (lastVote && lastVote.at > Date.now() - 86_400_000) {
			const timeRemaining = 86_400_000 - (Date.now() - lastVote.at);
			const d = new Date(timeRemaining);
			const try_after = d.toISOString().substring(11, 19); // HH:MM:SS
			return json({ err: "cooldown", try_after }, { status: 400 });
		}

		// Remove stale entry for this server and record fresh vote
		votesArr = votesArr.filter((v) => v.server !== id);
		votesArr.push({ server: id, at: Date.now() });

		const newServerVotes = (server.votes ?? 0) + 1;

		// Persist
		try {
			await db
				.update(Users)
				.set({ votes: JSON.stringify(votesArr) })
				.where(eq(Users.id, userData.id));
			await db.update(Servers).set({ votes: newServerVotes }).where(eq(Servers.id, id));
		} catch (e) {
			console.error("[server-vote] DB update error:", e);
			return json({ err: "db_update_failed" }, { status: 500 });
		}

		// Record vote in the activity log for the referral vote-20 milestone.
		// Fire-and-forget — never let this block or fail the vote response.
		recordVote(userData.id, id, "server").catch((err) => {
			console.warn(
				"[server-vote] recordVote failed (non-fatal):",
				err instanceof Error ? err.message : String(err)
			);
		});

		// Best-effort log
		try {
			await SendLog({
				env: {
					DOMAIN: env.DOMAIN ?? "",
					FAILED_DMS_LOGS_CHANNEL_ID: env.FAILED_DMS_LOGS_CHANNEL_ID ?? "",
					LOGS_CHANNEL_ID: env.LOGS_CHANNEL_ID ?? "",
					DISCORD_TOKEN: env.DISCORD_TOKEN ?? ""
				},
				body: {
					title: `${server.name} received a new vote!`,
					desc: `**${userData.global_name ?? userData.username}** voted for **${server.name}**! It now has **${newServerVotes}** votes.`,
					img: server.icon
						? `https://cdn.discordapp.com/icons/${server.id}/${server.icon}.webp?size=128`
						: undefined,
					owners: [server.owner]
				}
			});
		} catch {
			// Non-fatal — vote already recorded
		}

		return json({ success: true }, { status: 200 });
	} catch (err) {
		console.error("[api/servers/[id]/vote] Unhandled error:", err);
		return json(
			{ err: "server_error", message: err instanceof Error ? err.message : String(err) },
			{ status: 500 }
		);
	}
};
