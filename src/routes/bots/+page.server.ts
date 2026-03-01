import type { PageServerLoad } from "./$types";
import { listBots } from "$lib/db/queries";

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const q = url.searchParams.get("q") ?? null;
	const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 50);
	const offset = Math.max(parseInt(url.searchParams.get("offset") ?? "0", 10), 0);
	const newFlag = url.searchParams.has("new");
	const trending = url.searchParams.has("trending");
	const lucky = url.searchParams.has("lucky");

	// For "lucky" we reuse the listBots with a random seed — DB layer handles RANDOM() ordering
	const bots = await listBots({ q, limit, offset, newFlag: newFlag || lucky, trending });

	setHeaders({
		"cache-control": q
			? "public, max-age=60, stale-while-revalidate=120"
			: "public, max-age=600, stale-while-revalidate=1200",
		"netlify-vary":
			"query=key|slug|code|q|limit|offset|new|trending|lucky,cookie=key|code,header=user-agent"
	});

	return {
		bots,
		q,
		limit,
		offset,
		newFlag,
		trending,
		lucky
	};
};
