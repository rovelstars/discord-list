/**
 * bot-refresh.ts
 *
 * Shared logic for refreshing a single bot's data from Discord and persisting
 * any changes back to the database.
 *
 * Used by two different route handlers that share identical core behaviour but
 * differ only in their auth / rate-limiting concerns:
 *
 *   - POST /api/internals/refresh-bot/[id]  - internal, INTERNAL_SECRET protected
 *   - POST /api/bots/[id]/refresh           - public-facing, rate-limited
 *
 * Steps performed by `refreshBot()`:
 *   1. Load the current bot row from DB (id, username, discriminator, avatar, bg, owners).
 *   2. Fetch the latest identity from Discord via GET /users/:id (bot token).
 *   3. Diff each field against the DB value - only changed fields are written.
 *   4. If `bg` is an expired Discord CDN attachment URL, refresh it via
 *      POST /attachments/refresh-urls and include it in the write.
 *   5. Write the update set to the DB (single UPDATE, only when something changed).
 *   6. Send a Discord log notification via SendLog when anything was updated.
 *
 * Both Discord API calls are non-fatal: if either fails the function logs a
 * warning and continues so partial work (e.g. identity updated but bg not, or
 * vice-versa) is still persisted.
 */

import { getDb } from "$lib/db";
import { Bots } from "$lib/db/schema";
import { eq } from "drizzle-orm";
import { env } from "$env/dynamic/private";
import SendLog from "@/bot/log";
import getAvatarURL from "@/lib/get-avatar-url";
import { classifyCdnUrl, isDiscordCdnAttachment } from "$lib/cdn-refresh";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Result returned by `refreshBot()` to route handlers. */
export interface BotRefreshResult {
	/** The bot ID that was processed. */
	botId: string;
	/** Whether any DB write was performed. */
	updated: boolean;
	/** Human-readable list of what changed, e.g. `['avatar: "abc" → "def"', 'bg: CDN URL refreshed']`. */
	changes: string[];
	/** Whether the `bg` CDN URL was successfully refreshed. */
	bgRefreshed: boolean;
	/**
	 * The latest resolved `bg` value after this refresh cycle - set whenever
	 * `updates.bg` was written (either a new banner hash from Discord identity
	 * or a freshly-signed CDN URL). The client can use this to update the card
	 * in-place without a full page reload.
	 */
	newBg?: string;
	/**
	 * Set when a non-fatal error occurred during the Discord fetch step.
	 * The function still continues (e.g. to attempt the bg refresh), so
	 * this coexists with a potentially partial `updated: true`.
	 */
	partialError?: string;
}

/** Options forwarded from the route handler to customise log messages. */
export interface BotRefreshOptions {
	/**
	 * Short label used in log lines and the Discord notification description
	 * to indicate where the refresh was triggered from.
	 * Defaults to `'unknown'`.
	 * @example 'frontend-image-error'
	 * @example 'internal-api'
	 */
	triggeredBy?: string;
}

// ---------------------------------------------------------------------------
// Private types
// ---------------------------------------------------------------------------

export interface DiscordBotUser {
	id: string;
	username: string;
	discriminator: string;
	avatar: string | null;
	bot?: boolean;
	global_name?: string | null;
	banner?: string | null;
	approximate_guild_count?: number;
}

interface DiscordRefreshedUrl {
	original: string;
	refreshed: string;
}

type BotUpdatePayload = Partial<{
	username: string;
	discriminator: string;
	avatar: string;
	bg: string;
}>;

// ---------------------------------------------------------------------------
// Discord API helpers
// ---------------------------------------------------------------------------

/**
 * Fetch the bot user object from Discord's v10 API.
 * Requires a bot token; returns the full user object or throws on non-2xx.
 */
export async function fetchDiscordBotUser(id: string, botToken: string): Promise<DiscordBotUser> {
	const res = await fetch(`https://discord.com/api/v10/users/${encodeURIComponent(id)}`, {
		headers: {
			Authorization: `Bot ${botToken}`,
			"User-Agent": "discord-list/infra"
		}
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "(unreadable)");
		throw new Error(`Discord GET /users/${id} returned HTTP ${res.status}: ${text}`);
	}

	return res.json() as Promise<DiscordBotUser>;
}

