import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { withDb, type DrizzleDb } from "$lib/db";
import { Users } from "$lib/db/schema";
import { eq } from "drizzle-orm";

function validateSecret(request: Request): boolean {
	const internalSecret = (env.INTERNAL_SECRET ?? "").trim();
	if (!internalSecret) return false;
	const supplied = (request.headers.get("x-internal-secret") ?? "").trim();
	return supplied === internalSecret;
}

/**
 * GET /api/internals/user-exists?id=<discordUserId>
 *
 * Checks whether a Discord user id has a corresponding account in the Users table.
 * Used by the /register bot command to gate server registration behind having
 * a site account.
 *
 * Auth: x-internal-secret header must match INTERNAL_SECRET env var.
 *
 * Response:
 *   200 { exists: true | false, bal: number | null }
 *   400 { error: "missing_id" }
 *   401 { error: "Unauthorized" }
 *   500 { error: string }
 */
export const GET: RequestHandler = async ({ request, url }) => {
	if (!validateSecret(request)) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	const id = url.searchParams.get("id")?.trim();
	if (!id) {
		return json({ error: "missing_id" }, { status: 400 });
	}

	try {
		const rows = await withDb((db: DrizzleDb) =>
			db.select({ id: Users.id, bal: Users.bal }).from(Users).where(eq(Users.id, id)).limit(1)
		);

		const exists = Array.isArray(rows) && rows.length > 0;
		const bal = exists
			? typeof rows[0].bal === "number"
				? rows[0].bal
				: Number(rows[0].bal) || 0
			: null;
		return json({ exists, bal }, { status: 200 });
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		console.error("[user-exists] DB error:", msg);
		return json({ error: "db_error" }, { status: 500 });
	}
};
