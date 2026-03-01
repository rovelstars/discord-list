import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { getBotByIdOrSlug, getRandomBots } from "$lib/db/queries";

/**
 * GET /api/bots/[id]/index
 *
 * Returns:
 *  - 200: { bot, randombots }
 *  - 400: { err: 'missing_id' }
 *  - 404: { err: 'no_bot_found' }
 *  - 500: { err: 'server_error', message?: string }
 *
 * Caching:
 *  - Short public cache with stale-while-revalidate semantics to match previous behavior.
 */
export const GET: RequestHandler = async ({ params }) => {
	const idOrSlug = params.id;
	if (!idOrSlug) {
		return json({ err: "missing_id" }, { status: 400 });
	}

	try {
		const bot = await getBotByIdOrSlug(idOrSlug);
		if (!bot) {
			return json({ err: "no_bot_found" }, { status: 404 });
		}

		const randombots = await getRandomBots(10);

		return json(
			{ bot, randombots },
			{
				status: 200,
				headers: {
					// Keep a short public cache and allow SWR on the edge
					"Cache-Control": "public, max-age=120, stale-while-revalidate=1200",
					"Content-Type": "application/json"
				}
			}
		);
	} catch (err) {
		console.error("Error in GET /api/bots/[id]/index:", err);
		return json(
			{ err: "server_error", message: err instanceof Error ? err.message : String(err) },
			{ status: 500 }
		);
	}
};
