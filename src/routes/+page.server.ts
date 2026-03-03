import type { PageServerLoad } from "./$types";
import { getTopBots, listBots, getTopServers } from "$lib/db/queries";
import { getTopEmojis, getNewestEmojis } from "$lib/db/queries/emojis";

export const load: PageServerLoad = async ({ setHeaders }) => {
	try {
		const [topBotsVotes, topBotsServers, topServersData] = await Promise.all([
			getTopBots(30),
			listBots({ limit: 30, offset: 0, trending: true }),
			getTopServers(6)
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

		// Emoji queries are non-fatal — the table may not exist yet on first
		// deploy before migration runs, or may be temporarily unavailable.
		let topEmojis: Awaited<ReturnType<typeof getTopEmojis>> = [];
		let newestEmojis: Awaited<ReturnType<typeof getNewestEmojis>> = [];
		try {
			[topEmojis, newestEmojis] = await Promise.all([getTopEmojis(12), getNewestEmojis(12)]);
		} catch (emojiErr) {
			console.warn("[home] Emoji queries failed (non-fatal):", emojiErr);
		}

		setHeaders({
			"cache-control": "public, max-age=600, stale-while-revalidate=1200",
			"netlify-vary": "query=key|slug|code,cookie=key|code,header=user-agent"
		});

		return {
			topbotsdata: topBotsVotes,
			allBotsForBg: allBots,
			topServersData,
			topEmojis,
			newestEmojis
		};
	} catch {
		setHeaders({
			"cache-control": "public, max-age=60, stale-while-revalidate=120",
			"netlify-vary": "query=key|slug|code,cookie=key|code,header=user-agent"
		});

		return {
			topbotsdata: [],
			allBotsForBg: [],
			topServersData: [],
			topEmojis: [],
			newestEmojis: []
		};
	}
};
