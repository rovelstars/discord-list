import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import DiscordOauth2 from "discord-oauth2";
import { env } from "$env/dynamic/private";
import { getCommentsByBotId, createComment, getCommentById } from "$lib/db/queries";
import { withDb, type DrizzleDb } from "$lib/db";
import { Users, Bots, Comments } from "$lib/schema";
import { eq, and } from "drizzle-orm";

/**
 * Resolve the caller's Discord access token from the request.
 * Checks (in order): `key` query param, Authorization header, RDL-key header, `key` cookie.
 */
function resolveKey(
	request: Request,
	cookies: { get(name: string): string | undefined }
): string | null {
	const url = new URL(request.url);
	return (
		url.searchParams.get("key") ??
		request.headers.get("authorization") ??
		request.headers.get("RDL-key") ??
		cookies.get("key") ??
		null
	);
}

/**
 * Fetch the Discord user corresponding to the given access token.
 * Returns null if the token is invalid or the call fails.
 */
async function getDiscordUser(key: string): Promise<{ id: string; username: string } | null> {
	const oauth = new DiscordOauth2({
		clientId: env.DISCORD_BOT_ID,
		clientSecret: env.DISCORD_SECRET,
		redirectUri: (env.DOMAIN ?? "http://localhost:5173") + "/api/auth"
	});
	try {
		return await oauth.getUser(key);
	} catch {
		return null;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bots/[id]/comments
// Returns the threaded comment tree for the given bot.
// ─────────────────────────────────────────────────────────────────────────────
export const GET: RequestHandler = async ({ params }) => {
	const botId = params.id;
	if (!botId) return json({ err: "missing_bot_id" }, { status: 400 });

	try {
		const comments = await getCommentsByBotId(botId);
		return json({ comments }, { status: 200 });
	} catch (err) {
		console.error("[comments GET] error:", err);
		return json({ err: "server_error" }, { status: 500 });
	}
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/bots/[id]/comments
//
// Body (JSON):
//   rating?   number   - required for top-level; forbidden for replies
//                        (0.5–5.0, one decimal place, e.g. 4.3)
//   text?     string   - optional comment body (max 2 000 chars)
//   parent_id? string  - omit or null for top-level; set to a comment id for a reply
//
// Auth: key cookie / query param / Authorization header
// ─────────────────────────────────────────────────────────────────────────────
export const POST: RequestHandler = async ({ request, params, cookies }) => {
	const botId = params.id;
	if (!botId) return json({ err: "missing_bot_id" }, { status: 400 });

	// ── Auth ──────────────────────────────────────────────────────────────────
	const key = resolveKey(request, cookies);
	if (!key) return json({ err: "not_logged_in" }, { status: 401 });

	const discordUser = await getDiscordUser(key);
	if (!discordUser) return json({ err: "invalid_key" }, { status: 401 });

	const userId = discordUser.id;

	// ── Verify bot exists ─────────────────────────────────────────────────────
	const botRows = (await withDb((d: DrizzleDb) =>
		d.select({ id: Bots.id }).from(Bots).where(eq(Bots.id, botId)).limit(1)
	)) as any[];
	if (!botRows || botRows.length === 0) {
		return json({ err: "bot_not_found" }, { status: 404 });
	}

	// ── Verify user exists in DB ──────────────────────────────────────────────
	const userRows = (await withDb((d: DrizzleDb) =>
		d.select({ id: Users.id }).from(Users).where(eq(Users.id, userId)).limit(1)
	)) as any[];
	if (!userRows || userRows.length === 0) {
		return json({ err: "user_not_found" }, { status: 403 });
	}

	// ── Parse body ────────────────────────────────────────────────────────────
	let body: any;
	try {
		body = await request.json();
	} catch {
		return json({ err: "invalid_json" }, { status: 400 });
	}

	const parentId: string | null = body.parent_id ?? null;
	const text: string | null =
		typeof body.text === "string" ? body.text.trim().slice(0, 2000) || null : null;
	const ratingRaw: number | null = body.rating != null ? Number(body.rating) : null;

	// ── Validate ──────────────────────────────────────────────────────────────
	if (parentId === null) {
		// Top-level comment: rating is required
		if (ratingRaw == null) {
			return json(
				{ err: "rating_required", message: "A rating is required for top-level reviews." },
				{ status: 400 }
			);
		}
		// Validate rating range and precision
		if (!isFinite(ratingRaw) || ratingRaw < 0.5 || ratingRaw > 5) {
			return json(
				{ err: "invalid_rating", message: "Rating must be between 0.5 and 5.0." },
				{ status: 400 }
			);
		}
		if (Math.round(ratingRaw * 10) !== ratingRaw * 10) {
			return json(
				{ err: "invalid_rating", message: "Rating may have at most one decimal place (e.g. 4.3)." },
				{ status: 400 }
			);
		}

		// One review per user per bot - check for an existing top-level comment
		const existing = (await withDb((d: DrizzleDb) =>
			d
				.select({ id: Comments.id })
				.from(Comments)
				.where(and(eq(Comments.bot_id, botId), eq(Comments.user_id, userId)))
				// Only match top-level comments (parent_id IS NULL).
				// Drizzle sqlite: use sql`` or isNull helper.
				.limit(1)
		)) as any[];

		// Filter in JS since isNull may not be available in this Drizzle build
		const topLevelExisting = (existing ?? []).filter(
			(r: any) => r.parent_id == null || r.parent_id === undefined
		);
		// Re-query with parent_id check explicitly since the select above doesn't include it
		const existingFull = (await withDb((d: DrizzleDb) =>
			d
				.select({ id: Comments.id, parent_id: Comments.parent_id })
				.from(Comments)
				.where(and(eq(Comments.bot_id, botId), eq(Comments.user_id, userId)))
		)) as any[];

		const hasTopLevel = (existingFull ?? []).some((r: any) => r.parent_id == null);
		if (hasTopLevel) {
			return json(
				{
					err: "already_reviewed",
					message: "You have already reviewed this bot. Edit your existing review instead."
				},
				{ status: 409 }
			);
		}
	} else {
		// Reply: verify parent comment exists and belongs to this bot
		const parent = await getCommentById(parentId);
		if (!parent || parent.bot_id !== botId) {
			return json({ err: "parent_not_found" }, { status: 404 });
		}
		// Replies must be to top-level comments only (no deep nesting at DB level)
		if (parent.parent_id !== null) {
			return json(
				{ err: "cannot_nest_replies", message: "Replies can only be made to top-level comments." },
				{ status: 400 }
			);
		}
		// Must provide at least some text in a reply
		if (!text) {
			return json(
				{ err: "text_required", message: "Reply text cannot be empty." },
				{ status: 400 }
			);
		}
	}

	if (!text && parentId === null) {
		// Top-level without any text is fine - rating alone is sufficient.
		// Leave text as null.
	}

	// ── Insert ────────────────────────────────────────────────────────────────
	const id = crypto.randomUUID();
	const comment = await createComment({
		id,
		botId,
		userId,
		ratingRaw,
		text,
		parentId
	});

	if (!comment) {
		return json({ err: "create_failed" }, { status: 500 });
	}

	return json({ comment }, { status: 201 });
};
