/**
 * netlify/functions/settle-rewards.mts
 *
 * Netlify scheduled function - runs once per day (02:00 UTC) to process all
 * outstanding referral rewards for the Rovel Stars platform.
 *
 * What it does in a single run:
 *
 *  Pass 1 - Sign-up rewards (R$100)
 *    Fetches every Referrals row in "payable" status and credits R$100 to the
 *    referrer, then marks the row as "paid".
 *
 *  Pass 2 - Retention & voting milestones
 *    For every referral whose 7-day activity window is still open (or just
 *    closed), evaluates two independent conditions:
 *
 *    A. Retention daily bonus (R$50 × up to 5 days)
 *       If the referred user visited the site on N distinct calendar days
 *       within their first week, and fewer than N daily-bonus milestones have
 *       been paid for this referral, credits R$50 per new eligible day.
 *
 *    B. Vote-20 bonus (R$50 flat, once)
 *       If the referred user voted on >= 20 unique entities within their first
 *       week and the vote_20 milestone has not yet been paid, credits R$50.
 *
 * Design principles:
 *  - Idempotent: every reward check calls milestoneExists() before inserting,
 *    so re-running the function (e.g. after a timeout) never double-credits.
 *  - Non-blocking: errors for a single referral are caught and logged; the
 *    function continues processing all remaining referrals.
 *  - Calls the SvelteKit internal API endpoint rather than importing DB helpers
 *    directly, keeping the Netlify function layer thin and stateless - the
 *    application server owns all business logic and DB access.
 *  - Returns HTTP 200 in all cases so Netlify does not treat a single-batch
 *    error as a function failure and spam the retry queue.
 *
 * Required environment variables (Netlify UI → Site → Environment vars):
 *   INTERNAL_SECRET   - shared secret (same value the SvelteKit app reads)
 *   DOMAIN            - deployed origin, e.g. https://rovelstars.com
 *                       Falls back to the Netlify-injected URL variable.
 *
 * Schedule: daily at 02:00 UTC (quiet period, low user traffic).
 */

import type { Config, Context } from "@netlify/functions";

// ---------------------------------------------------------------------------
// Types mirroring what the internal API returns
// ---------------------------------------------------------------------------

interface SettleResult {
	processed: number;
	signupRewardsPaid: number;
	retentionDaysPaid: number;
	voteMilestonesPaid: number;
	serverBountiesPaid: number;
	skipped: number;
	errors: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build the base URL for internal API calls.
 * Prefers the explicit DOMAIN env-var; falls back to Netlify's own URL var.
 */
function getSiteUrl(): string {
	return (process.env.DOMAIN ?? process.env.URL ?? "").replace(/\/$/, "").trim();
}

/**
 * Return a headers object containing the shared internal secret and a
 * descriptive User-Agent so server logs can identify this caller.
 */
function internalHeaders(secret: string): HeadersInit {
	return {
		"Content-Type": "application/json",
		"X-Internal-Secret": secret,
		"User-Agent": "netlify-scheduled-fn/settle-rewards"
	};
}

/**
 * Perform a POST to an internal SvelteKit API endpoint and return the parsed
 * JSON response body (typed as T).  Throws on network errors or non-2xx
 * responses so the caller can catch and log them per-referral.
 */
async function callInternal<T = unknown>(
	url: string,
	secret: string,
	body: unknown
): Promise<T> {
	const res = await fetch(url, {
		method: "POST",
		headers: internalHeaders(secret),
		body: JSON.stringify(body)
	});

	const text = await res.text();

	if (!res.ok) {
		throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
	}

	try {
		return JSON.parse(text) as T;
	} catch {
		// Some endpoints return plain-text OK; treat as success with no payload.
		return {} as T;
	}
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export default async function handler(_req: Request, _ctx: Context): Promise<Response> {
	const secret = process.env.INTERNAL_SECRET?.trim();
	const siteUrl = getSiteUrl();

	// ── Pre-flight checks ────────────────────────────────────────────────────
	if (!secret) {
		console.error("[settle-rewards] INTERNAL_SECRET is not set - aborting.");
		return new Response("Misconfiguration: INTERNAL_SECRET not set.", { status: 200 });
	}
	if (!siteUrl) {
		console.error("[settle-rewards] DOMAIN (or URL) env-var is not set - aborting.");
		return new Response("Misconfiguration: DOMAIN not set.", { status: 200 });
	}

	const startedAt = Date.now();
	console.log(`[settle-rewards] Run started at ${new Date().toISOString()}`);

	// ── Delegate to the SvelteKit internal endpoint ──────────────────────────
	// All heavy logic (DB queries, fraud checks, milestone creation, balance
	// crediting) lives inside the app server so it can share DB helpers and
	// Drizzle types.  The scheduled function is intentionally a thin HTTP
	// client - it just triggers the run and logs the summary.
	const endpoint = `${siteUrl}/api/internals/settle-rewards`;

	try {
		const result = await callInternal<SettleResult>(endpoint, secret, {
			triggeredBy: "scheduled-fn",
			triggeredAt: new Date().toISOString()
		});

		const durationMs = Date.now() - startedAt;

		console.log(
			`[settle-rewards] Completed in ${durationMs}ms.`,
			JSON.stringify({
				processed: result.processed,
				signupRewardsPaid: result.signupRewardsPaid,
				retentionDaysPaid: result.retentionDaysPaid,
				voteMilestonesPaid: result.voteMilestonesPaid,
				serverBountiesPaid: result.serverBountiesPaid,
				skipped: result.skipped,
				errorCount: result.errors?.length ?? 0
			})
		);

		if (Array.isArray(result.errors) && result.errors.length > 0) {
			console.warn(
				`[settle-rewards] ${result.errors.length} non-fatal error(s) during run:`,
				result.errors.slice(0, 20) // cap log length
			);
		}

		return new Response(JSON.stringify({ ok: true, durationMs, ...result }), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch (err) {
		const durationMs = Date.now() - startedAt;
		const msg = err instanceof Error ? err.message : String(err);
		console.error(`[settle-rewards] Fatal error after ${durationMs}ms:`, msg);
		// Return 200 so Netlify does not retry - a misconfiguration or app-level
		// 500 won't be resolved by immediate retries.
		return new Response(JSON.stringify({ ok: false, error: msg, durationMs }), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	}
}

// ---------------------------------------------------------------------------
// Netlify scheduled-function config
// ---------------------------------------------------------------------------

export const config: Config = {
	/**
	 * Run daily at 02:00 UTC.
	 * Chosen because it falls in the lowest-traffic window for a
	 * Discord-centric platform (most Discord users are in US/EU time zones).
	 *
	 * Cron syntax (UTC): minute  hour  day-of-month  month  day-of-week
	 */
	schedule: "0 2 * * *"
};
