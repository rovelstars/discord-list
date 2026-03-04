import type { PageServerLoad } from "./$types";
import { listStickers, countStickers } from "$lib/db/queries/stickers";
import { resolveStickerTagsBulk } from "$lib/resolve-sticker-tags";

const PAGE_SIZE = 48;

export const load: PageServerLoad = async ({ url, setHeaders, parent }) => {
	const q = url.searchParams.get("q")?.trim() || null;
	const animatedParam = url.searchParams.get("animated");
	const animated = animatedParam === "true" ? true : animatedParam === "false" ? false : null;
	const guildId = url.searchParams.get("guild")?.trim() || null;
	const sort = (url.searchParams.get("sort") ?? "newest") as "newest" | "popular" | "az";
	const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
	const offset = (page - 1) * PAGE_SIZE;

	const layoutData = await parent();

	const [stickers, total] = await Promise.all([
		listStickers({ q, animated, guildId, offset, limit: PAGE_SIZE, sort }),
		countStickers({ q, animated, guildId })
	]);

	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

	// Resolve custom emoji IDs in tags - one DB round-trip for all 48 stickers.
	let resolvedTagsMap: Awaited<ReturnType<typeof resolveStickerTagsBulk>> = new Map();
	try {
		resolvedTagsMap = await resolveStickerTagsBulk(stickers);
	} catch (err) {
		console.warn("[stickers-page] Tag resolution failed (non-fatal):", err);
	}

	// Attach resolved tags to each sticker so the template can pass them to StickerCard.
	const stickersWithTags = stickers.map((s) => ({
		...s,
		resolvedTags: resolvedTagsMap.get(s.id) ?? []
	}));

	setHeaders({
		"cache-control": "public, max-age=60, stale-while-revalidate=300"
	});

	return {
		stickers: stickersWithTags,
		total,
		page,
		totalPages,
		q,
		animated,
		guildId,
		sort,
		user: layoutData.user ?? null
	};
};
