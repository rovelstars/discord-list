/**
 * Drizzle schema for SQLite (libSQL/Turso)
 *
 * Tables:
 *  - Bots
 *  - Users
 *  - Servers
 *  - Comments  ← rating + threaded replies via parent_id
 *  - Emojis    ← Discord custom emojis, synced from registered servers or submitted manually
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
	added_at: text("added_at").default(new Date().toISOString()) // default to current time in ISO format
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
