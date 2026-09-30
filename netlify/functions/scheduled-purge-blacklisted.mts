/**
 * netlify/functions/scheduled-purge-blacklisted.mts
 *
 * Netlify scheduled function that pings the internal
 * /api/internals/purge-blacklisted-bots endpoint once a day. That endpoint
 * permanently deletes bots that have been blacklisted (owner-requested deletion)
 * for at least 7 days; within that window owners can still restore them.
 *
 * Schedule: daily at 03:00 UTC — sits between settle-rewards (02:00 UTC) and
 * reindex (04:00 UTC), inside the low-traffic window.
 *
 * Required environment variables (Netlify UI → Site → Environment vars):
 *   INTERNAL_SECRET  - shared secret (same value the SvelteKit app reads)
 *   DOMAIN           - deployed origin, e.g. https://discord.rovelstars.com
 *                      Falls back to the Netlify-injected URL variable.
 */

import type { Config, Context } from "@netlify/functions";

export default async function handler(_req: Request, _ctx: Context): Promise<Response> {
	const secret = process.env.INTERNAL_SECRET?.trim();
	const siteUrl = (process.env.DOMAIN ?? process.env.URL ?? "").replace(/\/$/, "").trim();

	if (!secret) {
		console.error("[scheduled-purge-blacklisted] INTERNAL_SECRET is not set - aborting.");
		return new Response("Misconfiguration: INTERNAL_SECRET not set.", { status: 200 });
	}
	if (!siteUrl) {
		console.error("[scheduled-purge-blacklisted] DOMAIN (or URL) is not set - aborting.");
		return new Response("Misconfiguration: DOMAIN not set.", { status: 200 });
	}

	const endpoint = `${siteUrl}/api/internals/purge-blacklisted-bots`;
	const startedAt = Date.now();

	try {
		const res = await fetch(endpoint, {
			method: "GET",
			headers: {
				"X-Internal-Secret": secret,
				"User-Agent": "netlify-scheduled-fn/scheduled-purge-blacklisted"
			}
		});

		const durationMs = Date.now() - startedAt;
		const body = await res.text();

		if (!res.ok) {
			console.error(
				`[scheduled-purge-blacklisted] Endpoint returned HTTP ${res.status} after ${durationMs}ms:`,
				body
			);
			return new Response(`Endpoint error ${res.status}`, { status: 200 });
		}

		try {
			const result = JSON.parse(body);
			console.log(
				`[scheduled-purge-blacklisted] Completed in ${durationMs}ms.`,
				JSON.stringify(result)
			);
		} catch {
			console.log(`[scheduled-purge-blacklisted] Response (${durationMs}ms):`, body);
		}

		return new Response("OK", { status: 200 });
	} catch (err) {
		const durationMs = Date.now() - startedAt;
		const msg = err instanceof Error ? err.message : String(err);
		console.error(`[scheduled-purge-blacklisted] fetch() threw after ${durationMs}ms:`, msg);
		return new Response("Fetch error - see logs.", { status: 200 });
	}
}

export const config: Config = {
	// minute hour day-of-month month day-of-week (UTC)
	schedule: "0 3 * * *"
};
