/**
 * netlify/functions/scheduled-reindex.mts
 *
 * Netlify scheduled function that pings the internal /api/internals/reindex
 * endpoint once a day. The endpoint picks a deterministic daily slice of
 * the canonical URL catalog and submits it to IndexNow, so search engines
 * keep re-crawling our pages during (and after) the SEO recovery period.
 *
 * Schedule: daily at 04:00 UTC — runs after settle-rewards (02:00 UTC) so
 * the DB is quiet and doesn't compete with heavier nightly work.
 *
 * Required environment variables (Netlify UI → Site → Environment vars):
 *   INTERNAL_SECRET  - shared secret (same value the SvelteKit app reads)
 *   DOMAIN           - deployed origin, e.g. https://discord.rovelstars.com
 *                      Falls back to the Netlify-injected URL variable.
 *
 * The endpoint itself checks INDEXNOW_KEY and silently skips if unset, so
 * this function does not need to gate on it.
 */

import type { Config, Context } from "@netlify/functions";

export default async function handler(_req: Request, _ctx: Context): Promise<Response> {
	const secret = process.env.INTERNAL_SECRET?.trim();
	const siteUrl = (process.env.DOMAIN ?? process.env.URL ?? "").replace(/\/$/, "").trim();

	if (!secret) {
		console.error("[scheduled-reindex] INTERNAL_SECRET is not set - aborting.");
		return new Response("Misconfiguration: INTERNAL_SECRET not set.", { status: 200 });
	}
	if (!siteUrl) {
		console.error("[scheduled-reindex] DOMAIN (or URL) is not set - aborting.");
		return new Response("Misconfiguration: DOMAIN not set.", { status: 200 });
	}

	const endpoint = `${siteUrl}/api/internals/reindex`;
	const startedAt = Date.now();

	try {
		const res = await fetch(endpoint, {
			method: "GET",
			headers: {
				"X-Internal-Secret": secret,
				"User-Agent": "netlify-scheduled-fn/scheduled-reindex"
			}
		});

		const durationMs = Date.now() - startedAt;
		const body = await res.text();

		if (!res.ok) {
			console.error(
				`[scheduled-reindex] Endpoint returned HTTP ${res.status} after ${durationMs}ms:`,
				body
			);
			return new Response(`Endpoint error ${res.status}`, { status: 200 });
		}

		try {
			const result = JSON.parse(body);
			console.log(`[scheduled-reindex] Completed in ${durationMs}ms.`, JSON.stringify(result));
		} catch {
			console.log(`[scheduled-reindex] Response (${durationMs}ms):`, body);
		}

		return new Response("OK", { status: 200 });
	} catch (err) {
		const durationMs = Date.now() - startedAt;
		const msg = err instanceof Error ? err.message : String(err);
		console.error(`[scheduled-reindex] fetch() threw after ${durationMs}ms:`, msg);
		return new Response("Fetch error - see logs.", { status: 200 });
	}
}

export const config: Config = {
	/**
	 * Cron syntax (UTC): minute  hour  day-of-month  month  day-of-week
	 *
	 * 04:00 UTC chosen so this run doesn't overlap the 02:00 UTC
	 * settle-rewards pass, and sits inside the 00:00-06:00 UTC low-traffic
	 * window for a Discord-centric audience.
	 */
	schedule: "0 4 * * *"
};
