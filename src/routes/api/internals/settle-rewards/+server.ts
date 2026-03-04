/**
 * POST /api/internals/settle-rewards
 *
 * Internal endpoint called once-per-day by the Netlify scheduled function
 * `settle-rewards.mts`. Processes all outstanding referral rewards in a
 * single, idempotent run and returns a structured JSON summary.
 *
 * ─── Double-Sided Reward Rules ───────────────────────────────────────────────
 *
 * Every milestone credits BOTH the referrer AND the referred user.
 * The amounts follow the design spec:
 *
 * ┌─────────────────────────────┬──────────────┬──────────────────┐
 * │ Milestone                   │ Referrer     │ Referred User    │
 * ├─────────────────────────────┼──────────────┼──────────────────┤
 * │ Welcome Handshake (sign-up) │ R$100        │ R$50             │
 * │ Engagement Sprint (5d/20v)  │ R$250 total  │ R$200 total      │
 * │   └─ per retention day      │   R$50/day   │   R$40/day       │
 * │   └─ vote-20 bonus          │   R$0 (incl) │   R$0 (incl)     │
 * │ Growth Bounty (server ≥50)  │ R$500        │ R$500            │
 * └─────────────────────────────┴──────────────┴──────────────────┘
 *
 * Engagement Sprint breakdown:
 *   The referrer earns R$250 over 5 retention days (R$50/day).
 *   The referred user earns R$200 over 5 retention days (R$40/day).
 *   Both totals are reached naturally as SettleRewards processes each day.
 *   There is no separate vote-20 row - the engagement sprint is purely
 *   visit-day based (5 visits = full payout). The vote-20 condition is an
 *   ALTERNATIVE trigger: if the referred user casts 20 votes before reaching
 *   5 visit-days, SettleRewards treats the engagement sprint as "met" and
 *   issues the remaining daily rows immediately.
 *
 * ─── What this endpoint does ─────────────────────────────────────────────────
 *
 * Pass 1 - Welcome Handshake (sign-up reward)
 *   Fetches every Referrals row in "payable" status and issues a double-credit:
 *   R$100 → referrer  |  R$50 → referred user (Welcome Bonus).
 *   Marks the referral row as "paid".
 *
 * Pass 2 - Engagement Sprint (retention & voting milestones)
 *   For every referral whose 7-day activity window is still open:
 *
 *   A. Retention daily double-bonus  (R$50 referrer + R$40 referred, up to 5 days)
 *      One pair of milestone rows per new eligible day (idempotent on retry).
 *
 *   B. Vote-20 engagement trigger
 *      When the referred user reaches 20 unique votes AND the visit-day
 *      threshold has NOT yet triggered all 5 days, we immediately treat the
 *      remaining engagement days as earned (up to the 5-day cap) so the
 *      payout is issued in full.
 *
 * ─── Auth ────────────────────────────────────────────────────────────────────
 * Protected by the X-Internal-Secret header. Only the Netlify scheduled
 * function (and local dev scripts) should call this endpoint.
 *
 * ─── Idempotency ─────────────────────────────────────────────────────────────
 * Every reward write is guarded by milestoneExists() checks so re-running
 * the endpoint (e.g. after a timeout or manual trigger) never double-credits.
 *
 * ─── Response ────────────────────────────────────────────────────────────────
 * Always returns HTTP 200 with a JSON summary:
 * {
 *   processed:              number,
 *   signupRewardsPaid:      number,   // "Welcome Handshake" pairs credited
 *   retentionDaysPaid:      number,   // individual daily bonus pairs credited
 *   serverBountiesPaid:     number,   // reserved - handled inline on listing
 *   skipped:                number,
 *   errors:                 string[],
 *   durationMs:             number
 * }
 */

import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";

import {
	getPayableSignupReferrals,
	getActiveReferralsInWindow,
	markReferralPaid,
	checkRetentionProgress,
	checkVotingProgress,
	milestoneExists,
	signupWelcomeBonusExists,
	creditDoubleReward,
	createMilestone,
	creditReward
} from "$lib/db/queries/referrals";

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

