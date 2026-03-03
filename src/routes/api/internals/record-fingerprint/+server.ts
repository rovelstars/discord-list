/**
 * POST /api/internals/record-fingerprint
 *
 * Records a browser fingerprint for the currently authenticated user.
 *
 * This endpoint is called client-side immediately after a user authenticates
 * (or on any subsequent page load where a fingerprint hasn't been recorded yet
 * for the current session). It handles three responsibilities:
 *
 *  1. FIFO fingerprint storage (max 5 per user)
 *     Calls upsertFingerprint() which either:
 *       - Updates last_seen for a known device, or
 *       - Inserts a new fingerprint, evicting the oldest if the 5-slot cap
 *         is already full (First-In-First-Out by last_seen).
 *
 *  2. Cross-account fraud detection
 *     After upserting, queries getUsersWithFingerprint() to find other accounts
 *     that share this fingerprint. If any are found, the trust_score for this
 *     fingerprint is lowered on all associated accounts, and a warning is logged.
 *     This does NOT automatically ban anyone — it surfaces the signal for review.
 *
 *  3. Referral fraud flagging
 *     If the authenticated user was referred by someone, checks whether the
 *     referrer's device list also contains this fingerprint. If so, the
 *     Referrals row is updated to fingerprint_match = 1 and reward_status is
 *     set to "flagged" if it was previously "pending" or "payable".
 *
 * ── Auth ──────────────────────────────────────────────────────────────────────
 * Requires the user to be authenticated via the session cookie ("key").
 * The user's Discord access token is verified against the Users table.
 * Returns 401 if no valid session is present.
 *
 * ── Request body (JSON) ───────────────────────────────────────────────────────
 * {
 *   fingerprint: string   // SHA-256 hex string (64 chars) from collect.ts
 * }
 *
 * ── Response ──────────────────────────────────────────────────────────────────
 * 200 {
 *   action:          "updated" | "inserted" | "evicted",
 *   trustScore:      number,           // current trust score for this fingerprint
 *   sharedAccounts:  number,           // count of OTHER accounts with this FP
 *   referralFlagged: boolean           // true if a referral was just soft-flagged
 * }
 * 400 { error: "missing_fingerprint" | "invalid_fingerprint" }
 * 401 { error: "Unauthorized" }
 * 500 { error: string }
 */

import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { getDb, withDb, type DrizzleDb } from "$lib/db";
import { Users, Referrals, UserFingerprints } from "$lib/db/schema";
import { eq, and, not, sql } from "drizzle-orm";
import {
	upsertFingerprint,
	getUsersWithFingerprint,
	fingerprintBelongsToUser
} from "$lib/db/queries/referrals";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * How much to reduce the trust_score when a fingerprint is found on another
 * account. Applied to ALL accounts sharing the fingerprint, not just the
 * current one.
 */
const TRUST_SCORE_SHARED_PENALTY = 15;

/**
 * Minimum trust score — clamped so it never goes below this value.
 * A score of 0 would mean "completely untrusted"; 10 keeps some headroom
 * for graduated responses rather than a hard binary.
 */
const TRUST_SCORE_MIN = 10;

/**
 * How many characters a valid SHA-256 hex fingerprint must be.
 * collectFingerprint() in collect.ts always returns a 64-char hex string.
 */
const FINGERPRINT_HEX_LENGTH = 64;

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

/**
 * Resolve the current session cookie to a verified user row.
 * Returns the user's { id, keys } or null if the session is missing/invalid.
 *
 * We look up the user by matching the access_token stored in their keys JSON
 * array against the "key" cookie value — the same pattern used by the rest of
 * the app (see +layout.server.ts and the auth callback).
 */
