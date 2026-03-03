/**
 * Drizzle schema for SQLite (libSQL/Turso)
 *
 * Tables:
 *  - Bots
 *  - Users
 *  - Servers
 *  - Comments  ← rating + threaded replies via parent_id
 *  - Emojis    ← Discord custom emojis, synced from registered servers or submitted manually
 *  - Stickers  ← Discord guild stickers, synced from registered servers
 *
 * Notes:
 * - Some Drizzle sqlite-core builds/export sets may differ between versions.
 *   To maximize compatibility, this schema avoids relying on `json`/`timestamp`
 *   typed column helpers that may not be present in all versions.
 *
 * - JSON fields in the original schema are stored here as `TEXT`. The app code
 *   should parse/stringify these columns (JSON.parse / JSON.stringify) when
 *   reading/writing complex objects/arrays. This keeps the schema compatible
 *   with a minimal sqlite-core surface.
 *
 * - Boolean flags are stored as `INTEGER` (0 | 1). Treat `0` as false and
 *   any non-zero as true.
 *
 * - `added_at` is stored as an string in the format ISO 8601. The original
 *   code used `date`/`timestamp` helpers; storing as integer keeps it portable.
 */

import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

/**
 * Bots table
 *
 * - JSON-like columns are TEXT (serialized JSON)
 * - Boolean-like flags are INTEGER (0/1)
 * - Timestamps are STRING in ISO 8601 format (e.g. "2024-06-01T12:34:56.789Z") for compatibility
 *   across Drizzle versions without relying on `timestamp()` column helper.
 */
export const Bots = sqliteTable("Bots", {
	// JSON blobs stored as TEXT (serialize with JSON.stringify on insert/update)
	card: text("card", { mode: "json" }), // originally JSON
	badges: text("badges", { mode: "json" }).default([]), // store as JSON stringified array
	owners: text("owners", { mode: "json" }).default([]), // store as JSON stringified array
	tags: text("tags", { mode: "json" }).default([]), // store as JSON stringified array

	// boolean flags as integers (0/1)
	approved: integer("approved", { mode: "boolean" }).default(false),
	promoted: integer("promoted", { mode: "boolean" }).default(false),
	opted_coins: integer("opted_coins", { mode: "boolean" }).default(false),

	// numeric counters
	servers: integer("servers").default(0),
	votes: integer("votes").default(0),

	// core identifiers
	id: text("id").primaryKey(),
	username: text("username").notNull(),
	discriminator: text("discriminator").notNull(),
	avatar: text("avatar").notNull(),

	// descriptions & metadata
	short: text("short").notNull(),
	desc: text("desc").default(""),
	prefix: text("prefix").default("/"),
	lib: text("lib").default(""),

	// optional strings
	code: text("code"),
	webhook: text("webhook"),
	support: text("support"),
	bg: text("bg"),
	source_repo: text("source_repo"),
	website: text("website"),
	donate: text("donate"),
	// links & slugs
	invite: text("invite"),
	slug: text("slug"),
	// timestamps are string ISO format for compatibility; app code should parse with `new Date(row.added_at)` or similar
	added_at: text("added_at").default(new Date().toISOString()), // default to current time in ISO format
	/**
	 * JSON array of server IDs (from the Servers table) where this bot has been
	 * confirmed present via Discord's GET /guilds/{id}/members/{bot_id} API.
	 * Populated and refreshed by the sync-bot-memberships internal endpoint.
	 * Example: '["123456789","987654321"]'
	 */
	guild_ids: text("guild_ids", { mode: "json" }).default([])
});

/**
 * Users table
 *
 * - JSON-like columns are TEXT
 * - boolean flags are INTEGER (0/1)
 * - added_at & last_login are stored as STRING in ISO 8601 format for compatibility across Drizzle versions without relying on `timestamp()` helper.
 */
