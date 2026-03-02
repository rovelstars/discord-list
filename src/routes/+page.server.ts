import type { PageServerLoad } from "./$types";
import { getTopBots } from "$lib/db/queries";
import { listBots } from "$lib/db/queries";

export const load: PageServerLoad = async ({ setHeaders }) => {
	try {
		const [topBotsVotes, topBotsServers] = await Promise.all([
			getTopBots(30),
			listBots({ limit: 30, offset: 0, trending: true })
		]);

		// Merge and deduplicate by id, preferring the votes list ordering
		const seen = new Set<string>();
		const allBots: typeof topBotsVotes = [];
		for (const bot of [...topBotsVotes, ...topBotsServers]) {
			if (!seen.has(bot.id)) {
				seen.add(bot.id);
				allBots.push(bot);
			}
		}

		setHeaders({
			"cache-control": "public, max-age=600, stale-while-revalidate=1200",
			"netlify-vary": "query=key|slug|code,cookie=key|code,header=user-agent"
		});

		return {
			topbotsdata: topBotsVotes,
			allBotsForBg: allBots
		};
	} catch {
		setHeaders({
			"cache-control": "public, max-age=60, stale-while-revalidate=120",
			"netlify-vary": "query=key|slug|code,cookie=key|code,header=user-agent"
		});

		return { topbotsdata: [], allBotsForBg: [] };
	}
};
