/**
 * indexnow.ts
 *
 * Shared utility for notifying search engines of page changes via IndexNow.
 *
 * Flow:
 *   1. On any bot/server/emoji change → `queueReindex(url)` inserts a row into
 *      the `PendingReindex` DB table. The URL is the PRIMARY KEY so concurrent
 *      or repeated edits before the cron fires produce exactly one submission.
 *   2. The daily scheduled cron calls `/api/internals/reindex`, which reads all
 *      pending rows, POSTs them to IndexNow, and deletes the rows.
 *
 * This gives Bing "streaming" semantics (only changed URLs, submitted as changes
 * accumulate) rather than a bulk catalog dump.
 *
 * `submitToIndexNow` is kept as an internal helper used only by the reindex
 * endpoint — callers outside this file should use `queueReindex` instead.
 *
 * Configuration:
 *   INDEXNOW_KEY  — env var containing the IndexNow key string.
 *                   The same key must be hosted at /<key>.txt.
 *                   If not set, `submitToIndexNow` silently skips.
 */

import { env } from "$env/dynamic/private";
import { withDb } from "$lib/db";
import { PendingReindex } from "$lib/db/schema";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/IndexNow";
const SITE_HOST = "discord.rovelstars.com";
const SITE_ORIGIN = `https://${SITE_HOST}`;

// ---------------------------------------------------------------------------
// Internal: submit to IndexNow API
// ---------------------------------------------------------------------------

/**
 * POST one or more URLs to the IndexNow API.
 * Fire-and-forget safe: never throws, logs warnings on failure.
 * If INDEXNOW_KEY is not configured, returns immediately.
 */
export async function submitToIndexNow(urls: string | string[]): Promise<void> {
	const key = (env.INDEXNOW_KEY ?? "").trim();
	if (!key) return;

	const urlList = (Array.isArray(urls) ? urls : [urls])
		.map((u) => {
			const trimmed = u.trim();
			if (!trimmed) return null;
			if (trimmed.startsWith("/")) return `${SITE_ORIGIN}${trimmed}`;
			return trimmed;
		})
		.filter((u): u is string => u !== null);

	if (urlList.length === 0) return;

	const keyLocation = `${SITE_ORIGIN}/${key}.txt`;

	try {
		const res = await fetch(INDEXNOW_ENDPOINT, {
			method: "POST",
			headers: {
				"Content-Type": "application/json; charset=utf-8",
				"User-Agent": "discord-list/indexnow"
			},
			body: JSON.stringify({ host: SITE_HOST, key, keyLocation, urlList })
		});

		if (res.ok) {
			console.info(`[indexnow] Submitted ${urlList.length} URL(s) — HTTP ${res.status}`);
		} else {
			const text = await res.text().catch(() => "(unreadable body)");
			console.warn(
				`[indexnow] Submission failed — HTTP ${res.status}: ${text}`,
				`URLs: ${urlList.join(", ")}`
			);
		}
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		console.warn(`[indexnow] Submission error: ${msg}`);
	}
}

// ---------------------------------------------------------------------------
// Public: queue a URL for the next cron flush
// ---------------------------------------------------------------------------

/**
 * Queue a URL to be submitted to IndexNow on the next scheduled cron run.
 * Fire-and-forget: never throws.
 * Duplicate URLs are silently ignored (url is the PRIMARY KEY).
 *
 * @param url  Full URL or relative path (e.g. "/bots/my-slug").
 */
export function queueReindex(url: string): void {
	const fullUrl = url.trim().startsWith("/") ? `${SITE_ORIGIN}${url.trim()}` : url.trim();
	if (!fullUrl) return;

	withDb((db) =>
		db
			.insert(PendingReindex)
			.values({ url: fullUrl, queued_at: new Date().toISOString() })
			.onConflictDoNothing()
	).catch((err) => {
		console.warn("[indexnow] Failed to queue URL for reindex:", err instanceof Error ? err.message : err);
	});
}

// ---------------------------------------------------------------------------
// Convenience helpers for common entity types
// ---------------------------------------------------------------------------

/**
 * Notify IndexNow that a bot page was created or updated.
 * @param slugOrId  The bot's slug (preferred) or numeric ID.
 */
export function notifyBotChanged(slugOrId: string): void {
	queueReindex(`${SITE_ORIGIN}/bots/${encodeURIComponent(slugOrId)}`);
}

/**
 * Notify IndexNow that a server page was created or updated.
 * @param slugOrId  The server's slug (preferred) or numeric guild ID.
 */
export function notifyServerChanged(slugOrId: string): void {
	queueReindex(`${SITE_ORIGIN}/servers/${encodeURIComponent(slugOrId)}`);
}