export const Users = sqliteTable("Users", {
	id: text("id").primaryKey(),
	globalname: text("globalname"),
	accent_color: text("accent_color"),
	username: text("username").notNull(),
	discriminator: text("discriminator").notNull(),
	avatar: text("avatar").notNull(),
	email: text("email"),
	bal: integer("bal").default(50),
	bio: text("bio").default("The user doesn't have bio set!"),
	banner: text("banner"),
	badges: text("badges", { mode: "json" }).default([]), // serialized array
	lang: text("lang").default("en"),
	last_login: text("last_login").default(new Date().toISOString()), // default to current time in ISO format
	nitro: integer("nitro").default(0),
	old: integer("old", { mode: "boolean" }).default(true), // boolean-as-integer
	votes: text("votes", { mode: "json" }).default([]), // serialized array
	added_at: text("added_at").default(new Date().toISOString()), // default to current time in ISO format
	keys: text("keys", { mode: "json" }).default([]) // serialized array of key objects
});

/**
 * Servers table
 *
 * Minimal compatible typing; mirrors original columns but uses TEXT/INTEGER.
 */
export const Servers = sqliteTable("Servers", {
	id: text("id").primaryKey(),
	short: text("short").default("Short description is not Updated."),
	name: text("name").notNull(),
	desc: text("desc").default("Description is not updated."),
	owner: text("owner").notNull(),
	icon: text("icon").default(""),
	promoted: integer("promoted", { mode: "boolean" }).default(false),
	badges: text("badges", { mode: "json" }).default([]),
	slug: text("slug"),
	//current time
	added_at: text("added_at").default(new Date().toISOString()),
	votes: integer("votes").default(0),
	/**
	 * JSON array of bot IDs (from the Bots table) that have been confirmed
	 * present in this server via Discord's GET /guilds/{id}/members/{bot_id} API.
	 * Populated and refreshed by the sync-bot-memberships internal endpoint.
	 * Example: '["123456789","987654321"]'
	 */
	bot_ids: text("bot_ids", { mode: "json" }).default([]),

	// Discord guild snapshot — populated/refreshed via the server-refresh lib.
	// Stored so we can display rich stats without hitting Discord's API on every
	// page load; values are updated lazily when a page load detects stale data.
	/** Approximate total member count (from guild.approximate_member_count). */
	member_count: integer("member_count"),
	/** Approximate online/active member count (from guild.approximate_presence_count). */
	presence_count: integer("presence_count"),
	/**
	 * JSON array of channel objects: { id, name, type, nsfw }.
	 * type mirrors the Discord channel type integer (0=text, 2=voice, 4=category, etc.).
	 */
	channels: text("channels").default("[]"),
	/** Whether any channel in the guild is marked NSFW. Stored as INTEGER (0/1). */
	has_nsfw: integer("has_nsfw", { mode: "boolean" }).default(false),
	/** ISO 8601 timestamp of the last successful Discord data sync. */
	synced_at: text("synced_at")
});

/**
 * Comments table
 *
 * Stores user reviews/comments for bots, supporting threaded replies via
 * a self-referencing `parent_id`.
 *
 * Design notes:
 *  - `id`         — UUID string generated by the app (crypto.randomUUID()).
 *  - `bot_id`     — references Bots.id (not enforced as FK at DB level for libSQL compat).
 *  - `user_id`    — references Users.id.
 *  - `rating`     — stored as INTEGER (rating * 10), so 4.3 → 43. This avoids
 *                   floating-point precision issues while allowing one decimal place.
 *                   Valid range: 1–50 (i.e. 0.1–5.0). NULL is allowed for pure replies
 *                   that don't carry a rating of their own.
 *  - `text`       — optional comment body (plain text, max 2000 chars).
 *  - `parent_id`  — NULL for top-level comments; set to the root comment's `id`
 *                   for replies (flat threading — all replies reference the top-level
 *                   comment, which keeps queries simple: one SELECT per bot fetches
 *                   everything and the client groups by parent_id). If you need
 *                   true recursive nesting just change this to point at the immediate
 *                   parent instead; the query pattern is identical.
 *  - `created_at` — ISO 8601 string.
 *  - `updated_at` — ISO 8601 string, NULL until the comment is edited.
 */
