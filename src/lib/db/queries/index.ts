/**
 * Query helpers for the app's DB.
 *
 * - Uses the schema defined in `$lib/db/schema`.
 * - Assumes JSON-like columns are stored as serialized TEXT (JSON.stringify on write).
 * - Parses JSON fields on read so callers receive real arrays/objects.
 *
 * Exported helpers:
 *  - getTopBots, getMusicBots, getGameBots, getModBots
 *  - getTopBotsFull, getNewestBots, getBotsByLibrary
 *  - getAllBotSlugs
 *  - listBots, searchBots
 *  - getBotByIdOrSlug
 *  - getRandomBots
 *  - getUserById
 *  - getBotsByOwner
 *  - healthCheck
 */

import { withDb, type DrizzleDb } from '$lib/db';
import { Bots, Users } from '$lib/db/schema';
import { eq, notInArray, or, desc, asc, like, and, isNotNull, not, ne, sql } from 'drizzle-orm';

type RawRow = Record<string, any>;

/** Lightweight shapes returned by helper functions */
export type BotSummary = {
	id: string;
	slug: string;
	avatar: string | null;
	username: string;
	discriminator: string;
	short: string;
	votes: number;
	servers: number;
	invite: string | null;
	bg: string | null;
};

export type BotDetail = BotSummary & {
	desc?: string | null;
	badges?: any;
	source_repo?: string | null;
	support?: string | null;
	website?: string | null;
	owners: string[]; // parsed JSON
	donate?: string | null;
	prefix?: string | null;
	lib?: string | null;
};

/** Minimal shape used for sitemap generation — only slug + timestamp */
export type BotSlugEntry = {
	slug: string;
	added_at: number | null;
};

/** Extended summary that includes rank position and lib, used on the /top page */
export type BotRanked = BotSummary & {
	rank: number;
	lib?: string | null;
	prefix?: string | null;
};

export type User = {
	id: string;
	username: string;
	avatar: string | null;
	email?: string | null;
	bal?: number;
	bio?: string | null;
	banner?: string | null;
	added_at?: number | null;
	keys?: any;
	votes?: any;
};

/** Helpers -------------------------------------------------------------- */

/** parse JSON stored in TEXT columns; tolerate null/invalid and return defaultValue */
function parseJson<T = any>(value: unknown, defaultValue: T): T {
	try {
		if (value == null) return defaultValue;
		if (typeof value === 'string') {
			return JSON.parse(value) as T;
		}
		// if already object/array
		return value as T;
	} catch {
		return defaultValue;
	}
}

/** Return numeric boolean (INTEGER 0/1) as boolean */
function intToBool(v: unknown): boolean {
	const n = Number(v);
	return !Number.isNaN(n) && n !== 0;
}

/** Common selection used by listing endpoints */
const BOT_SUMMARY_SELECTION = {
	id: Bots.id,
	slug: Bots.slug,
	avatar: Bots.avatar,
	username: Bots.username,
	discriminator: Bots.discriminator,
	short: Bots.short,
	votes: Bots.votes,
	servers: Bots.servers,
	invite: Bots.invite,
	bg: Bots.bg
};

/** Map raw DB row -> BotSummary (and parse as necessary) */
function mapBotSummary(row: RawRow): BotSummary {
	return {
		id: String(row.id),
		slug: String(row.slug ?? row.id),
		avatar: row.avatar ?? null,
		username: String(row.username ?? ''),
		discriminator: String(row.discriminator ?? ''),
		short: String(row.short ?? ''),
		votes: typeof row.votes === 'number' ? row.votes : Number(row.votes) || 0,
		servers: typeof row.servers === 'number' ? row.servers : Number(row.servers) || 0,
		invite: row.invite ?? null,
		bg: row.bg ?? null
	};
}

/** Map raw DB row -> BotDetail with parsed JSON fields */
function mapBotDetail(row: RawRow): BotDetail {
	const summary = mapBotSummary(row);
	return {
		...summary,
		desc: row.desc ?? null,
		badges: parseJson<any>(row.badges, null),
		source_repo: row.source_repo ?? null,
		support: row.support ?? null,
		website: row.website ?? null,
		owners: parseJson<string[]>(row.owners, []),
		donate: row.donate ?? null,
		prefix: row.prefix ?? null,
		lib: row.lib ?? null
	};
}

/** Map user row and parse JSON fields */
function mapUser(row: RawRow): User {
	return {
		id: String(row.id),
		username: String(row.username ?? ''),
		avatar: row.avatar ?? null,
		email: row.email ?? null,
		bal: typeof row.bal === 'number' ? row.bal : Number(row.bal) || 0,
		bio: row.bio ?? null,
		banner: row.banner ?? null,
		added_at: typeof row.added_at === 'number' ? row.added_at : Number(row.added_at) || null,
		keys: parseJson(row.keys, null),
		votes: parseJson(row.votes, [])
	};
}

/** Query implementations ------------------------------------------------ */