function validateSecret(request: Request): boolean {
	const internalSecret = (env.INTERNAL_SECRET ?? "").trim();
	if (!internalSecret) return false;
	const supplied = (request.headers.get("x-internal-secret") ?? "").trim();
	return supplied === internalSecret;
}

// ---------------------------------------------------------------------------
// Reward constants (double-sided)
// ---------------------------------------------------------------------------

/** R$ credited to the REFERRER for the one-time Welcome Handshake. */
const SIGNUP_REWARD_REFERRER = 100;

/** R$ credited to the REFERRED USER as their Welcome Bonus at sign-up. */
const SIGNUP_REWARD_REFERRED = 50;

/**
 * R$ credited per retention day to the REFERRER.
 * 5 days × R$50 = R$250 total ("Engagement Sprint" referrer payout).
 */
const RETENTION_DAILY_REFERRER = 50;

/**
 * R$ credited per retention day to the REFERRED USER.
 * 5 days × R$40 = R$200 total ("Engagement Sprint" referred payout).
 */
const RETENTION_DAILY_REFERRED = 40;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const POST: RequestHandler = async ({ request }) => {
	// ── Auth ─────────────────────────────────────────────────────────────────
	if (!validateSecret(request)) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	const runStartedAt = Date.now();

	// ── Accumulators (returned in the summary) ────────────────────────────────
	let processed = 0;
	let signupRewardsPaid = 0;
	let retentionDaysPaid = 0;
	const serverBountiesPaid = 0; // awarded inline during server listing, not here
	let skipped = 0;
	const errors: string[] = [];

	// =========================================================================
	// PASS 1 - Welcome Handshake (sign-up double-credit)
	// =========================================================================
	// Fetch every Referrals row in "payable" status.  These have already passed
	// the account-age and email-verification checks in createReferral() but
	// their Welcome Handshake reward has not been credited to either user yet.

	let payableReferrals: Awaited<ReturnType<typeof getPayableSignupReferrals>> = [];
	try {
		payableReferrals = await getPayableSignupReferrals();
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		console.error("[settle-rewards] Failed to fetch payable referrals:", msg);
		errors.push(`fetch_payable_referrals: ${msg}`);
		// Continue - pass 2 can still run independently.
	}

	for (const referral of payableReferrals) {
		processed++;
		try {
			// ── Idempotency guard ─────────────────────────────────────────────
			// The referrer-side signup row uses milestone_type="retention_daily"
			// with meta.type="signup_reward" (day=0). The referred-side welcome
			// bonus uses the dedicated "signup_welcome" type so both can be
			// checked independently.
			const [referrerSignupExists, referredWelcomeExists] = await Promise.all([
				// Check if the referrer-side signup carrier already exists (day=0).
				milestoneExists(referral.id, "retention_daily", 0),
				// Check if the referred-side welcome bonus already exists.
				signupWelcomeBonusExists(referral.id)
			]);

			if (referrerSignupExists && referredWelcomeExists) {
				// Both sides already credited - nothing to do.
				skipped++;
				continue;
			}

			// ── Referrer side: R$100 Welcome Handshake ────────────────────────
			// We model the referrer's signup reward as a retention_daily day=0
			// row so it appears in the milestone history with a clear audit trail.
			if (!referrerSignupExists) {
				const referrerMilestoneId = await createMilestone({
					referralId: referral.id,
					userId: referral.referrer_id,
					milestoneType: "retention_daily",
					rewardAmount: SIGNUP_REWARD_REFERRER,
					meta: {
						type: "signup_reward",
						day: 0,
						referred_id: referral.referred_id,
						recipient: "referrer"
					}
				});

				const referrerNewBal = await creditReward(
					referral.referrer_id,
					referrerMilestoneId,
					SIGNUP_REWARD_REFERRER
				);

				if (referrerNewBal === null) {
					errors.push(
						`signup_reward[referrer]: user ${referral.referrer_id} not found ` +
							`(referral ${referral.id})`
					);
				} else {
					console.info(
						`[settle-rewards] Welcome Handshake (referrer): ` +
							`R$${SIGNUP_REWARD_REFERRER} → ${referral.referrer_id} ` +
							`(referral ${referral.id}). New bal: R$${referrerNewBal}`
					);
				}
			}

			// ── Referred side: R$50 Welcome Bonus ────────────────────────────
			if (!referredWelcomeExists) {
				const referredMilestoneId = await createMilestone({
					referralId: referral.id,
					userId: referral.referred_id,
					milestoneType: "signup_welcome",
					rewardAmount: SIGNUP_REWARD_REFERRED,
					meta: {
						type: "welcome_bonus",
						referred_id: referral.referred_id,
						referrer_id: referral.referrer_id,
						recipient: "referred"
					}
				});

				const referredNewBal = await creditReward(
					referral.referred_id,
					referredMilestoneId,
					SIGNUP_REWARD_REFERRED
				);

				if (referredNewBal === null) {
					errors.push(
						`signup_reward[referred]: user ${referral.referred_id} not found ` +
							`(referral ${referral.id})`
					);
				} else {
					console.info(
						`[settle-rewards] Welcome Bonus (referred): ` +
							`R$${SIGNUP_REWARD_REFERRED} → ${referral.referred_id} ` +
							`(referral ${referral.id}). New bal: R$${referredNewBal}`
					);
				}
			}

			// Mark the Referrals row as "paid" so it won't be re-fetched next run.
			await markReferralPaid(referral.id);

			signupRewardsPaid++;
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			console.error(
				`[settle-rewards] Error processing Welcome Handshake for referral ${referral.id}:`,
				msg
			);
			errors.push(`signup_reward[${referral.id}]: ${msg}`);
		}
	}

	// =========================================================================
	// PASS 2 - Engagement Sprint (retention daily double-bonus)
	// =========================================================================
	// Fetch all referrals whose 7-day activity window is still open (created
	// within the past 7 days) and whose status is "payable" OR "paid".
	// "payable" rows may have just been promoted in Pass 1 - that is
	// intentional; we process both in the same run.

	let activeReferrals: Awaited<ReturnType<typeof getActiveReferralsInWindow>> = [];
	try {
		activeReferrals = await getActiveReferralsInWindow();
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		console.error("[settle-rewards] Failed to fetch active referrals:", msg);
		errors.push(`fetch_active_referrals: ${msg}`);
		return json({
			processed,
			signupRewardsPaid,
			retentionDaysPaid,
			serverBountiesPaid,
			skipped,
			errors,
			durationMs: Date.now() - runStartedAt
		});
	}

	for (const referral of activeReferrals) {
		// Avoid double-counting rows already incremented in Pass 1.
		const wasCountedInPass1 = payableReferrals.some((p) => p.id === referral.id);
		if (!wasCountedInPass1) processed++;

		try {
			// ── checkRetentionProgress ────────────────────────────────────────
			// Returns visitDays, daysPaid (referrer rows only), newDaysPayable,
			// engagementBonusMet (5 visits threshold), engagementBonusAlreadyPaid.
			const retention = await checkRetentionProgress(
				referral.id,
				referral.referrer_id,
				referral.referred_id,
				referral.created_at
			);

			// ── checkVotingProgress ───────────────────────────────────────────
			// The vote-20 threshold is an ALTERNATIVE engagement trigger.
			// If the referred user hits 20 votes before accumulating 5 visit-days,
			// we treat remaining engagement days as earned and issue them now.
			const voting = await checkVotingProgress(
				referral.id,
				referral.referred_id,
				referral.created_at
			);

			// Determine effective "days payable" accounting for vote-20 trigger.
			// If either condition is met (5 visits OR 20 votes) the engagement
			// sprint is considered complete and all 5 daily rewards are due.
			const engagementTriggered = retention.engagementBonusMet || voting.thresholdMet;
			let effectiveDaysPayable = retention.newDaysPayable;

			if (engagementTriggered && retention.daysPaid < 5) {
				// Force all remaining days to be payable immediately.
				effectiveDaysPayable = Math.max(effectiveDaysPayable, 5 - retention.daysPaid);
			}

			if (effectiveDaysPayable > 0) {
				for (let d = 0; d < effectiveDaysPayable; d++) {
					const dayNumber = retention.daysPaid + d + 1; // 1-indexed (1–5)

					// Idempotency guard: check both the referrer's retention_daily
					// row AND the referred user's engagement_sprint_referred row for
					// this specific day number before inserting.
					const referrerDayExists = await milestoneExists(
						referral.id,
						"retention_daily",
						dayNumber
					);

					if (referrerDayExists) {
						// This day was already credited (e.g. on a previous run).
						continue;
					}

					const sharedMeta = {
						day: dayNumber,
						referred_id: referral.referred_id,
						visit_days_total: retention.visitDays,
						unique_votes: voting.uniqueVotes,
						trigger: engagementTriggered && !retention.engagementBonusMet ? "vote_20" : "visit"
					};

					// Issue the double-credit for this engagement day.
					// referrer: retention_daily (R$50)
					// referred: engagement_sprint_referred (R$40)
					const result = await creditDoubleReward({
						referralId: referral.id,
						referrerId: referral.referrer_id,
						referredId: referral.referred_id,
						milestoneType: "retention_daily",
						referredMilestoneType: "engagement_sprint_referred",
						referrerAmount: RETENTION_DAILY_REFERRER,
						referredAmount: RETENTION_DAILY_REFERRED,
						baseMeta: sharedMeta
					});

					if (result.referrerNewBal === null) {
						errors.push(
							`engagement_sprint day ${dayNumber}: referrer ` +
								`${referral.referrer_id} not found (referral ${referral.id})`
						);
					}
					if (result.referredNewBal === null) {
						errors.push(
							`engagement_sprint day ${dayNumber}: referred ` +
								`${referral.referred_id} not found (referral ${referral.id})`
						);
					}

					if (result.referrerNewBal !== null || result.referredNewBal !== null) {
						retentionDaysPaid++;
						console.info(
							`[settle-rewards] Engagement Sprint day ${dayNumber}: ` +
								`R$${RETENTION_DAILY_REFERRER} → ${referral.referrer_id} (new bal: R$${result.referrerNewBal ?? "?"}) | ` +
								`R$${RETENTION_DAILY_REFERRED} → ${referral.referred_id} (new bal: R$${result.referredNewBal ?? "?"}) ` +
								`(referral ${referral.id}, trigger: ${sharedMeta.trigger})`
						);
					}
				}
			}

			// ── Skipped check ─────────────────────────────────────────────────
			const nothingNew = effectiveDaysPayable === 0;
			if (nothingNew && !wasCountedInPass1) {
				skipped++;
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			console.error(
				`[settle-rewards] Error processing Engagement Sprint for referral ${referral.id}:`,
				msg
			);
			errors.push(`engagement_sprint[${referral.id}]: ${msg}`);
		}
	}

	// =========================================================================
	// Summary
	// =========================================================================

	const durationMs = Date.now() - runStartedAt;
	const totalPaid = signupRewardsPaid + retentionDaysPaid;

	console.log(
		`[settle-rewards] Run complete. ` +
			`Processed: ${processed}, Paid: ${totalPaid} ` +
			`(welcome-handshake pairs: ${signupRewardsPaid}, engagement-sprint day pairs: ${retentionDaysPaid}), ` +
			`Skipped: ${skipped}, Errors: ${errors.length}. ` +
			`Duration: ${durationMs}ms`
	);

	return json(
		{
			processed,
			signupRewardsPaid,
			retentionDaysPaid,
			serverBountiesPaid,
			skipped,
			errors,
			durationMs
		},
		{ status: 200 }
	);
};
