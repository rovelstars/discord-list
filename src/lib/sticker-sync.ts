/**
 * Sticker Sync Utility
 *
 * Reusable core logic for syncing Discord server stickers into the database.
 * Mirrors emoji-sync.ts exactly, substituting the Stickers table and the
 * Discord /guilds/{id}/stickers endpoint.
 *
 * Used by:
 *  - The /register slash command (auto-sync on first registration)
 *  - The /sync slash command (force re-sync)
 *  - The internal API route (for web-triggered syncs)
 *
 * This module is server-only. It fetches guild stickers from Discord's REST API
 * and upserts them into the Stickers table via the syncGuildStickers query helper.
 *
 * NOTE: Does NOT use dynamic $lib imports so this module is safe to import
 * from both SvelteKit routes and standalone server/bot contexts.
 */

const DISCORD_API = "https://discord.com/api/v10";
const FETCH_TIMEOUT_MS = 10_000;

export type StickerSyncResult = {
	guildId: string;
	created: number;
	updated: number;
	total: number;
	error?: string;
};

/**
 * A Discord guild sticker object as returned by the REST API.
 *
 * Relevant fields from GET /guilds/{guild.id}/stickers:
 *  https://discord.com/developers/docs/resources/sticker#sticker-object
 */
export type DiscordSticker = {
	id: string;
	name: string;
	description?: string | null | undefined;
	tags?: string;
	/** Format type: 1=PNG, 2=APNG, 3=LOTTIE, 4=GIF */
	format_type: number;
	/** Whether the sticker is available for use (may be false for boosted servers that lost a boost level). */
	available?: boolean;
};

/**
 * fetch() with an AbortController timeout so a slow Discord API never
 * hangs the process indefinitely.
 */
async function fetchWithTimeout(
	url: string,
	options: RequestInit = {},
	timeoutMs = FETCH_TIMEOUT_MS
): Promise<Response> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetch(url, { ...options, signal: controller.signal });
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Fetch all custom stickers for a guild from the Discord REST API.
 *
 * @param guildId   Discord guild snowflake.
 * @param botToken  Bot token for authorization.
 * @returns Array of sticker objects, or null on failure.
 */
export async function fetchGuildStickers(
	guildId: string,
	botToken: string
): Promise<DiscordSticker[] | null> {
	try {
		const res = await fetchWithTimeout(
			`${DISCORD_API}/guilds/${encodeURIComponent(guildId)}/stickers`,
			{
				headers: {
					Authorization: `Bot ${botToken}`,
					"User-Agent": "RovelDiscordList/1.0 (+https://discord.rovelstars.com)"
				}
			}
		);

		if (!res.ok) {
			const text = await res.text().catch(() => `HTTP ${res.status}`);
			console.error(`[sticker-sync] Discord API error ${res.status} for guild ${guildId}:`, text);
			return null;
		}

		const stickers = await res.json().catch(() => null);
		if (!Array.isArray(stickers)) {
			console.error(`[sticker-sync] Unexpected response shape for guild ${guildId}`);
			return null;
		}

		// Filter to guild stickers only — must have an id, name, and format_type.
		// Standard stickers (Nitro/built-in) have no guild_id and should be skipped.
		return stickers.filter(
			(s: any) =>
				s &&
				typeof s.id === "string" &&
				typeof s.name === "string" &&
				typeof s.format_type === "number"
		) as DiscordSticker[];
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		console.error(`[sticker-sync] fetchGuildStickers error for guild ${guildId}:`, msg);
		return null;
	}
}

/**
 * Sync all stickers for a single guild into the database.
 *
 * Accepts an explicit `syncFn` so callers can inject the DB dependency
 * without relying on dynamic $lib imports (which are only available inside
 * the SvelteKit build context). API routes pass the real function;
 * tests can pass a mock.
 *
 * @param guildId   Discord guild snowflake.
 * @param botToken  Bot token for authorization.
 * @param syncFn    The DB upsert function — accepts (guildId, stickers[]) and
 *                  returns Promise<{ created: number; updated: number }>.
 */
export async function syncServerStickersWithFn(
	guildId: string,
	botToken: string,
	syncFn: (
		guildId: string,
		stickers: DiscordSticker[]
	) => Promise<{ created: number; updated: number }>
): Promise<StickerSyncResult> {
	// 1. Fetch stickers from Discord
	const stickers = await fetchGuildStickers(guildId, botToken);

	if (stickers === null) {
		return {
			guildId,
			created: 0,
			updated: 0,
			total: 0,
			error: "discord_fetch_failed"
		};
	}

	if (stickers.length === 0) {
		return { guildId, created: 0, updated: 0, total: 0 };
	}

	// 2. Upsert into DB via the injected function
	try {
		const { created, updated } = await syncFn(guildId, stickers);
		return {
			guildId,
			created,
			updated,
			total: stickers.length
		};
	} catch (dbErr) {
		const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
		console.error(`[sticker-sync] DB error syncing guild ${guildId}:`, msg);
		return {
			guildId,
			created: 0,
			updated: 0,
			total: stickers.length,
			error: `db_error: ${msg}`
		};
	}
}

/**
 * Convenience wrapper for use inside SvelteKit server routes.
 * Imports the DB module statically (works because SvelteKit resolves
 * $lib at build time for server-side code).
 *
 * For bot/standalone contexts, use syncServerStickersWithFn and pass
 * your own DB function.
 */
export async function syncServerStickers(
	guildId: string,
	botToken: string
): Promise<StickerSyncResult> {
	const { syncGuildStickers } = await import("$lib/db/queries/stickers");
	return syncServerStickersWithFn(guildId, botToken, syncGuildStickers);
}
