/**
 * netlify/functions/scheduled-cdn-refresh.mts
 *
 * Netlify scheduled function that periodically triggers the CDN bg refresh
 * cycle by calling the internal SvelteKit API endpoint.
 *
 * Schedule: every 12 hours (Discord signed URLs have a 24-hour TTL by default,
 * so running twice a day guarantees no URL is ever shown expired on the site).
 *
 * How it works on Netlify free tier:
 *   - Netlify Scheduled Functions are built on top of Background Functions.
 *   - They run serverlessly on Netlify's infrastructure on the given cron
 *     schedule, completely independent of incoming web traffic — the site stays
 *     up the entire time.
 *   - The free tier includes 125,000 function invocations / month and
 *     background function runtime up to 15 minutes per invocation, both of
 *     which are far more than enough for this task.
 *
 * Required environment variables (set in Netlify UI → Site → Environment vars):
 *   INTERNAL_SECRET   — shared secret, must match the one the SvelteKit app reads
 *   SITE_URL          — your deployed site origin, e.g. https://yoursite.netlify.app
 *                       (Netlify also exposes URL / DEPLOY_URL automatically, but
 *                        we read our own SITE_URL so staging deploys don't
 *                        accidentally call production, and vice-versa)
 */

import type { Config, Context } from '@netlify/functions';

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(_req: Request, _ctx: Context): Promise<Response> {
	const secret = process.env.INTERNAL_SECRET?.trim();
	const siteUrl = (process.env.DOMAIN ?? process.env.URL ?? '').replace(/\/$/, '').trim();

	// ------------------------------------------------------------------
	// Guard: both vars must be present or we refuse to run and log clearly.
	// ------------------------------------------------------------------
	if (!secret) {
		console.error('[scheduled-cdn-refresh] INTERNAL_SECRET is not set — aborting.');
		// Return 200 so Netlify doesn't keep retrying a permanent misconfiguration.
		return new Response('Misconfiguration: INTERNAL_SECRET not set.', { status: 200 });
	}

	if (!siteUrl) {
		console.error('[scheduled-cdn-refresh] DOMAIN (or URL) is not set — aborting.');
		return new Response('Misconfiguration: DOMAIN not set.', { status: 200 });
	}

	const endpoint = `${siteUrl}/api/internals/refresh-cdn-bgs`;
	console.log(`[scheduled-cdn-refresh] Calling ${endpoint} …`);

	const startedAt = Date.now();

	try {
		const response = await fetch(endpoint, {
			method: 'GET',
			headers: {
				'X-Internal-Secret': secret,
				// Identify this caller in server logs for easier tracing.
				'User-Agent': 'netlify-scheduled-fn/scheduled-cdn-refresh'
			}
		});

		const durationMs = Date.now() - startedAt;
		const body = await response.text();

		if (!response.ok) {
			console.error(
				`[scheduled-cdn-refresh] Endpoint returned HTTP ${response.status} after ${durationMs}ms:`,
				body
			);
			// Still return 200 to Netlify — the error is logged, retrying immediately
			// won't help if the site itself returned a 4xx/5xx.
			return new Response(`Endpoint error ${response.status}: ${body}`, { status: 200 });
		}

		// Parse and pretty-print the result summary for the function log.
		try {
			const result = JSON.parse(body);
			console.log(
				`[scheduled-cdn-refresh] Completed in ${durationMs}ms.`,
				JSON.stringify({
					totalCdnUrls: result.totalCdnUrls,
					permanentUrls: result.permanentUrls,
					validSignedUrls: result.validSignedUrls,
					invalidUrls: result.invalidUrls,
					refreshed: result.refreshed,
					dbUpdates: result.dbUpdates,
					errors: result.errors?.length ?? 0
				})
			);

			if (Array.isArray(result.errors) && result.errors.length > 0) {
				console.warn(
					'[scheduled-cdn-refresh] Non-fatal errors reported by endpoint:',
					result.errors
				);
			}
		} catch {
			// Body wasn't JSON — log as-is and move on.
			console.log(`[scheduled-cdn-refresh] Response (${durationMs}ms):`, body);
		}

		return new Response('OK', { status: 200 });
	} catch (err) {
		const durationMs = Date.now() - startedAt;
		console.error(
			`[scheduled-cdn-refresh] fetch() threw after ${durationMs}ms:`,
			err instanceof Error ? err.message : String(err)
		);
		return new Response('Fetch error — see logs.', { status: 200 });
	}
}

// ---------------------------------------------------------------------------
// Netlify scheduled-function config
// ---------------------------------------------------------------------------

export const config: Config = {
	/**
	 * Run every 12 hours at minute 0.
	 * Discord signed URLs have a ~24-hour TTL, so this gives a comfortable
	 * 2× safety margin without hammering the DB or Discord API.
	 *
	 * Cron syntax (UTC): minute  hour  day-of-month  month  day-of-week
	 */
	schedule: '0 */12 * * *'
};
