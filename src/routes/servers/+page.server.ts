import type { PageServerLoad } from "./$types";
import { listServers, getTopServers } from "$lib/db/queries";
import { env } from "$env/dynamic/private";

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const q = url.searchParams.get("q") ?? null;
	const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 50);
	const offset = Math.max(parseInt(url.searchParams.get("offset") ?? "0", 10), 0);
	const newFlag = url.searchParams.has("new");
	const trending = url.searchParams.has("trending");

	const isSearching = !!(q || newFlag || trending);

	const serversPromise = listServers({ q, limit, offset, newFlag, trending });

	let topServersPromise: Promise<any[]> = Promise.resolve([]);
	if (!isSearching) {
		topServersPromise = getTopServers(12);
	}

	const [servers, topServers] = await Promise.all([serversPromise, topServersPromise]);

	setHeaders({
		"cache-control": isSearching
			? "public, max-age=120, s-maxage=300, stale-while-revalidate=600"
			: "public, max-age=600, s-maxage=1800, stale-while-revalidate=1800",
		"netlify-vary": "query=q|limit|offset|new|trending,cookie=code,header=user-agent"
	});

	return {
		servers,
		topServers,
		q,
		limit,
		offset,
		newFlag,
		trending,
		isSearching,
		discordBotId: env.DISCORD_BOT_ID ?? ""
	};
};
