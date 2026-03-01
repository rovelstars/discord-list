import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import DiscordOauth2 from 'discord-oauth2';
import { env } from '$env/dynamic/private';
import { getCommentById, toggleReaction, REACTION_EMOJIS, type ReactionEmoji } from '$lib/db/queries';
import { withDb, type DrizzleDb } from '$lib/db';
import { Users } from '$lib/schema';
import { eq } from 'drizzle-orm';

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
		url.searchParams.get('key') ??
		request.headers.get('authorization') ??
		request.headers.get('RDL-key') ??
		cookies.get('key') ??
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
		redirectUri: (env.DOMAIN ?? 'http://localhost:5173') + '/api/auth'
	});
	try {
		return await oauth.getUser(key);
	} catch {
		return null;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/bots/[id]/comments/[commentId]/react
//
// Toggles a single emoji reaction for the authenticated user on the given comment.
// If the user has not yet reacted with this emoji → adds the reaction.
// If the user already reacted with this emoji → removes the reaction.
//
// Body (JSON):
//   emoji  string  — one of the nine canonical slugs:
//                    funny | useful | informative | like | dislike |
//                    love | angry | sad | skull
//
// Response (200):
//   { reactions: ReactionCount[] }
//   where ReactionCount = { emoji, count, reacted }
//   (the full updated reaction set for the comment, from the caller's perspective)
//
// Auth: key cookie / query param / Authorization header
// ─────────────────────────────────────────────────────────────────────────────
export const PUT: RequestHandler = async ({ request, params, cookies }) => {
	const { id: botId, commentId } = params;

	if (!botId || !commentId) {
		return json({ err: 'missing_params' }, { status: 400 });
	}

	// ── Auth ──────────────────────────────────────────────────────────────────
	const key = resolveKey(request, cookies);
	if (!key) {
		return json({ err: 'not_logged_in', message: 'You must be logged in to react.' }, { status: 401 });
	}

	const discordUser = await getDiscordUser(key);
	if (!discordUser) {
		return json({ err: 'invalid_key', message: 'Invalid or expired session.' }, { status: 401 });
	}

	const userId = discordUser.id;

	// ── Verify user exists in DB ──────────────────────────────────────────────
	const userRows = (await withDb((d: DrizzleDb) =>
		d.select({ id: Users.id }).from(Users).where(eq(Users.id, userId)).limit(1)
	)) as any[];

	if (!userRows || userRows.length === 0) {
		return json({ err: 'user_not_found', message: 'Your account was not found in the database.' }, { status: 403 });
	}

	// ── Fetch and validate comment ────────────────────────────────────────────
	const comment = await getCommentById(commentId);

	if (!comment) {
		return json({ err: 'not_found', message: 'Comment not found.' }, { status: 404 });
	}

	// Confirm the comment belongs to this bot (prevents cross-bot reaction
	// injection if someone guesses a comment id from another bot)
	if (comment.bot_id !== botId) {
		return json({ err: 'not_found', message: 'Comment not found.' }, { status: 404 });
	}

	// ── Parse and validate body ───────────────────────────────────────────────
	let body: any;
	try {
		body = await request.json();
	} catch {
		return json({ err: 'invalid_json', message: 'Request body must be valid JSON.' }, { status: 400 });
	}

	const emojiRaw = body?.emoji;

	if (typeof emojiRaw !== 'string' || !REACTION_EMOJIS.includes(emojiRaw as ReactionEmoji)) {
		return json(
			{
				err: 'invalid_emoji',
				message: `emoji must be one of: ${REACTION_EMOJIS.join(', ')}`
			},
			{ status: 400 }
		);
	}

	const emoji = emojiRaw as ReactionEmoji;

	// ── Toggle ────────────────────────────────────────────────────────────────
	try {
		const reactions = await toggleReaction(commentId, userId, emoji);
		return json({ reactions }, { status: 200 });
	} catch (err) {
		console.error('[react PUT] error:', err);
		return json({ err: 'server_error', message: 'Failed to toggle reaction.' }, { status: 500 });
	}
};
