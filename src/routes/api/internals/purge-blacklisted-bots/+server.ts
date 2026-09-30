/**
 * GET /api/internals/purge-blacklisted-bots
 *
 * Internal endpoint that permanently deletes bots which have been blacklisted
 * (owner-requested deletion) for at least 7 days. Within those 7 days an owner
 * can still "restore" the bot from their dashboard; after the window it is
 * removed for good, along with its comments and comment reactions.
 *
 * Security (same pattern as other /api/internals endpoints):
 *   X-Internal-Secret header OR ?secret=<val> query param must match
 *   env.INTERNAL_SECRET.
 *
 * Response JSON:
 *   200  { success: true, eligible, deletedBots, deletedComments, deletedReactions, durationMs }
 *   401  { success: false, error: 'Unauthorized.' }
 *   500  { success: false, error: string }
 */

import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { withDb } from "$lib/db";
import { Bots, Comments, CommentReactions } from "$lib/db/schema";
import { and, eq, lt, isNotNull, inArray } from "drizzle-orm";

/** Grace period before a blacklisted bot is permanently removed. */
const GRACE_DAYS = 7;
const GRACE_MS = GRACE_DAYS * 24 * 60 * 60 * 1000;

export const GET: RequestHandler = async ({ request, url }) => {
	const internalSecret = (env.INTERNAL_SECRET ?? "").trim();
	if (!internalSecret) {
		console.error("[purge-blacklisted-bots] INTERNAL_SECRET env var is not set.");
		return json(
			{ success: false, error: "Server misconfiguration: INTERNAL_SECRET not set." },
			{ status: 500 }
		);
	}

	const supplied = (
		request.headers.get("X-Internal-Secret") ??
		url.searchParams.get("secret") ??
		""
	).trim();
	if (!supplied || supplied !== internalSecret) {
		return json({ success: false, error: "Unauthorized." }, { status: 401 });
	}

	const startedAt = Date.now();
	const cutoffIso = new Date(Date.now() - GRACE_MS).toISOString();

	try {
		// 1. Find bots whose grace period has elapsed.
		const rows = (await withDb((db) =>
			db
				.select({ id: Bots.id })
				.from(Bots)
				.where(
					and(
						eq(Bots.blacklisted, true),
						isNotNull(Bots.blacklisted_at),
						lt(Bots.blacklisted_at, cutoffIso)
					)
				)
		)) as { id: string }[];

		const botIds = rows.map((r) => String(r.id));
		const eligible = botIds.length;

		if (eligible === 0) {
			return json(
				{
					success: true,
					eligible: 0,
					deletedBots: 0,
					deletedComments: 0,
					deletedReactions: 0,
					durationMs: Date.now() - startedAt
				},
				{ status: 200 }
			);
		}

		// 2. Collect comment ids for those bots so their reactions can be cleaned.
		const commentRows = (await withDb((db) =>
			db.select({ id: Comments.id }).from(Comments).where(inArray(Comments.bot_id, botIds))
		)) as { id: string }[];
		const commentIds = commentRows.map((r) => String(r.id));

		// 3. Delete reactions → comments → bots (children first to avoid orphans).
		if (commentIds.length > 0) {
			await withDb((db) =>
				db.delete(CommentReactions).where(inArray(CommentReactions.comment_id, commentIds))
			);
			await withDb((db) => db.delete(Comments).where(inArray(Comments.bot_id, botIds)));
		}
		await withDb((db) => db.delete(Bots).where(inArray(Bots.id, botIds)));

		const summary = {
			success: true,
			eligible,
			deletedBots: eligible,
			deletedComments: commentIds.length,
			deletedReactions: commentIds.length, // reactions removed for those comments (count not re-queried)
			durationMs: Date.now() - startedAt
		};
		console.log(`[purge-blacklisted-bots] ${JSON.stringify(summary)}`);
		return json(summary, { status: 200 });
	} catch (err) {
		console.error("[purge-blacklisted-bots] Failed:", err);
		return json(
			{ success: false, error: err instanceof Error ? err.message : String(err) },
			{ status: 500 }
		);
	}
};
