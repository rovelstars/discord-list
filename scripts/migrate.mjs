/**
 * Migration script: AstroDB -> Drizzle (Turso/libSQL)
 *
 * What this does:
 *  1. Reads existing data from the old AstroDB-style tables (Bots, Users, Servers)
 *  2. Validates and transforms the shape of each row to match the new Drizzle schema
 *  3. Prompts for confirmation before writing anything
 *  4. Creates the new tables (if they don't exist yet) using the new schema DDL
 *  5. Inserts the transformed rows, skipping duplicates (INSERT OR IGNORE)
 *
 * Usage:
 *   node scripts/migrate.mjs
 *
 * Required environment variables (in .env or shell):
 *   TURSO_URL   – libsql:// or https:// URL for the Turso database
 *   TURSO_TOKEN – auth token for the database (leave empty for local file DBs)
 *
 * The script will never drop or rename existing tables. It is safe to run
 * multiple times (idempotent via INSERT OR IGNORE on primary keys).
 */

import { createClient } from '@libsql/client';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output, exit } from 'node:process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// 0. Load .env manually (no dotenv dep required — we parse it ourselves)
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');

if (existsSync(envPath)) {
	const raw = readFileSync(envPath, 'utf8');
	for (const line of raw.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const eqIdx = trimmed.indexOf('=');
		if (eqIdx === -1) continue;
		const key = trimmed.slice(0, eqIdx).trim();
		let val = trimmed.slice(eqIdx + 1).trim();
		// Strip surrounding quotes
		if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
			val = val.slice(1, -1);
		}
		if (!process.env[key]) process.env[key] = val;
	}
	console.log(`[env] Loaded variables from ${envPath}`);
} else {
	console.warn(`[env] No .env file found at ${envPath} — relying on shell environment`);
}

// ---------------------------------------------------------------------------
// 1. Resolve connection config
//    Supports the same variable names the app itself uses, plus TURSO_URL /
//    TURSO_TOKEN as explicit migration-time overrides.
// ---------------------------------------------------------------------------

const TURSO_URL =
	process.env.TURSO_URL ?? process.env.ASTRO_DB_REMOTE_URL ?? process.env.DATABASE_URL ?? null;

const TURSO_TOKEN = process.env.TURSO_TOKEN ?? process.env.ASTRO_DB_APP_TOKEN ?? undefined;

if (!TURSO_URL) {
	console.error(
		'\n[error] No database URL found.\n' +
			'Set one of the following in your .env or shell:\n' +
			'  TURSO_URL, ASTRO_DB_REMOTE_URL, or DATABASE_URL\n'
	);
	exit(1);
}

// ---------------------------------------------------------------------------
// 2. Helpers
// ---------------------------------------------------------------------------

/** Safely parse a JSON text column; returns fallback on any failure. */
function parseJson(value, fallback = null) {
	if (value === null || value === undefined) return fallback;
	if (typeof value === 'object') return value; // already parsed by driver
	try {
		return JSON.parse(value);
	} catch {
		return fallback;
	}
}

/** Coerce a value to a JSON TEXT string. */
function toJsonText(value, fallback = '[]') {
	if (value === null || value === undefined) return fallback;
	if (typeof value === 'string') {
		// Validate it is actually JSON before round-tripping
		try {
			JSON.parse(value);
			return value;
		} catch {
			/* fall through */
		}
	}
	try {
		return JSON.stringify(value);
	} catch {
		return fallback;
	}
}

/** Normalise a date-ish value to an ISO 8601 string, or null. */
function toIso(value) {
	if (!value) return new Date().toISOString();
	if (value instanceof Date) return value.toISOString();
	if (typeof value === 'number') return new Date(value).toISOString();
	if (typeof value === 'string') {
		const d = new Date(value);
		return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
	}
	return new Date().toISOString();
}

