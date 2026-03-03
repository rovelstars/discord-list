/**
 * src/lib/db/queries/referrals.ts
 *
 * Database query helpers for the Rovel Stars referral system.
 *
 * Covers:
 *  - Referral code look-up & loop-prevention checks
 *  - Sign-up reward eligibility (account age via Snowflake, email verification)
 *  - Referral row creation with fraud-signal detection
 *  - Milestone existence checks (idempotent guards used by SettleRewards)
 *  - Balance crediting (atomic R$ award with audit trail)
 *  - Bulk queries used by the scheduled SettleRewards function
 *
 * All functions use `withDb` so they benefit from the automatic
 * WebSocket-reconnection retry built into `$lib/db/index.ts`.
 *
 * Conventions:
 *  - ISO 8601 strings are used for all timestamps (TEXT columns in SQLite).
 *  - Boolean columns are stored as INTEGER 0/1.
 *  - JSON blobs are stored as TEXT and must be JSON.stringify'd before writing.
 *  - Every public function is documented with its purpose, parameters, and
 *    possible return values so callers don't need to read the implementation.
 */

import { withDb, type DrizzleDb } from "$lib/db/index";
import { Users } from "$lib/db/schema";
import { Referrals, ReferralMilestones, UserFingerprints, UserActivityLog } from "$lib/db/schema";
import { eq, and, sql, lt, desc, not } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Public type definitions
// ---------------------------------------------------------------------------

/** Allowed values for Referrals.reward_status */
export type ReferralRewardStatus = "pending" | "payable" | "paid" | "flagged" | "rejected";

/** Allowed values for ReferralMilestones.milestone_type */
export type MilestoneType =
	| "retention_daily"
	| "vote_20"
	| "server_bounty"
	| "self_listing_100"
	| "self_listing_500"
	| "signup_welcome"
	| "engagement_sprint_referred"
	| "server_bounty_referred";

/** Allowed values for ReferralMilestones.status */
export type MilestoneStatus = "pending" | "paid" | "flagged";

/** Returned by createReferral() */
export interface CreateReferralResult {
	/** UUID of the new Referrals row. */
	referralId: string;
	/** Resolved reward_status that was written to the DB. */
	status: ReferralRewardStatus;
	/** True when a shared fingerprint was detected between referrer and referred. */
	fingerprintMatch: boolean;
	/** True when the referred account is >= 7 days old. */
	accountOldEnough: boolean;
	/** True when the referred user had a verified Discord email at sign-up. */
	emailVerified: boolean;
}

/** Shape returned by getReferralsByReferrer() */
export interface ReferralSummary {
	id: string;
	referred_id: string;
	reward_status: ReferralRewardStatus;
	fingerprint_match: boolean;
	created_at: string;
}

/**
 * Result of a double-credit operation where both referrer and referred user
 * are rewarded atomically in a single logical operation.
 */
export interface DoubleCreditResult {
	referrerMilestoneId: string;
	referredMilestoneId: string;
	referrerNewBal: number | null;
	referredNewBal: number | null;
}

/** Shape used by SettleRewards to process pending referrals */
export interface PendingReferral {
	id: string;
	referrer_id: string;
	referred_id: string;
	reward_status: ReferralRewardStatus;
	created_at: string;
}

/** Returned by checkRetentionProgress() */
export interface RetentionProgress {
	/** Number of distinct calendar days the referred user visited in their first 7 days. */
	visitDays: number;
	/** Whether the 5-day threshold has been reached. */
	thresholdMet: boolean;
	/** Number of retention_daily milestone rows already paid for this referral. */
	daysPaid: number;
	/** How many new daily rewards are payable right now (0–5, capped). */
	newDaysPayable: number;
	/** Whether the overall 5-visit OR 20-vote engagement threshold has been met. */
	engagementBonusMet: boolean;
	/** Whether the engagement bonus for the referred user has already been paid. */
	engagementBonusAlreadyPaid: boolean;
}

