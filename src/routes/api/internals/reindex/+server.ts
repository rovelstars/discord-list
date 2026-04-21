/**
 * GET /api/internals/reindex
 *
 * Internal endpoint that submits a rolling batch of canonical URLs to the
 * IndexNow API so search engines re-crawl them. Used during SEO recovery to
 * keep sustained "freshness" signals flowing without looking spammy.
 *
 * Default behaviour (no query params):
 *   Picks a deterministic daily slice of the full catalog (static pages +
 *   every bot + every server) and submits it. The slice advances by one
 *   each day (based on days-since-epoch), so the entire catalog is covered
 *   every ceil(total / BATCH_SIZE) days, then rotates.
 *
 * Query overrides:
 *   ?all=1         — submit the entire catalog in one run (chunked at 10k
 *                    for IndexNow's per-request limit). Useful for a one-shot
 *                    push immediately after a major SEO change.
 *   ?batch=<n>     — force a specific rolling-batch index (0..totalBatches-1)
 *                    instead of today's.
 *
 * Security (same pattern as other /api/internals endpoints):
 *   X-Internal-Secret header (scheduled function) OR ?secret=<val> query param
 *   must match env.INTERNAL_SECRET.
 *
 * Required env vars:
 *   INTERNAL_SECRET  — shared secret with the Netlify scheduled function.
 *   INDEXNOW_KEY     — IndexNow key. If missing, submitToIndexNow silently
 *                      skips, so this endpoint still returns 200 with a
 *                      "skipped" flag in the response.
 */

import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { submitToIndexNow } from "$lib/indexnow";
import { getAllBotSlugs, getAllServerSlugs } from "$lib/db/queries";

const SITE_ORIGIN = "https://discord.rovelstars.com";

// One day's rolling batch. With ~3-5k total URLs this rotates through the
// full catalog in 3-5 days, which is well below IndexNow's soft 10k/day
// guidance and feels like organic freshness rather than a bulk dump.
const BATCH_SIZE = 1000;

// IndexNow accepts at most 10,000 URLs per request. Chunk defensively so
// `?all=1` on a huge catalog still succeeds.
const INDEXNOW_CHUNK = 10_000;

function buildCanonicalUrls(
	bots: { slug: string }[],
	servers: { id: string; slug: string | null }[]
): string[] {
	// Highest-priority static pages — keep in sync with sitemap.xml. We
	// deliberately omit /bots?lucky (noindex'd) and low-value pages like
	// /about, /privacy, /terms, /docs.
	const staticPaths = [
		"/",
		"/bots",
		"/bots?new",
		"/bots?trending",
		"/servers",
		"/servers?new",
		"/servers?trending",
		"/emojis",
		"/stickers",
		"/categories",
		"/top",
		"/new"
	];

	const statics = staticPaths.map((p) => `${SITE_ORIGIN}${p}`);
	const botUrls = bots
		.filter((b) => b.slug)
		.map((b) => `${SITE_ORIGIN}/bots/${encodeURIComponent(b.slug)}`);
	const serverUrls = servers.map(
		(s) => `${SITE_ORIGIN}/servers/${encodeURIComponent(s.slug ?? s.id)}`
	);

	return [...statics, ...botUrls, ...serverUrls];
}

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

	const [bots, servers] = await Promise.all([getAllBotSlugs(), getAllServerSlugs()]);
	const allUrls = buildCanonicalUrls(bots, servers);

	const totalBatches = Math.max(1, Math.ceil(allUrls.length / BATCH_SIZE));
	const full = url.searchParams.get("all") === "1";

	let batchIndex: number;
	let batch: string[];

	if (full) {
		batchIndex = -1;
		batch = allUrls;
	} else {
		// Day-based rotation: days-since-epoch mod totalBatches. Monotonic,
		// survives year boundaries, no persisted state needed.
		const dayNum = Math.floor(Date.now() / 86_400_000);
		const override = url.searchParams.get("batch");
		batchIndex =
			override !== null ? ((parseInt(override, 10) || 0) + totalBatches) % totalBatches : dayNum % totalBatches;
		batch = allUrls.slice(batchIndex * BATCH_SIZE, (batchIndex + 1) * BATCH_SIZE);
	}

	const indexNowConfigured = !!(env.INDEXNOW_KEY ?? "").trim();
	let submitted = 0;

	if (indexNowConfigured) {
		for (let i = 0; i < batch.length; i += INDEXNOW_CHUNK) {
			const slice = batch.slice(i, i + INDEXNOW_CHUNK);
			await submitToIndexNow(slice);
			submitted += slice.length;
		}
	}

	const durationMs = Date.now() - startedAt;
	const summary = {
		success: true,
		skipped: !indexNowConfigured,
		mode: full ? "full" : "rolling",
		totalCatalog: allUrls.length,
		totalBatches,
		batchIndex,
		batchSize: batch.length,
		submitted,
		durationMs
	};

	console.log(`[reindex] ${JSON.stringify(summary)}`);

	return json(summary, { status: 200 });
};
