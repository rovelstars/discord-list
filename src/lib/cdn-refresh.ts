/**
 * cdn-refresh.ts
 *
 * Core logic for detecting and refreshing stale/invalid Discord CDN attachment
 * URLs stored in the `bot.bg` column of the Bots table.
 *
 * ## What counts as "invalid"?
 *
 * A Discord CDN URL is considered invalid (needs refresh) when it meets ALL of:
 *   1. It starts with https://cdn.discordapp.com/attachments/  (it's a CDN attachment)
 *   2. It carries signed query params (ex, is, hm) — unsigned URLs never expire
 *      and therefore never need refreshing.
 *   3. The `ex` (Unix timestamp hex, seconds) is in the past → the token is expired.
 *
 * A URL is left alone (not refreshed) when:
 *   - It is null / empty.
 *   - It is not a Discord CDN attachment URL (could be an external image, keep it).
 *   - It IS a Discord CDN attachment URL but has NO ex/is/hm params → it is a
 *     permanent (unsigned) URL and will never expire.
 *   - It has ex/is/hm but the expiry is still in the future.
 *
 * ## Efficiency notes
 *
 *   - Single DB read: only the `id` and `bg` columns are fetched (no joins, no extra cols).
 *   - All classification is done purely in memory — no network requests to Discord CDN.
 *   - A single POST to Discord's refresh-urls endpoint covers up to 50 URLs per call
 *     (Discord's documented batch limit). We batch automatically.
 *   - Only rows that receive a new URL are written back — one UPDATE per changed row
 *     (Turso/libSQL does not support bulk multi-value UPDATE in a single statement
 *     through Drizzle, so we fire individual updates; each is tiny and only done when
 *     truly necessary).
 */

import { withDb } from "$lib/db";
import { Bots } from "$lib/db/schema";
import { isNotNull, isNull, not, like, or } from "drizzle-orm";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal row shape fetched from the DB — keeps the read cheap. */
interface BotBgRow {
	id: string;
	bg: string | null;
}

/** A CDN URL that has been classified as needing a refresh. */
interface InvalidCdnEntry {
	/** Bot's primary-key id in the Bots table. */
	botId: string;
	/** The stale/expired CDN URL currently stored in the DB. */
	url: string;
}

/** One element returned by Discord's refresh-urls endpoint. */
interface DiscordRefreshedUrl {
	original: string;
	refreshed: string;
}

/** Shape of the Discord refresh-urls response body. */
interface DiscordRefreshResponse {
	refreshed_urls: DiscordRefreshedUrl[];
}

/** Summary returned to the caller (API route / scheduled function). */
export interface CdnRefreshResult {
	/** Total bots that had a non-null bg column. */
	totalWithBg: number;
	/** Bots whose bg is a Discord CDN URL (with or without signed params). */
	totalCdnUrls: number;
	/** CDN URLs that were permanent (no ex/is/hm) and skipped. */
	permanentUrls: number;
	/** CDN URLs that were signed but not yet expired — skipped. */
	validSignedUrls: number;
	/** CDN URLs that were expired (or expiry unreadable) — sent for refresh. */
	invalidUrls: number;
	/** URLs successfully refreshed by Discord. */
	refreshed: number;
	/** Rows actually written back to the DB. */
	dbUpdates: number;
	/** Any non-fatal errors encountered during the run. */
	errors: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DISCORD_CDN_ATTACHMENT_PREFIX = "https://cdn.discordapp.com/attachments/";

/** Discord's hard batch limit for the refresh-urls endpoint. */
const DISCORD_REFRESH_BATCH_SIZE = 50;

// ---------------------------------------------------------------------------
// URL classification helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when `url` is a Discord CDN attachment URL (the only kind the
 * refresh endpoint supports).
 */
function isDiscordCdnAttachment(url: string): boolean {
	return url.startsWith(DISCORD_CDN_ATTACHMENT_PREFIX);
}

/**
 * Parse the query-string of a URL and return the values for the three
 * signed-URL params: ex (expiry, hex seconds), is (issued-at, hex seconds),
 * and hm (HMAC signature).
 *
 * Returns null for any param that is absent.
 */
