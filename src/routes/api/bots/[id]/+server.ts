import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { getBotByIdOrSlug, getRandomBots } from "$lib/db/queries";

/**
 * GET /api/bots/[id]
 *
 * Returns a JSON payload with:
 *  - bot: the detailed bot object (or null)
 *  - randombots: an array of bot summaries for "You might also like"
 *
 * Behavior:
 *  - 200: { bot, randombots }
 *  - 400: missing id
 *  - 404: bot not found
 *  - 500: server error
 *
 * Caching:
 *  - Matches previous site defaults: short cache window with SWR available.
 */
export const GET: RequestHandler = async ({ params }) => {
	const idOrSlug = params.id;
	if (!idOrSlug) {
		return json({ err: "missing_id" }, { status: 400 });
	}

	try {
		const bot = await getBotByIdOrSlug(idOrSlug);
		if (!bot) {
			// Bot not found
			return json({ err: "not_found" }, { status: 404 });
		}

		// Provide a small set of random bots for the "You might also like" section.
		// This mirrors the behavior of the original endpoint which returned a random set.
		const randombots = await getRandomBots(10);

		return json(
			{ bot, randombots },
			{
				status: 200,
				headers: {
					"Cache-Control": "public, max-age=120, stale-while-revalidate=1200",
					"Content-Type": "application/json"
				}
			}
		);
	} catch (err) {
		console.error("Error fetching bot detail for", idOrSlug, err);
		return json(
			{ err: "server_error", message: err instanceof Error ? err.message : String(err) },
			{ status: 500 }
		);
	}
};