export const Comments = sqliteTable("Comments", {
	id: text("id").primaryKey(),
	bot_id: text("bot_id").notNull(),
	user_id: text("user_id").notNull(),
	// rating × 10 stored as integer to avoid float imprecision.
	// NULL is valid for reply comments that don't include a rating.
	rating: integer("rating"),
	text: text("text"),
	// NULL = top-level comment; non-NULL = reply to the comment with this id.
	parent_id: text("parent_id"),
	created_at: text("created_at").notNull().default(new Date().toISOString()),
	updated_at: text("updated_at")
});

/**
 * Emojis table
 *
 * Stores Discord custom emojis. They can arrive via two routes:
 *  1. Manual submission — a logged-in user submits an emoji; `submitter` is set,
 *     `guild` is NULL.
 *  2. Server auto-sync — the bot syncs emojis from a registered guild; `guild`
 *     is set, `submitter` is NULL (or cleared if a previous manual submission
 *     is claimed by a guild sync).
 *
 * Design notes:
 *  - `id`         — Discord snowflake for the emoji (unique, primary key).
 *  - `code`       — Original Discord emoji name (e.g. "pepe_sad"). Never changes.
 *  - `name`       — Human-friendly display name set by the submitter/admin.
 *  - `alt_names`  — JSON array of alternative search names.
 *  - `description`— Optional freeform description.
 *  - `a`          — 1 if animated (GIF), 0 if static (PNG/WEBP). Short column
 *                   name for storage efficiency.
 *  - `dc`         — Download counter; incremented each time the download button
 *                   is used.
 *  - `added_at`   — ISO 8601 timestamp when the emoji was first inserted.
 *  - `submitter`  — Discord user id of the manual submitter. NULL when `guild`
 *                   is populated. If a guild sync later claims the same emoji
 *                   the submitter is cleared and guild is set.
 *  - `guild`      — Discord guild id that owns this emoji (auto-sync path).
 *                   NULL for manual submissions.
 *
 * Constraint: at least one of `submitter` or `guild` must be non-NULL (enforced
 * at the application layer, not at the DB level for libSQL compat).
 */
export const Emojis = sqliteTable("Emojis", {
	/** Discord snowflake — stable unique identifier for the emoji. */
	id: text("id").primaryKey(),

	/** Original emoji name as returned by Discord (e.g. "pepe_sad"). */
	code: text("code").notNull(),

	/** Human-friendly display name. */
	name: text("name").notNull(),

	/** JSON array of alternative/search names, e.g. ["pepesad","sad_pepe"]. */
	alt_names: text("alt_names").default("[]"),

	/** Optional description of the emoji. */
	description: text("description"),

	/**
	 * Animated flag. 1 = animated (GIF), 0 = static (PNG/WEBP).
	 * Short column name `a` to keep the schema compact.
	 */
	a: integer("a", { mode: "boolean" }).default(false),

	/**
	 * Download counter. Incremented atomically each time a user uses
	 * the dedicated download button.
	 */
	dc: integer("dc").default(0),

	/** ISO 8601 timestamp when this emoji record was created. */
	added_at: text("added_at").default(new Date().toISOString()),

	/**
	 * Discord user id of the person who manually submitted this emoji.
	 * NULL when the emoji was added via server auto-sync (guild is set instead).
	 * Cleared and set to NULL if a subsequent guild sync claims the same emoji.
	 */
	submitter: text("submitter"),

	/**
	 * Discord guild (server) id that this emoji belongs to.
	 * Set during auto-sync from a registered server.
	 * NULL for manually-submitted emojis.
	 * If a guild sync later finds an emoji that was previously manually
	 * submitted, `guild` is set and `submitter` is cleared to NULL.
	 */
	guild: text("guild")
});

/**
 * Stickers table
 *
 * Stores Discord guild stickers. They arrive via server auto-sync when the bot
 * syncs a registered guild's stickers into the database.
 *
 * Design notes:
 *  - `id`          — Discord snowflake for the sticker (unique, primary key).
 *  - `name`        — Display name of the sticker (e.g. "wave").
 *  - `description` — Optional description set by the guild owner.
 *  - `tags`        — The Discord autocomplete/suggestion tags string (comma-separated).
 *  - `format`      — Sticker format type integer from Discord:
 *                    1 = PNG, 2 = APNG, 3 = LOTTIE, 4 = GIF.
 *                    Stored as integer for compact storage and easy filtering.
 *  - `dc`          — Download counter; incremented each time the download button
 *                    is used.
 *  - `added_at`    — ISO 8601 timestamp when this sticker record was created.
 *  - `guild`       — Discord guild id that owns this sticker (auto-sync path).
 *                    NULL for stickers not linked to a registered guild.
 *
 * Format reference:
 *  1 = PNG  (static)
 *  2 = APNG (animated PNG)
 *  3 = LOTTIE (animated vector — rendered via lottie-web on client)
 *  4 = GIF  (animated)
 */