function parseSignedParams(url: string): {
	ex: string | null;
	is: string | null;
	hm: string | null;
} {
	try {
		// Use URL constructor — handles relative paths gracefully by ignoring them
		// (they won't start with https:// so they're already filtered above).
		const parsed = new URL(url);
		return {
			ex: parsed.searchParams.get("ex"),
			is: parsed.searchParams.get("is"),
			hm: parsed.searchParams.get("hm")
		};
	} catch {
		// Malformed URL — treat as having no signed params so we skip it.
		return { ex: null, is: null, hm: null };
	}
}

/**
 * Classify a single Discord CDN attachment URL.
 *
 * Returns:
 *  - `'permanent'`  — no signed params → URL never expires, no action needed.
 *  - `'valid'`      — signed params present and expiry is in the future.
 *  - `'invalid'`    — signed params present and URL is expired (or expiry is
 *                     unreadable), needs a refresh.
 */
function classifyCdnUrl(url: string): "permanent" | "valid" | "invalid" {
	const { ex, is, hm } = parseSignedParams(url);

	// Permanent URL: all three params must be absent.
	// (Partially-signed URLs with only some params are treated as invalid to
	//  be safe — Discord requires all three.)
	if (!ex && !is && !hm) {
		return "permanent";
	}

	// If any of the three required signed params is missing the token is
	// malformed. Treat as invalid so Discord can issue a proper signed URL.
	if (!ex || !is || !hm) {
		return "invalid";
	}

	// ex is a lowercase hex string representing a Unix timestamp in seconds.
	const expirySeconds = parseInt(ex, 16);
	if (Number.isNaN(expirySeconds)) {
		// Unreadable expiry — treat as invalid.
		return "invalid";
	}

	const nowSeconds = Math.floor(Date.now() / 1000);
	return expirySeconds > nowSeconds ? "valid" : "invalid";
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

/**
 * Fetch only the `id` and `bg` columns from every Bots row that has a non-null
 * bg value starting with the Discord CDN prefix.
 *
 * We filter at the DB level (LIKE 'https://cdn.discordapp.com/attachments/%')
 * to avoid transferring rows we would unconditionally skip anyway.
 */
async function fetchCdnBgRows(): Promise<BotBgRow[]> {
	const rows = await withDb((db) =>
		db
			.select({ id: Bots.id, bg: Bots.bg })
			.from(Bots)
			.where(like(Bots.bg, `${DISCORD_CDN_ATTACHMENT_PREFIX}%`))
	);
	return (rows as any[]).map((r) => ({ id: String(r.id), bg: r.bg as string | null }));
}

/**
 * Write a refreshed URL back to a single bot row.
 * Only called when the new URL differs from what is already stored.
 */
async function updateBotBg(botId: string, newBg: string): Promise<void> {
	await withDb((db) => db.update(Bots).set({ bg: newBg }).where(eq(Bots.id, botId)));
}

// ---------------------------------------------------------------------------
// Discord API helper
// ---------------------------------------------------------------------------

/**
 * Call Discord's POST /attachments/refresh-urls endpoint for a batch of URLs.
 *
 * @param urls       Array of CDN URLs to refresh (max 50 per Discord's limit).
 * @param botToken   Bot token (without the "Bot " prefix — we add it here).
 * @returns          Array of { original, refreshed } pairs on success.
 */
async function discordRefreshBatch(
	urls: string[],
	botToken: string
): Promise<DiscordRefreshedUrl[]> {
	const response = await fetch("https://discord.com/api/v9/attachments/refresh-urls", {
		method: "POST",
		headers: {
			Authorization: `Bot ${botToken}`,
			"Content-Type": "application/json"
		},
		body: JSON.stringify({ attachment_urls: urls })
	});

	if (!response.ok) {
		const text = await response.text().catch(() => "(unreadable body)");
		throw new Error(`Discord refresh-urls returned HTTP ${response.status}: ${text}`);
	}

	const data = (await response.json()) as DiscordRefreshResponse;
	return data.refreshed_urls ?? [];
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Run a full CDN bg refresh cycle.
 *
 * Steps:
 *  1. Read all bot rows that have a Discord CDN bg URL (single cheap SELECT).
 *  2. Classify each URL in memory — no network calls to Discord CDN.
 *  3. Collect the invalid/expired ones.
 *  4. Batch-POST them to Discord's refresh-urls endpoint (≤50 per request).
 *  5. For each refreshed URL that actually differs from the stored one, fire
 *     an UPDATE. Only rows that truly changed are written.
 *
 * @param botToken  Discord Bot token (value only, without "Bot " prefix).
 */
export async function runCdnBgRefresh(botToken: string): Promise<CdnRefreshResult> {
	const result: CdnRefreshResult = {
		totalWithBg: 0,
		totalCdnUrls: 0,
		permanentUrls: 0,
		validSignedUrls: 0,
		invalidUrls: 0,
		refreshed: 0,
		dbUpdates: 0,
		errors: []
	};

	// ------------------------------------------------------------------
	// Step 1: Fetch only CDN rows from DB (single read)
	// ------------------------------------------------------------------
	let rows: BotBgRow[];
	try {
		rows = await fetchCdnBgRows();
	} catch (err) {
		result.errors.push(`DB read failed: ${err instanceof Error ? err.message : String(err)}`);
		return result;
	}

	result.totalCdnUrls = rows.length;
	result.totalWithBg = rows.length; // fetchCdnBgRows already pre-filters to CDN URLs only

	// ------------------------------------------------------------------
	// Step 2: Classify each URL in memory
	// ------------------------------------------------------------------
	const invalid: InvalidCdnEntry[] = [];

	for (const row of rows) {
		if (!row.bg) continue; // shouldn't happen after DB filter, but be safe

		const classification = classifyCdnUrl(row.bg);

		if (classification === "permanent") {
			result.permanentUrls++;
		} else if (classification === "valid") {
			result.validSignedUrls++;
		} else {
			// 'invalid' — expired or malformed signed URL
			result.invalidUrls++;
			invalid.push({ botId: row.id, url: row.bg });
		}
	}

	if (invalid.length === 0) {
		// Nothing to do — return early without hitting Discord API at all.
		return result;
	}

	// ------------------------------------------------------------------
	// Step 3: Build a map of url → botId for fast lookup after Discord responds
	// ------------------------------------------------------------------
	// Multiple bots could theoretically share the same bg URL, so we map
	// url → array of botIds.
	const urlToBotIds = new Map<string, string[]>();
	for (const entry of invalid) {
		const existing = urlToBotIds.get(entry.url);
		if (existing) {
			existing.push(entry.botId);
		} else {
			urlToBotIds.set(entry.url, [entry.botId]);
		}
	}

	// Unique URLs to send (deduplication reduces API usage further).
	const uniqueInvalidUrls = Array.from(urlToBotIds.keys());

	// ------------------------------------------------------------------
	// Step 4: Batch-POST to Discord in chunks of DISCORD_REFRESH_BATCH_SIZE
	// ------------------------------------------------------------------
	// Map of original URL → refreshed URL, built from all batch responses.
	const refreshMap = new Map<string, string>();

	for (let i = 0; i < uniqueInvalidUrls.length; i += DISCORD_REFRESH_BATCH_SIZE) {
		const batch = uniqueInvalidUrls.slice(i, i + DISCORD_REFRESH_BATCH_SIZE);
		try {
			const refreshed = await discordRefreshBatch(batch, botToken);
			for (const pair of refreshed) {
				if (pair.original && pair.refreshed) {
					refreshMap.set(pair.original, pair.refreshed);
					result.refreshed++;
				}
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			result.errors.push(`Discord API batch error (offset ${i}): ${msg}`);
			// Continue with remaining batches — partial success is better than none.
		}
	}

	// ------------------------------------------------------------------
	// Step 5: Write changed URLs back to DB (one UPDATE per changed row)
	// ------------------------------------------------------------------
	for (const [originalUrl, refreshedUrl] of refreshMap.entries()) {
		// Skip if Discord returned the same URL (shouldn't happen but guard it).
		if (originalUrl === refreshedUrl) continue;

		const botIds = urlToBotIds.get(originalUrl);
		if (!botIds) continue;

		for (const botId of botIds) {
			try {
				await updateBotBg(botId, refreshedUrl);
				result.dbUpdates++;
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				result.errors.push(`DB update failed for bot ${botId}: ${msg}`);
			}
		}
	}

	return result;
}

// ---------------------------------------------------------------------------
// Exported classification helper (useful for unit tests / other modules)
// ---------------------------------------------------------------------------
export { classifyCdnUrl, isDiscordCdnAttachment, parseSignedParams };
