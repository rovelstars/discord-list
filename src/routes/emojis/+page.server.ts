import type { PageServerLoad } from "./$types";
import { listEmojis, countEmojis } from "$lib/db/queries/emojis";

const PAGE_SIZE = 48;

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const q = url.searchParams.get("q")?.trim() || null;
	const animatedParam = url.searchParams.get("animated");
	const animated = animatedParam === "true" ? true : animatedParam === "false" ? false : null;
	const guildId = url.searchParams.get("guild")?.trim() || null;
	const sort = (url.searchParams.get("sort") ?? "newest") as "newest" | "popular" | "az";
	const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
	const offset = (page - 1) * PAGE_SIZE;

	const [emojis, total] = await Promise.all([
		listEmojis({ q, animated, guildId, offset, limit: PAGE_SIZE, sort }),
		countEmojis({ q, animated, guildId })
	]);

	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

	setHeaders({
		"cache-control": "public, max-age=180, s-maxage=600, stale-while-revalidate=600"
	});

	return {
		emojis,
		total,
		page,
		totalPages,
		q,
		animated,
		guildId,
		sort
	};
};