/** Coerce a boolean-ish value to 0 | 1 integer for SQLite. */
function toBoolInt(value) {
	if (typeof value === 'boolean') return value ? 1 : 0;
	if (typeof value === 'number') return value !== 0 ? 1 : 0;
	if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true' ? 1 : 0;
	return 0;
}

/** Check whether a table exists in the connected SQLite database. */
async function tableExists(client, tableName) {
	const result = await client.execute({
		sql: `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
		args: [tableName]
	});
	return result.rows.length > 0;
}

/** Return the column names present in a table (empty array if table absent). */
async function getColumns(client, tableName) {
	const exists = await tableExists(client, tableName);
	if (!exists) return [];
	const result = await client.execute({ sql: `PRAGMA table_info(${tableName})`, args: [] });
	return result.rows.map((r) => r.name);
}

/** Prompt the user for a yes/no answer; returns true on 'y'/'yes'. */
async function confirm(rl, question) {
	const answer = await rl.question(`${question} [y/N] `);
	return answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes';
}

// ---------------------------------------------------------------------------
// 3. DDL for the NEW schema tables
//    These are created only when the table doesn't already exist, so running
//    the script twice is safe.
// ---------------------------------------------------------------------------

const DDL = {
	Bots: `
    CREATE TABLE IF NOT EXISTS "Bots" (
      "id"          TEXT PRIMARY KEY,
      "card"        TEXT,
      "owners"      TEXT NOT NULL DEFAULT '[]',
      "tags"        TEXT NOT NULL DEFAULT '[]',
      "badges"      TEXT NOT NULL DEFAULT '[]',
      "approved"    INTEGER NOT NULL DEFAULT 0,
      "promoted"    INTEGER NOT NULL DEFAULT 0,
      "opted_coins" INTEGER NOT NULL DEFAULT 0,
      "servers"     INTEGER NOT NULL DEFAULT 0,
      "votes"       INTEGER NOT NULL DEFAULT 0,
      "username"    TEXT NOT NULL,
      "discriminator" TEXT NOT NULL,
      "avatar"      TEXT NOT NULL,
      "short"       TEXT NOT NULL,
      "desc"        TEXT NOT NULL DEFAULT '',
      "prefix"      TEXT NOT NULL DEFAULT '/',
      "lib"         TEXT NOT NULL DEFAULT '',
      "code"        TEXT,
      "webhook"     TEXT,
      "support"     TEXT,
      "bg"          TEXT,
      "source_repo" TEXT,
      "website"     TEXT,
      "donate"      TEXT,
      "invite"      TEXT,
      "slug"        TEXT,
      "added_at"    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    )
  `,
	Users: `
    CREATE TABLE IF NOT EXISTS "Users" (
      "id"           TEXT PRIMARY KEY,
      "globalname"   TEXT,
      "accent_color" TEXT,
      "username"     TEXT NOT NULL,
      "discriminator" TEXT NOT NULL,
      "avatar"       TEXT NOT NULL,
      "email"        TEXT,
      "bal"          INTEGER NOT NULL DEFAULT 50,
      "bio"          TEXT NOT NULL DEFAULT 'The user doesn''t have bio set!',
      "banner"       TEXT,
      "badges"       TEXT NOT NULL DEFAULT '[]',
      "lang"         TEXT NOT NULL DEFAULT 'en',
      "last_login"   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      "nitro"        INTEGER NOT NULL DEFAULT 0,
      "old"          INTEGER NOT NULL DEFAULT 1,
      "votes"        TEXT NOT NULL DEFAULT '[]',
      "added_at"     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      "keys"         TEXT NOT NULL DEFAULT '[]'
    )
  `,
	Servers: `
    CREATE TABLE IF NOT EXISTS "Servers" (
      "id"       TEXT PRIMARY KEY,
      "short"    TEXT NOT NULL DEFAULT 'Short description is not Updated.',
      "name"     TEXT NOT NULL,
      "desc"     TEXT NOT NULL DEFAULT 'Description is not updated.',
      "owner"    TEXT NOT NULL,
      "icon"     TEXT NOT NULL DEFAULT '',
      "promoted" INTEGER NOT NULL DEFAULT 0,
      "badges"   TEXT NOT NULL DEFAULT '[]',
      "slug"     TEXT,
      "added_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      "votes"    INTEGER NOT NULL DEFAULT 0
    )
  `
};

// ---------------------------------------------------------------------------
// 4. Row transformers: old shape -> new shape
//    Each function accepts a raw row from the old table and returns a plain
//    object whose keys match the NEW table columns exactly.
// ---------------------------------------------------------------------------

function transformBot(row) {
	return {
		id: String(row.id ?? ''),
		card: row.card !== undefined ? toJsonText(row.card, 'null') : null,
		owners: toJsonText(parseJson(row.owners, []), '[]'),
		tags: toJsonText(parseJson(row.tags, []), '[]'),
		badges: toJsonText(parseJson(row.badges, []), '[]'),
		approved: toBoolInt(row.approved),
		promoted: toBoolInt(row.promoted),
		opted_coins: toBoolInt(row.opted_coins),
		servers: Number(row.servers ?? 0),
		votes: Number(row.votes ?? 0),
		username: String(row.username ?? ''),
		discriminator: String(row.discriminator ?? ''),
		avatar: String(row.avatar ?? ''),
		short: String(row.short ?? ''),
		desc: String(row.desc ?? ''),
		prefix: String(row.prefix ?? '/'),
		lib: String(row.lib ?? ''),
		code: row.code != null ? String(row.code) : null,
		webhook: row.webhook != null ? String(row.webhook) : null,
		support: row.support != null ? String(row.support) : null,
		bg: row.bg != null ? String(row.bg) : null,
		source_repo: row.source_repo != null ? String(row.source_repo) : null,
		website: row.website != null ? String(row.website) : null,
		donate: row.donate != null ? String(row.donate) : null,
		invite: row.invite != null ? String(row.invite) : null,
		slug: row.slug != null ? String(row.slug) : null,
		added_at: toIso(row.added_at)
	};
}

function transformUser(row) {
	return {
		id: String(row.id ?? ''),
		globalname: row.globalname != null ? String(row.globalname) : null,
		accent_color: row.accent_color != null ? String(row.accent_color) : null,
		username: String(row.username ?? ''),
		discriminator: String(row.discriminator ?? ''),
		avatar: String(row.avatar ?? ''),
		email: row.email != null ? String(row.email) : null,
		bal: Number(row.bal ?? 50),
		bio: String(row.bio ?? "The user doesn't have bio set!"),
		banner: row.banner != null ? String(row.banner) : null,
		badges: toJsonText(parseJson(row.badges, []), '[]'),
		lang: String(row.lang ?? 'en'),
		// Key rename: lastLogin (old) -> last_login (new)
		last_login: toIso(row.lastLogin ?? row.last_login),
		nitro: Number(row.nitro ?? 0),
		old: toBoolInt(row.old ?? true),
		votes: toJsonText(parseJson(row.votes, []), '[]'),
		added_at: toIso(row.added_at),
		keys: toJsonText(parseJson(row.keys, []), '[]')
	};
}

function transformServer(row) {
	return {
		id: String(row.id ?? ''),
		short: String(row.short ?? 'Short description is not Updated.'),
		name: String(row.name ?? ''),
		desc: String(row.desc ?? 'Description is not updated.'),
		owner: String(row.owner ?? ''),
		icon: String(row.icon ?? ''),
		promoted: toBoolInt(row.promoted),
		badges: toJsonText(parseJson(row.badges, []), '[]'),
		slug: row.slug != null ? String(row.slug) : null,
		added_at: toIso(row.added_at),
		votes: Number(row.votes ?? 0)
	};
}

// ---------------------------------------------------------------------------
// 5. Validation: make sure a transformed row is usable
// ---------------------------------------------------------------------------

function validateBot(row, idx) {
	const errors = [];
	if (!row.id) errors.push('missing id');
	if (!row.username) errors.push('missing username');
	if (!row.avatar) errors.push('missing avatar');
	if (!row.short) errors.push('missing short description');
	if (errors.length) {
		console.warn(
			`  [warn] Bot row #${idx} has issues: ${errors.join(', ')} — will still be imported`
		);
	}
	return errors.length === 0;
}

