import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import DiscordOauth2 from "discord-oauth2";
import { getDb } from "$lib/db";
import { Users, Bots } from "$lib/schema";
import { eq } from "drizzle-orm";
import SendLog from "@/bot/log";
import { env } from "$env/dynamic/private";

// ─────────────────────────────────────────────────────────────────────────────
// Discord webhook helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns true when the URL points at a Discord-hosted webhook endpoint. */
function isDiscordWebhook(url: string): boolean {
	try {
		const { hostname, pathname } = new URL(url);
		return (
			(hostname === "discord.com" || hostname === "discordapp.com") &&
			pathname.startsWith("/api/webhooks/")
		);
	} catch {
		return false;
	}
}

/**
 * Build a Discord webhook embed payload for a vote event.
 * Discord webhooks expect { content?, embeds?, username?, avatar_url? }.
 */
function buildDiscordVotePayload(opts: {
	voterUsername: string;
	voterId: string;
	voterAvatar: string | null;
	voterBal: number;
	botName: string;
	botId: string;
	botAvatar: string | null;
	coins: number | null;
	votesAdded: number;
	totalVotes: number;
	domain: string;
}) {
	const {
		voterUsername,
		voterId,
		voterAvatar,
		voterBal,
		botName,
		botId,
		botAvatar,
		coins,
		votesAdded,
		totalVotes,
		domain
	} = opts;

	const voterAvatarUrl = voterAvatar
		? `https://cdn.discordapp.com/avatars/${voterId}/${voterAvatar}.webp?size=128`
		: `https://cdn.discordapp.com/embed/avatars/0.png`;

	const botAvatarUrl = botAvatar
		? `https://cdn.discordapp.com/avatars/${botId}/${botAvatar}.webp?size=128`
		: null;

	const isCoins = coins !== null;
	const description = isCoins
		? `**${voterUsername}** spent **${coins} Rcoins** to give **${votesAdded}** vote${votesAdded !== 1 ? "s" : ""}!`
		: `**${voterUsername}** just voted for your bot!`;

	return {
		username: "Rovel Discord List",
		avatar_url: `${domain}/assets/img/bot/logo-512.png`,
		embeds: [
			{
				title: `🎉 New vote for ${botName}!`,
				description,
				color: 0x57f287, // Discord green
				url: `${domain}/bots/${botId}`,
				thumbnail: botAvatarUrl ? { url: botAvatarUrl } : undefined,
				fields: [
					{
						name: "Voter",
						value: `[${voterUsername}](https://discord.com/users/${voterId})`,
						inline: true
					},
					{
						name: isCoins ? "Coins spent" : "Vote type",
						value: isCoins ? `${coins} Rcoins` : "Time-based (24h cooldown)",
						inline: true
					},
					{
						name: "Votes added",
						value: String(votesAdded),
						inline: true
					},
					{
						name: "Total votes",
						value: String(totalVotes),
						inline: true
					},
					...(isCoins
						? [
								{
									name: "Voter balance after",
									value: `${voterBal} Rcoins`,
									inline: true
								}
							]
						: [])
				],
				author: {
					name: voterUsername,
					icon_url: voterAvatarUrl
				},
				footer: {
					text: "Rovel Discord List",
					icon_url: `${domain}/assets/img/bot/logo-512.png`
				},
				timestamp: new Date().toISOString()
			}
		]
	};
}

/**
 * POST /api/bots/[id]/vote
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
			userData = await oauth.getUser(String(key));
		} catch (e) {
			// Token invalid -> clear cookie and return
			try {
				cookies.delete("key", { path: "/" });
			} catch {}
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
				owners: Bots.owners,
				slug: Bots.slug
			})
			.from(Bots)
			.where(eq(Bots.id, id))
			.limit(1);

		if (!botRows || botRows.length === 0) {
			return json({ err: "no_bot_found" }, { status: 400 });
		}

		const bot = botRows[0] as any;

		// Parse owners field: schema stores `owners` as serialized JSON TEXT.
		// Ensure we convert it to an array for downstream logic (DMs, logging).
		let botOwners: string[] = [];
		try {
			if (typeof bot.owners === "string") botOwners = JSON.parse(bot.owners as string);
			else if (Array.isArray(bot.owners)) botOwners = bot.owners;
		} catch {
			botOwners = [];
		}

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
			// Persist votes as serialized JSON TEXT (schema stores votes as TEXT).
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
			const votesAdded = bot.opted_coins ? Math.floor((coins ?? 0) / 10) : 1;
			const domain = (env.DOMAIN ?? "https://discord.rovelstars.com").replace(/\/$/, "");

			// When the configured URL is a Discord webhook, send a rich embed instead
			// of the raw vote data payload — Discord only accepts its own schema.
			const discordWebhook = isDiscordWebhook(bot.webhook);

			const body = discordWebhook
				? buildDiscordVotePayload({
						voterUsername: userData.username,
						voterId: userData.id,
						voterAvatar: userData.avatar ?? null,
						voterBal: user.bal ?? 0,
						botName: bot.username,
						botId: bot.slug || id,
						botAvatar: bot.avatar ?? null,
						coins,
						votesAdded,
						totalVotes: newBotVotes,
						domain
					})
				: {
						user: {
							id: userData.id,
							username: userData.username,
							discriminator: userData.discriminator,
							avatar: userData.avatar,
							bal: user.bal
						},
						coins,
						votes: votesAdded,
						currentVotes: newBotVotes
					};

			try {
				// Discord webhooks must NOT receive the bot's secret code — they use
				// their own token embedded in the URL. Only append code for custom webhooks.
				const webhookUrl = discordWebhook
					? bot.webhook
					: `${bot.webhook}${bot.code ? `?code=${bot.code}` : ""}`;

				const res = await fetch(webhookUrl, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...(!discordWebhook && bot.code ? { Authorization: bot.code } : {})
					},
					body: JSON.stringify(body),
					// @ts-ignore
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
								owners: botOwners
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
							owners: botOwners
						}
					});
				} catch {
					// ignore
				}
			}
		}

		return json({ success: true }, { status: 200 });
	} catch (err) {
		console.error("/api/bots/[id]/vote error:", err);
		return json(
			{ err: "server_error", message: err instanceof Error ? err.message : String(err) },
			{ status: 500 }
		);
	}
};
