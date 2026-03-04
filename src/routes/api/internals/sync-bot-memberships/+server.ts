/**
 * POST /api/internals/sync-bot-memberships
 *
 * Internal endpoint that cross-references every listed bot against every
 * listed server by calling Discord's GET /guilds/{guild_id}/members/{bot_id}.
 * If the bot is a member of the guild, its ID is written into the server's
 * `bot_ids` column and the guild ID is written into the bot's `guild_ids`
 * column.
 *
 * This is the ground-truth source for the "this bot is in these servers" and
 * "this server has these bots" features on bot/server detail pages.  The
 * page-load queries simply read from these cached columns - no Discord API
 * call is needed at render time.
 *
 * Security:
 *   X-Internal-Secret: <INTERNAL_SECRET>   (header)
 *   ?secret=<INTERNAL_SECRET>              (query param fallback)
 *
 * Optional query params:
 *   ?bot_id=<id>    Only sync membership for one specific bot (faster, used
 *                   when a new bot is added to the listing).
 *   ?server_id=<id> Only sync membership for one specific server.
 *   ?dry_run=1      Run all Discord checks but do not write to the DB.
 *
 * Rate-limit strategy:
 *   Discord's bot REST global limit is 50 req/s.  We process (server × bot)
 *   pairs in small concurrent batches with a delay between batches so we stay
 *   comfortably under that ceiling.
 *
 * Response JSON (200):
 *   {
 *     success:       true,
 *     durationMs:    number,
 *     totalChecked:  number,   // total (server, bot) pairs checked
 *     confirmed:     number,   // pairs where the bot IS in the server
 *     botsUpdated:   number,   // distinct bot rows written
 *     serversUpdated:number,   // distinct server rows written
 *     dryRun:        boolean,
 *     errors:        string[]  // non-fatal per-pair error messages
 *   }
 */

import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import {
	getAllServerAndBotIds,
	updateBotGuildIds,
	updateServerBotIds
} from "$lib/db/queries";

// ---------------------------------------------------------------------------
// Tuning constants
// ---------------------------------------------------------------------------

/** How many (server, bot) pairs to check concurrently. */
const BATCH_SIZE = 10;

/** Milliseconds to wait between batches. */
const BATCH_DELAY_MS = 500;

/** Timeout per Discord API call. */
const FETCH_TIMEOUT_MS = 8_000;

const DISCORD_API = "https://discord.com/api/v10";

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

function validateSecret(request: Request, url: URL): { ok: boolean; misconfigured: boolean } {
	const internalSecret = (env.INTERNAL_SECRET ?? "").trim();
	if (!internalSecret) return { ok: false, misconfigured: true };

	const supplied = (
		request.headers.get("X-Internal-Secret") ??
		url.searchParams.get("secret") ??
		""
	).trim();

	return { ok: supplied === internalSecret, misconfigured: false };
}

// ---------------------------------------------------------------------------
// Discord helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

/**
 * Check whether `botId` is currently a member of `guildId`.
 *
 * Returns:
 *   true   - 2xx response (bot is in the guild)
 *   false  - 404 (bot is NOT in the guild; this is the normal "not present" case)
 *   null   - any other HTTP error or network failure (treat as unknown / skip)
 */
