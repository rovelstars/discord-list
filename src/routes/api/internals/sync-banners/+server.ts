/**
 * GET /api/internals/sync-banners
 *
 * Internal endpoint that iterates every bot in the DB, fetches its current
 * banner hash from the Discord API, and writes it to the `bg` column when it
 * differs from the stored value.
 *
 * "Banner" here means the raw hash returned by Discord's GET /users/{id}
 * endpoint (e.g. `a_abc123` or `abc123`). The client-side code already knows
 * how to expand this into a full CDN URL:
 *   https://cdn.discordapp.com/banners/{botId}/{hash}.webp?size=512
 *
 * Bots that have no banner on Discord (`banner: null`) are intentionally left
 * alone - we only write when Discord provides a non-null value, so manually
 * set custom `bg` URLs/hashes are preserved for bannerless bots.
 *
 * Security - identical to other /api/internals/* routes:
 *   1. Header:      X-Internal-Secret: <INTERNAL_SECRET>
 *   2. Query param: ?secret=<INTERNAL_SECRET>
 *
 * Concurrency / rate-limit strategy:
 *   - Bots are fetched in small concurrent batches (BATCH_SIZE) to avoid
 *     opening hundreds of simultaneous connections to Discord.
 *   - A short delay between batches keeps us comfortably within Discord's
 *     REST rate limits (50 req/s global bucket for bots).
 *   - Per-bot Discord fetch errors are recorded as non-fatal warnings and
 *     included in the summary; they never abort the run.
 *
 * Response JSON (200):
 *   {
 *     success: true,
 *     durationMs: number,
 *     totalBots: number,         // rows read from DB
 *     withBanner: number,        // bots Discord returned a banner hash for
 *     updated: number,           // rows where bg was actually changed in DB
 *     skippedNoBanner: number,   // bots with null banner on Discord
 *     skippedUnchanged: number,  // bots whose stored bg already matched
 *     errors: string[]           // non-fatal per-bot error messages
 *   }
 */

import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { withDb, type DrizzleDb } from "$lib/db";
import { Bots } from "$lib/db/schema";
import { eq } from "drizzle-orm";
import { fetchDiscordBotUser } from "$lib/bot-refresh";

// ---------------------------------------------------------------------------
// Tuning constants
// ---------------------------------------------------------------------------

/** How many bots to fetch from Discord concurrently per batch. */
const BATCH_SIZE = 5;

/** Milliseconds to wait between batches to stay within Discord rate limits. */
const BATCH_DELAY_MS = 1_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SyncBannersResult {
	totalBots: number;
	withBanner: number;
	updated: number;
	skippedNoBanner: number;
	skippedUnchanged: number;
	errors: string[];
}