export const Stickers = sqliteTable("Stickers", {
	/** Discord snowflake — stable unique identifier for the sticker. */
	id: text("id").primaryKey(),

	/** Display name of the sticker (e.g. "wave"). */
	name: text("name").notNull(),

	/** Optional description set by the guild owner. */
	description: text("description"),

	/**
	 * Autocomplete/suggestion tags string as returned by Discord.
	 * Typically a single emoji or a comma-separated list of related terms.
	 */
	tags: text("tags"),

	/**
	 * Discord sticker format type integer.
	 * 1 = PNG, 2 = APNG, 3 = LOTTIE, 4 = GIF
	 */
	format: integer("format").notNull().default(1),

	/**
	 * Download counter. Incremented atomically each time a user uses
	 * the dedicated download button.
	 */
	dc: integer("dc").default(0),

	/** ISO 8601 timestamp when this sticker record was created. */
	added_at: text("added_at").default(new Date().toISOString()),

	/**
	 * Discord guild (server) id that this sticker belongs to.
	 * Set during auto-sync from a registered server.
	 */
	guild: text("guild")
});

/**
 * CommentReactions table
 *
 * One row per (comment, user, emoji) triple — the composite primary key
 * enforces the uniqueness constraint at the database level with zero chance
 * of counter drift. Counts are derived with GROUP BY at query time.
 *
 * Design notes:
 *  - `comment_id` — references Comments.id.
 *  - `user_id`    — references Users.id.
 *  - `emoji`      — one of the 9 canonical reaction slugs defined in the app:
 *                   funny | useful | informative | like | dislike |
 *                   love | angry | sad | skull
 *                   Stored as a short ASCII slug (not the Unicode emoji) so
 *                   the column stays compact, indexable, and easy to validate.
 *  - `created_at` — ISO 8601 string; lets us sort "most recent reactions" if needed.
 *
 * Toggle semantics: inserting a row adds the reaction; deleting it removes it.
 * A PUT /react endpoint handles both by attempting an INSERT and falling back
 * to a DELETE on conflict (or vice-versa) — true toggle with a single round-trip.
 */
export const CommentReactions = sqliteTable(
	"CommentReactions",
	{
		comment_id: text("comment_id").notNull(),
		user_id: text("user_id").notNull(),
		// ASCII slug — never the raw emoji glyph. Validated against REACTION_EMOJIS
		// in the app before insertion.
		emoji: text("emoji").notNull(),
		created_at: text("created_at").notNull().default(new Date().toISOString())
	},
	(t) => ({
		pk: primaryKey({ columns: [t.comment_id, t.user_id, t.emoji] })
	})
);

// ============================================================================
// REFERRAL SYSTEM TABLES
// ============================================================================

