/**
 * Emoji query helpers
 *
 * All emoji-related DB operations live here to keep the main queries/index
 * file focused on bots/servers/users.
 *
 * Tables:
 *  - Emojis  (id TEXT PK, code TEXT, name TEXT, alt_names TEXT/JSON,
 *             description TEXT, a INTEGER/bool, dc INTEGER, added_at TEXT,
 *             submitter TEXT|NULL, guild TEXT|NULL)
 *
 * Query patterns:
 *  - listEmojis          paginated listing with optional search + animated filter
 *  - getEmojiById        single emoji by id
 *  - getEmojisByGuild    all emojis belonging to a specific guild
 *  - searchEmojis        full-text-ish search across name, code, alt_names
 *  - incrementEmojiDownload  atomic dc++ via SQL expression
 *  - upsertEmojiFromSync     server sync: insert or update guild link
 *  - getRandomEmojis     random selection for homepage / sidebars
 */

import { withDb, type DrizzleDb } from "$lib/db/index";
import { Emojis } from "$lib/db/schema";
import { eq, like, or, desc, asc, sql, and, inArray } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type EmojiSummary = {
	id: string;
	code: string;
	name: string;
	alt_names: string[];
	a: boolean;
	dc: number;
	added_at: string | null;
	guild: string | null;
	submitter: string | null;
};

