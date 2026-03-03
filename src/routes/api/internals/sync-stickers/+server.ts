import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { withDb, type DrizzleDb } from "$lib/db";
import { Servers } from "$lib/db/schema";
import { eq } from "drizzle-orm";
import { syncServerStickers } from "$lib/sticker-sync";

function validateSecret(request: Request): boolean {
	const internalSecret = (env.INTERNAL_SECRET ?? "").trim();
	if (!internalSecret) return false;
	const supplied = (request.headers.get("x-internal-secret") ?? "").trim();
	return supplied === internalSecret;
}

/**
 * POST /api/internals/sync-stickers
 *
 * Syncs all custom stickers for a registered Discord guild into the Stickers table.
 * Called by:
 *  - The /sync slash command (manual force-sync by guild admins)
 *  - The /register slash command (auto-sync on first registration)
 *
 * Auth: x-internal-secret header must match INTERNAL_SECRET env var.
 *
 * Body (JSON):
 *   { guildId: string }
 *
 * Response:
 *   200 { success: true, created: number, updated: number, total: number }
 *   400 { error: string }
 *   401 { error: "Unauthorized" }
 *   404 { error: "server_not_registered" }
 *   500 { error: string }
 */
export const POST: RequestHandler = async ({ request }) => {
	if (!validateSecret(request)) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: { guildId?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: "invalid_json" }, { status: 400 });
	}

	const { guildId } = body ?? {};

	if (!guildId || typeof guildId !== "string" || !guildId.trim()) {
		return json({ error: "missing_guildId" }, { status: 400 });
	}

	const id = guildId.trim();

	// Verify the server is registered in our listing
	try {
		const existing = await withDb((db: DrizzleDb) =>
			db.select({ id: Servers.id }).from(Servers).where(eq(Servers.id, id)).limit(1)
		);

		if (!Array.isArray(existing) || existing.length === 0) {
			return json({ error: "server_not_registered" }, { status: 404 });
		}
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		console.error("[sync-stickers] DB server-check error:", msg);
		return json({ error: "db_error", detail: msg }, { status: 500 });
	}

	// Get the bot token for the Discord API call
	const botToken = (env.DISCORD_TOKEN ?? "").trim();
	if (!botToken) {
		console.error("[sync-stickers] DISCORD_TOKEN is not configured.");
		return json({ error: "bot_token_missing" }, { status: 500 });
	}

	// Run the sync
	let result: Awaited<ReturnType<typeof syncServerStickers>>;
	try {
		result = await syncServerStickers(id, botToken);
	} catch (unexpectedErr) {
		const msg = unexpectedErr instanceof Error ? unexpectedErr.message : String(unexpectedErr);
		console.error(`[sync-stickers] Unexpected error syncing guild ${id}:`, msg);
		return json({ error: "sync_threw", detail: msg }, { status: 500 });
	}

	if (result.error) {
		console.error(`[sync-stickers] Sync error for guild ${id}:`, result.error);

		if (result.error === "discord_fetch_failed") {
			return json(
				{
					error: "discord_fetch_failed",
					message:
						"Could not fetch stickers from Discord. Ensure the bot is still in the server."
				},
				{ status: 502 }
			);
		}

		return json({ error: result.error }, { status: 500 });
	}

	return json(
		{
			success: true,
			guildId: result.guildId,
			created: result.created,
			updated: result.updated,
			total: result.total
		},
		{ status: 200 }
	);
};
