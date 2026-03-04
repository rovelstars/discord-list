import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import DiscordOauth2 from "discord-oauth2";
import { getDb } from "$lib/db";
import { Users, Bots } from "$lib/schema";
import { eq } from "drizzle-orm";
import SendLog from "@/bot/log";
import { env } from "$env/dynamic/private";

/**
 * POST /bots/[id]/vote
 *
 * Body/Query:
 *  - coins (optional) -> number of coins to spend when bot opted into coin-based voting
 * Auth:
 *  - Accepts access token in query `key`, Authorization header, RDL-key header or `key` cookie.
 *
 * Behavior mirrors previous implementation:
 *  - Enforces cooldown for time-based votes (24h)
 *  - Supports coin-based votes when bot.opted_coins is true (10 coins = 1 vote)
 *  - Updates Users.votes and Users.bal and Bots.votes accordingly
 *  - Sends webhook to bot.webhook when configured (best-effort)
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

		// Get the bot id from params
		const id = params.id;
		if (!id) {
			return json({ err: "missing_bot_id" }, { status: 400 });
		}

		// Use Discord OAuth to fetch user info
		const oauth = new DiscordOauth2({
			clientId: env.DISCORD_BOT_ID,
			clientSecret: env.DISCORD_SECRET,
			redirectUri: (env.DOMAIN ?? "http://localhost:5173") + "/api/auth"
		});

		let userData: any;
		try {
			userData = await oauth.getUser(key);
		} catch (e) {
			// Token invalid -> clear cookie and return
			cookies.delete("key");
			return json({ err: "invalid_key" }, { status: 400 });
		}

		// Fetch user record from DB
		const userRows = await db
			.select({ bal: Users.bal, votes: Users.votes })
			.from(Users)
			.where(eq(Users.id, userData.id))
			.limit(1);

		if (!userRows || userRows.length === 0) {
			return json({ err: "invalid_key" }, { status: 400 });
		}

		let user = userRows[0] as any;
		// Normalize votes (could be stored as JSON string)
		let votesArr: { bot: string; at: number }[] = [];
		try {
			if (!user.votes) votesArr = [];
			else if (typeof user.votes === "string") votesArr = JSON.parse(user.votes as string);
			else votesArr = Array.isArray(user.votes) ? user.votes : [];
		} catch {
			votesArr = [];
		}
		if (!Array.isArray(votesArr)) votesArr = [];

		// Fetch bot record
		const botRows = await db
			.select({
				votes: Bots.votes,
				opted_coins: Bots.opted_coins,
				webhook: Bots.webhook,
				code: Bots.code,
				username: Bots.username,
				avatar: Bots.avatar,
				owners: Bots.owners
			})
			.from(Bots)
			.where(eq(Bots.id, id))
			.limit(1);

		if (!botRows || botRows.length === 0) {
			return json({ err: "no_bot_found" }, { status: 400 });
		}

		const bot = botRows[0] as any;

		// Parse coins param (if provided)
		const coinsParam = url.searchParams.get("coins");
		let coins: number | null = null;
		if (coinsParam !== null) {
			const parsed = parseInt(coinsParam);
			if (Number.isNaN(parsed)) {
				return json({ err: "invalid_coins" }, { status: 400 });
			}
			coins = parsed;
		}

		// Determine voting type and validate
		if (coins !== null && !bot.opted_coins) {
			return json({ err: "invalid_voting_type" }, { status: 400 });
		}

		if (coins !== null && bot.opted_coins) {
			// coins must be positive and divisible by 10
			if (coins < 1) return json({ err: "invalid_coins" }, { status: 400 });
			if (coins % 10 !== 0) return json({ err: "coins_not_divisble_by_10" }, { status: 400 });
			if ((user.bal ?? 0) < coins) return json({ err: "insufficient_coins" }, { status: 400 });
			// Deduct coins locally first
			user.bal = (user.bal ?? 0) - coins;
		}

		// Cooldown logic for non-coin votes (time-based)
		const lastVote = votesArr.find((v) => v.bot === id);
		let try_after: string | null = null;
		if (lastVote) {
			const timeRemaining = 86400000 - (Date.now() - lastVote.at);
			if (timeRemaining > 0) {
				// Format as HH:MM:SS
				const d = new Date(timeRemaining);
				try_after = d.toISOString().substr(11, 8);
			}
		}

		if (lastVote && lastVote.at > Date.now() - 86400000 && !bot.opted_coins) {
			return json({ err: "cooldown", try_after }, { status: 400 });
		}

		// Remove any previous vote entries for this bot
		votesArr = votesArr.filter((v) => v.bot !== id);

		// Add the new vote entry for time-based voting
		if (!bot.opted_coins) {
			votesArr.push({ bot: id, at: Date.now() });
		}

		// Update bot votes
		let newBotVotes = bot.votes ?? 0;
		if (bot.opted_coins && coins !== null) {
			newBotVotes = newBotVotes + Math.floor(coins / 10);
		} else if (!bot.opted_coins) {
			newBotVotes = newBotVotes + 1;
		}

		// Persist user and bot updates (best-effort)
		try {
			// Users.votes is stored as TEXT JSON in our portable schema; stringify on write.
			await db
				.update(Users)
				.set({ bal: user.bal ?? 0, votes: JSON.stringify(votesArr) })
				.where(eq(Users.id, userData.id));
			await db.update(Bots).set({ votes: newBotVotes }).where(eq(Bots.id, id));
		} catch (e) {
			console.error("DB update error in vote endpoint:", e);
			return json({ err: "db_update_failed" }, { status: 500 });
		}

		// If bot has a webhook configured, notify it (best-effort)
		if (bot.webhook) {
			const body = {
				user: {
					id: userData.id,
					username: userData.username,
					discriminator: userData.discriminator,
					avatar: userData.avatar,
					bal: user.bal
				},
				coins: coins,
				votes: bot.opted_coins ? Math.floor((coins ?? 0) / 10) : 1,
				currentVotes: newBotVotes
			};

			try {
				const webhookUrl = `${bot.webhook}${bot.code ? `?code=${bot.code}` : ""}`;
				const res = await fetch(webhookUrl, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...(bot.code ? { Authorization: bot.code } : {})
					},
					body: JSON.stringify(body),
					// keep it short
					// @ts-ignore fetch option may be available in runtime
					keepalive: true
				});
				if (!res.ok) {
					// Log failure via SendLog if available, but don't fail the vote
					try {
						await SendLog({
							env: {
								DOMAIN: env.DOMAIN ?? "",
								FAILED_DMS_LOGS_CHANNEL_ID: env.FAILED_DMS_LOGS_CHANNEL_ID ?? "",
								LOGS_CHANNEL_ID: env.LOGS_CHANNEL_ID ?? "",
								DISCORD_TOKEN: env.DISCORD_TOKEN ?? ""
							},
							body: {
								title: `Failed to send data to ${bot.username} (${id})`,
								desc: `Webhook responded with status ${res.status}.`,
								img: bot.avatar
									? `https://cdn.discordapp.com/avatars/${id}/${bot.avatar}?size=128`
									: undefined,
								// bot.owners may be stored as serialized JSON TEXT in DB - parse if necessary
								owners:
									typeof bot.owners === "string"
										? JSON.parse(bot.owners || "[]")
										: (bot.owners ?? [])
							}
						});
					} catch (e) {
						// swallow logging errors
					}
				}
			} catch (e) {
				// Best-effort: log and continue
				try {
					await SendLog({
						env: {
							DOMAIN: env.DOMAIN ?? "",
							FAILED_DMS_LOGS_CHANNEL_ID: env.FAILED_DMS_LOGS_CHANNEL_ID ?? "",
							LOGS_CHANNEL_ID: env.LOGS_CHANNEL_ID ?? "",
							DISCORD_TOKEN: env.DISCORD_TOKEN ?? ""
						},
						body: {
							title: `Failed to send webhook for ${bot.username} (${id})`,
							desc: String(e),
							// bot.owners may be stored as serialized JSON TEXT in DB - parse if necessary
							owners:
								typeof bot.owners === "string" ? JSON.parse(bot.owners || "[]") : (bot.owners ?? [])
						}
					});
				} catch {
					// ignore
				}
			}
		}

		return json({ success: true });
	} catch (err) {
		console.error("/api/bots/[id]/vote error:", err);
		return json(
			{ err: "server_error", message: err instanceof Error ? err.message : String(err) },
			{ status: 500 }
		);
	}
};
