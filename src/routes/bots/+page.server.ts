import type { PageServerLoad } from "./$types";
import { listBots, getTopBots, getMusicBots, getGameBots, getModBots } from "$lib/db/queries";

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const q = url.searchParams.get("q") ?? null;
	const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 50);
	const offset = Math.max(parseInt(url.searchParams.get("offset") ?? "0", 10), 0);
	const newFlag = url.searchParams.has("new");
	const trending = url.searchParams.has("trending");
	const lucky = url.searchParams.has("lucky");
	const category = url.searchParams.get("category") ?? null;

	// "Searching" means the user has applied any filter - show results grid, not landing sections
	const isSearching = !!(q || newFlag || trending || lucky || category);

	// Always fetch the filtered bot list
	const botsPromise = listBots({
		q,
		limit,
		offset,
		newFlag: newFlag || lucky,
		trending,
		category
	});

	// Only fetch landing-page curated sections when on the bare /bots landing view
	let topBotsPromise: Promise<any[]> = Promise.resolve([]);
	let musicBotsPromise: Promise<any[]> = Promise.resolve([]);
	let gameBotsPromise: Promise<any[]> = Promise.resolve([]);
	let modBotsPromise: Promise<any[]> = Promise.resolve([]);

	if (!isSearching) {
		topBotsPromise = getTopBots(10);
		musicBotsPromise = getMusicBots(10);
		gameBotsPromise = getGameBots(10);
		modBotsPromise = getModBots(10);
	}

	const [bots, topBots, musicBots, gameBots, modBots] = await Promise.all([
		botsPromise,
		topBotsPromise,
		musicBotsPromise,
		gameBotsPromise,
		modBotsPromise
	]);

	const isFiltered = isSearching;

	setHeaders({
		"cache-control": isFiltered
			? "public, max-age=60, stale-while-revalidate=120"
			: "public, max-age=600, stale-while-revalidate=1200",
		"netlify-vary":
			"query=key|slug|code|q|limit|offset|new|trending|lucky|category,cookie=key|code,header=user-agent"
	});

	return {
		bots,
		q,
		limit,
		offset,
		newFlag,
		trending,
		lucky,
		category,
		isSearching,
		topBots,
		musicBots,
		gameBots,
		modBots
	};
};
