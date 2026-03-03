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
 *  - getCommentsByBotId
 *  - createComment
 *  - updateComment
 *  - deleteComment
 *  - getCommentById
 *  - getReactionsForComments
 *  - toggleReaction
 */

import { withDb, type DrizzleDb } from "$lib/db";
import { Bots, Users, Comments, CommentReactions, Servers } from "$lib/db/schema";
import {
	eq,
	notInArray,
	or,
	desc,
	asc,
	like,
	and,
	isNotNull,
	not,
	ne,
	sql,
	isNull,
	inArray
} from "drizzle-orm";

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
	tags?: string[] | null;
	source_repo?: string | null;
	support?: string | null;
	website?: string | null;
	owners: string[]; // parsed JSON
	donate?: string | null;
	prefix?: string | null;
	lib?: string | null;
	added_at?: string | null;
};

/**
 * A single comment row, with the author's username + avatar joined in.
 * `rating` is stored as integer (rating × 10); convert back with / 10.
 * `replies` is populated client-side / by getCommentsByBotId, not stored in DB.
 */
/** Canonical set of reaction emoji slugs, in display order. */
export const REACTION_EMOJIS = [
	"funny",
	"useful",
	"informative",
	"like",
	"dislike",
	"love",
	"angry",
	"sad",
	"skull"
] as const;

export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

/** Per-emoji count + whether the current user reacted. */
export type ReactionCount = {
	emoji: ReactionEmoji;
	count: number;
	/** true if the currently-authenticated user has this reaction on this comment. */
	reacted: boolean;
};

export type Comment = {
	id: string;
	bot_id: string;
	user_id: string;
	/** rating × 10 integer (e.g. 43 = 4.3). NULL for pure reply comments. */
	rating: number | null;
	text: string | null;
	parent_id: string | null;
	created_at: string;
	updated_at: string | null;
	// joined from Users
	author_username: string;
	author_avatar: string | null;
	author_discriminator: string;
	// nested replies — populated after the flat query
	replies?: Comment[];
	/** Aggregated reactions for this comment (populated by getCommentsByBotId). */
	reactions: ReactionCount[];
};

/** Minimal shape used for sitemap generation — only slug + timestamp */
export type BotSlugEntry = {
	slug: string;
	added_at: number | null;
};

export type ServerSummary = {
	id: string;
	name: string;
	short: string;
	icon: string | null;
	votes: number;
	owner: string;
	slug: string | null;
	promoted: boolean;
	badges: any[];
	added_at: string | null;
};

export type ServerDetail = ServerSummary & {
	desc: string | null;
};

/** Extended summary that includes rank position and lib, used on the /top page */
type BotRanked = BotSummary & {
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
		if (typeof value === "string") {
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
		username: String(row.username ?? ""),
		discriminator: String(row.discriminator ?? ""),
		short: String(row.short ?? ""),
		votes: typeof row.votes === "number" ? row.votes : Number(row.votes) || 0,
		servers: typeof row.servers === "number" ? row.servers : Number(row.servers) || 0,
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
		tags: parseJson<string[] | null>(row.tags, null),
		source_repo: row.source_repo ?? null,
		support: row.support ?? null,
		website: row.website ?? null,
		owners: parseJson<string[]>(row.owners, []),
		donate: row.donate ?? null,
		prefix: row.prefix ?? null,
		lib: row.lib ?? null,
		added_at: row.added_at ?? null
	};
}