/**
 * Referrals table
 *
 * One row per referral relationship. Tracks who referred whom, the lifecycle
 * state of the relationship, and any fraud signals detected at sign-up time.
 *
 * Reward states (reward_status):
 *   "pending"     — referred user signed up but conditions not yet verified.
 *   "payable"     — all sign-up conditions met; R$100 queued for payout.
 *   "paid"        — sign-up reward has been credited to the referrer.
 *   "flagged"     — fraud signal detected (e.g. shared fingerprint).
 *                   Reward is logged but NOT credited. Requires manual review.
 *   "rejected"    — hard rejection: account too new, unverified email, etc.
 *
 * Loop prevention: before inserting a row, the application must check that
 * no row exists where referrer_id = NEW.referred_id AND referred_id = NEW.referrer_id.
 * This is enforced at the application layer (see referral helpers).
 *
 * Columns:
 *   id             — UUID generated by the application (crypto.randomUUID()).
 *   referrer_id    — Discord snowflake of the user who shared the invite link.
 *   referred_id    — Discord snowflake of the newly-created account.
 *   code           — The referral code string used (= referrer_id by default,
 *                    or a custom vanity code if the referrer has one).
 *   reward_status  — Current state of the sign-up R$100 reward (see above).
 *   fingerprint_match — 1 if the referred user's device fingerprint was already
 *                    seen on the referrer's account. Soft-flag only — does NOT
 *                    auto-reject; sets reward_status to "flagged".
 *   referred_account_age_days — Discord account age in days at the time of
 *                    sign-up (derived from the Snowflake). Stored so audits
 *                    don't need to re-derive it.
 *   referred_email_verified — 1 if Discord reported a verified email at sign-up.
 *   created_at     — ISO 8601 timestamp when the referral row was created
 *                    (i.e. when the referred user first signed in).
 *   settled_at     — ISO 8601 timestamp when reward_status last changed.
 */
export const Referrals = sqliteTable("Referrals", {
	id: text("id").primaryKey(),
	referrer_id: text("referrer_id").notNull(),
	referred_id: text("referred_id").notNull(),

	/**
	 * The referral code that was used. Defaults to the referrer's user ID but
	 * can be a custom vanity slug. Indexed for O(1) look-ups on sign-up.
	 */
	code: text("code").notNull(),

	/**
	 * Lifecycle state of the one-time R$100 sign-up reward.
	 * Allowed values: "pending" | "payable" | "paid" | "flagged" | "rejected"
	 */
	reward_status: text("reward_status").notNull().default("pending"),

	/**
	 * 1 when the referred user's fingerprint was already associated with the
	 * referrer's account at the time of sign-up. Triggers "flagged" status.
	 */
	fingerprint_match: integer("fingerprint_match", { mode: "boolean" }).default(false),

	/**
	 * Discord account age in whole days at the moment the referred user signed
	 * up (derived from their Discord Snowflake). Must be >= 7 for "payable".
	 */
	referred_account_age_days: integer("referred_account_age_days"),

	/**
	 * Whether the referred user had a Discord-verified email at sign-up time.
	 * Must be true (1) for the reward to be "payable".
	 */
	referred_email_verified: integer("referred_email_verified", { mode: "boolean" }).default(false),

	created_at: text("created_at").notNull().default(new Date().toISOString()),
	settled_at: text("settled_at")
});

/**
 * ReferralMilestones table
 *
 * Tracks multi-stage, time-bounded bonus rewards that accrue after sign-up.
 * Each row represents ONE milestone type for ONE referral relationship.
 *
 * Milestone types (milestone_type):
 *   "retention_daily"  — R$50/day bonus for up to 5 days. One row per day
 *                        credited (day 1 … day 5). The scheduled SettleRewards
 *                        function writes these rows.
 *   "vote_20"                  — Legacy: kept for backwards-compat. The
 *                                vote-20 threshold now acts as an alternative
 *                                trigger for the Engagement Sprint rather than
 *                                issuing its own separate row.
 *   "signup_welcome"           — R$50 Welcome Bonus credited to the REFERRED
 *                                USER at sign-up (companion to the referrer's
 *                                retention_daily day=0 signup_reward row).
 *   "server_bounty"            — R$500 Growth Bounty credited to the REFERRER
 *                                when the referred user lists a server with
 *                                ≥ 50 members. Written by the server-listing flow.
 *   "server_bounty_referred"   — R$500 Growth Bounty credited to the REFERRED
 *                                USER for the same server-listing event.
 *   "engagement_sprint_referred" — R$40/day Engagement Sprint bonus credited
 *                                to the REFERRED USER (companion to the
 *                                referrer's retention_daily rows, days 1–5).
 *   "self_listing_100"         — R$100 self-listing reward (server 50–199 members).
 *                                user_id is the listing owner; referral_id may be NULL.
 *   "self_listing_500"         — R$500 self-listing reward (server ≥ 200 members).
 *
 * Columns:
 *   id             — UUID.
 *   referral_id    — FK to Referrals.id. NULL for self-listing rewards where
 *                    no referral relationship exists.
 *   user_id        — The user receiving this particular milestone reward.
 *                    For retention_daily / server_bounty this is the referrer.
 *                    For signup_welcome / engagement_sprint_referred /
 *                    server_bounty_referred this is the referred user.
 *                    For self_listing_* this is the server owner.
 *   milestone_type — One of the values listed above.
 *   reward_amount  — R$ amount credited (40, 50, 100, or 500).
 *   status         — "pending" | "paid" | "flagged"
 *   meta           — JSON blob for any extra context. Always includes:
 *                      recipient: "referrer" | "referred"  (who this row pays)
 *                    Other fields by type:
 *                      retention_daily          : { day, referred_id, visit_days_total, trigger }
 *                      signup_welcome           : { referred_id, referrer_id }
 *                      engagement_sprint_referred: { day, referred_id, visit_days_total, trigger }
 *                      server_bounty*           : { server_id, member_count }
 *                      self_listing_*           : { server_id, member_count }
 *                    Stored as TEXT (JSON.stringify).
 *   created_at     — ISO 8601 timestamp when the milestone was first detected.
 *   paid_at        — ISO 8601 timestamp when the R$ was actually credited.
 */
