import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { refreshServer, NotFoundError } from "$lib/server-refresh";

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
 * POST /api/internals/refresh-server/[id]
 *
 * Privileged endpoint for refreshing a single guild's Discord snapshot data
 * (member count, presence count, channel list, NSFW flag). All core logic
 * lives in `$lib/server-refresh.ts`; this handler only deals with
 * authentication.
 *
 * Auth — secret required (same pattern as /refresh-bot):
 *   - Header:      X-Internal-Secret: <INTERNAL_SECRET>
 *   - Query param: ?secret=<INTERNAL_SECRET>
 *
 * Query params:
 *   - force=1   Pass minAgeMs=0 to bypass the stale-data guard in the lib.
 *               Without this the lib defaults to 10-minute minimum age.
 *
 * Response JSON:
 *   200  { success: true,  serverId, updated, skipped, changes, partialError? }
 *   400  { success: false, error: 'missing_id' }
 *   401  { success: false, error: 'Unauthorized.' }
 *   404  { success: false, error: 'server_not_found_in_db' }
 *   500  { success: false, error: string }
 */
export const POST: RequestHandler = async ({ request, url, params }) => {
	// ------------------------------------------------------------------
	// Auth
	// ------------------------------------------------------------------
	const { ok, misconfigured } = validateSecret(request, url);

	if (misconfigured) {
		console.error("[refresh-server/internal] INTERNAL_SECRET env var is not set.");
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
	const serverId = params.id?.trim();
	if (!serverId) {
		return json({ success: false, error: "missing_id" }, { status: 400 });
	}

	// ------------------------------------------------------------------
	// Discord token
	// ------------------------------------------------------------------
	const discordToken = (env.DISCORD_TOKEN ?? "").trim();
	if (!discordToken) {
		console.error("[refresh-server/internal] DISCORD_TOKEN env var is not set.");
		return json(
			{ success: false, error: "Server misconfiguration: DISCORD_TOKEN not set." },
			{ status: 500 }
		);
	}

	// ------------------------------------------------------------------
	// Optional force flag — bypasses the stale-data guard in the lib
	// ------------------------------------------------------------------
	const force = url.searchParams.get("force") === "1";

	// ------------------------------------------------------------------
	// Delegate to shared refresh logic
	// ------------------------------------------------------------------
	try {
		const result = await refreshServer(serverId, discordToken, {
			triggeredBy: "internal-api",
			minAgeMs: force ? 0 : undefined
		});
		return json({ success: true, ...result }, { status: 200 });
	} catch (err) {
		if (err instanceof NotFoundError) {
			return json({ success: false, error: "server_not_found_in_db" }, { status: 404 });
		}
		const msg = err instanceof Error ? err.message : String(err);
		console.error(`[refresh-server/internal] Unexpected error for server ${serverId}:`, err);
		return json({ success: false, error: msg }, { status: 500 });
	}
};
