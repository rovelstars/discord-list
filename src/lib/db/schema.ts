/**
 * Drizzle schema for SQLite (libSQL/Turso)
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

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * Bots table
 *
 * - JSON-like columns are TEXT (serialized JSON)
 * - Boolean-like flags are INTEGER (0/1)
 * - Timestamps are STRING in ISO 8601 format (e.g. "2024-06-01T12:34:56.789Z") for compatibility
 *   across Drizzle versions without relying on `timestamp()` column helper.
 */
export const Bots = sqliteTable('Bots', {
	// JSON blobs stored as TEXT (serialize with JSON.stringify on insert/update)
	card: text('card', { mode: 'json' }), // originally JSON
	badges: text('badges', { mode: 'json' }).default([]), // store as JSON stringified array
	owners: text('owners', { mode: 'json' }).default([]), // store as JSON stringified array
	tags: text('tags', { mode: 'json' }).default([]), // store as JSON stringified array

	// boolean flags as integers (0/1)
	approved: integer('approved', { mode: 'boolean' }).default(false),
	promoted: integer('promoted', { mode: 'boolean' }).default(false),
	opted_coins: integer('opted_coins', { mode: 'boolean' }).default(false),

	// numeric counters
	servers: integer('servers').default(0),
	votes: integer('votes').default(0),

	// core identifiers
	id: text('id').primaryKey(),
	username: text('username').notNull(),
	discriminator: text('discriminator').notNull(),
	avatar: text('avatar').notNull(),

	// descriptions & metadata
	short: text('short').notNull(),
	desc: text('desc').default(''),
	prefix: text('prefix').default('/'),
	lib: text('lib').default(''),

	// optional strings
	code: text('code'),
	webhook: text('webhook'),
	support: text('support'),
	bg: text('bg'),
	source_repo: text('source_repo'),
	website: text('website'),
	donate: text('donate'),
	// links & slugs
	invite: text('invite'),
	slug: text('slug'),
	// timestamps are string ISO format for compatibility; app code should parse with `new Date(row.added_at)` or similar
	added_at: text('added_at').default(new Date().toISOString()) // default to current time in ISO format
});

/**
 * Users table
 *
 * - JSON-like columns are TEXT
 * - boolean flags are INTEGER (0/1)
 * - added_at & last_login are stored as STRING in ISO 8601 format for compatibility across Drizzle versions without relying on `timestamp()` helper.
 */
export const Users = sqliteTable('Users', {
	id: text('id').primaryKey(),
	globalname: text('globalname'),
	accent_color: text('accent_color'),
	username: text('username').notNull(),
	discriminator: text('discriminator').notNull(),
	avatar: text('avatar').notNull(),
	email: text('email'),
	bal: integer('bal').default(50),
	bio: text('bio').default("The user doesn't have bio set!"),
	banner: text('banner'),
	badges: text('badges', { mode: 'json' }).default([]), // serialized array
	lang: text('lang').default('en'),
	last_login: text('last_login').default(new Date().toISOString()), // default to current time in ISO format
	nitro: integer('nitro').default(0),
	old: integer('old', { mode: 'boolean' }).default(true), // boolean-as-integer
	votes: text('votes', { mode: 'json' }).default([]), // serialized array
	added_at: text('added_at').default(new Date().toISOString()), // default to current time in ISO format
	keys: text('keys', { mode: 'json' }).default([]) // serialized array of key objects
});

/**
 * Servers table
 *
 * Minimal compatible typing; mirrors original columns but uses TEXT/INTEGER.
 */
export const Servers = sqliteTable('Servers', {
	id: text('id').primaryKey(),
	short: text('short').default('Short description is not Updated.'),
	name: text('name').notNull(),
	desc: text('desc').default('Description is not updated.'),
	owner: text('owner').notNull(),
	icon: text('icon').default(''),
	promoted: integer('promoted', { mode: 'boolean' }).default(false),
	badges: text('badges', { mode: 'json' }).default([]),
	slug: text('slug'),
	//current time
	added_at: text('added_at').default(new Date().toISOString()),
	votes: integer('votes').default(0)
});