export const ReferralMilestones = sqliteTable("ReferralMilestones", {
	id: text("id").primaryKey(),

	/**
	 * References Referrals.id. NULL is allowed for self-listing rewards that
	 * are not tied to a specific referral relationship.
	 */
	referral_id: text("referral_id"),

	/** The user who will receive (or has received) this milestone's R$ reward. */
	user_id: text("user_id").notNull(),

	/**
	 * Discriminates the type of milestone.
	 * Double-sided milestone pairs (one row per user per event):
	 *   "retention_daily"            — referrer's Engagement Sprint daily bonus (R$50/day)
	 *   "signup_welcome"             — referred user's Welcome Bonus (R$50, one-time)
	 *   "engagement_sprint_referred" — referred user's Engagement Sprint daily bonus (R$40/day)
	 *   "server_bounty"              — referrer's Growth Bounty (R$500)
	 *   "server_bounty_referred"     — referred user's Growth Bounty (R$500)
	 * Single-sided milestones:
	 *   "vote_20"          — legacy; kept for backwards-compat audit rows
	 *   "self_listing_100" — server owner self-listing reward (50–199 members)
	 *   "self_listing_500" — server owner self-listing reward (≥ 200 members)
	 */
	milestone_type: text("milestone_type").notNull(),

	/** R$ amount associated with this milestone row. */
	reward_amount: integer("reward_amount").notNull(),

	/**
	 * Processing state.
	 * "pending" — detected but not yet credited.
	 * "paid"    — R$ debited from the system and credited to user_id.
	 * "flagged" — blocked due to a fraud signal; not credited.
	 */
	status: text("status").notNull().default("pending"),

	/**
	 * Freeform JSON metadata for the milestone. Examples:
	 *   retention_daily : { "day": 2, "referred_id": "…" }
	 *   vote_20         : { "unique_votes": 22, "referred_id": "…" }
	 *   server_bounty   : { "server_id": "…", "member_count": 87 }
	 *   self_listing_*  : { "server_id": "…", "member_count": 210 }
	 */
	meta: text("meta").default("{}"),

	created_at: text("created_at").notNull().default(new Date().toISOString()),
	paid_at: text("paid_at")
});

/**
 * UserFingerprints table
 *
 * Stores browser/device fingerprints associated with a user account.
 * Maximum 5 fingerprints per user enforced via FIFO eviction at the
 * application layer (see fingerprint helpers).
 *
 * Design decisions:
 *   - fingerprint  — A stable hash string produced client-side (e.g. via
 *                    FingerprintJS or a custom canvas+audio hash). The raw
 *                    hash is stored; the app never needs to reverse it.
 *   - first_seen   — When this fingerprint was first associated with this user.
 *   - last_seen    — Updated on every successful login from this device.
 *                    Used by the FIFO eviction policy: the oldest last_seen
 *                    entry is evicted when the 5-row cap is exceeded.
 *   - trust_score  — Integer 0–100. Starts at 50 and is adjusted by the fraud
 *                    detection layer. Low scores can trigger additional checks.
 *
 * Uniqueness: (user_id, fingerprint) is unique — the same physical device
 * cannot create duplicate rows for the same user.
 * Cross-user uniqueness is NOT enforced here; that query is done at the
 * application layer to detect shared-device fraud.
 */
