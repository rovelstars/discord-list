import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { getDb } from "$lib/db";
import { Bots } from "$lib/schema";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/bots/[id]/servers
 *
 * Expected:
 *  - Authorization via bot `code` provided in:
 *      - query param `code`
 *      - `Authorization` header
 *      - `RDL-code` header
 *  - JSON body: { count: number }
 *
 * Behavior:
 *  - Validates code and bot id match a row
 *  - Validates `count` is a number
 *  - Updates the `servers` column for the matching bot
 */
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const id = params.id;
		if (!id) {
			return json({ err: "missing_bot_id" }, { status: 400 });
		}

		const url = new URL(request.url);
		const codeFromQuery = url.searchParams.get("code");
		const authHeader = request.headers.get("authorization") ?? request.headers.get("RDL-code");
		const code = codeFromQuery ?? authHeader ?? null;

		if (!code) {
			return json({ err: "no_code" }, { status: 400 });
		}

		const db = getDb();

		// Verify bot exists and code matches
		const rows = await db
			.select({ votes: Bots.votes })
			.from(Bots)
			.where(and(eq(Bots.code, code), eq(Bots.id, id)))
			.limit(1);

		if (!rows || rows.length === 0) {
			return json({ err: "invalid_code" }, { status: 400 });
		}

		// Parse body
		let body: any;
		try {
			body = await request.json();
		} catch {
			return json({ err: "invalid_body" }, { status: 400 });
		}

		if (!body || typeof body.count !== "number" || Number.isNaN(body.count)) {
			return json({ err: "NaN" }, { status: 400 });
		}

		// Persist servers count
		await db
			.update(Bots)
			.set({ servers: body.count })
			.where(and(eq(Bots.code, code), eq(Bots.id, id)));

		return json({ success: true }, { status: 200 });
	} catch (err) {
		console.error("/api/bots/[id]/servers error:", err);
		return json(
			{ err: "server_error", message: err instanceof Error ? err.message : String(err) },
			{ status: 500 }
		);
	}
};
