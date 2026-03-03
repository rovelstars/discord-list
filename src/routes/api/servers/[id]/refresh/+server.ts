import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { refreshServer, NotFoundError } from "$lib/server-refresh";

// ---------------------------------------------------------------------------
// Simple in-memory rate limiter
// Prevents the same server from being refreshed more than once per 10 minutes
// from the public endpoint.
// ---------------------------------------------------------------------------

const RATE_LIMIT_MS = 10 * 60 * 1000; // 10 minutes
const lastRefreshAt = new Map<string, number>();

function isRateLimited(serverId: string): boolean {
	const last = lastRefreshAt.get(serverId);
	if (last == null) return false;
	return Date.now() - last < RATE_LIMIT_MS;
}

function markRefreshed(serverId: string): void {
	lastRefreshAt.set(serverId, Date.now());
	// Evict stale entries to keep the map from growing forever.
	if (lastRefreshAt.size > 500) {
		const cutoff = Date.now() - RATE_LIMIT_MS;
		for (const [id, ts] of lastRefreshAt.entries()) {
			if (ts < cutoff) lastRefreshAt.delete(id);
		}
	}
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * POST /api/servers/[id]/refresh
 *
 * Public-facing endpoint that the server page calls (fire-and-forget) when it
 * detects the guild snapshot is stale. Returns immediately with the result;
 * the page can use it to decide whether to soft-reload.
 *
 * Security model:
 *   - No secret required from the client — this is a public route.
 *   - DISCORD_TOKEN is read server-side only and never exposed to the browser.
 *   - Per-server rate limiting (10 min window) prevents abuse.
 *   - Only servers that already exist in the DB can be refreshed.
 *   - The refresh lib itself has a built-in minAgeMs stale guard (pass 0 to
 *     the lib so the rate limiter here is the only gate).
 *
 * Response JSON:
 *   200  { success: true,  serverId, updated, skipped, changes, partialError? }
 *   400  { success: false, error: 'missing_id' }
 *   404  { success: false, error: 'server_not_found' }
 *   429  { success: false, error: 'rate_limited', retryAfterMs: number }
 *   500  { success: false, error: string }
 */
export const POST: RequestHandler = async ({ params }) => {
	// ------------------------------------------------------------------
	// Param validation
	// ------------------------------------------------------------------
	const serverId = params.id?.trim();
	if (!serverId) {
		return json({ success: false, error: "missing_id" }, { status: 400 });
	}

	// ------------------------------------------------------------------
	// Rate limiting
	// ------------------------------------------------------------------
	if (isRateLimited(serverId)) {
		const last = lastRefreshAt.get(serverId)!;
		const retryAfterMs = RATE_LIMIT_MS - (Date.now() - last);
		return json(
			{ success: false, error: "rate_limited", retryAfterMs },
			{ status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
		);
	}

	// ------------------------------------------------------------------
	// Discord token — required; fail fast if not configured.
	// ------------------------------------------------------------------
	const discordToken = (env.DISCORD_TOKEN ?? "").trim();
	if (!discordToken) {
		console.error("[refresh-server/public] DISCORD_TOKEN env var is not set.");
		return json(
			{ success: false, error: "Server misconfiguration: DISCORD_TOKEN not set." },
			{ status: 500 }
		);
	}

	// Mark refreshed immediately to block concurrent floods for the same server
	// while we await the Discord API calls.
	markRefreshed(serverId);

	// ------------------------------------------------------------------
	// Delegate to shared refresh logic.
	// minAgeMs=0 because the rate limiter above is the only gate here.
	// ------------------------------------------------------------------
	try {
		const result = await refreshServer(serverId, discordToken, {
			triggeredBy: "public-api",
			minAgeMs: 0
		});
		return json({ success: true, ...result }, { status: 200 });
	} catch (err) {
		if (err instanceof NotFoundError) {
			return json({ success: false, error: "server_not_found" }, { status: 404 });
		}
		const msg = err instanceof Error ? err.message : String(err);
		console.error(`[refresh-server/public] Unexpected error for server ${serverId}:`, err);
		return json({ success: false, error: msg }, { status: 500 });
	}
};