/** Return top bots by votes (descending) */
export async function getTopBots(limit = 10): Promise<BotSummary[]> {
	const rows = (await withDb((d: DrizzleDb) =>
		d.select(BOT_SUMMARY_SELECTION).from(Bots).orderBy(desc(Bots.votes)).limit(limit)
	)) as any[];
	return rows.map(mapBotSummary);
}

/** Music bots - simple keyword match */
export async function getMusicBots(limit = 10): Promise<BotSummary[]> {
	const rows = (await withDb((d: DrizzleDb) =>
		d
			.select(BOT_SUMMARY_SELECTION)
			.from(Bots)
			.where(
				and(
					or(like(Bots.username, `%music%`), like(Bots.short, `%music%`)),
					and(notInArray(Bots.avatar, ['0', '1', '2', '3', '4'] as any))
				)
			)
			.orderBy(desc(Bots.servers))
			.limit(limit)
	)) as any[];
	return rows.map(mapBotSummary);
}

/** Game/gaming bots */
export async function getGameBots(limit = 10): Promise<BotSummary[]> {
	const rows = (await withDb((d: DrizzleDb) =>
		d
			.select(BOT_SUMMARY_SELECTION)
			.from(Bots)
			.where(
				and(
					or(
						like(Bots.username, `%game%`),
						like(Bots.short, `%game%`),
						like(Bots.username, `%esports%`),
						like(Bots.short, `%esports%`),
						like(Bots.username, `%gaming%`),
						like(Bots.short, `%gaming%`)
					),
					and(notInArray(Bots.avatar, ['0', '1', '2', '3', '4'] as any))
				)
			)
			.orderBy(desc(Bots.servers))
			.limit(limit)
	)) as any[];
	return rows.map(mapBotSummary);
}

/** Moderation/community bots */
export async function getModBots(limit = 10): Promise<BotSummary[]> {
	const rows = (await withDb((d: DrizzleDb) =>
		d
			.select(BOT_SUMMARY_SELECTION)
			.from(Bots)
			.where(
				and(
					or(like(Bots.username, `%moder%`), like(Bots.short, `%moder%`)),
					and(notInArray(Bots.avatar, ['0', '1', '2', '3', '4'] as any))
				)
			)
			.orderBy(desc(Bots.servers))
			.limit(limit)
	)) as any[];
	return rows.map(mapBotSummary);
}

/**
 * Generic paginated listing.
 * Options:
 *  - q?: string (search username or short)
 *  - offset?: number
 *  - limit?: number
 *  - newFlag?: boolean -> order by added_at desc
 *  - trending?: boolean -> order by votes desc
 */
export async function listBots(
	options: {
		q?: string | null;
		offset?: number;
		limit?: number;
		newFlag?: boolean;
		trending?: boolean;
	} = {}
): Promise<BotSummary[]> {
	const { q = null, offset = 0, limit = 10, newFlag = false, trending = false } = options;

	const rows = (await withDb((d: DrizzleDb) => {
		let builder: any = d.select(BOT_SUMMARY_SELECTION).from(Bots);

		if (q) {
			builder = builder.where(or(like(Bots.username, `%${q}%`), like(Bots.short, `%${q}%`)));
		}

		if (newFlag && trending) {
			builder = builder.orderBy(desc(Bots.added_at));
		} else if (newFlag) {
			builder = builder.orderBy(desc(Bots.added_at));
		} else if (trending) {
			builder = builder.orderBy(desc(Bots.votes));
		}

		return builder.limit(limit).offset(offset);
	})) as any[];
	return rows.map(mapBotSummary);
}

export async function searchBots(q: string, limit = 10, offset = 0) {
	return listBots({ q, limit, offset });
}

/** Get a bot by id or slug, parse json owners/tags etc */
export async function getBotByIdOrSlug(idOrSlug: string): Promise<BotDetail | null> {
	const rows = await withDb((d: DrizzleDb) =>
		d
			.select({
				id: Bots.id,
				slug: Bots.slug,
				avatar: Bots.avatar,
				username: Bots.username,
				discriminator: Bots.discriminator,
				short: Bots.short,
				votes: Bots.votes,
				servers: Bots.servers,
				invite: Bots.invite,
				bg: Bots.bg,
				desc: Bots.desc,
				badges: Bots.badges,
				source_repo: Bots.source_repo,
				support: Bots.support,
				website: Bots.website,
				owners: Bots.owners,
				donate: Bots.donate,
				prefix: Bots.prefix,
				lib: Bots.lib
			})
			.from(Bots)
			.where(or(eq(Bots.slug, idOrSlug), eq(Bots.id, idOrSlug)))
			.limit(1)
	);

	if (!rows || (rows as any[]).length === 0) return null;
	// row fields may be TEXT-serialized JSON for owners/badges etc.
	return mapBotDetail((rows as any[])[0] as RawRow);
}

/** Get random bots using SQL RANDOM() */
export async function getRandomBots(limit = 10): Promise<BotSummary[]> {
	const rows = (await withDb((d: DrizzleDb) =>
		d
			.select(BOT_SUMMARY_SELECTION)
			.from(Bots)
			.orderBy(sql`RANDOM()`)
			.limit(limit)
	)) as any[];
	return rows.map(mapBotSummary);
}

