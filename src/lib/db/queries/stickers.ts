/**
 * Sticker query helpers
 *
 * All sticker-related DB operations live here, mirroring the structure of
 * the emoji query helpers for consistency.
 *
 * Tables:
 *  - Stickers  (id TEXT PK, name TEXT, description TEXT, tags TEXT,
 *               format INTEGER, dc INTEGER, added_at TEXT, guild TEXT|NULL)
 *
 * Query patterns:
 *  - listStickers              paginated listing with optional search + format filter
 *  - countStickers             total count matching filters
 *  - getStickerById            single sticker by id
 *  - getStickersByGuild        all stickers belonging to a specific guild
 *  - incrementStickerDownload  atomic dc++ via SQL expression
 *  - syncGuildStickers         bulk-upsert from a guild sync
 *  - getRandomStickers         random selection for homepage / sidebars
 *  - getTopStickers            most-downloaded stickers
 *  - getNewestStickers         most recently added stickers
 */

import { withDb, type DrizzleDb } from "$lib/db/index";
import { Stickers } from "$lib/db/schema";
import { eq, like, or, desc, asc, sql, and, inArray } from "drizzle-orm";

// Pure utility functions and constants live in the client-safe utils module.
// Re-export everything from there so server-side callers can keep using this
// single import path while Svelte components import from sticker-utils directly.
export {
	STICKER_FORMAT,
	isStickerAnimated,
	getStickerUrl,
	getStickerExtension,
	getStickerFormatLabel
} from "$lib/sticker-utils";
export type { StickerFormatType } from "$lib/sticker-utils";

// Local alias used below for format constant comparisons.
import { STICKER_FORMAT } from "$lib/sticker-utils";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type StickerSummary = {
	id: string;
	name: string;
	tags: string | null;
	format: number;
	dc: number;
	added_at: string | null;
	guild: string | null;
};

export type StickerDetail = StickerSummary & {
	description: string | null;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type RawRow = Record<string, any>;

function mapSummary(row: RawRow): StickerSummary {
	return {
		id: String(row.id),
		name: String(row.name ?? ""),
		tags: row.tags ?? null,
		format: typeof row.format === "number" ? row.format : Number(row.format) || 1,
		dc: typeof row.dc === "number" ? row.dc : Number(row.dc) || 0,
		added_at: row.added_at ?? null,
		guild: row.guild ?? null
	};
}

function mapDetail(row: RawRow): StickerDetail {
	return {
		...mapSummary(row),
		description: row.description ?? null
	};
}

// Common column selection for summary queries (no description to keep it lean)
const SUMMARY_COLS = {
	id: Stickers.id,
	name: Stickers.name,
	tags: Stickers.tags,
	format: Stickers.format,
	dc: Stickers.dc,
	added_at: Stickers.added_at,
	guild: Stickers.guild
} as const;

// ---------------------------------------------------------------------------
// Query implementations
// ---------------------------------------------------------------------------

/**
 * Paginated sticker listing.
 *
 * Options:
 *  - q?         Search across name and tags.
 *  - animated?  true = only animated formats (APNG/LOTTIE/GIF), false = PNG only.
 *  - guildId?   Filter to stickers belonging to a specific guild.
 *  - offset?    Pagination offset.
 *  - limit?     Page size (max 100).
 *  - sort?      "newest" | "popular" | "az"
 */
export async function listStickers(
	options: {
		q?: string | null;
		animated?: boolean | null;
		guildId?: string | null;
		offset?: number;
		limit?: number;
		sort?: "newest" | "popular" | "az";
	} = {}
): Promise<StickerSummary[]> {
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
		let builder: any = db.select(SUMMARY_COLS).from(Stickers);

		const conditions: any[] = [];

		if (q) {
			const pattern = `%${q}%`;
			conditions.push(or(like(Stickers.name, pattern), like(Stickers.tags, pattern)));
		}

		if (animated === true) {
			// APNG=2, LOTTIE=3, GIF=4
			conditions.push(
				or(
					eq(Stickers.format, STICKER_FORMAT.APNG),
					eq(Stickers.format, STICKER_FORMAT.LOTTIE),
					eq(Stickers.format, STICKER_FORMAT.GIF)
				)
			);
		} else if (animated === false) {
			// PNG=1 only
			conditions.push(eq(Stickers.format, STICKER_FORMAT.PNG));
		}

		if (guildId) {
			conditions.push(eq(Stickers.guild, guildId));
		}

		if (conditions.length === 1) {
			builder = builder.where(conditions[0]);
		} else if (conditions.length > 1) {
			builder = builder.where(and(...conditions));
		}

		if (sort === "popular") {
			builder = builder.orderBy(desc(Stickers.dc));
		} else if (sort === "az") {
			builder = builder.orderBy(asc(Stickers.name));
		} else {
			builder = builder.orderBy(desc(Stickers.added_at));
		}

		return builder.limit(clampedLimit).offset(offset);
	})) as RawRow[];

	return rows.map(mapSummary);
}