/**
 * Ask Discord to issue a fresh signed URL for a single CDN attachment.
 * Returns the refreshed URL string, or `null` when Discord returns the same
 * URL (no-op) or when the response has no entry for it.
 */
async function refreshSingleCdnUrl(url: string, botToken: string): Promise<string | null> {
	const res = await fetch("https://discord.com/api/v9/attachments/refresh-urls", {
		method: "POST",
		headers: {
			Authorization: `Bot ${botToken}`,
			"Content-Type": "application/json",
			"User-Agent": "discord-list/infra"
		},
		body: JSON.stringify({ attachment_urls: [url] })
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "(unreadable)");
		throw new Error(`Discord refresh-urls returned HTTP ${res.status}: ${text}`);
	}

	const data = (await res.json()) as { refreshed_urls: DiscordRefreshedUrl[] };
	const pair = data.refreshed_urls?.[0];
	// Treat same-URL response as a no-op (shouldn't happen, but be safe).
	if (!pair?.refreshed || pair.refreshed === url) return null;
	return pair.refreshed;
}

// ---------------------------------------------------------------------------
// Core refresh logic
// ---------------------------------------------------------------------------

/**
 * Refresh a single bot's Discord identity and CDN background URL.
 *
 * @param botId        The bot's primary-key `id` in the Bots table.
 * @param discordToken Bot token (value only, without "Bot " prefix).
 * @param options      Optional metadata forwarded to log messages.
 *
 * @returns A `BotRefreshResult` describing what changed (or why nothing did).
 *          Throws only on unrecoverable errors (DB read failure, DB write failure).
 *          Discord API failures are captured as `partialError` and do not throw.
 */
