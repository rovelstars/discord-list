import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { refreshBot, NotFoundError } from "$lib/bot-refresh";

// ---------------------------------------------------------------------------
// Simple in-memory rate limiter
// Prevents the same bot from being refreshed more than once per 5 minutes from
// the public endpoint - mitigates accidental or malicious hammering.
// ---------------------------------------------------------------------------

const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes
const lastRefreshAt = new Map<string, number>();

function isRateLimited(botId: string): boolean {
	const last = lastRefreshAt.get(botId);
	if (last == null) return false;
	return Date.now() - last < RATE_LIMIT_MS;
}

function markRefreshed(botId: string): void {
	lastRefreshAt.set(botId, Date.now());
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
 * POST /api/bots/[id]/refresh
 *
 * Public-facing endpoint that the frontend calls when any bot image fails to
 * load (onerror handler on the bg/avatar <img> elements). It is intentionally
 * POST-only so GET-based crawlers/CDN prefetch cannot trigger it.
 *
 * Security model:
 *   - No secret required from the client - this is a public route.
 *   - DISCORD_TOKEN is read server-side only and never exposed to the browser.
 *   - Per-bot rate limiting (5 min window) prevents abuse.
 *   - Only bots that already exist in the DB can be refreshed.
 *
 * All core refresh logic (Discord fetch, diff, DB write, SendLog) lives in
 * `$lib/bot-refresh.ts`; this handler only deals with rate limiting.
 *
 * Response JSON:
 *   200  { success: true,  botId, updated, changes, bgRefreshed, partialError? }
 *   400  { success: false, error: 'missing_id' }
 *   404  { success: false, error: 'bot_not_found' }
 *   429  { success: false, error: 'rate_limited', retryAfterMs: number }
 *   500  { success: false, error: string }
 */
export const POST: RequestHandler = async ({ params }) => {
	// ------------------------------------------------------------------
	// Param validation
	// ------------------------------------------------------------------
	const botId = params.id?.trim();
	if (!botId) {
		return json({ success: false, error: "missing_id" }, { status: 400 });
	}

	// ------------------------------------------------------------------
	// Rate limiting
	// ------------------------------------------------------------------
	if (isRateLimited(botId)) {
		const last = lastRefreshAt.get(botId)!;
		const retryAfterMs = RATE_LIMIT_MS - (Date.now() - last);
		return json(
			{ success: false, error: "rate_limited", retryAfterMs },
			{ status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
		);
	}

	// ------------------------------------------------------------------
	// Discord token - required; fail fast if not configured.
	// ------------------------------------------------------------------
	const discordToken = (env.DISCORD_TOKEN ?? "").trim();
	if (!discordToken) {
		console.error("[refresh-bot/public] DISCORD_TOKEN env var is not set.");
		return json(
			{ success: false, error: "Server misconfiguration: DISCORD_TOKEN not set." },
			{ status: 500 }
		);
	}

	// Mark refreshed immediately to block concurrent floods for the same bot
	// while we await the Discord API calls.
	markRefreshed(botId);

	// ------------------------------------------------------------------
	// Delegate to shared refresh logic
	// ------------------------------------------------------------------
	try {
		const result = await refreshBot(botId, discordToken, { triggeredBy: "frontend-image-error" });
		return json({ success: true, ...result }, { status: 200 });
	} catch (err) {
		if (err instanceof NotFoundError) {
			return json({ success: false, error: "bot_not_found" }, { status: 404 });
		}
		const msg = err instanceof Error ? err.message : String(err);
		console.error(`[refresh-bot/public] Unexpected error for bot ${botId}:`, err);
		return json({ success: false, error: msg }, { status: 500 });
	}
};
