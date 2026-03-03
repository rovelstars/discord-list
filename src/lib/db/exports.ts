/**
 * Barrel module for database utilities and schema.
 *
 * Import from "$lib/db" (or the project's configured alias) to access:
 *  - getClient, getDb, ping
 *  - schema objects: Bots, Users, Servers, Referrals, ReferralMilestones,
 *                    UserFingerprints, UserActivityLog
 *  - query helpers and types (BotSummary, BotDetail, User, etc.)
 *  - referral helpers: createReferral, upsertFingerprint, awardServerBounty, etc.
 *
 * This file intentionally re-exports concrete implementations from the
 * runtime helper (`./index`), the typed schema (`./schema`) and the
 * query helpers (`./queries/helpers`).
 *
 * Keep this file minimal — implementation details live in their own modules.
 */

import { getClient, getDb, ping, withDb } from "./index";
export { getClient, getDb, ping, withDb } from "./index";
export type { DrizzleDb } from "./index";
export * from "./schema";
export * from "./queries/helpers";
export { updateServerSnapshot } from "./queries/index";
export type { ServerDetail, ServerSummary } from "./queries/index";
export {
	listEmojis,
	getEmojiById,
	getEmojisByGuild,
	searchEmojis,
	incrementEmojiDownload,
	getRandomEmojis
} from "./queries/emojis";
export type { EmojiSummary, EmojiDetail } from "./queries/emojis";

export {
	listStickers,
	countStickers,
	getStickerById,
	getStickersByGuild,
	countStickersByGuild,
	incrementStickerDownload,
	syncGuildStickers,
	getRandomStickers,
	getTopStickers,
	getNewestStickers,
	getStickerUrl,
	getStickerExtension,
	getStickerFormatLabel,
	isStickerAnimated,
	STICKER_FORMAT
} from "./queries/stickers";
export type { StickerSummary, StickerDetail, StickerFormatType } from "./queries/stickers";

// ---------------------------------------------------------------------------
// Referral system — schema tables, query helpers, and type definitions
// ---------------------------------------------------------------------------
// Schema tables (for use with Drizzle query builders in server code)
export { Referrals, ReferralMilestones, UserFingerprints, UserActivityLog } from "./schema";

// Query helpers — grouped by responsibility:
//   createReferral / resolveReferralCode       — sign-up flow
//   upsertFingerprint / getUserFingerprints    — device fingerprint management (FIFO)
//   getUsersWithFingerprint / fingerprintBelongsToUser — cross-account fraud detection
//   recordSiteVisit / recordVote               — activity logging
//   getPayableSignupReferrals / getActiveReferralsInWindow — SettleRewards batch queries
//   markReferralPaid                           — sign-up reward settlement
//   checkRetentionProgress / checkVotingProgress — milestone evaluation
//   milestoneExists / createMilestone          — idempotent milestone writes
//   creditReward                               — atomic R$ crediting (single user)
//   creditDoubleReward                         — atomic double-sided R$ credit (referrer + referred)
//   signupWelcomeBonusExists                   — idempotency guard for the referred user's welcome bonus
//   awardServerBounty / awardSelfListing       — server-listing rewards
//   getReferralsByReferrer / getMilestonesForReferral — dashboard queries (referrer view)
//   getMilestonesForUser                       — dashboard queries (referred user view)
//   snowflakeToDate / snowflakeAgeInDays       — Discord Snowflake utilities
//   wouldCreateReferralLoop / isAlreadyReferred — loop & duplicate prevention
export {
	// Date / calendar utilities
	todayUtc,
	addDays,
	// Snowflake utilities
	snowflakeToDate,
	snowflakeAgeInDays,
	// Loop & duplicate prevention
	wouldCreateReferralLoop,
	isAlreadyReferred,
	// Fingerprint management
	getUserFingerprints,
	userHasFingerprint,
	getUsersWithFingerprint,
	upsertFingerprint,
	fingerprintBelongsToUser,
	// Referral creation & code resolution
	resolveReferralCode,
	createReferral,
	// Sign-up reward settlement
	getPayableSignupReferrals,
	markReferralPaid,
	// Activity logging
	recordSiteVisit,
	recordVote,
	// Milestone queries
	countVisitDaysInWindow,
	countUniqueVotesInWindow,
	checkRetentionProgress,
	checkVotingProgress,
	// Milestone writes (idempotent)
	milestoneExists,
	createMilestone,
	// Balance crediting
	creditReward,
	// Double-sided balance crediting (referrer + referred in one operation)
	creditDoubleReward,
	// Welcome bonus idempotency guard
	signupWelcomeBonusExists,
	// Batch queries for SettleRewards
	getActiveReferralsInWindow,
	// Server-listing & self-listing rewards
	awardServerBounty,
	awardSelfListing,
	// Dashboard / read queries
	getReferralsByReferrer,
	getMilestonesForReferral,
	getMilestonesForUser
} from "./queries/referrals";

export type {
	ReferralRewardStatus,
	MilestoneType,
	MilestoneStatus,
	CreateReferralResult,
	DoubleCreditResult,
	ReferralSummary,
	PendingReferral,
	RetentionProgress,
	VotingProgress
} from "./queries/referrals";

// Default export provides the most commonly-used runtime helpers for convenience.
export default {
	getClient,
	getDb,
	ping,
	withDb
};