function validateUser(row, idx) {
	const errors = [];
	if (!row.id) errors.push('missing id');
	if (!row.username) errors.push('missing username');
	if (errors.length) {
		console.warn(
			`  [warn] User row #${idx} has issues: ${errors.join(', ')} — will still be imported`
		);
	}
	return errors.length === 0;
}

function validateServer(row, idx) {
	const errors = [];
	if (!row.id) errors.push('missing id');
	if (!row.name) errors.push('missing name');
	if (errors.length) {
		console.warn(
			`  [warn] Server row #${idx} has issues: ${errors.join(', ')} — will still be imported`
		);
	}
	return errors.length === 0;
}

// ---------------------------------------------------------------------------
// 6. Bulk insert helper (INSERT OR IGNORE to stay idempotent)
// ---------------------------------------------------------------------------

// Rows per multi-value INSERT statement.
// Each chunk becomes a single SQL statement:
//   INSERT OR IGNORE INTO "T" (a,b,c) VALUES (?,?,?),(?,?,?),(?,?,?)...
// This means the whole 4 MB database typically fits in 2-3 round-trips total.
// Turso's HTTP body limit is ~2 MB; 100 wide rows (Users/Bots with JSON blobs)
// is safe. Raise to 250 for narrower tables if desired.
const CHUNK_SIZE = 100;

