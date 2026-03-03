/**
 * POST /api/internals/record-visit
 *
 * Called client-side (fire-and-forget) by the root layout once per calendar
 * day per authenticated user. Writes a single deduplicated "site_visit" row
 * to UserActivityLog, which the SettleRewards function reads when evaluating
 * the 5-day retention milestone.
 *
 * ── Auth ──────────────────────────────────────────────────────────────────────
 * Requires the "key" session cookie (same cookie set by /api/auth).
 * Returns 401 if the cookie is absent or resolves to no known user.
 * No request body is required or read.
 *
 * ── Idempotency ───────────────────────────────────────────────────────────────
 * recordSiteVisit() checks whether a row already exists for
 * (user_id, "site_visit", today_utc) before inserting, so calling this
 * endpoint multiple times in a day is completely safe.
 *
 * ── Response ──────────────────────────────────────────────────────────────────
 * 200 { recorded: boolean }
 *   recorded = true  → new row inserted (first visit of the day)
 *   recorded = false → row already existed (subsequent call, no-op)
 * 401 { error: "Unauthorized" }
 * 500 { error: string }
 */

import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { withDb, type DrizzleDb } from "$lib/db";
import { Users, UserActivityLog } from "$lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { recordSiteVisit, todayUtc } from "$lib/db/queries/referrals";

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

/**
 * Resolve the "key" session cookie to a verified user ID.
 *
 * Looks up the user by matching their serialised `keys` JSON TEXT column
 * against the cookie value — identical to the strategy used in
 * /api/internals/record-fingerprint and the layout server load.
 *
 * Returns the user's Discord ID string, or null when no match is found.
 */
async function resolveSession(cookieValue: string | undefined): Promise<string | null> {
	if (!cookieValue) return null;

	const rows = await withDb((db: DrizzleDb) =>
		db
			.select({ id: Users.id })
			.from(Users)
			.where(sql`${Users.keys} LIKE ${"%" + cookieValue + "%"}`)
			.limit(1)
	);

	if (!Array.isArray(rows) || rows.length === 0) return null;
	return (rows[0] as any).id as string;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const POST: RequestHandler = async ({ cookies }) => {
	// ── Auth ──────────────────────────────────────────────────────────────────
	const sessionToken = cookies.get("key");
	const userId = await resolveSession(sessionToken);

	if (!userId) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		// Check whether a visit row for today already exists so we can return
		// an accurate `recorded` flag without relying on side-effects.
		const today = todayUtc();

		const existing = await withDb((db: DrizzleDb) =>
			db
				.select({ id: UserActivityLog.id })
				.from(UserActivityLog)
				.where(
					and(
						eq(UserActivityLog.user_id, userId),
						eq(UserActivityLog.event_type, "site_visit"),
						eq(UserActivityLog.event_day, today)
					)
				)
				.limit(1)
		);

		const alreadyRecorded = Array.isArray(existing) && existing.length > 0;

		if (!alreadyRecorded) {
			// recordSiteVisit performs its own existence check internally, but
			// we've already done it above so this is effectively a direct insert
			// path.  The double-check makes this handler safe even if called
			// concurrently from two tabs (the second insert attempt inside
			// recordSiteVisit will simply no-op).
			await recordSiteVisit(userId);
		}

		return json({ recorded: !alreadyRecorded }, { status: 200 });
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		console.error("[record-visit] Unhandled error:", msg);
		return json({ error: "server_error" }, { status: 500 });
	}
};