/** Map user row and parse JSON fields */
function mapUser(row: RawRow): User {
	return {
		id: String(row.id),
		username: String(row.username ?? ""),
		avatar: row.avatar ?? null,
		email: row.email ?? null,
		bal: typeof row.bal === "number" ? row.bal : Number(row.bal) || 0,
		bio: row.bio ?? null,
		banner: row.banner ?? null,
		added_at: typeof row.added_at === "number" ? row.added_at : Number(row.added_at) || null,
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
					and(notInArray(Bots.avatar, ["0", "1", "2", "3", "4"] as any))
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
					and(notInArray(Bots.avatar, ["0", "1", "2", "3", "4"] as any))
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
					and(notInArray(Bots.avatar, ["0", "1", "2", "3", "4"] as any))
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
		/** Category keyword — searches username, short description, and tags */
		category?: string | null;
	} = {}
): Promise<BotSummary[]> {
	const {
		q = null,
		offset = 0,
		limit = 10,
		newFlag = false,
		trending = false,
		category = null
	} = options;

	const rows = (await withDb((d: DrizzleDb) => {
		let builder: any = d.select(BOT_SUMMARY_SELECTION).from(Bots);

		const conditions: any[] = [];

		if (q) {
			conditions.push(or(like(Bots.username, `%${q}%`), like(Bots.short, `%${q}%`)));
		}

		if (category) {
			conditions.push(
				or(
					like(Bots.username, `%${category}%`),
					like(Bots.short, `%${category}%`),
					like(Bots.tags, `%${category}%`)
				)
			);
		}

		if (conditions.length === 1) {
			builder = builder.where(conditions[0]);
		} else if (conditions.length > 1) {
			builder = builder.where(and(...conditions));
		}

		if (newFlag && trending) {
			builder = builder.orderBy(desc(Bots.added_at));
		} else if (newFlag) {
			builder = builder.orderBy(desc(Bots.added_at));
		} else if (trending) {
			builder = builder.orderBy(desc(Bots.votes));
		} else if (category) {
			// For category browsing default to most-servers ranking
			builder = builder.orderBy(desc(Bots.servers));
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
				tags: Bots.tags,
				source_repo: Bots.source_repo,
				support: Bots.support,
				website: Bots.website,
				owners: Bots.owners,
				donate: Bots.donate,
				prefix: Bots.prefix,
				lib: Bots.lib,
				added_at: Bots.added_at
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
		slug: String(r.slug ?? r.id ?? ""),
		added_at: r.added_at != null ? Number(r.added_at) : null
	}));
}

// ─────────────────────────────────────────────────────────────────────────────
// Comment helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all comments (top-level + replies) for a bot, joined with basic author
 * info from Users. Returns a tree: top-level comments each carry a `replies`
 * array of their direct children, sorted oldest-first within each level.
 *
 * Strategy: one flat SELECT JOIN, then group in-memory — avoids recursive SQL
 * which libSQL doesn't support, and is fast enough for the volumes expected.
 */
export async function getCommentsByBotId(
	botId: string,
	currentUserId?: string
): Promise<Comment[]> {
	const rows = (await withDb((d: DrizzleDb) =>
		d
			.select({
				id: Comments.id,
				bot_id: Comments.bot_id,
				user_id: Comments.user_id,
				rating: Comments.rating,
				text: Comments.text,
				parent_id: Comments.parent_id,
				created_at: Comments.created_at,
				updated_at: Comments.updated_at,
				author_username: Users.username,
				author_avatar: Users.avatar,
				author_discriminator: Users.discriminator
			})
			.from(Comments)
			.leftJoin(Users, eq(Comments.user_id, Users.id))
			.where(eq(Comments.bot_id, botId))
			.orderBy(asc(Comments.created_at))
	)) as any[];

	// Map rows to Comment objects
	const all: Comment[] = rows.map((r) => ({
		id: String(r.id),
		bot_id: String(r.bot_id),
		user_id: String(r.user_id),
		rating: r.rating != null ? Number(r.rating) : null,
		text: r.text ?? null,
		parent_id: r.parent_id ?? null,
		created_at: String(r.created_at),
		updated_at: r.updated_at ?? null,
		author_username: String(r.author_username ?? "Unknown"),
		author_avatar: r.author_avatar ?? null,
		author_discriminator: String(r.author_discriminator ?? "0"),
		replies: [],
		reactions: []
	}));

	// Hydrate reactions for all comments in one query
	if (all.length > 0) {
		const commentIds = all.map((c) => c.id);
		const reactionMap = await getReactionsForComments(commentIds, currentUserId);
		for (const c of all) {
			c.reactions = reactionMap.get(c.id) ?? emptyReactions();
		}
	}

	// Build tree: index by id, then attach children to parents
	const byId = new Map<string, Comment>(all.map((c) => [c.id, c]));
	const roots: Comment[] = [];

	for (const c of all) {
		if (c.parent_id && byId.has(c.parent_id)) {
			byId.get(c.parent_id)!.replies!.push(c);
		} else {
			roots.push(c);
		}
	}

	return roots;
}

/**
 * Fetch a single comment by its id (used for ownership checks before mutations).
 * Reactions are NOT hydrated here — this is intentionally lightweight for auth checks.
 */
export async function getCommentById(id: string): Promise<Comment | null> {
	const rows = (await withDb((d: DrizzleDb) =>
		d
			.select({
				id: Comments.id,
				bot_id: Comments.bot_id,
				user_id: Comments.user_id,
				rating: Comments.rating,
				text: Comments.text,
				parent_id: Comments.parent_id,
				created_at: Comments.created_at,
				updated_at: Comments.updated_at,
				author_username: Users.username,
				author_avatar: Users.avatar,
				author_discriminator: Users.discriminator
			})
			.from(Comments)
			.leftJoin(Users, eq(Comments.user_id, Users.id))
			.where(eq(Comments.id, id))
			.limit(1)
	)) as any[];

	if (!rows || rows.length === 0) return null;
	const r = rows[0];
	return {
		id: String(r.id),
		bot_id: String(r.bot_id),
		user_id: String(r.user_id),
		rating: r.rating != null ? Number(r.rating) : null,
		text: r.text ?? null,
		parent_id: r.parent_id ?? null,
		created_at: String(r.created_at),
		updated_at: r.updated_at ?? null,
		author_username: String(r.author_username ?? "Unknown"),
		author_avatar: r.author_avatar ?? null,
		author_discriminator: String(r.author_discriminator ?? "0"),
		replies: [],
		reactions: []
	};
}

/**
 * Validate a raw rating value.
 *
 * Accepts a number with at most one decimal place, in the range 0.5–5.0.
 * Returns the integer representation (× 10) on success, or null on failure.
 */
export function validateRating(raw: unknown): number | null {
	const n = Number(raw);
	if (!isFinite(n)) return null;
	// Only one decimal place allowed
	if (Math.round(n * 10) !== n * 10) return null;
	if (n < 0.5 || n > 5) return null;
	return Math.round(n * 10);
}

/**
 * Insert a new comment or reply.
 *
 * `ratingRaw` is the user-facing value (e.g. 4.3). Pass null for replies.
 * Returns the created Comment or null on failure.
 */
export async function createComment(opts: {
	id: string;
	botId: string;
	userId: string;
	ratingRaw: number | null;
	text: string | null;
	parentId: string | null;
}): Promise<Comment | null> {
	const { id, botId, userId, ratingRaw, text, parentId } = opts;

	const ratingInt = ratingRaw != null ? validateRating(ratingRaw) : null;
	// top-level comments require a rating; replies do not
	if (parentId === null && ratingInt === null) return null;

	const now = new Date().toISOString();

	await withDb((d: DrizzleDb) =>
		d.insert(Comments).values({
			id,
			bot_id: botId,
			user_id: userId,
			rating: ratingInt,
			text: text ? text.slice(0, 2000) : null,
			parent_id: parentId,
			created_at: now,
			updated_at: null
		})
	);

	return getCommentById(id);
}

/**
 * Update the text and/or rating of an existing comment.
 * Only the owner of the comment should be allowed to call this (enforced in the API route).
 */
export async function updateComment(opts: {
	id: string;
	ratingRaw?: number | null;
	text?: string | null;
}): Promise<Comment | null> {
	const { id, ratingRaw, text } = opts;
	const now = new Date().toISOString();

	const patch: Record<string, any> = { updated_at: now };

	if (ratingRaw !== undefined) {
		patch.rating = ratingRaw != null ? validateRating(ratingRaw) : null;
	}
	if (text !== undefined) {
		patch.text = text ? text.slice(0, 2000) : null;
	}

	await withDb((d: DrizzleDb) => d.update(Comments).set(patch).where(eq(Comments.id, id)));

	return getCommentById(id);
}

/**
 * Delete a comment by id.
 * Also deletes all replies that reference it as their parent_id.
 */
export async function deleteComment(id: string): Promise<void> {
	await withDb((d: DrizzleDb) => d.delete(Comments).where(eq(Comments.parent_id, id)));
	await withDb((d: DrizzleDb) => d.delete(Comments).where(eq(Comments.id, id)));
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

// ─────────────────────────────────────────────────────────────────────────────
// Reaction helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns a zero-count ReactionCount array for all nine canonical emojis. */
function emptyReactions(): ReactionCount[] {
	return REACTION_EMOJIS.map((emoji) => ({ emoji, count: 0, reacted: false }));
}

/**
 * Fetch aggregated reaction counts for a batch of comment ids.
 *
 * Returns a Map<commentId, ReactionCount[]>.  Every comment id in the input
 * will have an entry; emojis with zero reactions are included (count = 0).
 *
 * @param commentIds  Array of comment ids to aggregate reactions for.
 * @param currentUserId  Optional — if provided, the `reacted` flag will be set
 *                       to true for each emoji that this user has reacted with.
 */
export async function getReactionsForComments(
	commentIds: string[],
	currentUserId?: string
): Promise<Map<string, ReactionCount[]>> {
	const result = new Map<string, ReactionCount[]>();

	// Pre-seed every comment with a zeroed entry for all nine emojis
	for (const id of commentIds) {
		result.set(id, emptyReactions());
	}

	if (commentIds.length === 0) return result;

	// ── Aggregate counts: GROUP BY comment_id, emoji ─────────────────────────
	const countRows = (await withDb((d: DrizzleDb) =>
		d
			.select({
				comment_id: CommentReactions.comment_id,
				emoji: CommentReactions.emoji,
				count: sql<number>`COUNT(*)`.as("count")
			})
			.from(CommentReactions)
			.where(inArray(CommentReactions.comment_id, commentIds))
			.groupBy(CommentReactions.comment_id, CommentReactions.emoji)
	)) as any[];

	for (const row of countRows) {
		const cid = String(row.comment_id);
		const emoji = String(row.emoji) as ReactionEmoji;
		if (!REACTION_EMOJIS.includes(emoji as any)) continue;
		const bucket = result.get(cid);
		if (!bucket) continue;
		const entry = bucket.find((e) => e.emoji === emoji);
		if (entry) entry.count = Number(row.count);
	}

	// ── Current user's reactions ──────────────────────────────────────────────
	if (currentUserId) {
		const userRows = (await withDb((d: DrizzleDb) =>
			d
				.select({
					comment_id: CommentReactions.comment_id,
					emoji: CommentReactions.emoji
				})
				.from(CommentReactions)
				.where(
					and(
						inArray(CommentReactions.comment_id, commentIds),
						eq(CommentReactions.user_id, currentUserId)
					)
				)
		)) as any[];

		for (const row of userRows) {
			const cid = String(row.comment_id);
			const emoji = String(row.emoji) as ReactionEmoji;
			if (!REACTION_EMOJIS.includes(emoji as any)) continue;
			const bucket = result.get(cid);
			if (!bucket) continue;
			const entry = bucket.find((e) => e.emoji === emoji);
			if (entry) entry.reacted = true;
		}
	}

	return result;
}

/**
 * Toggle a single reaction for a user on a comment.
 *
 * - If the (comment_id, user_id, emoji) row does NOT exist → INSERT it (add reaction).
 * - If it DOES exist → DELETE it (remove reaction).
 *
 * Returns the updated ReactionCount[] for the comment so the caller can respond
 * with fresh counts in a single round-trip.
 */
export async function toggleReaction(
	commentId: string,
	userId: string,
	emoji: ReactionEmoji
): Promise<ReactionCount[]> {
	// Check if the reaction already exists
	const existing = (await withDb((d: DrizzleDb) =>
		d
			.select({ comment_id: CommentReactions.comment_id })
			.from(CommentReactions)
			.where(
				and(
					eq(CommentReactions.comment_id, commentId),
					eq(CommentReactions.user_id, userId),
					eq(CommentReactions.emoji, emoji)
				)
			)
			.limit(1)
	)) as any[];

	if (existing && existing.length > 0) {
		// Reaction exists → remove it
		await withDb((d: DrizzleDb) =>
			d
				.delete(CommentReactions)
				.where(
					and(
						eq(CommentReactions.comment_id, commentId),
						eq(CommentReactions.user_id, userId),
						eq(CommentReactions.emoji, emoji)
					)
				)
		);
	} else {
		// Reaction does not exist → add it
		await withDb((d: DrizzleDb) =>
			d.insert(CommentReactions).values({
				comment_id: commentId,
				user_id: userId,
				emoji,
				created_at: new Date().toISOString()
			})
		);
	}

	// Return fresh counts for this comment (with this user's perspective)
	const map = await getReactionsForComments([commentId], userId);
	return map.get(commentId) ?? emptyReactions();
}

/**
 * Bots filtered by the library they were built with (e.g. "discord.js", "discord.py").
 * Matches case-insensitively using LIKE.
 */
// ─────────────────────────────────────────────────────────────────────────────
// Server query helpers
// ─────────────────────────────────────────────────────────────────────────────

function mapServerSummary(row: RawRow): ServerSummary {
	return {
		id: String(row.id ?? ""),
		name: String(row.name ?? ""),
		short: String(row.short ?? ""),
		icon: row.icon ?? null,
		votes: typeof row.votes === "number" ? row.votes : Number(row.votes) || 0,
		owner: String(row.owner ?? ""),
		slug: row.slug ?? null,
		promoted: Boolean(row.promoted),
		badges: parseJson(row.badges, []),
		added_at: row.added_at ?? null
	};
}

function mapServerDetail(row: RawRow): ServerDetail {
	return {
		...mapServerSummary(row),
		desc: row.desc ?? null
	};
}

export async function getTopServers(limit = 10): Promise<ServerSummary[]> {
	const rows = (await withDb((d: DrizzleDb) =>
		d
			.select({
				id: Servers.id,
				name: Servers.name,
				short: Servers.short,
				icon: Servers.icon,
				votes: Servers.votes,
				owner: Servers.owner,
				slug: Servers.slug,
				promoted: Servers.promoted,
				badges: Servers.badges,
				added_at: Servers.added_at
			})
			.from(Servers)
			.orderBy(desc(Servers.votes))
			.limit(limit)
	)) as any[];
	return rows.map(mapServerSummary);
}

export async function getRandomServers(limit = 10): Promise<ServerSummary[]> {
	const rows = (await withDb((d: DrizzleDb) =>
		d
			.select({
				id: Servers.id,
				name: Servers.name,
				short: Servers.short,
				icon: Servers.icon,
				votes: Servers.votes,
				owner: Servers.owner,
				slug: Servers.slug,
				promoted: Servers.promoted,
				badges: Servers.badges,
				added_at: Servers.added_at
			})
			.from(Servers)
			.orderBy(sql`RANDOM()`)
			.limit(limit)
	)) as any[];
	return rows.map(mapServerSummary);
}

export async function listServers(opts: {
	q?: string | null;
	limit?: number;
	offset?: number;
	newFlag?: boolean;
	trending?: boolean;
}): Promise<ServerSummary[]> {
	const { q, limit = 20, offset = 0, newFlag = false, trending = false } = opts;

	const rows = (await withDb((d: DrizzleDb) => {
		let builder = d
			.select({
				id: Servers.id,
				name: Servers.name,
				short: Servers.short,
				icon: Servers.icon,
				votes: Servers.votes,
				owner: Servers.owner,
				slug: Servers.slug,
				promoted: Servers.promoted,
				badges: Servers.badges,
				added_at: Servers.added_at
			})
			.from(Servers)
			.$dynamic();

		if (q) {
			builder = builder.where(
				or(like(Servers.name, `%${q}%`), like(Servers.short, `%${q}%`))
			) as typeof builder;
		}

		if (newFlag) {
			builder = builder.orderBy(desc(Servers.added_at)) as typeof builder;
		} else if (trending) {
			builder = builder.orderBy(desc(Servers.votes)) as typeof builder;
		} else {
			builder = builder.orderBy(desc(Servers.votes)) as typeof builder;
		}

		return builder.limit(limit).offset(offset);
	})) as any[];

	return rows.map(mapServerSummary);
}

export async function getServerByIdOrSlug(idOrSlug: string): Promise<ServerDetail | null> {
	const rows = (await withDb((d: DrizzleDb) =>
		d
			.select({
				id: Servers.id,
				name: Servers.name,
				short: Servers.short,
				desc: Servers.desc,
				icon: Servers.icon,
				votes: Servers.votes,
				owner: Servers.owner,
				slug: Servers.slug,
				promoted: Servers.promoted,
				badges: Servers.badges,
				added_at: Servers.added_at
			})
			.from(Servers)
			.where(or(eq(Servers.id, idOrSlug), eq(Servers.slug, idOrSlug)))
			.limit(1)
	)) as any[];

	if (!rows || rows.length === 0) return null;
	return mapServerDetail(rows[0]);
}

export async function getServersByOwner(ownerId: string): Promise<ServerSummary[]> {
	const rows = (await withDb((d: DrizzleDb) =>
		d
			.select({
				id: Servers.id,
				name: Servers.name,
				short: Servers.short,
				icon: Servers.icon,
				votes: Servers.votes,
				owner: Servers.owner,
				slug: Servers.slug,
				promoted: Servers.promoted,
				badges: Servers.badges,
				added_at: Servers.added_at
			})
			.from(Servers)
			.where(eq(Servers.owner, ownerId))
			.limit(50)
	)) as any[];
	return rows.map(mapServerSummary);
}

export async function upsertServer(data: {
	id: string;
	name: string;
	short?: string;
	desc?: string;
	icon?: string | null;
	owner: string;
	slug?: string | null;
}): Promise<void> {
	await withDb((d: DrizzleDb) =>
		d
			.insert(Servers)
			.values({
				id: data.id,
				name: data.name,
				short: data.short ?? "Short description is not Updated.",
				desc: data.desc ?? "Description is not updated.",
				icon: data.icon ?? "",
				owner: data.owner,
				slug: data.slug ?? "",
				added_at: new Date().toISOString(),
				votes: 0,
				promoted: false,
				badges: JSON.stringify([]) as any
			})
			.onConflictDoUpdate({
				target: Servers.id,
				set: {
					name: data.name,
					icon: data.icon ?? "",
					owner: data.owner
				}
			})
	);
}

export async function getAllServerSlugs(): Promise<
	{ id: string; slug: string | null; added_at: string | null }[]
> {
	const rows = (await withDb((d: DrizzleDb) =>
		d.select({ id: Servers.id, slug: Servers.slug, added_at: Servers.added_at }).from(Servers)
	)) as any[];
	return rows.map((r: any) => ({
		id: String(r.id),
		slug: r.slug ?? null,
		added_at: r.added_at ?? null
	}));
}

export async function getBotsByLibrary(lib: string, limit = 10): Promise<BotSummary[]> {
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
					notInArray(Bots.avatar, ["0", "1", "2", "3", "4"])
				)
			)
			.orderBy(desc(Bots.servers))
			.limit(limit)
	)) as any[];
	return rows.map(mapBotSummary);
}