async function bulkInsert(client, tableName, rows) {
	if (rows.length === 0) {
		console.log(`  [skip] No rows to insert into ${tableName}`);
		return 0;
	}

	const columns = Object.keys(rows[0]);
	const colList = columns.map((c) => `"${c}"`).join(', ');
	const rowPlaceholder = `(${columns.map(() => '?').join(', ')})`;

	let inserted = 0;
	let chunkNum = 0;
	const totalChunks = Math.ceil(rows.length / CHUNK_SIZE);

	for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
		const chunk = rows.slice(i, i + CHUNK_SIZE);
		chunkNum++;

		// One multi-row INSERT per chunk — single round-trip to Turso.
		const valueClauses = chunk.map(() => rowPlaceholder).join(', ');
		const sql = `INSERT OR IGNORE INTO "${tableName}" (${colList}) VALUES ${valueClauses}`;
		const args = chunk.flatMap((row) =>
			columns.map((c) => {
				const v = row[c];
				return v === undefined ? null : v;
			})
		);

		const res = await client.execute({ sql, args });
		inserted += res.rowsAffected;

		process.stdout.write(`\r  chunk ${chunkNum}/${totalChunks} — ${inserted} inserted so far`);
	}

	const skipped = rows.length - inserted;
	process.stdout.write('\n');
	console.log(`  [ok] ${tableName}: ${inserted} inserted, ${skipped} skipped (already existed)`);
	return inserted;
}

// ---------------------------------------------------------------------------
// 7. Main
// ---------------------------------------------------------------------------