async function resolveSession(
	cookieValue: string | undefined
): Promise<{ id: string } | null> {
	if (!cookieValue) return null;

	// Search for a user whose serialised `keys` JSON contains this token.
	// This mirrors how other server routes authenticate the current user.
	// We use a LIKE match on the TEXT column (same approach as getBotsByOwner).
	const rows = await withDb((db: DrizzleDb) =>
		db
			.select({ id: Users.id })
			.from(Users)
			.where(sql`${Users.keys} LIKE ${"%" + cookieValue + "%"}`)
			.limit(1)
	);

	if (!Array.isArray(rows) || rows.length === 0) return null;
	return { id: (rows[0] as any).id as string };
}

// ---------------------------------------------------------------------------
// Trust score helper
// ---------------------------------------------------------------------------

/**
 * Apply a penalty to the trust_score for every (user_id, fingerprint) row
 * that shares the given fingerprint. Clamps the score to TRUST_SCORE_MIN.
 *
 * This is a best-effort operation — errors are logged but do not abort the
 * main request flow.
 */
async function penaliseTrustScores(fingerprint: string): Promise<void> {
	try {
		// Read current scores for all rows with this fingerprint.
		const rows = await withDb((db: DrizzleDb) =>
			db
				.select({
					id: UserFingerprints.id,
					trust_score: UserFingerprints.trust_score
				})
				.from(UserFingerprints)
				.where(eq(UserFingerprints.fingerprint, fingerprint))
		);

		if (!Array.isArray(rows) || rows.length === 0) return;

		// Update each row individually so we can clamp properly.
		// In practice the number of rows is tiny (at most MAX_FINGERPRINTS × few accounts).
		await Promise.all(
			(rows as { id: string; trust_score: number }[]).map((row) => {
				const newScore = Math.max(
					TRUST_SCORE_MIN,
					(typeof row.trust_score === "number" ? row.trust_score : 50) -
						TRUST_SCORE_SHARED_PENALTY
				);
				return withDb((db: DrizzleDb) =>
					db
						.update(UserFingerprints)
						.set({ trust_score: newScore })
						.where(eq(UserFingerprints.id, row.id))
				);
			})
		);
	} catch (err) {
		console.warn(
			"[record-fingerprint] Failed to penalise trust scores for fingerprint:",
			err instanceof Error ? err.message : String(err)
		);
	}
}

// ---------------------------------------------------------------------------
// Referral fraud flagging helper
// ---------------------------------------------------------------------------

/**
 * Check whether the current user (referredId) has an active referral whose
 * referrer also owns the given fingerprint. If so, soft-flag that referral:
 *   - Set fingerprint_match = 1
 *   - Set reward_status = "flagged" (only if currently "pending" or "payable")
 *   - Record settled_at timestamp
 *
 * Returns true if a referral was flagged, false otherwise.
 */
async function checkAndFlagReferralFraud(
	referredId: string,
	fingerprint: string
): Promise<boolean> {
	// Find the referral for this referred user (at most one — a user can only
	// be referred once, enforced in createReferral).
	const referralRows = await withDb((db: DrizzleDb) =>
		db
			.select({
				id: Referrals.id,
				referrer_id: Referrals.referrer_id,
				reward_status: Referrals.reward_status,
				fingerprint_match: Referrals.fingerprint_match
			})
			.from(Referrals)
			.where(eq(Referrals.referred_id, referredId))
			.limit(1)
	);

	if (!Array.isArray(referralRows) || referralRows.length === 0) {
		// This user was not referred by anyone — nothing to flag.
		return false;
	}

	const referral = referralRows[0] as {
		id: string;
		referrer_id: string;
		reward_status: string;
		fingerprint_match: boolean | number;
	};

	// Already flagged on a previous request — nothing to do.
	if (referral.fingerprint_match) return false;

	// Check if the referrer has this same fingerprint on their account.
	const referrerHasFp = await fingerprintBelongsToUser(referral.referrer_id, fingerprint);
	if (!referrerHasFp) return false;

	// Soft-flag: the referrer and referred user share a device fingerprint.
	// Only promote to "flagged" if the reward hasn't been paid/rejected yet.
	const isFlaggable =
		referral.reward_status === "pending" || referral.reward_status === "payable";

	const updatePayload: Record<string, unknown> = {
		fingerprint_match: true,
		settled_at: new Date().toISOString()
	};
	if (isFlaggable) {
		updatePayload.reward_status = "flagged";
	}

	await withDb((db: DrizzleDb) =>
		db.update(Referrals).set(updatePayload).where(eq(Referrals.id, referral.id))
	);

	console.warn(
		`[record-fingerprint] Referral soft-flagged: referral=${referral.id}, ` +
			`referrer=${referral.referrer_id}, referred=${referredId}. ` +
			`Shared fingerprint detected. Previous status: ${referral.reward_status} → flagged.`
	);

	return true;
}

