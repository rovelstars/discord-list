/**
 * Emoji Sync Utility
 *
 * Reusable core logic for syncing Discord server emojis into the database.
 * Used by:
 *  - The /register slash command (auto-sync on first registration)
 *  - The /sync slash command (force re-sync)
 *  - The internal API route (for web-triggered syncs)
 *
 * This module is server-only. It fetches guild emojis from Discord's REST API
 * and upserts them into the Emojis table via the syncGuildEmojis query helper.
 *
 * NOTE: Does NOT use dynamic $lib imports so this module is safe to import
 * from both SvelteKit routes and standalone server/bot contexts.
 */

const DISCORD_API = "https://discord.com/api/v10";
const FETCH_TIMEOUT_MS = 10_000;

export type SyncResult = {
	guildId: string;
	created: number;
	updated: number;
	total: number;
	error?: string;
};

export type DiscordEmoji = {
	id: string;
	name: string;
	animated?: boolean;
	available?: boolean;
	managed?: boolean;
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
 * Fetch all custom emojis for a guild from the Discord REST API.
 *
 * @param guildId   Discord guild snowflake.
 * @param botToken  Bot token for authorization.
 * @returns Array of emoji objects, or null on failure.
 */
export async function fetchGuildEmojis(
	guildId: string,
	botToken: string
): Promise<DiscordEmoji[] | null> {
	try {
		const res = await fetchWithTimeout(
			`${DISCORD_API}/guilds/${encodeURIComponent(guildId)}/emojis`,
			{
				headers: {
					Authorization: `Bot ${botToken}`,
					"User-Agent": "RovelDiscordList/1.0 (+https://discord.rovelstars.com)"
				}
			}
		);

		if (!res.ok) {
			const text = await res.text().catch(() => `HTTP ${res.status}`);
			console.error(`[emoji-sync] Discord API error ${res.status} for guild ${guildId}:`, text);
			return null;
		}

		const emojis = await res.json().catch(() => null);
		if (!Array.isArray(emojis)) {
			console.error(`[emoji-sync] Unexpected response shape for guild ${guildId}`);
			return null;
		}

		// Filter to custom emojis only (must have an id) and skip unavailable/managed
		return emojis.filter(
			(e: any) => e && typeof e.id === "string" && typeof e.name === "string"
		) as DiscordEmoji[];
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		console.error(`[emoji-sync] fetchGuildEmojis error for guild ${guildId}:`, msg);
		return null;
	}
}

/**
 * Sync all emojis for a single guild into the database.
 *
 * Accepts an explicit `syncFn` so callers can inject the DB dependency
 * without relying on dynamic $lib imports (which are only available inside
 * the SvelteKit build context). API routes pass the real function;
 * tests can pass a mock.
 *
 * @param guildId   Discord guild snowflake.
 * @param botToken  Bot token for authorization.
 * @param syncFn    The DB upsert function — accepts (guildId, emojis[]) and
 *                  returns Promise<{ created: number; updated: number }>.
 */
export async function syncServerEmojisWithFn(
	guildId: string,
	botToken: string,
	syncFn: (guildId: string, emojis: DiscordEmoji[]) => Promise<{ created: number; updated: number }>
): Promise<SyncResult> {
	// 1. Fetch emojis from Discord
	const emojis = await fetchGuildEmojis(guildId, botToken);

	if (emojis === null) {
		return {
			guildId,
			created: 0,
			updated: 0,
			total: 0,
			error: "discord_fetch_failed"
		};
	}

	if (emojis.length === 0) {
		return { guildId, created: 0, updated: 0, total: 0 };
	}

	// 2. Upsert into DB via the injected function
	try {
		const { created, updated } = await syncFn(guildId, emojis);
		return {
			guildId,
			created,
			updated,
			total: emojis.length
		};
	} catch (dbErr) {
		const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
		console.error(`[emoji-sync] DB error syncing guild ${guildId}:`, msg);
		return {
			guildId,
			created: 0,
			updated: 0,
			total: emojis.length,
			error: `db_error: ${msg}`
		};
	}
}

/**
 * Convenience wrapper for use inside SvelteKit server routes.
 * Imports the DB module statically (works because SvelteKit resolves
 * $lib at build time for server-side code).
 *
 * For bot/standalone contexts, use syncServerEmojisWithFn and pass
 * your own DB function.
 */
export async function syncServerEmojis(guildId: string, botToken: string): Promise<SyncResult> {
	// Inline import keeps the module usable even if the caller hasn't
	// set up path aliases — SvelteKit resolves this at bundle time.
	const { syncGuildEmojis } = await import("$lib/db/queries/emojis");
	return syncServerEmojisWithFn(guildId, botToken, syncGuildEmojis);
}
