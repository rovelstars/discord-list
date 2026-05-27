/**
 * GET /api/internals/reindex
 *
 * Internal endpoint that flushes all URLs queued in the `PendingReindex` table
 * to the IndexNow API, then deletes the flushed rows.
 *
 * URLs land in `PendingReindex` whenever a bot, server, or emoji is created or
 * updated (via `queueReindex()` in `$lib/indexnow.ts`). Using the URL as the
 * PRIMARY KEY means multiple edits to the same page before this cron fires
 * produce exactly one IndexNow submission.
 *
 * Security (same pattern as other /api/internals endpoints):
 *   X-Internal-Secret header OR ?secret=<val> query param must match
 *   env.INTERNAL_SECRET.
 *
 * Response JSON:
 *   200  { success: true, queued, submitted, skipped, durationMs }
 *   401  { success: false, error: 'Unauthorized.' }
 *   500  { success: false, error: string }
 */

import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { submitToIndexNow } from "$lib/indexnow";
import { withDb } from "$lib/db";
import { PendingReindex } from "$lib/db/schema";

// IndexNow accepts at most 10,000 URLs per request.
const INDEXNOW_CHUNK = 10_000;

export const GET: RequestHandler = async ({ request, url }) => {
	const internalSecret = (env.INTERNAL_SECRET ?? "").trim();
	if (!internalSecret) {
		console.error("[reindex] INTERNAL_SECRET env var is not set.");
		return json(
			{ success: false, error: "Server misconfiguration: INTERNAL_SECRET not set." },
			{ status: 500 }
		);
	}

	const supplied = (
		request.headers.get("X-Internal-Secret") ??
		url.searchParams.get("secret") ??
		""
	).trim();
	if (!supplied || supplied !== internalSecret) {
		return json({ success: false, error: "Unauthorized." }, { status: 401 });
	}

	const startedAt = Date.now();

	// Fetch all pending URLs.
	const rows = await withDb((db) => db.select({ url: PendingReindex.url }).from(PendingReindex));
	const queued = rows.length;

	if (queued === 0) {
		return json({ success: true, queued: 0, submitted: 0, skipped: false, durationMs: Date.now() - startedAt });
	}

	const urlList = rows.map((r) => r.url);
	const indexNowConfigured = !!(env.INDEXNOW_KEY ?? "").trim();
	let submitted = 0;

	if (indexNowConfigured) {
		for (let i = 0; i < urlList.length; i += INDEXNOW_CHUNK) {
			await submitToIndexNow(urlList.slice(i, i + INDEXNOW_CHUNK));
			submitted += Math.min(INDEXNOW_CHUNK, urlList.length - i);
		}
	}

	// Delete the flushed rows regardless of indexNowConfigured so the queue
	// doesn't grow unbounded in environments where the key isn't set.
	await withDb((db) => db.delete(PendingReindex));

	const summary = {
		success: true,
		skipped: !indexNowConfigured,
		queued,
		submitted,
		durationMs: Date.now() - startedAt
	};

	console.log(`[reindex] ${JSON.stringify(summary)}`);

	return json(summary, { status: 200 });
};
