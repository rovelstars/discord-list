import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import DiscordOauth2 from 'discord-oauth2';
import { env } from '$env/dynamic/private';
import { getCommentById, updateComment, deleteComment } from '$lib/db/queries';

/**
 * Resolve the caller's Discord access token from the request.
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
// PATCH /api/bots/[id]/comments/[commentId]
//
// Body (JSON):
//   rating?  number  — new rating (0.5–5.0, one decimal place). Ignored for replies.
//   text?    string  — new text body (max 2 000 chars). Pass null to clear.
//
// Auth: key cookie / query param / Authorization header
// Only the comment's author may edit it.
// ─────────────────────────────────────────────────────────────────────────────
export const PATCH: RequestHandler = async ({ request, params, cookies }) => {
	const { id: botId, commentId } = params;
	if (!botId || !commentId) {
		return json({ err: 'missing_params' }, { status: 400 });
	}

	// ── Auth ──────────────────────────────────────────────────────────────────
	const key = resolveKey(request, cookies);
	if (!key) return json({ err: 'not_logged_in' }, { status: 401 });

	const discordUser = await getDiscordUser(key);
	if (!discordUser) return json({ err: 'invalid_key' }, { status: 401 });

	// ── Fetch comment ─────────────────────────────────────────────────────────
	const comment = await getCommentById(commentId);
	if (!comment) return json({ err: 'not_found' }, { status: 404 });

	// Confirm the comment belongs to this bot
	if (comment.bot_id !== botId) {
		return json({ err: 'not_found' }, { status: 404 });
	}

	// Only the author may edit
	if (comment.user_id !== discordUser.id) {
		return json({ err: 'forbidden' }, { status: 403 });
	}

	// ── Parse body ────────────────────────────────────────────────────────────
	let body: any;
	try {
		body = await request.json();
	} catch {
		return json({ err: 'invalid_json' }, { status: 400 });
	}

	const patch: { ratingRaw?: number | null; text?: string | null } = {};

	// Rating can only be changed on top-level comments (parent_id === null)
	if ('rating' in body) {
		if (comment.parent_id !== null) {
			return json(
				{ err: 'rating_on_reply', message: 'Replies cannot carry a rating.' },
				{ status: 400 }
			);
		}
		const ratingRaw = body.rating != null ? Number(body.rating) : null;
		if (ratingRaw != null) {
			if (!isFinite(ratingRaw) || ratingRaw < 0.5 || ratingRaw > 5) {
				return json(
					{ err: 'invalid_rating', message: 'Rating must be between 0.5 and 5.0.' },
					{ status: 400 }
				);
			}
			if (Math.round(ratingRaw * 10) !== ratingRaw * 10) {
				return json(
					{
						err: 'invalid_rating',
						message: 'Rating may have at most one decimal place (e.g. 4.3).'
					},
					{ status: 400 }
				);
			}
		} else {
			// Clearing the rating on a top-level comment is not allowed
			return json(
				{ err: 'rating_required', message: 'Top-level reviews must have a rating.' },
				{ status: 400 }
			);
		}
		patch.ratingRaw = ratingRaw;
	}

	if ('text' in body) {
		const raw = body.text;
		patch.text =
			typeof raw === 'string' ? (raw.trim().slice(0, 2000) || null) : null;

		// Replies must keep non-empty text
		if (comment.parent_id !== null && !patch.text) {
			return json(
				{ err: 'text_required', message: 'Reply text cannot be empty.' },
				{ status: 400 }
			);
		}
	}

	if (Object.keys(patch).length === 0) {
		return json({ err: 'no_changes', message: 'No fields to update were provided.' }, { status: 400 });
	}

	// ── Update ────────────────────────────────────────────────────────────────
	const updated = await updateComment({ id: commentId, ...patch });
	if (!updated) return json({ err: 'update_failed' }, { status: 500 });

	return json({ comment: updated }, { status: 200 });
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/bots/[id]/comments/[commentId]
//
// Auth: key cookie / query param / Authorization header
// Only the comment's author may delete it.
// Deleting a top-level comment also deletes all its replies.
// ─────────────────────────────────────────────────────────────────────────────
export const DELETE: RequestHandler = async ({ request, params, cookies }) => {
	const { id: botId, commentId } = params;
	if (!botId || !commentId) {
		return json({ err: 'missing_params' }, { status: 400 });
	}

	// ── Auth ──────────────────────────────────────────────────────────────────
	const key = resolveKey(request, cookies);
	if (!key) return json({ err: 'not_logged_in' }, { status: 401 });

	const discordUser = await getDiscordUser(key);
	if (!discordUser) return json({ err: 'invalid_key' }, { status: 401 });

	// ── Fetch comment ─────────────────────────────────────────────────────────
	const comment = await getCommentById(commentId);
	if (!comment) return json({ err: 'not_found' }, { status: 404 });

	if (comment.bot_id !== botId) {
		return json({ err: 'not_found' }, { status: 404 });
	}

	if (comment.user_id !== discordUser.id) {
		return json({ err: 'forbidden' }, { status: 403 });
	}

	// ── Delete ────────────────────────────────────────────────────────────────
	// deleteComment also deletes all child replies referencing this comment's id.
	await deleteComment(commentId);

	return json({ success: true }, { status: 200 });
};
