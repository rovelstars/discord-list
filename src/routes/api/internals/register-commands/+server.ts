/**
 * POST /api/internals/register-commands
 *
 * Internal endpoint that triggers Discord slash-command registration.
 *
 * Security — the secret is accepted from either of two sources (checked in order):
 *   1. Header:       X-Internal-Secret: <INTERNAL_SECRET>
 *      Used by automated callers (CI, deploy hooks, scheduled functions).
 *   2. Query param:  ?secret=<INTERNAL_SECRET>
 *      Convenient for quick manual runs via curl or the browser.
 *
 * Behaviour
 * ─────────
 * • MODE=development → registers as guild commands on DISCORD_GUILD_ID
 *   (instant propagation, no waiting, ideal for dev/staging deploys)
 * • MODE=production  → registers globally (up to 1 hour to propagate)
 *
 * Response (JSON)
 * ───────────────
 *   200  { ok: true,  scope: "guild" | "global", count: number, commands: { id, name }[] }
 *   401  { ok: false, error: "unauthorized" }
 *   500  { ok: false, error: string }
 */

import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import registerCommands from "@/bot/register";

export const POST: RequestHandler = async ({ request, url }) => {
	// -------------------------------------------------------------------------
	// Auth: require INTERNAL_SECRET to be configured, then verify the caller.
	// -------------------------------------------------------------------------
	const internalSecret = (env.INTERNAL_SECRET ?? "").trim();

	if (!internalSecret) {
		console.error("[register-commands] INTERNAL_SECRET env var is not set — refusing to run.");
		return json(
			{ ok: false, error: "server_misconfiguration" },
			{ status: 500 }
		);
	}

	const headerSecret = (request.headers.get("x-internal-secret") ?? "").trim();
	const querySecret  = (url.searchParams.get("secret") ?? "").trim();
	const provided     = headerSecret || querySecret;

	if (!provided || provided !== internalSecret) {
		console.warn("[register-commands] Unauthorized attempt — invalid or missing secret.");
		return json({ ok: false, error: "unauthorized" }, { status: 401 });
	}

	// -------------------------------------------------------------------------
	// Validate required bot env vars before attempting registration.
	// -------------------------------------------------------------------------
	const missingVars: string[] = [];

	if (!env.DISCORD_TOKEN)  missingVars.push("DISCORD_TOKEN");
	if (!env.DISCORD_BOT_ID) missingVars.push("DISCORD_BOT_ID");

	const mode    = (env.MODE ?? "development").toLowerCase();
	const isGuild = mode === "development";

	if (isGuild && !env.DISCORD_GUILD_ID) {
		missingVars.push("DISCORD_GUILD_ID");
	}

	if (missingVars.length > 0) {
		const msg = `Missing required environment variable(s): ${missingVars.join(", ")}`;
		console.error(`[register-commands] ${msg}`);
		return json({ ok: false, error: msg }, { status: 500 });
	}

	// -------------------------------------------------------------------------
	// Run registration.
	// -------------------------------------------------------------------------
	console.log(
		`[register-commands] Registering commands ${isGuild ? `to guild ${env.DISCORD_GUILD_ID}` : "globally"} …`
	);

	try {
		const result = await registerCommands({
			DISCORD_TOKEN:    env.DISCORD_TOKEN!,
			DISCORD_BOT_ID:   env.DISCORD_BOT_ID!,
			DISCORD_GUILD_ID: env.DISCORD_GUILD_ID ?? "",
			MODE:             env.MODE ?? "development",
		});

		// registerCommands() in register.ts currently returns void; we handle
		// both void and a future return value gracefully.
		const registeredList: { id: string; name: string }[] = Array.isArray(result) ? result : [];
		const scope = isGuild ? "guild" : "global";

		console.log(
			`[register-commands] Done — ${registeredList.length || "?"} command(s) registered ${scope === "guild" ? `to guild ${env.DISCORD_GUILD_ID}` : "globally"}.`
		);

		return json({
			ok:       true,
			scope,
			count:    registeredList.length,
			commands: registeredList.map(({ id, name }) => ({ id, name })),
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error("[register-commands] Registration failed:", err);
		return json({ ok: false, error: message }, { status: 500 });
	}
};

/**
 * GET /api/internals/register-commands
 *
 * A convenience alias so you can trigger registration with a simple browser
 * visit: /api/internals/register-commands?secret=YOUR_SECRET
 *
 * Delegates to the POST handler above.
 */
export const GET: RequestHandler = async (event) => {
	return POST(event);
};