async function main() {
	console.log('\n========================================');
	console.log('  TursoDB Migration: AstroDB -> Drizzle');
	console.log('========================================\n');
	console.log(`[db] Connecting to: ${TURSO_URL}\n`);

	const client = createClient({
		url: TURSO_URL,
		authToken: TURSO_TOKEN
	});

	const rl = readline.createInterface({ input, output });

	try {
		// ------------------------------------------------------------------
		// 7a. Connectivity check
		// ------------------------------------------------------------------
		console.log('[check] Verifying database connection...');
		await client.execute({ sql: 'SELECT 1', args: [] });
		console.log('[check] Connected successfully.\n');

		// ------------------------------------------------------------------
		// 7b. Discover which old tables exist and how many rows they hold
		// ------------------------------------------------------------------
		console.log('[check] Scanning existing tables...\n');

		const OLD_TABLES = ['Bots', 'Users', 'Servers'];
		const tableInfo = {};

		for (const t of OLD_TABLES) {
			const exists = await tableExists(client, t);
			if (exists) {
				const cols = await getColumns(client, t);
				const countRes = await client.execute({
					sql: `SELECT COUNT(*) as cnt FROM "${t}"`,
					args: []
				});
				const count = Number(countRes.rows[0]?.cnt ?? 0);
				tableInfo[t] = { exists: true, columns: cols, count };
				console.log(`  Table "${t}": FOUND  (${count} rows, columns: ${cols.join(', ')})`);
			} else {
				tableInfo[t] = { exists: false, columns: [], count: 0 };
				console.log(`  Table "${t}": NOT FOUND — will create from scratch`);
			}
		}

		// ------------------------------------------------------------------
		// 7c. Detect column-level migration concerns
		// ------------------------------------------------------------------
		console.log('\n[check] Checking for notable column differences...\n');

		const userCols = tableInfo['Users']?.columns ?? [];
		const hasLastLogin = userCols.includes('lastLogin');
		const hasLastLoginSnake = userCols.includes('last_login');

		if (hasLastLogin && !hasLastLoginSnake) {
			console.log(
				'  Users."lastLogin" -> Users."last_login"  [rename detected — ALTER TABLE will be run]'
			);
		} else if (!hasLastLogin && !hasLastLoginSnake && tableInfo['Users']?.exists) {
			console.warn(
				'  [warn] Users table exists but has neither "lastLogin" nor "last_login" — will default to now()'
			);
		} else if (hasLastLoginSnake) {
			console.log('  Users."last_login" already present — no rename needed');
		}
		console.log();

		// ------------------------------------------------------------------
		// 7d. Summarise what the migration will do and ask for confirmation
		// ------------------------------------------------------------------
		console.log('[plan] Migration plan:');
		console.log('  1. CREATE TABLE IF NOT EXISTS for Bots, Users, Servers (new schema DDL)');
		if (hasLastLogin && !hasLastLoginSnake) {
			console.log('  2. ALTER TABLE "Users" RENAME COLUMN "lastLogin" TO "last_login"');
		}
		for (const t of OLD_TABLES) {
			if (tableInfo[t].exists) {
				console.log(
					`  ${hasLastLogin && !hasLastLoginSnake ? '3' : '2'}. Read all ${tableInfo[t].count} rows from existing "${t}" table`
				);
				console.log(`     Transform to new schema shape (types, column renames, JSON coercion)`);
				console.log(`     INSERT OR IGNORE into the (new) "${t}" table`);
			}
		}
		console.log('\n  NOTE: The old tables will NOT be dropped. No data will be deleted.');
		console.log('  NOTE: Running this script again is safe — duplicates are skipped.\n');

		const totalRows = OLD_TABLES.reduce((s, t) => s + (tableInfo[t]?.count ?? 0), 0);
		if (totalRows === 0) {
			console.log('[info] All source tables are empty or absent. Nothing to migrate.\n');
		}

		const proceed = await confirm(rl, 'Proceed with migration?');
		if (!proceed) {
			console.log('\n[abort] Migration cancelled by user.');
			exit(0);
		}

		console.log('\n[migrate] Starting migration...\n');

		// ------------------------------------------------------------------
		// 7e. Create new tables
		// ------------------------------------------------------------------
		console.log('[ddl] Ensuring new schema tables exist...');
		for (const [tName, ddl] of Object.entries(DDL)) {
			await client.execute({ sql: ddl, args: [] });
			console.log(`  [ok] "${tName}" table ready`);
		}
		console.log();

		// ------------------------------------------------------------------
		// 7f. Rename lastLogin -> last_login on the live Users table if needed
		//     ALTER TABLE RENAME COLUMN is supported in SQLite 3.25.0+ and all
		//     Turso/libSQL versions. We re-scan columns afterwards so the rest
		//     of the script sees the updated layout.
		// ------------------------------------------------------------------
		const liveUserCols = await getColumns(client, 'Users');
		const liveHasLastLogin = liveUserCols.includes('lastLogin');
		const liveHasLastLoginSnake = liveUserCols.includes('last_login');

		if (liveHasLastLogin && !liveHasLastLoginSnake) {
			console.log('[alter] Renaming Users."lastLogin" -> "last_login"...');
			await client.execute({
				sql: `ALTER TABLE "Users" RENAME COLUMN "lastLogin" TO "last_login"`,
				args: []
			});
			console.log('  [ok] Column renamed successfully.\n');
			// Refresh the cached column list so the insert SQL is correct
			tableInfo['Users'].columns = await getColumns(client, 'Users');
		} else if (liveHasLastLoginSnake) {
			console.log('[alter] Users."last_login" already exists — skipping rename.\n');
		} else if (tableInfo['Users']?.exists) {
			console.warn(
				'[alter] Users table has neither "lastLogin" nor "last_login" — skipping rename.\n'
			);
		}

		// ------------------------------------------------------------------
		// 7g. Migrate Bots
		// ------------------------------------------------------------------
		if (tableInfo['Bots']?.exists && tableInfo['Bots'].count > 0) {
			console.log(`[migrate] Bots (${tableInfo['Bots'].count} rows)...`);
			const raw = await client.execute({ sql: 'SELECT * FROM "Bots"', args: [] });
			const rows = raw.rows.map((r, i) => {
				const transformed = transformBot(r);
				validateBot(transformed, i);
				return transformed;
			});
			await bulkInsert(client, 'Bots', rows);
		} else {
			console.log('[migrate] Bots: nothing to migrate');
		}
		console.log();

		// ------------------------------------------------------------------
		// 7h. Migrate Users
		// ------------------------------------------------------------------
		if (tableInfo['Users']?.exists && tableInfo['Users'].count > 0) {
			console.log(`[migrate] Users (${tableInfo['Users'].count} rows)...`);
			const raw = await client.execute({ sql: 'SELECT * FROM "Users"', args: [] });
			const rows = raw.rows.map((r, i) => {
				const transformed = transformUser(r);
				validateUser(transformed, i);
				return transformed;
			});
			await bulkInsert(client, 'Users', rows);
		} else {
			console.log('[migrate] Users: nothing to migrate');
		}
		console.log();

		// ------------------------------------------------------------------
		// 7i. Migrate Servers
		// ------------------------------------------------------------------
		if (tableInfo['Servers']?.exists && tableInfo['Servers'].count > 0) {
			console.log(`[migrate] Servers (${tableInfo['Servers'].count} rows)...`);
			const raw = await client.execute({ sql: 'SELECT * FROM "Servers"', args: [] });
			const rows = raw.rows.map((r, i) => {
				const transformed = transformServer(r);
				validateServer(transformed, i);
				return transformed;
			});
			await bulkInsert(client, 'Servers', rows);
		} else {
			console.log('[migrate] Servers: nothing to migrate');
		}
		console.log();

		// ------------------------------------------------------------------
		// 7j. Post-migration sanity check
		// ------------------------------------------------------------------
		console.log('[verify] Post-migration row counts:\n');
		for (const t of OLD_TABLES) {
			const res = await client.execute({ sql: `SELECT COUNT(*) as cnt FROM "${t}"`, args: [] });
			const count = Number(res.rows[0]?.cnt ?? 0);
			const oldCount = tableInfo[t]?.count ?? 0;
			const status = count >= oldCount ? 'OK' : 'WARN — fewer rows than source!';
			console.log(`  "${t}": ${count} rows  [source had ${oldCount}]  ${status}`);
		}

		console.log('\n[done] Migration complete!\n');
	} catch (err) {
		console.error('\n[error] Migration failed:', err);
		exit(1);
	} finally {
		rl.close();
		client.close();
	}
}

main();
