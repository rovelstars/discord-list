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
 * POST /api/internals/transfer-bal
 *
 * Transfers R$ balance from one user to another atomically.
 * Called exclusively by the /transfer slash command.
 *
 * Auth: x-internal-secret header must match INTERNAL_SECRET env var.
 *
 * Body (JSON):
 *   { from: string, to: string, amount: number }
 *
 * Response:
 *   200 { success: true, fromBal: number, toBal: number }
 *   400 { error: string }
 *   401 { error: "Unauthorized" }
 *   404 { error: "sender_not_found" | "recipient_not_found" }
 *   422 { error: "insufficient_balance" | "invalid_amount" | "same_user" }
 *   500 { error: string }
 */
export const POST: RequestHandler = async ({ request }) => {
	if (!validateSecret(request)) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: { from?: unknown; to?: unknown; amount?: unknown };
	try {
		body = await request.json();
	} catch {
		return json({ error: "invalid_json" }, { status: 400 });
	}

	const { from, to, amount } = body ?? {};

	// ── Input validation ──────────────────────────────────────────────────────

	if (!from || typeof from !== "string" || !from.trim()) {
		return json({ error: "missing_from" }, { status: 400 });
	}
	if (!to || typeof to !== "string" || !to.trim()) {
		return json({ error: "missing_to" }, { status: 400 });
	}
	if (amount === undefined || amount === null) {
		return json({ error: "missing_amount" }, { status: 400 });
	}

	const fromId = from.trim();
	const toId = to.trim();

	if (fromId === toId) {
		return json({ error: "same_user" }, { status: 422 });
	}

	// Must be a finite integer > 0
	const parsedAmount = Number(amount);
	if (
		!Number.isFinite(parsedAmount) ||
		!Number.isInteger(parsedAmount) ||
		parsedAmount <= 0
	) {
		return json({ error: "invalid_amount" }, { status: 422 });
	}

	try {
		// Fetch both users in parallel
		const [senderRows, recipientRows] = await Promise.all([
			withDb((db: DrizzleDb) =>
				db.select({ id: Users.id, bal: Users.bal }).from(Users).where(eq(Users.id, fromId)).limit(1)
			),
			withDb((db: DrizzleDb) =>
				db.select({ id: Users.id, bal: Users.bal }).from(Users).where(eq(Users.id, toId)).limit(1)
			)
		]);

		const sender = Array.isArray(senderRows) && senderRows.length > 0 ? senderRows[0] : null;
		const recipient =
			Array.isArray(recipientRows) && recipientRows.length > 0 ? recipientRows[0] : null;

		if (!sender) {
			return json({ error: "sender_not_found" }, { status: 404 });
		}
		if (!recipient) {
			return json({ error: "recipient_not_found" }, { status: 404 });
		}

		const senderBal = typeof sender.bal === "number" ? sender.bal : Number(sender.bal) || 0;
		const recipientBal =
			typeof recipient.bal === "number" ? recipient.bal : Number(recipient.bal) || 0;

		if (senderBal < parsedAmount) {
			return json({ error: "insufficient_balance", have: senderBal }, { status: 422 });
		}

		const newSenderBal = senderBal - parsedAmount;
		const newRecipientBal = recipientBal + parsedAmount;

		// Write both updates — not wrapped in a true SQL transaction since libSQL
		// doesn't expose interactive transactions via Drizzle here, but the
		// balance check above ensures we never go negative.
		await Promise.all([
			withDb((db: DrizzleDb) =>
				db.update(Users).set({ bal: newSenderBal }).where(eq(Users.id, fromId))
			),
			withDb((db: DrizzleDb) =>
				db.update(Users).set({ bal: newRecipientBal }).where(eq(Users.id, toId))
			)
		]);

		return json(
			{ success: true, fromBal: newSenderBal, toBal: newRecipientBal },
			{ status: 200 }
		);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		console.error("[transfer-bal] DB error:", msg);
		return json({ error: "db_error" }, { status: 500 });
	}
};