// ---------------------------------------------------------------------------
// Trust score reader (post-upsert)
// ---------------------------------------------------------------------------

/**
 * Read back the current trust_score for a (user_id, fingerprint) pair after
 * the upsert + any penalty have been applied. Returns 50 (default) on failure.
 */
async function readTrustScore(userId: string, fingerprint: string): Promise<number> {
	try {
		const rows = await withDb((db: DrizzleDb) =>
			db
				.select({ trust_score: UserFingerprints.trust_score })
				.from(UserFingerprints)
				.where(
					and(
						eq(UserFingerprints.user_id, userId),
						eq(UserFingerprints.fingerprint, fingerprint)
					)
				)
				.limit(1)
		);
		if (Array.isArray(rows) && rows.length > 0) {
			const score = (rows[0] as any).trust_score;
			return typeof score === "number" ? score : 50;
		}
	} catch {
		// ignore — fall through to default
	}
	return 50;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const POST: RequestHandler = async ({ request, cookies }) => {
	// ── Auth ──────────────────────────────────────────────────────────────────
	const sessionToken = cookies.get("key");
	const user = await resolveSession(sessionToken);

	if (!user) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	// ── Parse body ────────────────────────────────────────────────────────────
	let body: { fingerprint?: unknown };
	try {
		body = await request.json();
	} catch {
		return json({ error: "invalid_json" }, { status: 400 });
	}

	const { fingerprint } = body ?? {};

	if (!fingerprint || typeof fingerprint !== "string" || !fingerprint.trim()) {
		return json({ error: "missing_fingerprint" }, { status: 400 });
	}

	// Validate format: must be a 64-character lowercase hex string (SHA-256).
	const fp = fingerprint.trim().toLowerCase();
	if (fp.length !== FINGERPRINT_HEX_LENGTH || !/^[0-9a-f]+$/.test(fp)) {
		return json({ error: "invalid_fingerprint" }, { status: 400 });
	}

	try {
		// ── 1. Upsert fingerprint (FIFO eviction if at cap) ───────────────────
		const action = await upsertFingerprint(user.id, fp);

		// ── 2. Cross-account fraud detection ─────────────────────────────────
		// Find other user accounts that also have this fingerprint.
		const sharedUserIds = await getUsersWithFingerprint(fp, user.id);
		const sharedAccounts = sharedUserIds.length;

		if (sharedAccounts > 0) {
			console.warn(
				`[record-fingerprint] Cross-account fingerprint detected for user ${user.id}. ` +
					`Fingerprint is shared with ${sharedAccounts} other account(s): ` +
					sharedUserIds.join(", ")
			);

			// Penalise trust scores on ALL rows with this fingerprint (including
			// the current user's row that was just upserted).
			await penaliseTrustScores(fp);
		}

		// ── 3. Referral fraud check ───────────────────────────────────────────
		const referralFlagged = await checkAndFlagReferralFraud(user.id, fp);

		// ── 4. Read back current trust score ─────────────────────────────────
		const trustScore = await readTrustScore(user.id, fp);

		// ── Response ──────────────────────────────────────────────────────────
		return json(
			{
				action,
				trustScore,
				sharedAccounts,
				referralFlagged
			},
			{ status: 200 }
		);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		console.error("[record-fingerprint] Unhandled error:", msg);
		return json({ error: "server_error" }, { status: 500 });
	}
};