/**
 * Total count of stickers matching the given filters.
 * Used for pagination metadata.
 */
export async function countStickers(
	options: {
		q?: string | null;
		animated?: boolean | null;
		guildId?: string | null;
	} = {}
): Promise<number> {
	const { q = null, animated = null, guildId = null } = options;

	const rows = (await withDb((db: DrizzleDb) => {
		let builder: any = db.select({ n: sql<number>`COUNT(*)` }).from(Stickers);

		const conditions: any[] = [];

		if (q) {
			const pattern = `%${q}%`;
			conditions.push(or(like(Stickers.name, pattern), like(Stickers.tags, pattern)));
		}

		if (animated === true) {
			conditions.push(
				or(
					eq(Stickers.format, STICKER_FORMAT.APNG),
					eq(Stickers.format, STICKER_FORMAT.LOTTIE),
					eq(Stickers.format, STICKER_FORMAT.GIF)
				)
			);
		} else if (animated === false) {
			conditions.push(eq(Stickers.format, STICKER_FORMAT.PNG));
		}

		if (guildId) {
			conditions.push(eq(Stickers.guild, guildId));
		}

		if (conditions.length === 1) builder = builder.where(conditions[0]);
		else if (conditions.length > 1) builder = builder.where(and(...conditions));

		return builder;
	})) as RawRow[];

	return Number(rows[0]?.n ?? 0);
}

/**
 * Get a single sticker by its Discord snowflake id.
 * Returns full detail (including description).
 */
export async function getStickerById(id: string): Promise<StickerDetail | null> {
	const rows = (await withDb((db: DrizzleDb) =>
		db
			.select({
				...SUMMARY_COLS,
				description: Stickers.description
			})
			.from(Stickers)
			.where(eq(Stickers.id, id))
			.limit(1)
	)) as RawRow[];

	if (!rows || rows.length === 0) return null;
	return mapDetail(rows[0]);
}

/**
 * Get all stickers belonging to a specific guild (server).
 * Returns summaries ordered by name ascending.
 */
export async function getStickersByGuild(
	guildId: string,
	limit = 200,
	offset = 0
): Promise<StickerSummary[]> {
	const rows = (await withDb((db: DrizzleDb) =>
		db
			.select(SUMMARY_COLS)
			.from(Stickers)
			.where(eq(Stickers.guild, guildId))
			.orderBy(asc(Stickers.name))
			.limit(Math.min(limit, 500))
			.offset(offset)
	)) as RawRow[];

	return rows.map(mapSummary);
}

/**
 * Count stickers belonging to a specific guild.
 */
export async function countStickersByGuild(guildId: string): Promise<number> {
	const rows = (await withDb((db: DrizzleDb) =>
		db
			.select({ n: sql<number>`COUNT(*)` })
			.from(Stickers)
			.where(eq(Stickers.guild, guildId))
	)) as RawRow[];

	return Number(rows[0]?.n ?? 0);
}

/**
 * Atomically increment the download counter for a sticker.
 */
export async function incrementStickerDownload(id: string): Promise<void> {
	await withDb((db: DrizzleDb) =>
		db
			.update(Stickers)
			.set({ dc: sql`${Stickers.dc} + 1` })
			.where(eq(Stickers.id, id))
	);
}

/**
 * Validate a single sticker from Discord before touching the DB.
 * Returns a trimmed/safe copy, or null if the sticker should be skipped.
 */
function validateSyncSticker(
	sticker: { id: string; name: string; format_type?: number },
	guildId: string
): { safeId: string; safeName: string; safeGuildId: string; format: number } | null {
	if (!sticker.id || typeof sticker.id !== "string" || !/^\d+$/.test(sticker.id.trim())) {
		console.warn(
			`[syncGuildStickers] Skipping sticker with invalid id: ${JSON.stringify(sticker.id)}`
		);
		return null;
	}
	if (!sticker.name || typeof sticker.name !== "string" || !sticker.name.trim()) {
		console.warn(`[syncGuildStickers] Skipping sticker ${sticker.id} with empty name`);
		return null;
	}
	if (!guildId || typeof guildId !== "string" || !/^\d+$/.test(guildId.trim())) {
		console.warn(
			`[syncGuildStickers] Skipping sticker ${sticker.id} — invalid guildId: ${JSON.stringify(guildId)}`
		);
		return null;
	}
	const format = sticker.format_type != null ? Number(sticker.format_type) : STICKER_FORMAT.PNG;
	const safeFormat = [1, 2, 3, 4].includes(format) ? format : STICKER_FORMAT.PNG;

	return {
		safeId: sticker.id.trim(),
		safeName: sticker.name.trim(),
		safeGuildId: guildId.trim(),
		format: safeFormat
	};
}

/**
 * Bulk-upsert all stickers from a single guild sync in two round-trips:
 *
 *  1. SELECT existing rows for all incoming IDs (one query, inArray).
 *  2a. INSERT (ignore conflicts) all brand-new stickers in one batch.
 *  2b. UPDATE each existing sticker individually only when something actually
 *      changed (name/format/tags/description/guild).
 *
 * Returns { created, updated } counts.
 */