export const UserFingerprints = sqliteTable(
	"UserFingerprints",
	{
		id: text("id").primaryKey(),
		user_id: text("user_id").notNull(),

		/**
		 * Stable device/browser hash. Treat as an opaque string — never assume
		 * a specific format or length, but keep it <= 128 chars for index efficiency.
		 */
		fingerprint: text("fingerprint").notNull(),

		/** ISO 8601 — when this fingerprint was first seen for this user. */
		first_seen: text("first_seen").notNull().default(new Date().toISOString()),

		/**
		 * ISO 8601 — last time this device was seen for this user.
		 * Refreshed on every authenticated request that carries the fingerprint.
		 * The FIFO eviction policy removes the row with the oldest last_seen
		 * when a 6th distinct fingerprint would be added for the same user.
		 */
		last_seen: text("last_seen").notNull().default(new Date().toISOString()),

		/**
		 * Trust score 0–100 (starts at 50). Raised when the device is used
		 * consistently without fraud signals; lowered when anomalies are detected
		 * (e.g. the same fingerprint is linked to multiple accounts).
		 * The score is advisory — fraud decisions are made by the calling code.
		 */
		trust_score: integer("trust_score").notNull().default(50)
	},
	(t) => ({
		pk: primaryKey({ columns: [t.user_id, t.fingerprint] })
	})
);

/**
 * UserActivityLog table
 *
 * Append-only log used by the SettleRewards scheduled function to evaluate
 * the retention and voting milestones within a referred user's first 7 days.
 *
 * Events recorded:
 *   "site_visit"   — The user loaded any page. One row per calendar day
 *                    (UTC); duplicates on the same day are ignored via the
 *                    unique index on (user_id, event_type, event_day).
 *   "vote"         — The user voted on an entity. entity_id is stored so
 *                    uniqueness of votes can be counted (20 unique entities).
 *
 * Columns:
 *   id         — UUID.
 *   user_id    — References Users.id.
 *   event_type — "site_visit" | "vote"
 *   event_day  — Calendar date string "YYYY-MM-DD" (UTC). For site_visit
 *                this IS the dedup key. For votes it allows per-day counts.
 *   entity_id  — For vote events: the ID of the entity voted on (bot, server,
 *                or sticker). NULL for site_visit events.
 *   entity_type — "bot" | "server" | "sticker" | NULL
 *   created_at — Full ISO 8601 timestamp (for audits / ordering).
 *
 * Dedup notes:
 *   site_visit rows: unique on (user_id, "site_visit", event_day) — at most
 *     one row per user per day. The INSERT is a no-op if one already exists.
 *   vote rows: unique on (user_id, "vote", entity_id) across all days so the
 *     20-unique-votes milestone counts distinct entities, not repeated votes.
 *     The unique index key is (user_id, event_type, entity_id) for vote events.
 *     The scheduled function queries COUNT(DISTINCT entity_id) WHERE event_type='vote'.
 */
export const UserActivityLog = sqliteTable("UserActivityLog", {
	id: text("id").primaryKey(),
	user_id: text("user_id").notNull(),

	/**
	 * Event discriminator.
	 * Allowed values: "site_visit" | "vote"
	 */
	event_type: text("event_type").notNull(),

	/**
	 * UTC calendar date "YYYY-MM-DD".
	 * For site_visit: the day the user visited.
	 * For vote: the day the vote was cast.
	 */
	event_day: text("event_day").notNull(),

	/**
	 * For vote events: the ID of the entity (bot/server/sticker) voted on.
	 * NULL for site_visit events.
	 */
	entity_id: text("entity_id"),

	/**
	 * Discriminates the entity type for vote events.
	 * Allowed values: "bot" | "server" | "sticker" | NULL
	 */
	entity_type: text("entity_type"),

	created_at: text("created_at").notNull().default(new Date().toISOString())
});
