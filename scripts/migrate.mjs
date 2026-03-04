#!/usr/bin/env node
/**
 * migrate.mjs - Rovel Discord List database migration
 *
 * Responsibilities
 * ────────────────
 * 1. Load env from .env (no third-party dotenv needed)
 * 2. Connect to the Turso / libSQL database
 * 3. CREATE TABLE IF NOT EXISTS for every table in the schema
 * 4. Evolve existing tables: ALTER TABLE ADD COLUMN for any columns that are
 *    present in the schema definition but missing from the live table
 *    (SQLite does not support DROP/RENAME in older versions, so we only add)
 * 5. Report a final summary of every table's row count
 *
 * Usage
 * ─────
 *   node scripts/migrate.mjs
 *   # or via package.json script:
 *   bun run migrate / npm run migrate
 *
 * Environment variables (at least one URL variant is required)
 * ────────────────────────────────────────────────────────────
 *   DATABASE_URL        or  ASTRO_DB_REMOTE_URL  - libsql:// or https:// URL
 *   TURSO_TOKEN         or  ASTRO_DB_APP_TOKEN   - auth token (omit for local file)
 *
 * Safety guarantees
 * ─────────────────
 * • Never drops or truncates any table or column.
 * • Every CREATE TABLE uses IF NOT EXISTS - safe to re-run at any time.
 * • Every ALTER TABLE ADD COLUMN is guarded by a prior column-existence check.
 * • A dry-run mode is available: set DRY_RUN=1 to print SQL without executing.
 * • Exits with code 1 on any unrecoverable error so CI/CD pipelines can catch it.
 */

import { createClient } from "@libsql/client";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { exit } from "node:process";

// ─────────────────────────────────────────────────────────────────────────────
// Colour helpers (no deps - pure ANSI)
// ─────────────────────────────────────────────────────────────────────────────

const isTTY = process.stdout.isTTY;
const c = {
	reset: (s) => (isTTY ? `\x1b[0m${s}\x1b[0m` : s),
	bold: (s) => (isTTY ? `\x1b[1m${s}\x1b[0m` : s),
	dim: (s) => (isTTY ? `\x1b[2m${s}\x1b[0m` : s),
	green: (s) => (isTTY ? `\x1b[32m${s}\x1b[0m` : s),
	yellow: (s) => (isTTY ? `\x1b[33m${s}\x1b[0m` : s),
	red: (s) => (isTTY ? `\x1b[31m${s}\x1b[0m` : s),
	cyan: (s) => (isTTY ? `\x1b[36m${s}\x1b[0m` : s),
	blue: (s) => (isTTY ? `\x1b[34m${s}\x1b[0m` : s)
};