export type EmojiDetail = EmojiSummary & {
	description: string | null;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type RawRow = Record<string, any>;

function parseAltNames(raw: unknown): string[] {
	try {
		if (raw == null) return [];
		if (typeof raw === "string") {
			const parsed = JSON.parse(raw);
			return Array.isArray(parsed) ? parsed.map(String) : [];
		}
		if (Array.isArray(raw)) return raw.map(String);
		return [];
	} catch {
		return [];
	}
}

function mapSummary(row: RawRow): EmojiSummary {
	return {
		id: String(row.id),
		code: String(row.code ?? ""),
		name: String(row.name ?? ""),
		alt_names: parseAltNames(row.alt_names),
		a: row.a === 1 || row.a === true,
		dc: typeof row.dc === "number" ? row.dc : Number(row.dc) || 0,
		added_at: row.added_at ?? null,
		guild: row.guild ?? null,
		submitter: row.submitter ?? null
	};
}

function mapDetail(row: RawRow): EmojiDetail {
	return {
		...mapSummary(row),
		description: row.description ?? null
	};
}

// Common column selection for summary queries (no description to keep it lean)
const SUMMARY_COLS = {
	id: Emojis.id,
	code: Emojis.code,
	name: Emojis.name,
	alt_names: Emojis.alt_names,
	a: Emojis.a,
	dc: Emojis.dc,
	added_at: Emojis.added_at,
	guild: Emojis.guild,
	submitter: Emojis.submitter
} as const;

// ---------------------------------------------------------------------------
// Query implementations
// ---------------------------------------------------------------------------

/**
 * Paginated emoji listing.
 *
 * Options:
 *  - q?         Full-text search across name, code and alt_names.
 *  - animated?  true = only animated, false = only static, undefined = both.
 *  - guildId?   Filter to emojis belonging to a specific guild.
 *  - offset?    Pagination offset.
 *  - limit?     Page size (max 100).
 *  - sort?      "newest" | "popular" | "az"
 */
export async function listEmojis(
	options: {
		q?: string | null;
		animated?: boolean | null;
		guildId?: string | null;
		offset?: number;
		limit?: number;
		sort?: "newest" | "popular" | "az";
	} = {}
): Promise<EmojiSummary[]> {
	const {
		q = null,
		animated = null,
		guildId = null,
		offset = 0,
		limit = 48,
		sort = "newest"
	} = options;

	const clampedLimit = Math.min(limit, 100);

	const rows = (await withDb((db: DrizzleDb) => {
		let builder: any = db.select(SUMMARY_COLS).from(Emojis);

		// Build WHERE conditions
		const conditions: any[] = [];

		if (q) {
			const pattern = `%${q}%`;
			conditions.push(
				or(like(Emojis.name, pattern), like(Emojis.code, pattern), like(Emojis.alt_names, pattern))
			);
		}

		if (animated === true) {
			conditions.push(eq(Emojis.a, true));
		} else if (animated === false) {
			conditions.push(eq(Emojis.a, false));
		}

		if (guildId) {
			conditions.push(eq(Emojis.guild, guildId));
		}

		if (conditions.length === 1) {
			builder = builder.where(conditions[0]);
		} else if (conditions.length > 1) {
			builder = builder.where(and(...conditions));
		}

		// ORDER BY
		if (sort === "popular") {
			builder = builder.orderBy(desc(Emojis.dc));
		} else if (sort === "az") {
			builder = builder.orderBy(asc(Emojis.name));
		} else {
			// newest (default)
			builder = builder.orderBy(desc(Emojis.added_at));
		}

		return builder.limit(clampedLimit).offset(offset);
	})) as RawRow[];

	return rows.map(mapSummary);
}

/**
 * Fetch total count of emojis matching the given filters.
 * Used for pagination metadata.
 */
export async function countEmojis(
	options: {
		q?: string | null;
		animated?: boolean | null;
		guildId?: string | null;
	} = {}
): Promise<number> {
	const { q = null, animated = null, guildId = null } = options;

	const rows = (await withDb((db: DrizzleDb) => {
		let builder: any = db.select({ n: sql<number>`COUNT(*)` }).from(Emojis);

		const conditions: any[] = [];

		if (q) {
			const pattern = `%${q}%`;
			conditions.push(
				or(like(Emojis.name, pattern), like(Emojis.code, pattern), like(Emojis.alt_names, pattern))
			);
		}
		if (animated === true) conditions.push(eq(Emojis.a, true));
		else if (animated === false) conditions.push(eq(Emojis.a, false));
		if (guildId) conditions.push(eq(Emojis.guild, guildId));

		if (conditions.length === 1) builder = builder.where(conditions[0]);
		else if (conditions.length > 1) builder = builder.where(and(...conditions));

		return builder;
	})) as RawRow[];

	return Number(rows[0]?.n ?? 0);
}

/**
 * Get a single emoji by its Discord snowflake id.
 * Returns full detail (including description).
 */
export async function getEmojiById(id: string): Promise<EmojiDetail | null> {
	const rows = (await withDb((db: DrizzleDb) =>
		db
			.select({
				...SUMMARY_COLS,
				description: Emojis.description
			})
			.from(Emojis)
			.where(eq(Emojis.id, id))
			.limit(1)
	)) as RawRow[];

	if (!rows || rows.length === 0) return null;
	return mapDetail(rows[0]);
}

/**
 * Fetch multiple emojis by their Discord snowflake ids in a single query.
 * Returns a Map keyed by id for O(1) lookup by callers.
 * Missing ids simply have no entry in the map.
 */
export async function getEmojisByIds(ids: string[]): Promise<Map<string, EmojiSummary>> {
	if (!ids.length) return new Map();

	const rows = (await withDb((db: DrizzleDb) =>
		db.select(SUMMARY_COLS).from(Emojis).where(inArray(Emojis.id, ids))
	)) as RawRow[];

	const map = new Map<string, EmojiSummary>();
	for (const row of rows) {
		const emoji = mapSummary(row);
		map.set(emoji.id, emoji);
	}
	return map;
}

/**
 * Get all emojis belonging to a specific guild (server).
 * Returns summaries ordered by name ascending.
 */
export async function getEmojisByGuild(
	guildId: string,
	limit = 200,
	offset = 0
): Promise<EmojiSummary[]> {
	const rows = (await withDb((db: DrizzleDb) =>
		db
			.select(SUMMARY_COLS)
			.from(Emojis)
			.where(eq(Emojis.guild, guildId))
			.orderBy(asc(Emojis.name))
			.limit(Math.min(limit, 500))
			.offset(offset)
	)) as RawRow[];

	return rows.map(mapSummary);
}

/**
 * Count emojis belonging to a specific guild.
 */
export async function countEmojisByGuild(guildId: string): Promise<number> {
	const rows = (await withDb((db: DrizzleDb) =>
		db
			.select({ n: sql<number>`COUNT(*)` })
			.from(Emojis)
			.where(eq(Emojis.guild, guildId))
	)) as RawRow[];

	return Number(rows[0]?.n ?? 0);
}

/**
 * Search emojis by name, code or alt_names.
 * Convenience wrapper around listEmojis.
 */
export async function searchEmojis(q: string, limit = 48, offset = 0): Promise<EmojiSummary[]> {
	return listEmojis({ q, limit, offset });
}

/**
 * Atomically increment the download counter for an emoji.
 * Uses a SQL expression so it's race-condition-safe.
 */
export async function incrementEmojiDownload(id: string): Promise<void> {
	await withDb((db: DrizzleDb) =>
		db
			.update(Emojis)
			.set({ dc: sql`${Emojis.dc} + 1` })
			.where(eq(Emojis.id, id))
	);
}

/**
 * Validate a single emoji from Discord before touching the DB.
 * Returns a trimmed/safe copy, or null if the emoji should be skipped.
 */
function validateSyncEmoji(
	emoji: { id: string; name: string; animated?: boolean },
	guildId: string
): { safeId: string; safeName: string; safeGuildId: string } | null {
	if (!emoji.id || typeof emoji.id !== "string" || !/^\d+$/.test(emoji.id.trim())) {
		console.warn(`[syncGuildEmojis] Skipping emoji with invalid id: ${JSON.stringify(emoji.id)}`);
		return null;
	}
	if (!emoji.name || typeof emoji.name !== "string" || !emoji.name.trim()) {
		console.warn(`[syncGuildEmojis] Skipping emoji ${emoji.id} with empty name`);
		return null;
	}
	if (!guildId || typeof guildId !== "string" || !/^\d+$/.test(guildId.trim())) {
		console.warn(
			`[syncGuildEmojis] Skipping emoji ${emoji.id} — invalid guildId: ${JSON.stringify(guildId)}`
		);
		return null;
	}
	return { safeId: emoji.id.trim(), safeName: emoji.name.trim(), safeGuildId: guildId.trim() };
}

/**
 * Bulk-upsert all emojis from a single guild sync in two round-trips:
 *
 *  1. SELECT existing rows for all incoming IDs (one query, inArray).
 *  2a. INSERT (ignore conflicts) all brand-new emojis in one batch statement.
 *  2b. UPDATE each existing emoji individually only when something actually
 *      changed (code/name/animated/guild), so we never issue a write that
 *      touches unchanged rows.
 *
 * This replaces the old serial N×2 per-emoji loop and cuts round-trips from
 * O(N) down to O(1) for the common case where all emojis already exist.
 *
 * Returns { created, updated } counts.
 */
export async function syncGuildEmojis(
	guildId: string,
	emojis: Array<{ id: string; name: string; animated?: boolean }>
): Promise<{ created: number; updated: number }> {
	if (!emojis.length) return { created: 0, updated: 0 };

	// ── 1. Validate & deduplicate by id ───────────────────────────────────────
	const validMap = new Map<
		string,
		{ safeId: string; safeName: string; safeGuildId: string; animated: boolean }
	>();
	for (const e of emojis) {
		const v = validateSyncEmoji(e, guildId);
		if (v && !validMap.has(v.safeId)) {
			validMap.set(v.safeId, { ...v, animated: e.animated ?? false });
		}
	}
	if (!validMap.size) return { created: 0, updated: 0 };

	const allIds = [...validMap.keys()];
	const now = new Date().toISOString();

	// ── 2. Fetch all existing rows in one query ────────────────────────────────
	// inArray supports up to SQLite's SQLITE_MAX_VARIABLE_NUMBER (999 by default
	// for libSQL). Discord guilds are capped at 500 emojis (2×250 for boosted),
	// so we're always safely under that limit.
	const existingRows = (await withDb((db: DrizzleDb) =>
		db
			.select({
				id: Emojis.id,
				name: Emojis.name,
				code: Emojis.code,
				a: Emojis.a,
				guild: Emojis.guild,
				submitter: Emojis.submitter
			})
			.from(Emojis)
			.where(inArray(Emojis.id, allIds))
	)) as RawRow[];

	const existingById = new Map<string, RawRow>(existingRows.map((r) => [String(r.id), r]));

	// ── 3. Split into inserts vs updates ──────────────────────────────────────
	const toInsert: (typeof Emojis.$inferInsert)[] = [];
	const toUpdate: Array<{
		safeId: string;
		safeName: string;
		animated: boolean;
		safeGuildId: string;
		keepName: string;
	}> = [];

	for (const [safeId, v] of validMap) {
		const existing = existingById.get(safeId);
		if (!existing) {
			// Brand-new emoji
			toInsert.push({
				id: safeId,
				code: v.safeName,
				name: v.safeName.replace(/_/g, " "),
				alt_names: JSON.stringify([v.safeName.toLowerCase()]),
				a: v.animated,
				dc: 0,
				added_at: now,
				submitter: null,
				guild: v.safeGuildId
			});
		} else {
			// Existing — compute the display name to keep
			const keepName = existing.submitter
				? (existing.name ?? v.safeName.replace(/_/g, " "))
				: v.safeName.replace(/_/g, " ");

			// Only queue an UPDATE if something actually changed
			const needsUpdate =
				existing.code !== v.safeName ||
				existing.name !== keepName ||
				Boolean(existing.a) !== v.animated ||
				existing.guild !== v.safeGuildId ||
				existing.submitter !== null;

			if (needsUpdate) {
				toUpdate.push({
					safeId,
					safeName: v.safeName,
					animated: v.animated,
					safeGuildId: v.safeGuildId,
					keepName
				});
			}
		}
	}

	// ── 4a. Batch insert new emojis ────────────────────────────────────────────
	// SQLite INSERT OR IGNORE so a race (two syncs running simultaneously) never
	// throws a UNIQUE constraint error.
	if (toInsert.length > 0) {
		// Drizzle's .insert().values([...]) sends a single parameterised statement.
		await withDb((db: DrizzleDb) =>
			(db.insert(Emojis).values(toInsert) as any).onConflictDoNothing()
		);
	}

	// ── 4b. Update changed existing emojis ────────────────────────────────────
	// libSQL (Turso) doesn't support multi-row UPDATE in one statement, so we
	// fire individual UPDATEs — but only for rows that actually changed, which
	// in practice is a small fraction of the total on repeated syncs.
	for (const u of toUpdate) {
		await withDb((db: DrizzleDb) =>
			db
				.update(Emojis)
				.set({
					code: u.safeName,
					name: u.keepName,
					a: u.animated,
					guild: u.safeGuildId,
					submitter: null
				})
				.where(eq(Emojis.id, u.safeId))
		);
	}

	return { created: toInsert.length, updated: toUpdate.length };
}

/**
 * Get a random selection of emojis.
 * Useful for homepage highlights.
 */
export async function getRandomEmojis(limit = 12): Promise<EmojiSummary[]> {
	const rows = (await withDb((db: DrizzleDb) =>
		db
			.select(SUMMARY_COLS)
			.from(Emojis)
			.orderBy(sql`RANDOM()`)
			.limit(Math.min(limit, 50))
	)) as RawRow[];

	return rows.map(mapSummary);
}

/**
 * Get the most-downloaded emojis.
 */
export async function getTopEmojis(limit = 12): Promise<EmojiSummary[]> {
	const rows = (await withDb((db: DrizzleDb) =>
		db.select(SUMMARY_COLS).from(Emojis).orderBy(desc(Emojis.dc)).limit(Math.min(limit, 50))
	)) as RawRow[];

	return rows.map(mapSummary);
}

/**
 * Get the newest emojis added.
 */
export async function getNewestEmojis(limit = 12): Promise<EmojiSummary[]> {
	const rows = (await withDb((db: DrizzleDb) =>
		db.select(SUMMARY_COLS).from(Emojis).orderBy(desc(Emojis.added_at)).limit(Math.min(limit, 50))
	)) as RawRow[];

	return rows.map(mapSummary);
}
