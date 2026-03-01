/**
 * GET /api/internals/refresh-cdn-bgs
 *
 * Internal endpoint that triggers a full CDN background-URL refresh cycle.
 *
 * Security — the secret is accepted from either of two sources (checked in order):
 *   1. Header:        X-Internal-Secret: <INTERNAL_SECRET>
 *      Used by the Netlify scheduled function (can't set query params on cron calls).
 *   2. Query param:   ?secret=<INTERNAL_SECRET>
 *      Convenient for manual browser-triggered runs, e.g.:
 *        https://yoursite.com/api/internals/refresh-cdn-bgs?secret=YOUR_SECRET
 *
 * Designed to be called by the Netlify scheduled function
 * (`netlify/functions/scheduled-cdn-refresh.mts`) on a cron schedule, but can
 * also be hit manually for ad-hoc runs or local testing.
 *
 * Response (JSON):
 *   On success → 200 with a CdnRefreshResult summary object.
 *   On auth failure → 401.
 *   On missing Discord token → 500.
 *   On unexpected error → 500.
 */

import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { runCdnBgRefresh } from "$lib/cdn-refresh";

export const GET: RequestHandler = async ({ request, url }) => {
	// ------------------------------------------------------------------
	// Auth: compare the X-Internal-Secret header against the stored secret.
	// Both values are trimmed so trailing newlines in env vars don't bite us.
	// ------------------------------------------------------------------
	const internalSecret = (env.INTERNAL_SECRET ?? "").trim();

	if (!internalSecret) {
		// Misconfiguration — refuse to run without a secret so the endpoint is
		// never accidentally left open.
		console.error("[refresh-cdn-bgs] INTERNAL_SECRET env var is not set.");
		return json(
			{ success: false, error: "Server misconfiguration: INTERNAL_SECRET not set." },
			{ status: 500 }
		);
	}

	// Accept the secret from the header (scheduled function) or query param (manual browser run).
	const suppliedSecret = (
		request.headers.get("X-Internal-Secret") ??
		url.searchParams.get("secret") ??
		""
	).trim();

	if (!suppliedSecret || suppliedSecret !== internalSecret) {
		return json({ success: false, error: "Unauthorized." }, { status: 401 });
	}

	// ------------------------------------------------------------------
	// Require a Discord Bot token.
	// We read DISCORD_TOKEN (the same var used elsewhere in the project).
	// ------------------------------------------------------------------
	const discordToken = (env.DISCORD_TOKEN ?? "").trim();

	if (!discordToken) {
		console.error("[refresh-cdn-bgs] DISCORD_TOKEN env var is not set.");
		return json(
			{ success: false, error: "Server misconfiguration: DISCORD_TOKEN not set." },
			{ status: 500 }
		);
	}

	// ------------------------------------------------------------------
	// Run the refresh cycle.
	// ------------------------------------------------------------------
	const startedAt = Date.now();
	console.log("[refresh-cdn-bgs] Starting CDN bg refresh cycle…");

	try {
		const result = await runCdnBgRefresh(discordToken);

		const durationMs = Date.now() - startedAt;

		console.log(
			`[refresh-cdn-bgs] Done in ${durationMs}ms. ` +
				`cdnUrls=${result.totalCdnUrls} ` +
				`permanent=${result.permanentUrls} ` +
				`validSigned=${result.validSignedUrls} ` +
				`invalid=${result.invalidUrls} ` +
				`refreshed=${result.refreshed} ` +
				`dbUpdates=${result.dbUpdates} ` +
				`errors=${result.errors.length}`
		);

		if (result.errors.length > 0) {
			console.warn("[refresh-cdn-bgs] Non-fatal errors:", result.errors);
		}

		return json(
			{
				success: true,
				durationMs,
				...result
			},
			{ status: 200 }
		);
	} catch (err) {
		const durationMs = Date.now() - startedAt;
		const message = err instanceof Error ? err.message : String(err);
		console.error("[refresh-cdn-bgs] Unexpected error after", durationMs, "ms:", err);
		return json(
			{
				success: false,
				error: message,
				durationMs
			},
			{ status: 500 }
		);
	}
};
