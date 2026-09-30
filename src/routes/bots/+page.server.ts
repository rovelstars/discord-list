import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import {
	listBots,
	getTopBots,
	getMusicBots,
	getGameBots,
	getModBots,
	getPromotedBots
} from "$lib/db/queries";

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const categoryParam = url.searchParams.get("category");
	if (categoryParam) throw redirect(301, `/bots/category/${categoryParam}`);

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
		topBotsPromise = getTopBots(9);
		musicBotsPromise = getMusicBots(9);
		gameBotsPromise = getGameBots(9);
		modBotsPromise = getModBots(9);
	}

	const [bots, topBots, musicBots, gameBots, modBots, promotedBots] = await Promise.all([
		botsPromise,
		topBotsPromise,
		musicBotsPromise,
		gameBotsPromise,
		modBotsPromise,
		getPromotedBots(2).catch(() => [])
	]);

	const isFiltered = isSearching;

	// De-dupe: a sponsored bot pinned atop never repeats in the grids below.
	const sponsoredIds = new Set(promotedBots.map((b) => b.id));
	const withoutSponsored = <T extends { id: string }>(list: T[]): T[] =>
		sponsoredIds.size ? list.filter((b) => !sponsoredIds.has(b.id)) : list;

	setHeaders({
		"cache-control": isFiltered
			? "public, max-age=120, s-maxage=300, stale-while-revalidate=600"
			: "public, max-age=900, s-maxage=1800, stale-while-revalidate=1800",
		"netlify-vary":
			"query=key|slug|code|q|limit|offset|new|trending|lucky|category,cookie=code,header=user-agent"
	});

	return {
		bots: withoutSponsored(bots),
		q,
		limit,
		offset,
		newFlag,
		trending,
		lucky,
		category,
		isSearching,
		topBots: withoutSponsored(topBots),
		musicBots: withoutSponsored(musicBots),
		gameBots: withoutSponsored(gameBots),
		modBots: withoutSponsored(modBots),
		promotedBots
	};
};