/** Get a user by id; parse keys/votes JSON fields */
export async function getUserById(id: string): Promise<User | null> {
	const rows = await withDb((d: DrizzleDb) =>
		d
			.select({
				id: Users.id,
				username: Users.username,
				avatar: Users.avatar,
				email: Users.email,
				bal: Users.bal,
				bio: Users.bio,
				banner: Users.banner,
				added_at: Users.added_at,
				keys: Users.keys,
				votes: Users.votes
			})
			.from(Users)
			.where(eq(Users.id, id))
			.limit(1)
	);

	if (!rows || (rows as any[]).length === 0) return null;
	const raw = (rows as any[])[0] as RawRow;
	// parse JSON-ish columns stored as TEXT
	raw.keys = parseJson(raw.keys, null);
	raw.votes = parseJson(raw.votes, []);
	return mapUser(raw);
}

/** Health-check: cheap read */
export async function healthCheck(): Promise<boolean> {
	try {
		const rows = (await withDb((d: DrizzleDb) =>
			d.select({ ok: Bots.id }).from(Bots).limit(1)
		)) as any[];
		return Array.isArray(rows);
	} catch {
		return false;
	}
}

/**
 * Get bots owned by a specific user id.
 * Note: owners column stored as serialized JSON TEXT; use LIKE against the text
 * to maintain parity with original dataset. This is not perfect but preserves
 * previous behavior. Consider normalizing owners to a relation for robust queries.
 */
export async function getBotsByOwner(
	ownerId: string,
	limit = 50,
	offset = 0
): Promise<BotSummary[]> {
	const rows = (await withDb((d: DrizzleDb) =>
		d
			.select(BOT_SUMMARY_SELECTION)
			.from(Bots)
			.where(like(Bots.owners, `%${ownerId}%`))
			.limit(limit)
			.offset(offset)
	)) as any[];
	return rows.map(mapBotSummary);
}

/**
 * Return only slug + added_at for every bot — used exclusively for sitemap.xml
 * generation. Fetches the absolute minimum columns to keep the query cheap.
 */
export async function getAllBotSlugs(): Promise<BotSlugEntry[]> {
	const rows = (await withDb((d: DrizzleDb) =>
		d.select({ slug: Bots.slug, added_at: Bots.added_at }).from(Bots)
	)) as any[];
	return rows.map((r) => ({
		slug: String(r.slug ?? r.id ?? ''),
		added_at: r.added_at != null ? Number(r.added_at) : null
	}));
}

/**
 * Top bots with rank position, lib, and prefix — used on the /top leaderboard page.
 * Ordered by votes descending.
 */
export async function getTopBotsFull(limit = 100): Promise<BotRanked[]> {
	const rows = (await withDb((d: DrizzleDb) =>
		d
			.select({
				...BOT_SUMMARY_SELECTION,
				lib: Bots.lib,
				prefix: Bots.prefix
			})
			.from(Bots)
			.orderBy(desc(Bots.votes))
			.limit(limit)
	)) as any[];
	return rows.map((row, i) => ({
		...mapBotSummary(row),
		rank: i + 1,
		lib: row.lib ?? null,
		prefix: row.prefix ?? null
	}));
}

/**
 * Newest bots ordered by added_at descending.
 * Used on the /new page.
 */
export async function getNewestBots(limit = 50, offset = 0): Promise<BotSummary[]> {
	const rows = (await withDb((d: DrizzleDb) =>
		d
			.select(BOT_SUMMARY_SELECTION)
			.from(Bots)
			.orderBy(desc(Bots.added_at))
			.limit(limit)
			.offset(offset)
	)) as any[];
	return rows.map(mapBotSummary);
}

/**
 * Bots filtered by the library they were built with (e.g. "discord.js", "discord.py").
 * Matches case-insensitively using LIKE.
 */
export async function getBotsByLibrary(lib: string, limit = 50): Promise<BotSummary[]> {
	const rows = (await withDb((d: DrizzleDb) =>
		d
			.select(BOT_SUMMARY_SELECTION)
			.from(Bots)
			.where(like(Bots.lib, `%${lib}%`))
			.orderBy(desc(Bots.servers))
			.limit(limit)
	)) as any[];
	return rows.map(mapBotSummary);
}

/**
 * Bots filtered by a category keyword — searches username, short description,
 * and the tags JSON column. Used by /categories/[slug].
 * Excludes bots with default avatars (0-4) to surface higher-quality results.
 */
export async function getBotsByCategory(keyword: string, limit = 48): Promise<BotSummary[]> {
	const rows = (await withDb((d: DrizzleDb) =>
		d
			.select(BOT_SUMMARY_SELECTION)
			.from(Bots)
			.where(
				and(
					or(
						like(Bots.username, `%${keyword}%`),
						like(Bots.short, `%${keyword}%`),
						like(Bots.tags, `%${keyword}%`),
						like(Bots.lib, `%${keyword}%`)
					),
					notInArray(Bots.avatar, ['0', '1', '2', '3', '4'])
				)
			)
			.orderBy(desc(Bots.servers))
			.limit(limit)
	)) as any[];
	return rows.map(mapBotSummary);
}