interface BotRow {
	id: string;
	bg: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fetch every bot id + current bg from the DB. Cheap two-column SELECT. */
async function fetchAllBots(): Promise<BotRow[]> {
	const rows = (await withDb((db: DrizzleDb) =>
		db.select({ id: Bots.id, bg: Bots.bg }).from(Bots)
	)) as BotRow[];
	return rows.map((r) => ({ id: String(r.id), bg: r.bg ?? null }));
}

/** Write a new bg hash/URL to a single bot row. */
async function updateBotBg(botId: string, newBg: string): Promise<void> {
	await withDb((db: DrizzleDb) => db.update(Bots).set({ bg: newBg }).where(eq(Bots.id, botId)));
}

// ---------------------------------------------------------------------------
// Core sync logic
// ---------------------------------------------------------------------------

async function runBannerSync(discordToken: string): Promise<SyncBannersResult> {
	const result: SyncBannersResult = {
		totalBots: 0,
		withBanner: 0,
		updated: 0,
		skippedNoBanner: 0,
		skippedUnchanged: 0,
		errors: []
	};

	// ------------------------------------------------------------------
	// Step 1: Load all bot rows from DB (single cheap SELECT).
	// ------------------------------------------------------------------
	const bots = await fetchAllBots();
	result.totalBots = bots.length;

	if (bots.length === 0) {
		return result;
	}

	// ------------------------------------------------------------------
	// Step 2: Process in batches - fetch banner from Discord, diff, write.
	// ------------------------------------------------------------------
	for (let offset = 0; offset < bots.length; offset += BATCH_SIZE) {
		const batch = bots.slice(offset, offset + BATCH_SIZE);

		await Promise.all(
			batch.map(async (bot) => {
				try {
					const discordUser = await fetchDiscordBotUser(bot.id, discordToken);

					// Discord returns null banner for bots that have no banner set.
					// Leave the existing bg value untouched - it may be a custom URL
					// or a manually set hash the owner provided.
					if (!discordUser.banner) {
						result.skippedNoBanner++;
						return;
					}

					result.withBanner++;

					// Skip the DB write when the hash is already up to date.
					if (discordUser.banner === bot.bg) {
						result.skippedUnchanged++;
						return;
					}

					await updateBotBg(bot.id, discordUser.banner);
					result.updated++;

					console.log(
						`[sync-banners] Updated bg for bot ${bot.id}: "${bot.bg ?? "null"}" → "${discordUser.banner}"`
					);
				} catch (err: any) {
					const status = err?.status ?? "?";
					const message = err instanceof Error ? err.message : String(err);
					result.errors.push(`bot ${bot.id}: HTTP ${status} - ${message}`);
				}
			})
		);

		// Throttle between batches - skip the delay after the last batch.
		const isLastBatch = offset + BATCH_SIZE >= bots.length;
		if (!isLastBatch) {
			await sleep(BATCH_DELAY_MS);
		}
	}

	return result;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export const GET: RequestHandler = async ({ request, url }) => {
	// ------------------------------------------------------------------
	// Auth (mirrors all other /api/internals/* routes)
	// ------------------------------------------------------------------
	const internalSecret = (env.INTERNAL_SECRET ?? "").trim();

	if (!internalSecret) {
		console.error("[sync-banners] INTERNAL_SECRET env var is not set.");
		return json(
			{ success: false, error: "Server misconfiguration: INTERNAL_SECRET not set." },
			{ status: 500 }
		);
	}

	const suppliedSecret = (
		request.headers.get("X-Internal-Secret") ??
		url.searchParams.get("secret") ??
		""
	).trim();

	if (!suppliedSecret || suppliedSecret !== internalSecret) {
		return json({ success: false, error: "Unauthorized." }, { status: 401 });
	}

	// ------------------------------------------------------------------
	// Required env vars
	// ------------------------------------------------------------------
	const discordToken = (env.DISCORD_TOKEN ?? "").trim();

	if (!discordToken) {
		console.error("[sync-banners] DISCORD_TOKEN env var is not set.");
		return json(
			{ success: false, error: "Server misconfiguration: DISCORD_TOKEN not set." },
			{ status: 500 }
		);
	}

	// ------------------------------------------------------------------
	// Run
	// ------------------------------------------------------------------
	const startedAt = Date.now();
	console.log("[sync-banners] Starting banner sync…");

	try {
		const result = await runBannerSync(discordToken);
		const durationMs = Date.now() - startedAt;

		console.log(
			`[sync-banners] Done in ${durationMs}ms. ` +
				`total=${result.totalBots} ` +
				`withBanner=${result.withBanner} ` +
				`updated=${result.updated} ` +
				`skippedNoBanner=${result.skippedNoBanner} ` +
				`skippedUnchanged=${result.skippedUnchanged} ` +
				`errors=${result.errors.length}`
		);

		if (result.errors.length > 0) {
			console.warn("[sync-banners] Non-fatal errors:", result.errors);
		}

		return json({ success: true, durationMs, ...result }, { status: 200 });
	} catch (err) {
		const durationMs = Date.now() - startedAt;
		const message = err instanceof Error ? err.message : String(err);
		console.error("[sync-banners] Unexpected error after", durationMs, "ms:", err);
		return json({ success: false, error: message, durationMs }, { status: 500 });
	}
};