export async function refreshBot(
	botId: string,
	discordToken: string,
	options: BotRefreshOptions = {}
): Promise<BotRefreshResult> {
	const triggeredBy = options.triggeredBy ?? "unknown";
	const logPrefix = `[bot-refresh/${triggeredBy}]`;

	const result: BotRefreshResult = {
		botId,
		updated: false,
		changes: [],
		bgRefreshed: false,
		newBg: undefined
	};

	const db = getDb();

	// -----------------------------------------------------------------------
	// Step 1: Load current bot row from DB
	// -----------------------------------------------------------------------
	const rows = await db
		.select({
			id: Bots.id,
			username: Bots.username,
			discriminator: Bots.discriminator,
			avatar: Bots.avatar,
			bg: Bots.bg,
			owners: Bots.owners
		})
		.from(Bots)
		.where(eq(Bots.id, botId))
		.limit(1);

	if (!rows || rows.length === 0) {
		// Caller should translate this into a 404 response.
		throw new NotFoundError(`Bot ${botId} not found in database.`);
	}

	const dbBot = rows[0];
	const updates: BotUpdatePayload = {};

	// -----------------------------------------------------------------------
	// Step 2: Fetch latest identity from Discord (non-fatal)
	// -----------------------------------------------------------------------
	let discordUser: DiscordBotUser | null = null;
	try {
		discordUser = await fetchDiscordBotUser(botId, discordToken);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		console.warn(`${logPrefix} Could not fetch Discord user for ${botId}: ${msg}`);
		result.partialError = `discord_fetch_failed: ${msg}`;
	}
	// -----------------------------------------------------------------------
	// Step 3: Diff identity fields
	// -----------------------------------------------------------------------
	if (discordUser) {
		const newUsername = discordUser.username ?? dbBot.username;
		const newDiscriminator = discordUser.discriminator ?? dbBot.discriminator;
		// Discord returns null avatar for the default avatar; normalise to '0'.
		const newAvatar = discordUser.avatar ?? "0";
		const newBg = discordUser.banner ?? dbBot.bg ?? undefined; // Optional: also update bg if the bot has a banner?
		if (newUsername !== dbBot.username) {
			updates.username = newUsername;
			result.changes.push(`username: "${dbBot.username}" → "${newUsername}"`);
		}
		if (newDiscriminator !== dbBot.discriminator) {
			updates.discriminator = newDiscriminator;
			result.changes.push(`discriminator: "${dbBot.discriminator}" → "${newDiscriminator}"`);
		}
		if (newAvatar !== dbBot.avatar) {
			updates.avatar = newAvatar;
			result.changes.push(`avatar: "${dbBot.avatar}" → "${newAvatar}"`);
		}
		if (newBg !== dbBot.bg) {
			updates.bg = newBg;
			result.changes.push(`bg: "${dbBot.bg}" → "${newBg}"`);
		}
	}

	// -----------------------------------------------------------------------
	// Step 4: Refresh bg CDN URL if expired (non-fatal)
	// -----------------------------------------------------------------------
	const currentBg = dbBot.bg;
	if (currentBg && isDiscordCdnAttachment(currentBg) && classifyCdnUrl(currentBg) === "invalid") {
		try {
			const refreshedBg = await refreshSingleCdnUrl(currentBg, discordToken);
			if (refreshedBg) {
				updates.bg = refreshedBg;
				result.bgRefreshed = true;
				result.newBg = refreshedBg;
				result.changes.push("bg: CDN URL refreshed");
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			console.warn(`${logPrefix} Could not refresh bg CDN URL for ${botId}: ${msg}`);
			// Non-fatal - still write any identity changes collected above.
		}
	}

	// -----------------------------------------------------------------------
	// Step 5: Write to DB only when something actually changed
	// -----------------------------------------------------------------------
	if (Object.keys(updates).length > 0) {
		await db.update(Bots).set(updates).where(eq(Bots.id, botId));
		result.updated = true;
		// Propagate the final bg value to the result if it was part of this
		// update batch but not already set by the CDN refresh step above.
		if (updates.bg !== undefined && result.newBg === undefined) {
			result.newBg = updates.bg;
		}
	}

	// -----------------------------------------------------------------------
	// Step 6: Send Discord log notification (non-fatal)
	// -----------------------------------------------------------------------
	if (result.updated) {
		const effectiveUsername = updates.username ?? dbBot.username;
		const effectiveDiscriminator = updates.discriminator ?? dbBot.discriminator;
		const effectiveAvatar = updates.avatar ?? dbBot.avatar;

		try {
			await SendLog({
				env: {
					DOMAIN: env.DOMAIN ?? "",
					FAILED_DMS_LOGS_CHANNEL_ID: env.FAILED_DMS_LOGS_CHANNEL_ID ?? "",
					LOGS_CHANNEL_ID: env.LOGS_CHANNEL_ID ?? "",
					DISCORD_TOKEN: discordToken
				},
				body: {
					title: `Bot ${effectiveUsername}#${effectiveDiscriminator} data refreshed`,
					desc: [
						`Bot **${effectiveUsername}** (\`${botId}\`) was automatically refreshed (trigger: \`${triggeredBy}\`).`,
						"",
						"**Changes:**",
						...result.changes.map((c) => `• ${c}`)
					].join("\n"),
					color: "#5865F2",
					img: getAvatarURL(botId, effectiveAvatar)
				}
			});
		} catch (logErr) {
			// Logging failures are non-fatal - the DB update already succeeded.
			console.warn(`${logPrefix} SendLog failed (non-fatal):`, logErr);
		}
	}

	console.log(
		`${logPrefix} id=${botId} updated=${result.updated} bgRefreshed=${result.bgRefreshed}` +
			(result.changes.length ? ` changes=[${result.changes.join(", ")}]` : "")
	);

	return result;
}

// ---------------------------------------------------------------------------
// Sentinel error type so route handlers can distinguish "bot not in DB" from
// unexpected runtime errors without parsing error message strings.
// ---------------------------------------------------------------------------

export class NotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "NotFoundError";
	}
}