async function isBotInGuild(
	guildId: string,
	botId: string,
	botToken: string
): Promise<boolean | null> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

	try {
		const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${botId}`, {
			headers: {
				Authorization: `Bot ${botToken}`,
				"User-Agent": "discord-list/sync-bot-memberships"
			},
			signal: controller.signal
		});

		if (res.ok) return true;
		if (res.status === 404) return false;

		// 403 means our bot isn't in that guild (can't read members), treat as unknown
		if (res.status === 403) return null;

		// Any other status (rate-limit 429, server error 5xx, …) is unknown
		return null;
	} catch {
		// AbortError (timeout) or network failure
		return null;
	} finally {
		clearTimeout(timer);
	}
}

// ---------------------------------------------------------------------------
// Core sync logic
// ---------------------------------------------------------------------------

interface SyncResult {
	totalChecked: number;
	confirmed: number;
	botsUpdated: number;
	serversUpdated: number;
	errors: string[];
}

async function runSync(
	botToken: string,
	filterBotId: string | null,
	filterServerId: string | null,
	dryRun: boolean
): Promise<SyncResult> {
	const result: SyncResult = {
		totalChecked: 0,
		confirmed: 0,
		botsUpdated: 0,
		serversUpdated: 0,
		errors: []
	};

	// ── 1. Load the full ID lists from DB ─────────────────────────────────────
	const { serverIds, botIds } = await getAllServerAndBotIds();

	const targetServers = filterServerId ? serverIds.filter((id) => id === filterServerId) : serverIds;
	const targetBots = filterBotId ? botIds.filter((id) => id === filterBotId) : botIds;

	if (targetServers.length === 0 || targetBots.length === 0) {
		return result;
	}

	// ── 2. Build the full Cartesian product of (server, bot) pairs ────────────
	//
	// We iterate servers as the outer loop so that all bots for a given server
	// are checked together.  This makes the per-server accumulator easy to manage
	// and lets us write each server row in one update after its batch completes.
	//
	// In-memory accumulators - keyed by ID - collect the confirmed memberships
	// so we write each row only once at the end (or per-server for servers).

	// botId → Set<serverId> where bot is confirmed present
	const botGuildMap = new Map<string, Set<string>>();
	// serverId → Set<botId> confirmed present in that server
	const serverBotMap = new Map<string, Set<string>>();

	for (const bid of targetBots) botGuildMap.set(bid, new Set());
	for (const sid of targetServers) serverBotMap.set(sid, new Set());

	// ── 3. Process all pairs in batches ───────────────────────────────────────
	// Flatten into a single array of pairs for uniform batch processing.
	const pairs: Array<{ serverId: string; botId: string }> = [];
	for (const serverId of targetServers) {
		for (const botId of targetBots) {
			pairs.push({ serverId, botId });
		}
	}

	for (let offset = 0; offset < pairs.length; offset += BATCH_SIZE) {
		const batch = pairs.slice(offset, offset + BATCH_SIZE);

		await Promise.all(
			batch.map(async ({ serverId, botId }) => {
				result.totalChecked++;

				const present = await isBotInGuild(serverId, botId, botToken);

				if (present === null) {
					// Unknown / transient error - skip without recording as confirmed
					// or as absent; the existing stored value is preserved.
					return;
				}

				if (present) {
					result.confirmed++;
					botGuildMap.get(botId)?.add(serverId);
					serverBotMap.get(serverId)?.add(botId);
				}
				// present === false → the bot is not there; leave it out of the sets
			})
		);

		const isLastBatch = offset + BATCH_SIZE >= pairs.length;
		if (!isLastBatch) await sleep(BATCH_DELAY_MS);
	}

	// ── 4. Write results back to DB ───────────────────────────────────────────
	if (!dryRun) {
		// Update bot rows (guild_ids)
		await Promise.all(
			[...botGuildMap.entries()].map(async ([botId, guilds]) => {
				// Only write if we actually checked this bot against ≥1 server
				// (i.e. the filter didn't skip it entirely).
				if (!targetBots.includes(botId)) return;

				try {
					await updateBotGuildIds(botId, [...guilds]);
					result.botsUpdated++;
				} catch (err) {
					const msg = err instanceof Error ? err.message : String(err);
					result.errors.push(`updateBotGuildIds(${botId}): ${msg}`);
				}
			})
		);

		// Update server rows (bot_ids)
		await Promise.all(
			[...serverBotMap.entries()].map(async ([serverId, bots]) => {
				if (!targetServers.includes(serverId)) return;

				try {
					await updateServerBotIds(serverId, [...bots]);
					result.serversUpdated++;
				} catch (err) {
					const msg = err instanceof Error ? err.message : String(err);
					result.errors.push(`updateServerBotIds(${serverId}): ${msg}`);
				}
			})
		);
	}

	return result;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export const POST: RequestHandler = async ({ request, url }) => {
	// ── Auth ──────────────────────────────────────────────────────────────────
	const { ok, misconfigured } = validateSecret(request, url);

	if (misconfigured) {
		console.error("[sync-bot-memberships] INTERNAL_SECRET env var is not set.");
		return json(
			{ success: false, error: "Server misconfiguration: INTERNAL_SECRET not set." },
			{ status: 500 }
		);
	}
	if (!ok) {
		return json({ success: false, error: "Unauthorized." }, { status: 401 });
	}

	// ── Discord token ─────────────────────────────────────────────────────────
	const discordToken = (env.DISCORD_TOKEN ?? "").trim();
	if (!discordToken) {
		console.error("[sync-bot-memberships] DISCORD_TOKEN env var is not set.");
		return json(
			{ success: false, error: "Server misconfiguration: DISCORD_TOKEN not set." },
			{ status: 500 }
		);
	}

	// ── Optional filters ──────────────────────────────────────────────────────
	const filterBotId = url.searchParams.get("bot_id")?.trim() || null;
	const filterServerId = url.searchParams.get("server_id")?.trim() || null;
	const dryRun = url.searchParams.get("dry_run") === "1";

	// ── Run ───────────────────────────────────────────────────────────────────
	const startedAt = Date.now();

	console.log(
		`[sync-bot-memberships] Starting sync` +
			(filterBotId ? ` bot_id=${filterBotId}` : "") +
			(filterServerId ? ` server_id=${filterServerId}` : "") +
			(dryRun ? " (dry-run)" : "")
	);

	try {
		const result = await runSync(discordToken, filterBotId, filterServerId, dryRun);
		const durationMs = Date.now() - startedAt;

		console.log(
			`[sync-bot-memberships] Done in ${durationMs}ms - ` +
				`checked=${result.totalChecked} confirmed=${result.confirmed} ` +
				`botsUpdated=${result.botsUpdated} serversUpdated=${result.serversUpdated} ` +
				`errors=${result.errors.length}` +
				(dryRun ? " (dry-run, no writes)" : "")
		);

		if (result.errors.length > 0) {
			console.warn("[sync-bot-memberships] Non-fatal errors:", result.errors);
		}

		return json(
			{
				success: true,
				durationMs,
				dryRun,
				...result
			},
			{ status: 200 }
		);
	} catch (err) {
		const durationMs = Date.now() - startedAt;
		const message = err instanceof Error ? err.message : String(err);
		console.error("[sync-bot-memberships] Unexpected error after", durationMs, "ms:", err);
		return json({ success: false, error: message, durationMs }, { status: 500 });
	}
};
