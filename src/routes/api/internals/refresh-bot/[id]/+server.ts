import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { refreshBot, NotFoundError } from "$lib/bot-refresh";

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

function validateSecret(request: Request, url: URL): { ok: boolean; misconfigured: boolean } {
	const internalSecret = (env.INTERNAL_SECRET ?? "").trim();
	if (!internalSecret) {
		return { ok: false, misconfigured: true };
	}

	const supplied = (
		request.headers.get("X-Internal-Secret") ??
		url.searchParams.get("secret") ??
		""
	).trim();

	return { ok: supplied === internalSecret, misconfigured: false };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * POST /api/internals/refresh-bot/[id]
 *
 * Privileged endpoint for refreshing a single bot's Discord identity and CDN
 * background URL. All core logic lives in `$lib/bot-refresh.ts`; this handler
 * only deals with authentication.
 *
 * Auth — secret required (same pattern as /refresh-cdn-bgs):
 *   - Header:      X-Internal-Secret: <INTERNAL_SECRET>
 *   - Query param: ?secret=<INTERNAL_SECRET>
 *
 * Response JSON:
 *   200  { success: true,  botId, updated, changes, bgRefreshed, partialError? }
 *   400  { success: false, error: 'missing_id' }
 *   401  { success: false, error: 'Unauthorized.' }
 *   404  { success: false, error: 'bot_not_found_in_db' }
 *   500  { success: false, error: string }
 */
export const POST: RequestHandler = async ({ request, url, params }) => {
	// ------------------------------------------------------------------
	// Auth
	// ------------------------------------------------------------------
	const { ok, misconfigured } = validateSecret(request, url);

	if (misconfigured) {
		console.error("[refresh-bot/internal] INTERNAL_SECRET env var is not set.");
		return json(
			{ success: false, error: "Server misconfiguration: INTERNAL_SECRET not set." },
			{ status: 500 }
		);
	}

	if (!ok) {
		return json({ success: false, error: "Unauthorized." }, { status: 401 });
	}

	// ------------------------------------------------------------------
	// Param validation
	// ------------------------------------------------------------------
	const botId = params.id?.trim();
	if (!botId) {
		return json({ success: false, error: "missing_id" }, { status: 400 });
	}

	// ------------------------------------------------------------------
	// Discord token
	// ------------------------------------------------------------------
	const discordToken = (env.DISCORD_TOKEN ?? "").trim();
	if (!discordToken) {
		console.error("[refresh-bot/internal] DISCORD_TOKEN env var is not set.");
		return json(
			{ success: false, error: "Server misconfiguration: DISCORD_TOKEN not set." },
			{ status: 500 }
		);
	}

	// ------------------------------------------------------------------
	// Delegate to shared refresh logic
	// ------------------------------------------------------------------
	try {
		const result = await refreshBot(botId, discordToken, { triggeredBy: "internal-api" });
		return json({ success: true, ...result }, { status: 200 });
	} catch (err) {
		if (err instanceof NotFoundError) {
			return json({ success: false, error: "bot_not_found_in_db" }, { status: 404 });
		}
		const msg = err instanceof Error ? err.message : String(err);
		console.error(`[refresh-bot/internal] Unexpected error for bot ${botId}:`, err);
		return json({ success: false, error: msg }, { status: 500 });
	}
};