function log(msg) {
	console.log(msg);
}
function ok(msg) {
	console.log(`  ${c.green("✓")} ${msg}`);
}
function info(msg) {
	console.log(`  ${c.blue("ℹ")} ${msg}`);
}
function warn(msg) {
	console.warn(`  ${c.yellow("⚠")} ${msg}`);
}
function fail(msg) {
	console.error(`  ${c.red("✗")} ${msg}`);
}
function section(title) {
	log(`\n${c.bold(c.cyan(`── ${title} ${"─".repeat(Math.max(0, 50 - title.length))}`))}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// .env loader
// ─────────────────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
	const envPath = resolve(__dirname, "../.env");
	if (!existsSync(envPath)) {
		warn(".env not found - relying entirely on shell environment");
		return;
	}

	const lines = readFileSync(envPath, "utf8").split("\n");
	let loaded = 0;

	for (const raw of lines) {
		const line = raw.trim();
		if (!line || line.startsWith("#")) continue;

		const eq = line.indexOf("=");
		if (eq === -1) continue;

		const key = line.slice(0, eq).trim();
		let val = line.slice(eq + 1).trim();

		// Strip surrounding single or double quotes
		if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
			val = val.slice(1, -1);
		}

		// Don't overwrite variables already set in the shell
		if (!process.env[key]) {
			process.env[key] = val;
			loaded++;
		}
	}

	ok(`Loaded ${loaded} variable(s) from ${c.dim(envPath)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Schema definitions
//
// Each table is described as:
//   { sql: string }            - the full CREATE TABLE IF NOT EXISTS statement
//   { columns: ColumnDef[] }   - individual column specs used for ALTER TABLE
//
// ColumnDef: { name, type, notNull?, default? }
//   name    - column name (must match the name in `sql` exactly)
//   type    - SQLite type affinity: TEXT | INTEGER | REAL | BLOB
//   notNull - whether NOT NULL applies (default false)
//   default - the DEFAULT expression as a raw SQL string, e.g. "'[]'" or "0"
//             When notNull is true and default is provided, the ALTER TABLE
//             statement becomes:  ADD COLUMN "col" TYPE NOT NULL DEFAULT expr
//             which is required by SQLite for non-null columns added to
//             tables that already contain rows.
// ─────────────────────────────────────────────────────────────────────────────

const NOW_EXPR = `(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;

const SCHEMA = [
	// ── Bots ──────────────────────────────────────────────────────────────────
	{
		name: "Bots",
		sql: `
      CREATE TABLE IF NOT EXISTS "Bots" (
        "id"            TEXT    NOT NULL PRIMARY KEY,
        "card"          TEXT,
        "owners"        TEXT    NOT NULL DEFAULT '[]',
        "tags"          TEXT    NOT NULL DEFAULT '[]',
        "badges"        TEXT    NOT NULL DEFAULT '[]',
        "approved"      INTEGER NOT NULL DEFAULT 0,
        "promoted"      INTEGER NOT NULL DEFAULT 0,
        "opted_coins"   INTEGER NOT NULL DEFAULT 0,
        "servers"       INTEGER NOT NULL DEFAULT 0,
        "votes"         INTEGER NOT NULL DEFAULT 0,
        "username"      TEXT    NOT NULL,
        "discriminator" TEXT    NOT NULL,
        "avatar"        TEXT    NOT NULL,
        "short"         TEXT    NOT NULL,
        "desc"          TEXT             DEFAULT '',
        "prefix"        TEXT             DEFAULT '/',
        "lib"           TEXT             DEFAULT '',
        "code"          TEXT,
        "webhook"       TEXT,
        "support"       TEXT,
        "bg"            TEXT,
        "source_repo"   TEXT,
        "website"       TEXT,
        "donate"        TEXT,
        "invite"        TEXT,
        "slug"          TEXT,
        "added_at"      TEXT    NOT NULL DEFAULT ${NOW_EXPR},
        "guild_ids"     TEXT             DEFAULT '[]'
      )
    `,
		columns: [
			{ name: "card", type: "TEXT" },
			{ name: "owners", type: "TEXT", notNull: true, default: "'[]'" },
			{ name: "tags", type: "TEXT", notNull: true, default: "'[]'" },
			{ name: "badges", type: "TEXT", notNull: true, default: "'[]'" },
			{ name: "approved", type: "INTEGER", notNull: true, default: "0" },
			{ name: "promoted", type: "INTEGER", notNull: true, default: "0" },
			{ name: "opted_coins", type: "INTEGER", notNull: true, default: "0" },
			{ name: "servers", type: "INTEGER", notNull: true, default: "0" },
			{ name: "votes", type: "INTEGER", notNull: true, default: "0" },
			{ name: "username", type: "TEXT", notNull: true, default: "''" },
			{ name: "discriminator", type: "TEXT", notNull: true, default: "'0'" },
			{ name: "avatar", type: "TEXT", notNull: true, default: "''" },
			{ name: "short", type: "TEXT", notNull: true, default: "''" },
			{ name: "desc", type: "TEXT", default: "''" },
			{ name: "prefix", type: "TEXT", default: "'/'" },
			{ name: "lib", type: "TEXT", default: "''" },
			{ name: "code", type: "TEXT" },
			{ name: "webhook", type: "TEXT" },
			{ name: "support", type: "TEXT" },
			{ name: "bg", type: "TEXT" },
			{ name: "source_repo", type: "TEXT" },
			{ name: "website", type: "TEXT" },
			{ name: "donate", type: "TEXT" },
			{ name: "invite", type: "TEXT" },
			{ name: "slug", type: "TEXT" },
			{ name: "added_at", type: "TEXT", notNull: true, default: NOW_EXPR },
			{ name: "guild_ids", type: "TEXT", default: "'[]'" }
		]
	},

	// ── Users ─────────────────────────────────────────────────────────────────
	{
		name: "Users",
		sql: `
      CREATE TABLE IF NOT EXISTS "Users" (
        "id"            TEXT    NOT NULL PRIMARY KEY,
        "globalname"    TEXT,
        "accent_color"  TEXT,
        "username"      TEXT    NOT NULL,
        "discriminator" TEXT    NOT NULL,
        "avatar"        TEXT    NOT NULL,
        "email"         TEXT,
        "bal"           INTEGER NOT NULL DEFAULT 50,
        "bio"           TEXT             DEFAULT 'The user doesn''t have bio set!',
        "banner"        TEXT,
        "badges"        TEXT    NOT NULL DEFAULT '[]',
        "lang"          TEXT    NOT NULL DEFAULT 'en',
        "last_login"    TEXT    NOT NULL DEFAULT ${NOW_EXPR},
        "nitro"         INTEGER NOT NULL DEFAULT 0,
        "old"           INTEGER NOT NULL DEFAULT 1,
        "votes"         TEXT    NOT NULL DEFAULT '[]',
        "added_at"      TEXT    NOT NULL DEFAULT ${NOW_EXPR},
        "keys"          TEXT    NOT NULL DEFAULT '[]'
      )
    `,
		columns: [
			{ name: "globalname", type: "TEXT" },
			{ name: "accent_color", type: "TEXT" },
			{ name: "username", type: "TEXT", notNull: true, default: "''" },
			{ name: "discriminator", type: "TEXT", notNull: true, default: "'0'" },
			{ name: "avatar", type: "TEXT", notNull: true, default: "''" },
			{ name: "email", type: "TEXT" },
			{ name: "bal", type: "INTEGER", notNull: true, default: "50" },
			{ name: "bio", type: "TEXT", default: "'The user doesn''t have bio set!'" },
			{ name: "banner", type: "TEXT" },
			{ name: "badges", type: "TEXT", notNull: true, default: "'[]'" },
			{ name: "lang", type: "TEXT", notNull: true, default: "'en'" },
			{ name: "last_login", type: "TEXT", notNull: true, default: NOW_EXPR },
			{ name: "nitro", type: "INTEGER", notNull: true, default: "0" },
			{ name: "old", type: "INTEGER", notNull: true, default: "1" },
			{ name: "votes", type: "TEXT", notNull: true, default: "'[]'" },
			{ name: "added_at", type: "TEXT", notNull: true, default: NOW_EXPR },
			{ name: "keys", type: "TEXT", notNull: true, default: "'[]'" }
		]
	},

	// ── Servers ───────────────────────────────────────────────────────────────
	{
		name: "Servers",
		sql: `
      CREATE TABLE IF NOT EXISTS "Servers" (
        "id"       TEXT    NOT NULL PRIMARY KEY,
        "short"    TEXT    NOT NULL DEFAULT 'Short description is not Updated.',
        "name"     TEXT    NOT NULL,
        "desc"     TEXT             DEFAULT 'Description is not updated.',
        "owner"    TEXT    NOT NULL,
        "icon"     TEXT             DEFAULT '',
        "promoted" INTEGER NOT NULL DEFAULT 0,
        "badges"   TEXT    NOT NULL DEFAULT '[]',
        "slug"     TEXT,
        "added_at" TEXT    NOT NULL DEFAULT ${NOW_EXPR},
        "votes"    INTEGER NOT NULL DEFAULT 0,
        "bot_ids"  TEXT             DEFAULT '[]'
      )
    `,
		columns: [
			{
				name: "short",
				type: "TEXT",
				notNull: true,
				default: "'Short description is not Updated.'"
			},
			{ name: "name", type: "TEXT", notNull: true, default: "''" },
			{ name: "desc", type: "TEXT", default: "'Description is not updated.'" },
			{ name: "owner", type: "TEXT", notNull: true, default: "''" },
			{ name: "icon", type: "TEXT", default: "''" },
			{ name: "promoted", type: "INTEGER", notNull: true, default: "0" },
			{ name: "badges", type: "TEXT", notNull: true, default: "'[]'" },
			{ name: "slug", type: "TEXT" },
			{ name: "added_at", type: "TEXT", notNull: true, default: NOW_EXPR },
			{ name: "votes", type: "INTEGER", notNull: true, default: "0" },
			{ name: "bot_ids", type: "TEXT", default: "'[]'" }
		]
	},

	// ── Comments ──────────────────────────────────────────────────────────────
	{
		name: "Comments",
		sql: `
      CREATE TABLE IF NOT EXISTS "Comments" (
        "id"         TEXT NOT NULL PRIMARY KEY,
        "bot_id"     TEXT NOT NULL,
        "user_id"    TEXT NOT NULL,
        "rating"     INTEGER,
        "text"       TEXT,
        "parent_id"  TEXT,
        "created_at" TEXT NOT NULL DEFAULT ${NOW_EXPR},
        "updated_at" TEXT
      )
    `,
		columns: [
			{ name: "bot_id", type: "TEXT", notNull: true, default: "''" },
			{ name: "user_id", type: "TEXT", notNull: true, default: "''" },
			{ name: "rating", type: "INTEGER" },
			{ name: "text", type: "TEXT" },
			{ name: "parent_id", type: "TEXT" },
			{ name: "created_at", type: "TEXT", notNull: true, default: NOW_EXPR },
			{ name: "updated_at", type: "TEXT" }
		]
	},
	{
		name: "CommentReactions",
		sql: `
      CREATE TABLE IF NOT EXISTS "CommentReactions" (
        "comment_id" TEXT NOT NULL,
        "user_id"    TEXT NOT NULL,
        "emoji"      TEXT NOT NULL,
        "created_at" TEXT NOT NULL DEFAULT ${NOW_EXPR},
        PRIMARY KEY ("comment_id", "user_id", "emoji")
      )
    `,
		columns: [
			{ name: "comment_id", type: "TEXT", notNull: true, default: "''" },
			{ name: "user_id", type: "TEXT", notNull: true, default: "''" },
			{ name: "emoji", type: "TEXT", notNull: true, default: "''" },
			{ name: "created_at", type: "TEXT", notNull: true, default: NOW_EXPR }
		]
	},

	// ── Emojis ────────────────────────────────────────────────────────────────
	{
		name: "Emojis",
		sql: `
      CREATE TABLE IF NOT EXISTS "Emojis" (
        "id"          TEXT    NOT NULL PRIMARY KEY,
        "code"        TEXT    NOT NULL,
        "name"        TEXT    NOT NULL,
        "alt_names"   TEXT             DEFAULT '[]',
        "description" TEXT,
        "a"           INTEGER NOT NULL DEFAULT 0,
        "dc"          INTEGER NOT NULL DEFAULT 0,
        "added_at"    TEXT    NOT NULL DEFAULT ${NOW_EXPR},
        "submitter"   TEXT,
        "guild"       TEXT
      )
    `,
		columns: [
			{ name: "code", type: "TEXT", notNull: true, default: "''" },
			{ name: "name", type: "TEXT", notNull: true, default: "''" },
			{ name: "alt_names", type: "TEXT", default: "'[]'" },
			{ name: "description", type: "TEXT" },
			{ name: "a", type: "INTEGER", notNull: true, default: "0" },
			{ name: "dc", type: "INTEGER", notNull: true, default: "0" },
			{ name: "added_at", type: "TEXT", notNull: true, default: NOW_EXPR },
			{ name: "submitter", type: "TEXT" },
			{ name: "guild", type: "TEXT" }
		]
	},

	// ── Stickers ──────────────────────────────────────────────────────────────
	{
		name: "Stickers",
		sql: `
      CREATE TABLE IF NOT EXISTS "Stickers" (
        "id"          TEXT    NOT NULL PRIMARY KEY,
        "name"        TEXT    NOT NULL,
        "description" TEXT,
        "tags"        TEXT,
        "format"      INTEGER NOT NULL DEFAULT 1,
        "dc"          INTEGER NOT NULL DEFAULT 0,
        "added_at"    TEXT    NOT NULL DEFAULT ${NOW_EXPR},
        "guild"       TEXT
      )
    `,
		columns: [
			{ name: "name", type: "TEXT", notNull: true, default: "''" },
			{ name: "description", type: "TEXT" },
			{ name: "tags", type: "TEXT" },
			{ name: "format", type: "INTEGER", notNull: true, default: "1" },
			{ name: "dc", type: "INTEGER", notNull: true, default: "0" },
			{ name: "added_at", type: "TEXT", notNull: true, default: NOW_EXPR },
			{ name: "guild", type: "TEXT" }
		]
	},

	// ── Referrals ─────────────────────────────────────────────────────────────
	// One row per referral relationship. Tracks who referred whom, the lifecycle
	// state of the R$100 sign-up reward, and any fraud signals detected at
	// sign-up time (fingerprint match, account age, email verification).
	{
		name: "Referrals",
		sql: `
      CREATE TABLE IF NOT EXISTS "Referrals" (
        "id"                        TEXT    NOT NULL PRIMARY KEY,
        "referrer_id"               TEXT    NOT NULL,
        "referred_id"               TEXT    NOT NULL,
        "code"                      TEXT    NOT NULL,
        "reward_status"             TEXT    NOT NULL DEFAULT 'pending',
        "fingerprint_match"         INTEGER NOT NULL DEFAULT 0,
        "referred_account_age_days" INTEGER,
        "referred_email_verified"   INTEGER NOT NULL DEFAULT 0,
        "created_at"                TEXT    NOT NULL DEFAULT ${NOW_EXPR},
        "settled_at"                TEXT
      )
    `,
		columns: [
			{ name: "referrer_id", type: "TEXT", notNull: true, default: "''" },
			{ name: "referred_id", type: "TEXT", notNull: true, default: "''" },
			{ name: "code", type: "TEXT", notNull: true, default: "''" },
			{ name: "reward_status", type: "TEXT", notNull: true, default: "'pending'" },
			{ name: "fingerprint_match", type: "INTEGER", notNull: true, default: "0" },
			{ name: "referred_account_age_days", type: "INTEGER" },
			{ name: "referred_email_verified", type: "INTEGER", notNull: true, default: "0" },
			{ name: "created_at", type: "TEXT", notNull: true, default: NOW_EXPR },
			{ name: "settled_at", type: "TEXT" }
		]
	},

	// ── ReferralMilestones ────────────────────────────────────────────────────
	// Tracks multi-stage bonus rewards: retention_daily (R$50 × up to 5 days),
	// vote_20 (R$50 flat), server_bounty (R$500), and self_listing_100/500.
	// Each row is one milestone instance; the SettleRewards function writes rows
	// and then calls creditReward() to debit R$ from the system to the user.
	{
		name: "ReferralMilestones",
		sql: `
      CREATE TABLE IF NOT EXISTS "ReferralMilestones" (
        "id"             TEXT    NOT NULL PRIMARY KEY,
        "referral_id"    TEXT,
        "user_id"        TEXT    NOT NULL,
        "milestone_type" TEXT    NOT NULL,
        "reward_amount"  INTEGER NOT NULL,
        "status"         TEXT    NOT NULL DEFAULT 'pending',
        "meta"           TEXT             DEFAULT '{}',
        "created_at"     TEXT    NOT NULL DEFAULT ${NOW_EXPR},
        "paid_at"        TEXT
      )
    `,
		columns: [
			{ name: "referral_id", type: "TEXT" },
			{ name: "user_id", type: "TEXT", notNull: true, default: "''" },
			{ name: "milestone_type", type: "TEXT", notNull: true, default: "''" },
			{ name: "reward_amount", type: "INTEGER", notNull: true, default: "0" },
			{ name: "status", type: "TEXT", notNull: true, default: "'pending'" },
			{ name: "meta", type: "TEXT", default: "'{}'" },
			{ name: "created_at", type: "TEXT", notNull: true, default: NOW_EXPR },
			{ name: "paid_at", type: "TEXT" }
		]
	},

	// ── UserFingerprints ──────────────────────────────────────────────────────
	// Stores browser/device fingerprints for anti-fraud purposes.
	// Maximum 5 fingerprints per user; FIFO eviction (oldest last_seen dropped)
	// is enforced at the application layer when a 6th device would be added.
	// The composite primary key (user_id, fingerprint) enforces uniqueness so
	// the same physical device never creates duplicate rows for one user.
	{
		name: "UserFingerprints",
		sql: `
      CREATE TABLE IF NOT EXISTS "UserFingerprints" (
        "id"          TEXT    NOT NULL PRIMARY KEY,
        "user_id"     TEXT    NOT NULL,
        "fingerprint" TEXT    NOT NULL,
        "first_seen"  TEXT    NOT NULL DEFAULT ${NOW_EXPR},
        "last_seen"   TEXT    NOT NULL DEFAULT ${NOW_EXPR},
        "trust_score" INTEGER NOT NULL DEFAULT 50,
        UNIQUE ("user_id", "fingerprint")
      )
    `,
		columns: [
			{ name: "user_id", type: "TEXT", notNull: true, default: "''" },
			{ name: "fingerprint", type: "TEXT", notNull: true, default: "''" },
			{ name: "first_seen", type: "TEXT", notNull: true, default: NOW_EXPR },
			{ name: "last_seen", type: "TEXT", notNull: true, default: NOW_EXPR },
			{ name: "trust_score", type: "INTEGER", notNull: true, default: "50" }
		]
	},

	// ── UserActivityLog ───────────────────────────────────────────────────────
	// Append-only log of "site_visit" and "vote" events used by SettleRewards
	// to evaluate the retention (5 visit days) and voting (20 unique entities)
	// milestones within a referred user's first 7 days.
	// Deduplication is enforced at the application layer:
	//   site_visit - one row per (user_id, event_day).
	//   vote       - one row per (user_id, entity_id) across all days.
	{
		name: "UserActivityLog",
		sql: `
      CREATE TABLE IF NOT EXISTS "UserActivityLog" (
        "id"          TEXT NOT NULL PRIMARY KEY,
        "user_id"     TEXT NOT NULL,
        "event_type"  TEXT NOT NULL,
        "event_day"   TEXT NOT NULL,
        "entity_id"   TEXT,
        "entity_type" TEXT,
        "created_at"  TEXT NOT NULL DEFAULT ${NOW_EXPR}
      )
    `,
		columns: [
			{ name: "user_id", type: "TEXT", notNull: true, default: "''" },
			{ name: "event_type", type: "TEXT", notNull: true, default: "''" },
			{ name: "event_day", type: "TEXT", notNull: true, default: "''" },
			{ name: "entity_id", type: "TEXT" },
			{ name: "entity_type", type: "TEXT" },
			{ name: "created_at", type: "TEXT", notNull: true, default: NOW_EXPR }
		]
	}
];

// ─────────────────────────────────────────────────────────────────────────────
// Database introspection helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns true if the named table exists in sqlite_master. */
async function tableExists(client, name) {
	const r = await client.execute({
		sql: `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`,
		args: [name]
	});
	return r.rows.length > 0;
}

/** Returns the set of column names present in a live table. */
async function liveColumns(client, name) {
	const r = await client.execute({ sql: `PRAGMA table_info("${name}")`, args: [] });
	return new Set(r.rows.map((row) => String(row.name)));
}

/** Returns the number of rows in a table (0 if table does not exist). */
async function rowCount(client, name) {
	try {
		const r = await client.execute({ sql: `SELECT COUNT(*) AS n FROM "${name}"`, args: [] });
		return Number(r.rows[0]?.n ?? 0);
	} catch {
		return 0;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Core migration logic
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the ALTER TABLE ADD COLUMN statement for a single column definition.
 *
 * SQLite rules:
 *  - A column being added must not have PRIMARY KEY or UNIQUE constraints.
 *  - If the column is NOT NULL it MUST have a DEFAULT (otherwise existing rows
 *    would have no value for it, which violates the constraint).
 *  - DEFAULT expressions referencing functions (like strftime) must be wrapped
 *    in parentheses when they aren't already.
 */
function buildAlterSQL(tableName, col) {
	let fragment = `"${col.name}" ${col.type}`;

	if (col.notNull) {
		if (!col.default && col.default !== 0 && col.default !== "") {
			// Cannot safely add a NOT NULL column without a DEFAULT - downgrade to
			// nullable so we don't break existing rows.
			warn(
				`Column "${col.name}" on "${tableName}" is NOT NULL but has no DEFAULT. ` +
					`Adding as nullable to avoid breaking existing rows.`
			);
		} else {
			fragment += ` NOT NULL DEFAULT ${col.default}`;
		}
	} else if (col.default !== undefined) {
		fragment += ` DEFAULT ${col.default}`;
	}

	return `ALTER TABLE "${tableName}" ADD COLUMN ${fragment}`;
}

/**
 * Ensure a single table exists and has all required columns.
 * Returns a summary object describing what was done.
 */
async function migrateTable(client, tableDef, dryRun) {
	const { name, sql, columns } = tableDef;
	const summary = { name, created: false, added: [], skipped: [], rowCount: 0 };

	// ── 1. Create table if it doesn't exist ──────────────────────────────────
	const exists = await tableExists(client, name);

	if (!exists) {
		const ddl = sql.replace(/\s+/g, " ").trim();
		if (dryRun) {
			info(`[dry-run] Would CREATE TABLE "${name}"`);
		} else {
			await client.execute({ sql: ddl, args: [] });
			summary.created = true;
		}
	}

	// ── 2. Evolve existing columns ────────────────────────────────────────────
	// Skip if we just created it (all columns are already there).
	if (exists && columns?.length) {
		const live = await liveColumns(client, name);

		for (const col of columns) {
			// Primary key column - never needs to be added via ALTER TABLE
			if (col.name === "id") continue;

			if (live.has(col.name)) {
				summary.skipped.push(col.name);
				continue;
			}

			const alterSQL = buildAlterSQL(name, col);

			if (dryRun) {
				info(`[dry-run] Would ADD COLUMN "${col.name}" to "${name}"`);
				info(`          ${c.dim(alterSQL)}`);
			} else {
				await client.execute({ sql: alterSQL, args: [] });
				summary.added.push(col.name);
			}
		}
	}

	summary.rowCount = await rowCount(client, name);
	return summary;
}

// ─────────────────────────────────────────────────────────────────────────────
// Users table - legacy column rename: lastLogin → last_login
// ─────────────────────────────────────────────────────────────────────────────

async function handleLastLoginRename(client, dryRun) {
	const exists = await tableExists(client, "Users");
	if (!exists) return;

	const live = await liveColumns(client, "Users");
	if (!live.has("lastLogin") || live.has("last_login")) return;

	const sql = `ALTER TABLE "Users" RENAME COLUMN "lastLogin" TO "last_login"`;

	if (dryRun) {
		info(`[dry-run] Would rename Users."lastLogin" -> "last_login"`);
		info(`          ${c.dim(sql)}`);
		return;
	}

	await client.execute({ sql, args: [] });
	ok(`Renamed Users."lastLogin" → "last_login"`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Index creation - kept idempotent via CREATE INDEX IF NOT EXISTS
// ─────────────────────────────────────────────────────────────────────────────

const INDEXES = [
	// Speed up "get all comments for a bot" - the most common Comments query
	`CREATE INDEX IF NOT EXISTS "idx_comments_bot_id"
     ON "Comments" ("bot_id")`,

	// ── Emojis indexes ────────────────────────────────────────────────────────
	// Speed up "get all emojis for a guild" - most common Emojis query
	`CREATE INDEX IF NOT EXISTS "idx_emojis_guild"
     ON "Emojis" ("guild")`,

	// Speed up search by name / code
	`CREATE INDEX IF NOT EXISTS "idx_emojis_name"
     ON "Emojis" ("name")`,

	`CREATE INDEX IF NOT EXISTS "idx_emojis_code"
     ON "Emojis" ("code")`,

	// Speed up "top downloaded" sort
	`CREATE INDEX IF NOT EXISTS "idx_emojis_dc"
     ON "Emojis" ("dc" DESC)`,

	// Speed up "newest" sort
	`CREATE INDEX IF NOT EXISTS "idx_emojis_added_at"
     ON "Emojis" ("added_at" DESC)`,

	// Speed up "find by submitter" (dashboard: my submitted emojis)
	`CREATE INDEX IF NOT EXISTS "idx_emojis_submitter"
     ON "Emojis" ("submitter")`,

	// Speed up "did this user already review this bot?" duplicate-check
	`CREATE INDEX IF NOT EXISTS "idx_comments_bot_user"
     ON "Comments" ("bot_id", "user_id")`,

	// Speed up fetching replies for a parent comment
	`CREATE INDEX IF NOT EXISTS "idx_comments_parent_id"
     ON "Comments" ("parent_id")`,

	// Speed up bot lookups by slug
	`CREATE INDEX IF NOT EXISTS "idx_bots_slug"
     ON "Bots" ("slug")`,

	// Speed up getBotsByOwner (LIKE %id% is a full-scan, but index helps ORDER BY)
	`CREATE INDEX IF NOT EXISTS "idx_bots_votes"
     ON "Bots" ("votes" DESC)`,

	// Speed up session/key resolution
	`CREATE INDEX IF NOT EXISTS "idx_users_keys"
     ON "Users" ("keys")`,

	// Speed up "get all reactions for a batch of comments" (GROUP BY comment_id, emoji)
	`CREATE INDEX IF NOT EXISTS "idx_reactions_comment_id"
     ON "CommentReactions" ("comment_id")`,

	// Speed up "get all reactions by a specific user" (used in toggle auth checks)
	`CREATE INDEX IF NOT EXISTS "idx_reactions_user_id"
     ON "CommentReactions" ("user_id")`,

	// Speed up the toggle existence check: (comment_id, user_id, emoji) lookup
	// The PRIMARY KEY already covers this, but an explicit index makes the
	// planner's intent clear and helps on some SQLite builds.
	`CREATE INDEX IF NOT EXISTS "idx_reactions_toggle"
     ON "CommentReactions" ("comment_id", "user_id", "emoji")`,

	// ── Stickers indexes ──────────────────────────────────────────────────────
	// Speed up "get all stickers for a guild" - most common Stickers query
	`CREATE INDEX IF NOT EXISTS "idx_stickers_guild"
     ON "Stickers" ("guild")`,

	// Speed up search by name / tags
	`CREATE INDEX IF NOT EXISTS "idx_stickers_name"
     ON "Stickers" ("name")`,

	`CREATE INDEX IF NOT EXISTS "idx_stickers_tags"
     ON "Stickers" ("tags")`,

	// Speed up "top downloaded" sort
	`CREATE INDEX IF NOT EXISTS "idx_stickers_dc"
     ON "Stickers" ("dc" DESC)`,

	// Speed up "newest" sort
	`CREATE INDEX IF NOT EXISTS "idx_stickers_added_at"
     ON "Stickers" ("added_at" DESC)`,

	// Speed up "animated only" / "static only" format filter
	`CREATE INDEX IF NOT EXISTS "idx_stickers_format"
     ON "Stickers" ("format")`,

	// ── Referrals indexes ─────────────────────────────────────────────────────

	// Look up all referrals sent by a specific referrer (dashboard + SettleRewards).
	`CREATE INDEX IF NOT EXISTS "idx_referrals_referrer_id"
     ON "Referrals" ("referrer_id")`,

	// Look up whether a user has already been referred (duplicate-referral guard).
	`CREATE UNIQUE INDEX IF NOT EXISTS "idx_referrals_referred_id"
     ON "Referrals" ("referred_id")`,

	// Fetch all "payable" rows for Pass 1 of SettleRewards.
	`CREATE INDEX IF NOT EXISTS "idx_referrals_reward_status"
     ON "Referrals" ("reward_status")`,

	// Composite for the active-window query in Pass 2 of SettleRewards:
	//   WHERE reward_status IN ('payable','paid') AND created_at >= <cutoff>
	`CREATE INDEX IF NOT EXISTS "idx_referrals_status_created"
     ON "Referrals" ("reward_status", "created_at" DESC)`,

	// ── ReferralMilestones indexes ────────────────────────────────────────────

	// Primary lookup: all milestones for a given referral (SettleRewards + dashboard).
	`CREATE INDEX IF NOT EXISTS "idx_milestones_referral_id"
     ON "ReferralMilestones" ("referral_id")`,

	// Fetch all milestones that need to be paid out (status = 'pending').
	`CREATE INDEX IF NOT EXISTS "idx_milestones_status"
     ON "ReferralMilestones" ("status")`,

	// Composite used by milestoneExists() for type-level dedup checks.
	`CREATE INDEX IF NOT EXISTS "idx_milestones_referral_type"
     ON "ReferralMilestones" ("referral_id", "milestone_type")`,

	// ── UserFingerprints indexes ──────────────────────────────────────────────

	// getUserFingerprints() - fetch all fingerprints for a user ordered by last_seen.
	// Also used for FIFO eviction: ORDER BY last_seen ASC, LIMIT 1.
	`CREATE INDEX IF NOT EXISTS "idx_fingerprints_user_last_seen"
     ON "UserFingerprints" ("user_id", "last_seen" ASC)`,

	// getUsersWithFingerprint() - find all users sharing a fingerprint (fraud detection).
	`CREATE INDEX IF NOT EXISTS "idx_fingerprints_fp"
     ON "UserFingerprints" ("fingerprint")`,

	// ── UserActivityLog indexes ───────────────────────────────────────────────

	// countVisitDaysInWindow() - count distinct visit days within a date range.
	// Covers: WHERE user_id = ? AND event_type = 'site_visit' AND event_day BETWEEN …
	`CREATE INDEX IF NOT EXISTS "idx_activity_user_type_day"
     ON "UserActivityLog" ("user_id", "event_type", "event_day")`,

	// countUniqueVotesInWindow() - count distinct entity votes within a date range.
	// Covers: WHERE user_id = ? AND event_type = 'vote' AND event_day BETWEEN …
	`CREATE INDEX IF NOT EXISTS "idx_activity_user_vote_entity"
     ON "UserActivityLog" ("user_id", "event_type", "entity_id")`,

	// recordSiteVisit() idempotency check: has this user visited today already?
	`CREATE INDEX IF NOT EXISTS "idx_activity_visit_dedup"
     ON "UserActivityLog" ("user_id", "event_day")
     WHERE "event_type" = 'site_visit'`
];

async function ensureIndexes(client, dryRun) {
	let created = 0;
	for (const sql of INDEXES) {
		const nameMatch = sql.match(/INDEX\s+IF\s+NOT\s+EXISTS\s+"([^"]+)"/i);
		const idxName = nameMatch?.[1] ?? sql;
		if (dryRun) {
			info(`[dry-run] Would CREATE INDEX ${idxName}`);
		} else {
			await client.execute({ sql, args: [] });
			created++;
		}
	}
	if (!dryRun) ok(`Ensured ${created} index(es)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Pretty-print summary table
// ─────────────────────────────────────────────────────────────────────────────

function printSummary(results) {
	const COL = { name: 16, status: 12, added: 28, rows: 8 };
	const hr = "─".repeat(COL.name + COL.status + COL.added + COL.rows + 9);

	log("");
	log(c.bold("  Summary"));
	log(`  ${hr}`);
	log(
		c.bold(
			`  ${"Table".padEnd(COL.name)}  ${"Status".padEnd(COL.status)}  ${"Columns added".padEnd(COL.added)}  ${"Rows".padStart(COL.rows)}`
		)
	);
	log(`  ${hr}`);

	for (const r of results) {
		const statusStr = r.created
			? c.green("created")
			: r.added.length > 0
				? c.yellow("evolved")
				: c.dim("unchanged");

		const addedStr = r.added.length ? c.yellow(r.added.join(", ")) : c.dim("-");

		log(
			`  ${r.name.padEnd(COL.name)}  ${statusStr.padEnd(COL.status + 9)}  ${addedStr.padEnd(COL.added + 9)}  ${String(r.rowCount).padStart(COL.rows)}`
		);
	}

	log(`  ${hr}`);
	log("");
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
	log("");
	log(c.bold(c.cyan("╔══════════════════════════════════════════════╗")));
	log(c.bold(c.cyan("║     Rovel Discord List - DB Migration        ║")));
	log(c.bold(c.cyan("╚══════════════════════════════════════════════╝")));

	const dryRun = process.env.DRY_RUN === "1" || process.argv.includes("--dry-run");
	if (dryRun) {
		log("");
		log(c.yellow(c.bold("  DRY RUN MODE - no changes will be written to the database")));
	}

	// ── Load environment ──────────────────────────────────────────────────────
	section("Environment");
	loadEnv();

	const dbUrl = process.env.DATABASE_URL ?? process.env.ASTRO_DB_REMOTE_URL ?? null;
	const dbToken = process.env.TURSO_TOKEN ?? process.env.ASTRO_DB_APP_TOKEN ?? undefined;

	if (!dbUrl) {
		fail(
			"No database URL found.\n" +
				"    Set DATABASE_URL or ASTRO_DB_REMOTE_URL in your .env or shell environment."
		);
		exit(1);
	}

	info(`Database: ${c.dim(dbUrl)}`);
	info(`Auth token: ${dbToken ? c.dim("[provided]") : c.dim("[none - local/embedded mode]")}`);

	// ── Connect ───────────────────────────────────────────────────────────────
	section("Connection");

	let client;
	try {
		client = createClient({ url: dbUrl, authToken: dbToken });
		await client.execute({ sql: "SELECT 1", args: [] });
		ok("Connected to database");
	} catch (err) {
		fail(`Could not connect to database: ${err.message}`);
		exit(1);
	}

	// ── Legacy rename ─────────────────────────────────────────────────────────
	section("Legacy column renames");
	try {
		await handleLastLoginRename(client, dryRun);
		ok("Column rename check complete");
	} catch (err) {
		warn(`Column rename step failed (non-fatal): ${err.message}`);
	}

	// ── Tables ────────────────────────────────────────────────────────────────
	section("Tables");

	const results = [];
	let anyError = false;

	for (const tableDef of SCHEMA) {
		try {
			const summary = await migrateTable(client, tableDef, dryRun);
			results.push(summary);

			if (summary.created) {
				ok(`"${summary.name}" - created (${summary.rowCount} rows)`);
			} else if (summary.added.length > 0) {
				ok(
					`"${summary.name}" - added ${summary.added.length} column(s): ${summary.added.join(", ")} (${summary.rowCount} rows)`
				);
			} else {
				ok(`"${summary.name}" - already up to date (${summary.rowCount} rows)`);
			}
		} catch (err) {
			fail(`"${tableDef.name}" - ${err.message}`);
			// Print the full error stack in non-TTY/CI environments for better logs
			if (!isTTY) console.error(err);
			anyError = true;
			results.push({ name: tableDef.name, created: false, added: [], skipped: [], rowCount: 0 });
		}
	}

	// ── Indexes ───────────────────────────────────────────────────────────────
	section("Indexes");
	try {
		await ensureIndexes(client, dryRun);
	} catch (err) {
		warn(`Index creation step failed (non-fatal): ${err.message}`);
	}

	// ── Summary ───────────────────────────────────────────────────────────────
	section("Results");
	printSummary(results);

	client.close();

	if (anyError) {
		fail("Migration completed with errors - see above for details.");
		exit(1);
	}

	log(c.green(c.bold("  Migration complete.")));
	log("");
}

main().catch((err) => {
	console.error(c.red("\n[fatal] Unexpected error:"), err);
	exit(1);
});
