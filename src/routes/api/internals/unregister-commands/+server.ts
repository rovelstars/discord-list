/**
 * POST /api/internals/unregister-commands
 *
 * Internal endpoint that triggers Discord slash-command unregistration.
 * Fetches all currently registered commands from Discord and deletes them.
 *
 * Security — the secret is accepted from either of two sources (checked in order):
 *   1. Header:       X-Internal-Secret: <INTERNAL_SECRET>
 *      Used by automated callers (CI, deploy hooks, scheduled functions).
 *   2. Query param:  ?secret=<INTERNAL_SECRET>
 *      Convenient for quick manual runs via curl or the browser.
 *
 * Scope
 * ─────
 * Controlled by the `scope` query param (default: "both"):
 *   ?scope=global  — delete only globally registered commands
 *   ?scope=guild   — delete only guild-scoped commands for DISCORD_GUILD_ID
 *   ?scope=both    — delete both (default)
 *
 * Response (JSON)
 * ───────────────
 *   200  { ok: true,  deleted: number, failed: number, commands: { id, name, scope }[] }
 *   401  { ok: false, error: "unauthorized" }
 *   500  { ok: false, error: string }
 */

import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import unregisterCommands from "@/bot/unregister";

export const POST: RequestHandler = async ({ request, url }) => {
	// -------------------------------------------------------------------------
	// Auth: require INTERNAL_SECRET to be configured, then verify the caller.
	// -------------------------------------------------------------------------
	const internalSecret = (env.INTERNAL_SECRET ?? "").trim();

	if (!internalSecret) {
		console.error("[unregister-commands] INTERNAL_SECRET env var is not set — refusing to run.");
		return json({ ok: false, error: "server_misconfiguration" }, { status: 500 });
	}

	const headerSecret = (request.headers.get("x-internal-secret") ?? "").trim();
	const querySecret  = (url.searchParams.get("secret") ?? "").trim();
	const provided     = headerSecret || querySecret;

	if (!provided || provided !== internalSecret) {
		console.warn("[unregister-commands] Unauthorized attempt — invalid or missing secret.");
		return json({ ok: false, error: "unauthorized" }, { status: 401 });
	}

	// -------------------------------------------------------------------------
	// Scope: which set of commands to unregister.
	// -------------------------------------------------------------------------
	const rawScope = (url.searchParams.get("scope") ?? "both").trim().toLowerCase();
	const scope    = rawScope === "global" || rawScope === "guild" ? rawScope : "both";

	// -------------------------------------------------------------------------
	// Validate required bot env vars.
	// -------------------------------------------------------------------------
	const missingVars: string[] = [];

	if (!env.DISCORD_TOKEN)  missingVars.push("DISCORD_TOKEN");
	if (!env.DISCORD_BOT_ID) missingVars.push("DISCORD_BOT_ID");

	if ((scope === "guild" || scope === "both") && !env.DISCORD_GUILD_ID) {
		missingVars.push("DISCORD_GUILD_ID");
	}

	if (missingVars.length > 0) {
		const msg = `Missing required environment variable(s): ${missingVars.join(", ")}`;
		console.error(`[unregister-commands] ${msg}`);
		return json({ ok: false, error: msg }, { status: 500 });
	}

	// -------------------------------------------------------------------------
	// Run unregistration.
	// -------------------------------------------------------------------------
	console.log(
		`[unregister-commands] Unregistering commands (scope: ${scope}) …`
	);

	try {
		await unregisterCommands({
			DISCORD_TOKEN:    env.DISCORD_TOKEN!,
			DISCORD_BOT_ID:   env.DISCORD_BOT_ID!,
			DISCORD_GUILD_ID: env.DISCORD_GUILD_ID ?? "",
		});

		console.log(`[unregister-commands] Done (scope: ${scope}).`);

		return json({ ok: true, scope });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error("[unregister-commands] Unregistration failed:", err);
		return json({ ok: false, error: message }, { status: 500 });
	}
};

/**
 * GET /api/internals/unregister-commands
 *
 * Convenience alias so you can trigger unregistration with a simple browser
 * visit or curl GET:
 *   /api/internals/unregister-commands?secret=YOUR_SECRET
 *   /api/internals/unregister-commands?secret=YOUR_SECRET&scope=guild
 *
 * Delegates to the POST handler above.
 */
export const GET: RequestHandler = async (event) => {
	return POST(event);
};