export async function syncGuildStickers(
	guildId: string,
	stickers: Array<{
		id: string;
		name: string;
		description?: string | null;
		tags?: string;
		format_type?: number;
	}>
): Promise<{ created: number; updated: number }> {
	if (!stickers.length) return { created: 0, updated: 0 };

	// ── 1. Validate & deduplicate by id ──────────────────────────────────────
	const validMap = new Map<
		string,
		{
			safeId: string;
			safeName: string;
			safeGuildId: string;
			format: number;
			description: string | null;
			tags: string | null;
		}
	>();

	for (const s of stickers) {
		const v = validateSyncSticker(s, guildId);
		if (v && !validMap.has(v.safeId)) {
			validMap.set(v.safeId, {
				...v,
				description: s.description?.trim() || null,
				tags: s.tags?.trim() || null
			});
		}
	}

	if (!validMap.size) return { created: 0, updated: 0 };

	const allIds = [...validMap.keys()];
	const now = new Date().toISOString();

	// ── 2. Fetch all existing rows in one query ───────────────────────────────
	const existingRows = (await withDb((db: DrizzleDb) =>
		db
			.select({
				id: Stickers.id,
				name: Stickers.name,
				description: Stickers.description,
				tags: Stickers.tags,
				format: Stickers.format,
				guild: Stickers.guild
			})
			.from(Stickers)
			.where(inArray(Stickers.id, allIds))
	)) as RawRow[];

	const existingById = new Map<string, RawRow>(existingRows.map((r) => [String(r.id), r]));

	// ── 3. Split into inserts vs updates ─────────────────────────────────────
	const toInsert: (typeof Stickers.$inferInsert)[] = [];
	const toUpdate: Array<{
		safeId: string;
		safeName: string;
		format: number;
		safeGuildId: string;
		description: string | null;
		tags: string | null;
	}> = [];

	for (const [safeId, v] of validMap) {
		const existing = existingById.get(safeId);
		if (!existing) {
			toInsert.push({
				id: safeId,
				name: v.safeName,
				description: v.description,
				tags: v.tags,
				format: v.format,
				dc: 0,
				added_at: now,
				guild: v.safeGuildId
			});
		} else {
			const needsUpdate =
				existing.name !== v.safeName ||
				existing.format !== v.format ||
				existing.guild !== v.safeGuildId ||
				existing.tags !== v.tags ||
				(v.description !== null && existing.description !== v.description);

			if (needsUpdate) {
				toUpdate.push({
					safeId,
					safeName: v.safeName,
					format: v.format,
					safeGuildId: v.safeGuildId,
					description: v.description,
					tags: v.tags
				});
			}
		}
	}

	// ── 4a. Batch insert new stickers ─────────────────────────────────────────
	if (toInsert.length > 0) {
		await withDb((db: DrizzleDb) =>
			(db.insert(Stickers).values(toInsert) as any).onConflictDoNothing()
		);
	}

	// ── 4b. Update changed existing stickers ──────────────────────────────────
	for (const u of toUpdate) {
		const setValues: Partial<typeof Stickers.$inferInsert> = {
			name: u.safeName,
			format: u.format,
			guild: u.safeGuildId,
			tags: u.tags
		};
		if (u.description !== null) {
			setValues.description = u.description;
		}
		await withDb((db: DrizzleDb) =>
			db.update(Stickers).set(setValues).where(eq(Stickers.id, u.safeId))
		);
	}

	return { created: toInsert.length, updated: toUpdate.length };
}

/**
 * Get a random selection of stickers.
 * Useful for homepage highlights.
 */
export async function getRandomStickers(limit = 12): Promise<StickerSummary[]> {
	const rows = (await withDb((db: DrizzleDb) =>
		db
			.select(SUMMARY_COLS)
			.from(Stickers)
			.orderBy(sql`RANDOM()`)
			.limit(Math.min(limit, 50))
	)) as RawRow[];

	return rows.map(mapSummary);
}

/**
 * Get the most-downloaded stickers.
 */
export async function getTopStickers(limit = 12): Promise<StickerSummary[]> {
	const rows = (await withDb((db: DrizzleDb) =>
		db.select(SUMMARY_COLS).from(Stickers).orderBy(desc(Stickers.dc)).limit(Math.min(limit, 50))
	)) as RawRow[];

	return rows.map(mapSummary);
}

/**
 * Get the newest stickers added.
 */
export async function getNewestStickers(limit = 12): Promise<StickerSummary[]> {
	const rows = (await withDb((db: DrizzleDb) =>
		db
			.select(SUMMARY_COLS)
			.from(Stickers)
			.orderBy(desc(Stickers.added_at))
			.limit(Math.min(limit, 50))
	)) as RawRow[];

	return rows.map(mapSummary);
}