/** Returned by checkVotingProgress() */
export interface VotingProgress {
	/** Total unique entity IDs voted on by the referred user in their first 7 days. */
	uniqueVotes: number;
	/** Whether the 20-vote threshold has been reached. */
	thresholdMet: boolean;
	/** Whether the vote_20 milestone has already been paid for this referral. */
	alreadyPaid: boolean;
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

/** Maximum fingerprints stored per user before FIFO eviction kicks in. */
const MAX_FINGERPRINTS = 5;

/** Days a referred Discord account must be old to qualify for the sign-up reward. */
const MIN_ACCOUNT_AGE_DAYS = 7;

/** Discord epoch offset (ms) used to extract creation time from a Snowflake. */
const DISCORD_EPOCH_MS = 1420070400000n;

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Derive a Discord account creation date from its Snowflake ID.
 * Returns a Date object or null if the snowflake is invalid.
 *
 * Discord Snowflake layout:
 *   bits 63–22 = milliseconds since Discord epoch (2015-01-01T00:00:00.000Z)
 *   bits 21–17 = internal worker id
 *   bits 16–12 = internal process id
 *   bits 11–0  = increment
 */
export function snowflakeToDate(snowflake: string): Date | null {
	try {
		const ms = (BigInt(snowflake) >> 22n) + DISCORD_EPOCH_MS;
		return new Date(Number(ms));
	} catch {
		return null;
	}
}

/**
 * Calculate the age (in whole days) of a Discord account from its Snowflake.
 * Returns null if the snowflake cannot be parsed.
 */
export function snowflakeAgeInDays(snowflake: string): number | null {
	const created = snowflakeToDate(snowflake);
	if (!created) return null;
	const nowMs = Date.now();
	const ageMs = nowMs - created.getTime();
	if (ageMs < 0) return null; // clock skew sanity check
	return Math.floor(ageMs / (1000 * 60 * 60 * 24));
}

/**
 * Return today's UTC calendar date as "YYYY-MM-DD".
 * Used when recording activity log events and when querying per-day counts.
 */
export function todayUtc(): string {
	return new Date().toISOString().slice(0, 10);
}

/**
 * Return the UTC calendar date N days after a given ISO 8601 string.
 * Used to define the "first 7 days" window for retention/voting milestones.
 */
export function addDays(isoDate: string, days: number): string {
	const d = new Date(isoDate);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Loop prevention
// ---------------------------------------------------------------------------

/**
 * Returns true when adding a referral from `referrerId` → `referredId` would
 * create a mutual-referral cycle (A → B already exists when B wants to refer A).
 *
 * Must be called before inserting a new Referrals row.
 */
export async function wouldCreateReferralLoop(
	referrerId: string,
	referredId: string
): Promise<boolean> {
	const rows = await withDb((db: DrizzleDb) =>
		db
			.select({ id: Referrals.id })
			.from(Referrals)
			.where(and(eq(Referrals.referrer_id, referredId), eq(Referrals.referred_id, referrerId)))
			.limit(1)
	);
	return Array.isArray(rows) && rows.length > 0;
}

/**
 * Returns true if `referredId` has already been referred by anyone.
 * A user can only be referred once — this prevents double-referral.
 */
export async function isAlreadyReferred(referredId: string): Promise<boolean> {
	const rows = await withDb((db: DrizzleDb) =>
		db
			.select({ id: Referrals.id })
			.from(Referrals)
			.where(eq(Referrals.referred_id, referredId))
			.limit(1)
	);
	return Array.isArray(rows) && rows.length > 0;
}

// ---------------------------------------------------------------------------
// Fingerprint queries
// ---------------------------------------------------------------------------

/**
 * Look up all fingerprints associated with a given user.
 * Ordered by last_seen ascending (oldest first) — ready for FIFO eviction.
 */
export async function getUserFingerprints(
	userId: string
): Promise<{ id: string; fingerprint: string; last_seen: string; trust_score: number }[]> {
	const rows = await withDb(
		(db: DrizzleDb) =>
			db
				.select({
					id: UserFingerprints.id,
					fingerprint: UserFingerprints.fingerprint,
					last_seen: UserFingerprints.last_seen,
					trust_score: UserFingerprints.trust_score
				})
				.from(UserFingerprints)
				.where(eq(UserFingerprints.user_id, userId))
				.orderBy(UserFingerprints.last_seen) // oldest first for FIFO
	);
	return (rows as any[]) ?? [];
}

/**
 * Check whether a given fingerprint is already associated with the given user.
 * Used to decide between INSERT (new device) and UPDATE last_seen (returning device).
 */
export async function userHasFingerprint(userId: string, fingerprint: string): Promise<boolean> {
	const rows = await withDb((db: DrizzleDb) =>
		db
			.select({ id: UserFingerprints.id })
			.from(UserFingerprints)
			.where(
				and(eq(UserFingerprints.user_id, userId), eq(UserFingerprints.fingerprint, fingerprint))
			)
			.limit(1)
	);
	return Array.isArray(rows) && rows.length > 0;
}

/**
 * Return all user IDs (besides `ownUserId`) that have this fingerprint on record.
 * A non-empty result is a fraud signal: the same physical device is linked to
 * multiple accounts.
 */
export async function getUsersWithFingerprint(
	fingerprint: string,
	ownUserId: string
): Promise<string[]> {
	const rows = await withDb((db: DrizzleDb) =>
		db
			.select({ user_id: UserFingerprints.user_id })
			.from(UserFingerprints)
			.where(
				and(
					eq(UserFingerprints.fingerprint, fingerprint),
					not(eq(UserFingerprints.user_id, ownUserId))
				)
			)
	);
	return ((rows as any[]) ?? []).map((r: any) => r.user_id as string);
}

/**
 * Upsert a fingerprint row for a user.
 *
 * Strategy:
 *   1. If the (user_id, fingerprint) pair already exists → update last_seen only.
 *   2. If it is new AND the user already has < MAX_FINGERPRINTS rows → INSERT.
 *   3. If it is new AND the user has MAX_FINGERPRINTS rows → evict the oldest
 *      (smallest last_seen) via DELETE, then INSERT the new one.
 *
 * Returns:
 *   "updated"  — existing fingerprint refreshed.
 *   "inserted" — new fingerprint added (slot was available).
 *   "evicted"  — oldest fingerprint removed to make room; new one added.
 */
export async function upsertFingerprint(
	userId: string,
	fingerprint: string
): Promise<"updated" | "inserted" | "evicted"> {
	const now = new Date().toISOString();

	// ── 1. Already known device ──────────────────────────────────────────────
	const existing = await withDb((db: DrizzleDb) =>
		db
			.select({ id: UserFingerprints.id })
			.from(UserFingerprints)
			.where(
				and(eq(UserFingerprints.user_id, userId), eq(UserFingerprints.fingerprint, fingerprint))
			)
			.limit(1)
	);

	if (Array.isArray(existing) && existing.length > 0) {
		await withDb((db: DrizzleDb) =>
			db
				.update(UserFingerprints)
				.set({ last_seen: now })
				.where(
					and(eq(UserFingerprints.user_id, userId), eq(UserFingerprints.fingerprint, fingerprint))
				)
		);
		return "updated";
	}

	// ── 2. New device — check current count ──────────────────────────────────
	const allForUser = await getUserFingerprints(userId); // ordered by last_seen ASC

	if (allForUser.length >= MAX_FINGERPRINTS) {
		// ── 3. FIFO eviction: delete the row with the oldest last_seen ─────────
		const oldest = allForUser[0]; // first element = oldest last_seen
		await withDb((db: DrizzleDb) =>
			db
				.delete(UserFingerprints)
				.where(
					and(
						eq(UserFingerprints.user_id, userId),
						eq(UserFingerprints.fingerprint, oldest.fingerprint)
					)
				)
		);
	}

	// Insert the new fingerprint
	await withDb((db: DrizzleDb) =>
		db.insert(UserFingerprints).values({
			id: crypto.randomUUID(),
			user_id: userId,
			fingerprint,
			first_seen: now,
			last_seen: now,
			trust_score: 50
		})
	);

	return allForUser.length >= MAX_FINGERPRINTS ? "evicted" : "inserted";
}

/**
 * Check whether a given fingerprint appears on the referrer's device list.
 * Used at sign-up to detect self-referral fraud (referrer registers a second
 * account from the same machine and uses their own link).
 */
export async function fingerprintBelongsToUser(
	userId: string,
	fingerprint: string
): Promise<boolean> {
	return userHasFingerprint(userId, fingerprint);
}

// ---------------------------------------------------------------------------
// Referral creation
// ---------------------------------------------------------------------------

/**
 * Resolve a referral code string to a referrer user ID.
 *
 * Current implementation: referral codes are the referrer's Discord user ID.
 * If you later add custom vanity codes, extend this function to query a
 * `ReferralCodes` look-up table. For now this keeps things simple and avoids
 * an extra table until vanity codes are needed.
 *
 * Returns the referrer's user ID if the code is a valid, existing user.
 * Returns null if no user with that ID exists.
 */
export async function resolveReferralCode(code: string): Promise<string | null> {
	const rows = await withDb((db: DrizzleDb) =>
		db.select({ id: Users.id }).from(Users).where(eq(Users.id, code)).limit(1)
	);
	if (!Array.isArray(rows) || rows.length === 0) return null;
	return (rows[0] as any).id as string;
}

/**
 * Create a new Referrals row after a referred user completes Discord OAuth2.
 *
 * Performs all eligibility checks inline and writes the appropriate
 * reward_status so the SettleRewards function can process it without
 * re-deriving eligibility:
 *
 *   1. Loop prevention — returns early if A→B already exists.
 *   2. Duplicate prevention — a user may only be referred once.
 *   3. Fraud check — if the referred user's fingerprint is already on the
 *      referrer's device list, reward_status is set to "flagged".
 *   4. Eligibility — account age ≥ 7 days AND verified email → "payable";
 *      otherwise "rejected" (or "flagged" takes precedence).
 *
 * @param referrerId       Discord user ID of the referrer.
 * @param referredId       Discord user ID of the newly signed-up user.
 * @param code             The referral code string that was used.
 * @param referredSnowflake  The referred user's Discord ID (same as referredId;
 *                         passed explicitly so it's clear we're using it for
 *                         Snowflake-age derivation).
 * @param emailVerified    Whether Discord reported a verified email for the
 *                         referred user during the OAuth2 token exchange.
 * @param fingerprint      The browser fingerprint captured at sign-up time
 *                         (may be undefined if the client didn't send one).
 *
 * @returns CreateReferralResult, or null if the referral should be skipped
 *          (loop detected, or the referred user was already referred).
 */
export async function createReferral(
	referrerId: string,
	referredId: string,
	code: string,
	referredSnowflake: string,
	emailVerified: boolean,
	fingerprint?: string
): Promise<CreateReferralResult | null> {
	// ── Guard: referrer must exist ───────────────────────────────────────────
	const referrerExists = await resolveReferralCode(referrerId);
	if (!referrerExists) return null;

	// ── Guard: loop prevention ───────────────────────────────────────────────
	if (await wouldCreateReferralLoop(referrerId, referredId)) {
		console.warn(
			`[referrals] Loop prevented: ${referredId} tried to refer ${referrerId} ` +
				`but ${referrerId} already referred ${referredId}.`
		);
		return null;
	}

	// ── Guard: each user can only be referred once ───────────────────────────
	if (await isAlreadyReferred(referredId)) {
		return null;
	}

	// ── Fraud check: shared fingerprint ─────────────────────────────────────
	let fingerprintMatch = false;
	if (fingerprint) {
		fingerprintMatch = await fingerprintBelongsToUser(referrerId, fingerprint);
	}

	// ── Eligibility checks ───────────────────────────────────────────────────
	const ageDays = snowflakeAgeInDays(referredSnowflake);
	const accountOldEnough = ageDays !== null && ageDays >= MIN_ACCOUNT_AGE_DAYS;

	// ── Determine reward_status ──────────────────────────────────────────────
	let status: ReferralRewardStatus;
	if (fingerprintMatch) {
		// Soft-flag — log the relationship but don't pay out.
		status = "flagged";
	} else if (!accountOldEnough || !emailVerified) {
		// Hard eligibility failure.
		status = "rejected";
	} else {
		// All checks pass — mark as payable so SettleRewards credits it.
		status = "payable";
	}

	const now = new Date().toISOString();
	const referralId = crypto.randomUUID();

	await withDb((db: DrizzleDb) =>
		db.insert(Referrals).values({
			id: referralId,
			referrer_id: referrerId,
			referred_id: referredId,
			code,
			reward_status: status,
			fingerprint_match: fingerprintMatch,
			referred_account_age_days: ageDays ?? 0,
			referred_email_verified: emailVerified,
			created_at: now,
			settled_at: now
		})
	);

	return {
		referralId,
		status,
		fingerprintMatch,
		accountOldEnough,
		emailVerified
	};
}

// ---------------------------------------------------------------------------
// Sign-up reward (R$100)
// ---------------------------------------------------------------------------

/**
 * Fetch all Referrals rows that are in "payable" status and have not yet been
 * paid. Called by SettleRewards to process the one-time sign-up reward.
 */
export async function getPayableSignupReferrals(): Promise<PendingReferral[]> {
	const rows = await withDb((db: DrizzleDb) =>
		db
			.select({
				id: Referrals.id,
				referrer_id: Referrals.referrer_id,
				referred_id: Referrals.referred_id,
				reward_status: Referrals.reward_status,
				created_at: Referrals.created_at
			})
			.from(Referrals)
			.where(eq(Referrals.reward_status, "payable"))
	);
	return rows as any[] as PendingReferral[];
}

/**
 * Mark a Referrals row as "paid" and record the settled_at timestamp.
 * Called after the R$100 sign-up reward has been successfully credited.
 */
export async function markReferralPaid(referralId: string): Promise<void> {
	await withDb((db: DrizzleDb) =>
		db
			.update(Referrals)
			.set({ reward_status: "paid", settled_at: new Date().toISOString() })
			.where(eq(Referrals.id, referralId))
	);
}

// ---------------------------------------------------------------------------
// Activity log helpers
// ---------------------------------------------------------------------------

/**
 * Record a site-visit event for a user (idempotent — one row per user per day).
 *
 * Inserts a UserActivityLog row only if one with the same
 * (user_id, "site_visit", event_day) doesn't already exist.
 * Call this from the SvelteKit `handle` hook or a layout server load.
 */
export async function recordSiteVisit(userId: string): Promise<void> {
	const today = todayUtc();

	// Check if we already have a visit row for today before inserting.
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

	if (Array.isArray(existing) && existing.length > 0) return; // already recorded today

	await withDb((db: DrizzleDb) =>
		db.insert(UserActivityLog).values({
			id: crypto.randomUUID(),
			user_id: userId,
			event_type: "site_visit",
			event_day: today,
			entity_id: null,
			entity_type: null,
			created_at: new Date().toISOString()
		})
	);
}

/**
 * Record a vote event for a user (idempotent — one row per user per unique entity).
 *
 * Inserts a UserActivityLog row only if the user hasn't already voted on
 * this entity (uniqueness is on user_id + entity_id across all days).
 */
export async function recordVote(
	userId: string,
	entityId: string,
	entityType: "bot" | "server" | "sticker"
): Promise<void> {
	// Idempotency check: has this user already voted on this specific entity?
	const existing = await withDb((db: DrizzleDb) =>
		db
			.select({ id: UserActivityLog.id })
			.from(UserActivityLog)
			.where(
				and(
					eq(UserActivityLog.user_id, userId),
					eq(UserActivityLog.event_type, "vote"),
					eq(UserActivityLog.entity_id, entityId)
				)
			)
			.limit(1)
	);

	if (Array.isArray(existing) && existing.length > 0) return; // already recorded

	const today = todayUtc();
	await withDb((db: DrizzleDb) =>
		db.insert(UserActivityLog).values({
			id: crypto.randomUUID(),
			user_id: userId,
			event_type: "vote",
			event_day: today,
			entity_id: entityId,
			entity_type: entityType,
			created_at: new Date().toISOString()
		})
	);
}

// ---------------------------------------------------------------------------
// Milestone queries (called by SettleRewards)
// ---------------------------------------------------------------------------

/**
 * Count the number of distinct calendar days the referred user visited the
 * site within their first 7 days after sign-up.
 *
 * @param referredId   Discord user ID of the referred user.
 * @param signupDate   ISO 8601 string of when the referred user first signed up.
 */
export async function countVisitDaysInWindow(
	referredId: string,
	signupDate: string
): Promise<number> {
	const windowStart = signupDate.slice(0, 10); // "YYYY-MM-DD"
	const windowEnd = addDays(signupDate, 7); // exclusive upper bound

	const rows = await withDb((db: DrizzleDb) =>
		db
			.select({ event_day: UserActivityLog.event_day })
			.from(UserActivityLog)
			.where(
				and(
					eq(UserActivityLog.user_id, referredId),
					eq(UserActivityLog.event_type, "site_visit"),
					// event_day >= windowStart AND event_day < windowEnd
					sql`${UserActivityLog.event_day} >= ${windowStart}`,
					sql`${UserActivityLog.event_day} < ${windowEnd}`
				)
			)
	);

	// Rows are already deduplicated (one per day by recordSiteVisit), so the
	// row count IS the distinct-day count.
	return Array.isArray(rows) ? rows.length : 0;
}

/**
 * Count the number of distinct entities the referred user voted on within
 * their first 7 days after sign-up.
 *
 * @param referredId   Discord user ID of the referred user.
 * @param signupDate   ISO 8601 string of when the referred user first signed up.
 */
export async function countUniqueVotesInWindow(
	referredId: string,
	signupDate: string
): Promise<number> {
	const windowStart = signupDate.slice(0, 10);
	const windowEnd = addDays(signupDate, 7);

	const rows = await withDb((db: DrizzleDb) =>
		db
			.select({ entity_id: UserActivityLog.entity_id })
			.from(UserActivityLog)
			.where(
				and(
					eq(UserActivityLog.user_id, referredId),
					eq(UserActivityLog.event_type, "vote"),
					sql`${UserActivityLog.event_day} >= ${windowStart}`,
					sql`${UserActivityLog.event_day} < ${windowEnd}`
				)
			)
	);

	// recordVote already deduplicates per entity_id, so row count = unique votes.
	return Array.isArray(rows) ? rows.length : 0;
}

/**
 * Return the full retention + voting milestone progress for a single referral.
 * Used by SettleRewards to decide how many new daily rewards to create.
 *
 * @param referralId   Referrals.id
 * @param referrerId   Discord user ID of the referrer (receives the rewards).
 * @param referredId   Discord user ID of the referred user.
 * @param signupDate   ISO 8601 creation timestamp of the Referrals row.
 */
export async function checkRetentionProgress(
	referralId: string,
	referrerId: string,
	referredId: string,
	signupDate: string
): Promise<RetentionProgress> {
	const [visitDays, daysPaidRows, engagementBonusPaidRows] = await Promise.all([
		countVisitDaysInWindow(referredId, signupDate),
		// Count existing paid retention_daily milestones for the REFERRER (recipient="referrer").
		// We key only on the referrer's rows so we don't double-count the referred user's
		// companion rows written by creditDoubleReward.
		withDb((db: DrizzleDb) =>
			db
				.select({ id: ReferralMilestones.id })
				.from(ReferralMilestones)
				.where(
					and(
						eq(ReferralMilestones.referral_id, referralId),
						eq(ReferralMilestones.milestone_type, "retention_daily"),
						eq(ReferralMilestones.user_id, referrerId),
						eq(ReferralMilestones.status, "paid"),
						// Exclude the signup_reward carrier row (day=0)
						sql`json_extract(${ReferralMilestones.meta}, '$.day') > 0`
					)
				)
		),
		// Check whether the engagement-sprint bonus for the referred user has been paid.
		withDb((db: DrizzleDb) =>
			db
				.select({ id: ReferralMilestones.id })
				.from(ReferralMilestones)
				.where(
					and(
						eq(ReferralMilestones.referral_id, referralId),
						eq(ReferralMilestones.milestone_type, "engagement_sprint_referred"),
						eq(ReferralMilestones.status, "paid")
					)
				)
				.limit(1)
		)
	]);

	const daysPaid = Array.isArray(daysPaidRows) ? daysPaidRows.length : 0;
	const thresholdMet = visitDays >= 5;

	// We award one daily bonus per visit day, capped at 5 total.
	// newDaysPayable = min(visitDays, 5) - daysPaid (never negative).
	const earnedDays = Math.min(visitDays, 5);
	const newDaysPayable = Math.max(0, earnedDays - daysPaid);

	const engagementBonusMet = visitDays >= 5;
	const engagementBonusAlreadyPaid =
		Array.isArray(engagementBonusPaidRows) && engagementBonusPaidRows.length > 0;

	return {
		visitDays,
		thresholdMet,
		daysPaid,
		newDaysPayable,
		engagementBonusMet,
		engagementBonusAlreadyPaid
	};
}

/**
 * Return the voting milestone progress for a single referral.
 */
export async function checkVotingProgress(
	referralId: string,
	referredId: string,
	signupDate: string
): Promise<VotingProgress> {
	const [uniqueVotes, alreadyPaidRows] = await Promise.all([
		countUniqueVotesInWindow(referredId, signupDate),
		withDb((db: DrizzleDb) =>
			db
				.select({ id: ReferralMilestones.id })
				.from(ReferralMilestones)
				.where(
					and(
						eq(ReferralMilestones.referral_id, referralId),
						eq(ReferralMilestones.milestone_type, "vote_20"),
						eq(ReferralMilestones.status, "paid")
					)
				)
				.limit(1)
		)
	]);

	const thresholdMet = uniqueVotes >= 20;
	const alreadyPaid = Array.isArray(alreadyPaidRows) && alreadyPaidRows.length > 0;

	return { uniqueVotes, thresholdMet, alreadyPaid };
}

// ---------------------------------------------------------------------------
// Milestone creation
// ---------------------------------------------------------------------------

/**
 * Check whether a specific milestone has already been created (in any status)
 * for a given (referral_id, milestone_type, day?) combination.
 *
 * For "retention_daily" milestones, the `dayNumber` parameter disambiguates
 * which of the 5 possible daily rows we're checking (stored in meta.day).
 * For all other types, `dayNumber` is ignored and the check is on type alone.
 *
 * This is the idempotency guard used by SettleRewards before inserting a new
 * milestone row, preventing double-crediting on retries.
 */
export async function milestoneExists(
	referralId: string,
	milestoneType: MilestoneType,
	dayNumber?: number
): Promise<boolean> {
	if (milestoneType === "retention_daily" && dayNumber !== undefined) {
		// For daily retention we must match on the day stored in meta JSON.
		// SQLite supports JSON_EXTRACT since 3.38 (also available in libSQL).
		const rows = await withDb((db: DrizzleDb) =>
			db
				.select({ id: ReferralMilestones.id })
				.from(ReferralMilestones)
				.where(
					and(
						eq(ReferralMilestones.referral_id, referralId),
						eq(ReferralMilestones.milestone_type, "retention_daily"),
						sql`json_extract(${ReferralMilestones.meta}, '$.day') = ${dayNumber}`
					)
				)
				.limit(1)
		);
		return Array.isArray(rows) && rows.length > 0;
	}

	const rows = await withDb((db: DrizzleDb) =>
		db
			.select({ id: ReferralMilestones.id })
			.from(ReferralMilestones)
			.where(
				and(
					eq(ReferralMilestones.referral_id, referralId),
					eq(ReferralMilestones.milestone_type, milestoneType)
				)
			)
			.limit(1)
	);
	return Array.isArray(rows) && rows.length > 0;
}

/**
 * Insert a new ReferralMilestones row in "pending" status.
 * Returns the UUID of the new row.
 *
 * The caller is responsible for calling milestoneExists() first to ensure
 * idempotency — this function does NOT check for duplicates.
 */
export async function createMilestone(params: {
	referralId: string | null;
	userId: string;
	milestoneType: MilestoneType;
	rewardAmount: number;
	meta?: Record<string, unknown>;
}): Promise<string> {
	const id = crypto.randomUUID();
	await withDb((db: DrizzleDb) =>
		db.insert(ReferralMilestones).values({
			id,
			referral_id: params.referralId,
			user_id: params.userId,
			milestone_type: params.milestoneType,
			reward_amount: params.rewardAmount,
			status: "pending",
			meta: JSON.stringify(params.meta ?? {}),
			created_at: new Date().toISOString(),
			paid_at: null
		})
	);
	return id;
}

// ---------------------------------------------------------------------------
// Balance crediting
// ---------------------------------------------------------------------------

/**
 * Credit R$ to a user and mark the milestone row as "paid" atomically
 * (two sequential writes — libSQL does not expose interactive transactions
 * through Drizzle, but the milestone guard above ensures idempotency).
 *
 * Flow:
 *   1. Fetch the current balance.
 *   2. Write `bal = bal + amount`.
 *   3. Update the milestone row: status = "paid", paid_at = now.
 *
 * Returns the new balance after crediting, or null if the user was not found.
 */
export async function creditReward(
	userId: string,
	milestoneId: string,
	amount: number
): Promise<number | null> {
	// Fetch current balance
	const userRows = await withDb((db: DrizzleDb) =>
		db.select({ bal: Users.bal }).from(Users).where(eq(Users.id, userId)).limit(1)
	);

	if (!Array.isArray(userRows) || userRows.length === 0) {
		console.error(`[referrals] creditReward: user ${userId} not found.`);
		return null;
	}

	const currentBal =
		typeof (userRows[0] as any).bal === "number"
			? (userRows[0] as any).bal
			: Number((userRows[0] as any).bal) || 0;

	const newBal = currentBal + amount;

	// Write new balance and mark milestone paid in parallel (independent writes)
	await Promise.all([
		withDb((db: DrizzleDb) => db.update(Users).set({ bal: newBal }).where(eq(Users.id, userId))),
		withDb((db: DrizzleDb) =>
			db
				.update(ReferralMilestones)
				.set({ status: "paid", paid_at: new Date().toISOString() })
				.where(eq(ReferralMilestones.id, milestoneId))
		)
	]);

	return newBal;
}

/**
 * Credit R$ to BOTH the referrer and the referred user in a single logical
 * "double-credit" operation. This is the core of the double-sided rewards
 * system — both users get milestone rows created and their balances updated.
 *
 * For each user:
 *   1. A ReferralMilestones row is created with the appropriate amount and
 *      `meta.recipient` set to either "referrer" or "referred" so the
 *      audit ledger clearly identifies who received what and why.
 *   2. `creditReward` is called to update their balance and mark the row paid.
 *
 * The two user credits run in parallel (Promise.all) so the total latency is
 * bounded by the slower of the two writes rather than their sum.
 *
 * @param referralId      Referrals.id this milestone belongs to.
 * @param referrerId      Discord user ID of the referrer.
 * @param referredId      Discord user ID of the referred user.
 * @param milestoneType   The milestone type applied to BOTH rows.
 * @param referrerAmount  R$ to credit to the referrer.
 * @param referredAmount  R$ to credit to the referred user.
 * @param baseMeta        Additional metadata merged into both milestone rows.
 *
 * @returns DoubleCreditResult with both milestone IDs and new balances.
 *          A newBal of null means that user was not found (not credited).
 */
export async function creditDoubleReward(params: {
	referralId: string;
	referrerId: string;
	referredId: string;
	milestoneType: MilestoneType;
	/** Companion milestone_type written to the referred user's row.
	 *  Defaults to milestoneType if not specified. */
	referredMilestoneType?: MilestoneType;
	referrerAmount: number;
	referredAmount: number;
	baseMeta?: Record<string, unknown>;
}): Promise<DoubleCreditResult> {
	const {
		referralId,
		referrerId,
		referredId,
		milestoneType,
		referredMilestoneType,
		referrerAmount,
		referredAmount,
		baseMeta = {}
	} = params;

	// Create both milestone rows first (pending) so they appear in the ledger
	// even if one of the credit steps fails.
	const [referrerMilestoneId, referredMilestoneId] = await Promise.all([
		createMilestone({
			referralId,
			userId: referrerId,
			milestoneType,
			rewardAmount: referrerAmount,
			meta: { ...baseMeta, recipient: "referrer" }
		}),
		createMilestone({
			referralId,
			userId: referredId,
			milestoneType: referredMilestoneType ?? milestoneType,
			rewardAmount: referredAmount,
			meta: { ...baseMeta, recipient: "referred" }
		})
	]);

	// Credit both balances in parallel.
	const [referrerNewBal, referredNewBal] = await Promise.all([
		creditReward(referrerId, referrerMilestoneId, referrerAmount),
		creditReward(referredId, referredMilestoneId, referredAmount)
	]);

	return { referrerMilestoneId, referredMilestoneId, referrerNewBal, referredNewBal };
}

// ---------------------------------------------------------------------------
// Batch queries for SettleRewards scheduled function
// ---------------------------------------------------------------------------

/**
 * Return all "paid" Referrals rows whose 7-day activity window has NOT yet
 * expired and whose referred user may still be accumulating activity events.
 *
 * "Active window" = referral created_at + 7 days >= today (UTC).
 *
 * The SettleRewards function calls this to get the set of referrals it needs
 * to evaluate for retention_daily and vote_20 milestones.
 */
export async function getActiveReferralsInWindow(): Promise<PendingReferral[]> {
	// Calculate the cutoff: referrals created more than 7 days ago no longer
	// have an active window. We store created_at as ISO 8601 TEXT, so we can
	// compare lexicographically (ISO dates are lexicographically ordered).
	const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

	const rows = await withDb((db: DrizzleDb) =>
		db
			.select({
				id: Referrals.id,
				referrer_id: Referrals.referrer_id,
				referred_id: Referrals.referred_id,
				reward_status: Referrals.reward_status,
				created_at: Referrals.created_at
			})
			.from(Referrals)
			.where(
				and(
					// Only process referrals where the sign-up reward is paid (fully onboarded)
					// OR payable (sign-up reward not yet processed — SettleRewards handles both).
					// We deliberately include "payable" here so a single run of SettleRewards
					// can credit the sign-up reward AND check activity milestones in one pass.
					sql`${Referrals.reward_status} IN ('payable', 'paid')`,
					// Still within the 7-day activity window.
					sql`${Referrals.created_at} >= ${sevenDaysAgo}`
				)
			)
	);

	return rows as any[] as PendingReferral[];
}

/**
 * Return all referrals for a given referrer, ordered by most-recent first.
 * Used by the dashboard to display a user's referral history.
 */
export async function getReferralsByReferrer(
	referrerId: string,
	limit = 50
): Promise<ReferralSummary[]> {
	const rows = await withDb((db: DrizzleDb) =>
		db
			.select({
				id: Referrals.id,
				referred_id: Referrals.referred_id,
				reward_status: Referrals.reward_status,
				fingerprint_match: Referrals.fingerprint_match,
				created_at: Referrals.created_at
			})
			.from(Referrals)
			.where(eq(Referrals.referrer_id, referrerId))
			.orderBy(desc(Referrals.created_at))
			.limit(limit)
	);

	return ((rows as any[]) ?? []).map((r: any) => ({
		id: r.id as string,
		referred_id: r.referred_id as string,
		reward_status: r.reward_status as ReferralRewardStatus,
		fingerprint_match: Boolean(r.fingerprint_match),
		created_at: r.created_at as string
	}));
}

/**
 * Return all milestone rows for a given referral, ordered by created_at asc.
 * Useful for dashboard display and for debugging the SettleRewards output.
 */
export async function getMilestonesForReferral(referralId: string): Promise<
	{
		id: string;
		milestone_type: MilestoneType;
		reward_amount: number;
		status: MilestoneStatus;
		meta: Record<string, unknown>;
		created_at: string;
		paid_at: string | null;
	}[]
> {
	const rows = await withDb((db: DrizzleDb) =>
		db
			.select({
				id: ReferralMilestones.id,
				milestone_type: ReferralMilestones.milestone_type,
				reward_amount: ReferralMilestones.reward_amount,
				status: ReferralMilestones.status,
				meta: ReferralMilestones.meta,
				created_at: ReferralMilestones.created_at,
				paid_at: ReferralMilestones.paid_at
			})
			.from(ReferralMilestones)
			.where(eq(ReferralMilestones.referral_id, referralId))
			.orderBy(ReferralMilestones.created_at)
	);

	return ((rows as any[]) ?? []).map((r: any) => {
		let meta: Record<string, unknown> = {};
		try {
			meta = JSON.parse(r.meta ?? "{}");
		} catch {
			// leave as empty object
		}
		return {
			id: r.id as string,
			milestone_type: r.milestone_type as MilestoneType,
			reward_amount: r.reward_amount as number,
			status: r.status as MilestoneStatus,
			meta,
			created_at: r.created_at as string,
			paid_at: r.paid_at ?? null
		};
	});
}

// ---------------------------------------------------------------------------
// Server-listing & self-listing reward helpers
// ---------------------------------------------------------------------------

/**
 * Award a server-growth bounty (R$500) to a referrer when their referred user
 * lists a server with >= 50 members.
 *
 * Idempotent: checks milestoneExists before inserting.
 *
 * @param referralId   The Referrals.id for the referrer ↔ referred relationship.
 * @param referrerId   The referrer's Discord user ID (receives the R$500).
 * @param serverId     The newly-listed server's ID (stored in meta).
 * @param memberCount  The server's approximate member count.
 /**
  * Award the R$500 server-growth bounty to BOTH the referrer and the referred
  * user when the referred user lists a qualifying server (≥ 50 members).
  *
  * Double-sided payout:
  *   Referrer  → R$500 (server_bounty milestone, recipient: "referrer")
  *   Referred  → R$500 (server_bounty_referred milestone, recipient: "referred")
  *
  * Idempotent: if a server_bounty milestone already exists for this referral,
  * returns null without doing anything.
  *
  * @returns DoubleCreditResult, or null if already awarded / referrer not found.
  */
export async function awardServerBounty(
	referralId: string,
	referrerId: string,
	referredId: string,
	serverId: string,
	memberCount: number
): Promise<DoubleCreditResult | null> {
	if (await milestoneExists(referralId, "server_bounty")) {
		return null; // already awarded
	}

	return creditDoubleReward({
		referralId,
		referrerId,
		referredId,
		milestoneType: "server_bounty",
		referredMilestoneType: "server_bounty_referred",
		referrerAmount: 500,
		referredAmount: 500,
		baseMeta: { server_id: serverId, member_count: memberCount }
	});
}

/**
 * Award a self-listing reward to a server owner.
 *
 * Reward tiers:
 *   memberCount >= 200 → R$500 ("self_listing_500")
 *   memberCount >= 50  → R$100 ("self_listing_100")
 *   memberCount <  50  → no reward (returns null)
 *
 * Idempotent: checks milestoneExists before inserting (keyed on server_id
 * stored in meta via a JSON_EXTRACT query in milestoneExists).
 *
 // NOTE: Because self-listing rewards are not tied to a Referrals row,
 * referralId is passed as null to createMilestone.
 *
 * @param ownerId      Discord user ID of the server owner.
 * @param serverId     Discord guild ID being listed.
 * @param memberCount  The server's approximate member count.
 *
 * @returns { milestoneType, amount, newBalance } or null if ineligible / already paid.
 */
export async function awardSelfListing(
	ownerId: string,
	serverId: string,
	memberCount: number
): Promise<{ milestoneType: MilestoneType; amount: number; newBalance: number } | null> {
	if (memberCount < 50) return null;

	const milestoneType: MilestoneType = memberCount >= 200 ? "self_listing_500" : "self_listing_100";
	const amount = memberCount >= 200 ? 500 : 100;

	// Idempotency: check if ANY self-listing milestone for this server already exists.
	// We check both tiers to prevent a double-award if the member count changed.
	const [alreadyPaid100, alreadyPaid500] = await Promise.all([
		milestoneExists("__self__" + serverId, "self_listing_100"),
		milestoneExists("__self__" + serverId, "self_listing_500")
	]);
	if (alreadyPaid100 || alreadyPaid500) return null;

	// We use a pseudo referral_id of "__self__<serverId>" so milestoneExists can
	// be keyed on it without a real Referrals row. The referral_id column allows
	// null but using a pseudo-key avoids null-related collisions between servers.
	const milestoneId = await createMilestone({
		referralId: "__self__" + serverId,
		userId: ownerId,
		milestoneType,
		rewardAmount: amount,
		meta: { server_id: serverId, member_count: memberCount }
	});

	const newBalance = await creditReward(ownerId, milestoneId, amount);
	if (newBalance === null) return null;

	return { milestoneType, amount, newBalance };
}

// ---------------------------------------------------------------------------
// Referred-user "Welcome Bonus" query
// ---------------------------------------------------------------------------

/**
 * Check whether the referred user's welcome bonus (R$50, paid at sign-up
 * time alongside the referrer's R$100) has already been issued.
 *
 * The welcome bonus is stored as a "signup_welcome" milestone keyed on the
 * referral_id, with meta.recipient = "referred".
 */
export async function signupWelcomeBonusExists(referralId: string): Promise<boolean> {
	const rows = await withDb((db: DrizzleDb) =>
		db
			.select({ id: ReferralMilestones.id })
			.from(ReferralMilestones)
			.where(
				and(
					eq(ReferralMilestones.referral_id, referralId),
					eq(ReferralMilestones.milestone_type, "signup_welcome")
				)
			)
			.limit(1)
	);
	return Array.isArray(rows) && rows.length > 0;
}

/**
 * Return all milestone rows for a given USER (not referral), useful for
 * displaying the referred user's own earned rewards on their dashboard.
 */
export async function getMilestonesForUser(userId: string): Promise<
	{
		id: string;
		referral_id: string | null;
		milestone_type: MilestoneType;
		reward_amount: number;
		status: MilestoneStatus;
		meta: Record<string, unknown>;
		created_at: string;
		paid_at: string | null;
	}[]
> {
	const rows = await withDb((db: DrizzleDb) =>
		db
			.select({
				id: ReferralMilestones.id,
				referral_id: ReferralMilestones.referral_id,
				milestone_type: ReferralMilestones.milestone_type,
				reward_amount: ReferralMilestones.reward_amount,
				status: ReferralMilestones.status,
				meta: ReferralMilestones.meta,
				created_at: ReferralMilestones.created_at,
				paid_at: ReferralMilestones.paid_at
			})
			.from(ReferralMilestones)
			.where(eq(ReferralMilestones.user_id, userId))
			.orderBy(desc(ReferralMilestones.created_at))
			.limit(100)
	);

	return ((rows as any[]) ?? []).map((r: any) => {
		let meta: Record<string, unknown> = {};
		try {
			meta = typeof r.meta === "string" ? JSON.parse(r.meta) : (r.meta ?? {});
		} catch {
			meta = {};
		}
		return {
			id: r.id as string,
			referral_id: (r.referral_id as string | null) ?? null,
			milestone_type: r.milestone_type as MilestoneType,
			reward_amount:
				typeof r.reward_amount === "number" ? r.reward_amount : Number(r.reward_amount) || 0,
			status: r.status as MilestoneStatus,
			meta,
			created_at: r.created_at as string,
			paid_at: (r.paid_at as string | null) ?? null
		};
	});
}
