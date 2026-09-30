/**
 * src/lib/economy.ts
 *
 * Pure helpers + tuning constants for the R$ engagement economy.
 *
 * Design constraints (free tiers, no pay-to-win):
 *  - All amounts are small; daily caps bound total issuance per user.
 *  - Votes stay pure: coin-spent votes never touch leaderboard rank and
 *    never earn R$ (only time-based cooldown votes earn).
 *  - Every credit/debit is idempotent at the DB layer via the
 *    milestoneExists pattern in $lib/db/queries/referrals.
 *  - Check-in / vote-earn settle inside the existing daily settle-rewards
 *    cron (no new schedulers); one-off bounties settle inline (rare).
 *
 * This module is intentionally side-effect free so it can be unit-tested
 * without a database.
 */

/** Single source of truth for R$ tuning. Change amounts/caps here. */
export const ECONOMY = {
	/** Daily check-in base payout (per distinct site_visit day). */
	CHECKIN_BASE: 5,
	/** Extra R$ per consecutive streak day beyond day 1. */
	CHECKIN_STREAK_BONUS: 1,
	/** Max check-in payout per day (base + streak bonus, capped). */
	CHECKIN_DAILY_CAP: 10,
	/** R$ earned per time-based (cooldown) vote. Coin votes earn nothing. */
	VOTE_EARN: 2,
	/** Max paid votes per user per UTC day. */
	VOTE_EARN_DAILY_MAX: 5,
	/** One-time bounty for completing profile (custom bio + banner). */
	PROFILE_BOUNTY: 25,
	/** One-time bounty for submitting your first bot listing. */
	LISTING_BOUNTY: 50,
	/** Cosmetic spend catalogue: item key → R$ cost. Cosmetic only. */
	SPENDS: {
		profile_border: 100,
		listing_accent: 150,
		rising_slot: 200
	} as Record<string, number>,
	/** Minimum fingerprint trust_score required for check-in payout. */
	CHECKIN_MIN_TRUST: 30,
	/** R$ cost of 1 week of Premium (Sponsored pin) for one bot/server. */
	PREMIUM_WEEK_COST: 1000,
	/** Premium duration in days per purchase. */
	PREMIUM_WEEK_DAYS: 7
} as const;

export type SpendKind = keyof typeof ECONOMY.SPENDS;

/** All known earn-side milestone types owned by the engagement economy. */
export const EARN_TYPES = [
	"checkin_daily",
	"vote_earn",
	"profile_bounty",
	"listing_bounty"
] as const;

/**
 * Format a Date as UTC "YYYY-MM-DD" (the event_day key used by
 * UserActivityLog and earn-milestone meta).
 */
export function toDayKey(d: Date): string {
	return d.toISOString().slice(0, 10);
}

/** Shift a "YYYY-MM-DD" key by n days (UTC), returning a new key. */
export function shiftDayKey(dayKey: string, n: number): string {
	const d = new Date(dayKey + "T00:00:00.000Z");
	d.setUTCDate(d.getUTCDate() + n);
	return d.toISOString().slice(0, 10);
}

/**
 * Count the current consecutive-day streak from a list of distinct
 * "YYYY-MM-DD" visit days. The streak counts back from `todayKey`;
 * a missing today is tolerated when yesterday is present (user simply
 * hasn't visited yet today - streak is still alive).
 *
 * Pure: inputs are plain arrays, no DB access.
 */
export function calcStreak(visitDays: string[], todayKey: string): number {
	const set = new Set(visitDays);
	let streak = 0;
	// Start at today; if today is missing, start at yesterday (alive streak).
	let cursor = set.has(todayKey) ? todayKey : shiftDayKey(todayKey, -1);
	if (!set.has(cursor)) return 0;
	while (set.has(cursor)) {
		streak++;
		cursor = shiftDayKey(cursor, -1);
	}
	return streak;
}

/**
 * R$ payout for a check-in given the user's streak length (after
 * including today). Base + bonus per extra streak day, capped.
 */
export function checkinRewardForStreak(streakDays: number): number {
	if (streakDays <= 0) return 0;
	const raw =
		ECONOMY.CHECKIN_BASE + (streakDays - 1) * ECONOMY.CHECKIN_STREAK_BONUS;
	return Math.min(raw, ECONOMY.CHECKIN_DAILY_CAP);
}

/**
 * How many of today's votes are still payable given how many vote_earn
 * rows were already credited today. Never negative.
 */
export function payableVotesToday(votesCastToday: number, alreadyPaidToday: number): number {
	const remaining = ECONOMY.VOTE_EARN_DAILY_MAX - alreadyPaidToday;
	if (remaining <= 0) return 0;
	return Math.min(Math.max(0, votesCastToday), remaining);
}

/** R$ for n payable votes. */
export function voteEarnForCount(payableVotes: number): number {
	return Math.max(0, payableVotes) * ECONOMY.VOTE_EARN;
}

/**
 * A profile counts as "complete" for the bounty when the user has set a
 * custom bio (anything other than the default placeholder/empty) AND a
 * banner (custom URL or Discord-synced hash).
 */
export function isProfileComplete(bio: string | null, banner: string | null): boolean {
	const DEFAULT_BIO = "The user doesn't have bio set!";
	const bioOk =
		typeof bio === "string" && bio.trim().length > 0 && bio.trim() !== DEFAULT_BIO;
	const bannerOk = typeof banner === "string" && banner.trim().length > 0;
	return bioOk && bannerOk;
}

/** Cost of a cosmetic spend kind, or null when the kind is unknown. */
export function spendCost(kind: string): number | null {
	const cost = (ECONOMY.SPENDS as Record<string, number>)[kind];
	return typeof cost === "number" ? cost : null;
}

/** True when `bal` covers `cost` (cost must be positive). */
export function canAfford(bal: number, cost: number): boolean {
	return cost > 0 && bal >= cost;
}

/** ISO expiry timestamp for a premium purchase (`weeks` × 7 days from `from`). */
export function premiumWeekExpiry(from: Date = new Date(), weeks = 1): string {
	const d = new Date(from.getTime());
	d.setUTCDate(d.getUTCDate() + ECONOMY.PREMIUM_WEEK_DAYS * Math.max(1, weeks));
	return d.toISOString();
}

/** Extend an existing premium expiry by `weeks` (or start now when expired/absent). */
export function extendPremiumExpiry(
	currentUntil: string | null,
	weeks = 1,
	now: Date = new Date()
): string {
	if (currentUntil) {
		const cur = new Date(currentUntil);
		if (!isNaN(cur.getTime()) && cur.getTime() > now.getTime()) {
			return premiumWeekExpiry(cur, weeks);
		}
	}
	return premiumWeekExpiry(now, weeks);
}

/** True when a `promoted_until` ISO timestamp is still in the future (NULL = legacy permanent). */
export function isPremiumActive(promotedUntil: string | null, now: Date = new Date()): boolean {
	if (promotedUntil === null || promotedUntil === undefined) return true;
	const t = new Date(promotedUntil).getTime();
	return !isNaN(t) && t > now.getTime();
}
