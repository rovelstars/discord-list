import type { PageServerLoad } from "./$types";
import { listServers, getTopServers } from "$lib/db/queries";

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
			? "public, max-age=60, stale-while-revalidate=120"
			: "public, max-age=300, stale-while-revalidate=600",
		"netlify-vary":
			"query=q|limit|offset|new|trending,cookie=key|code,header=user-agent"
	});

	return {
		servers,
		topServers,
		q,
		limit,
		offset,
		newFlag,
		trending,
		isSearching
	};
};
