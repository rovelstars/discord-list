import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";
import { CATEGORIES } from "$lib/categories";
import { getBotsByCategory, getPromotedBots } from "$lib/db/queries";

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const meta = CATEGORIES[params.slug];

	if (!meta) {
		throw error(404, `No category found for "${params.slug}"`);
	}

	const [bots, promotedBots] = await Promise.all([
		getBotsByCategory(meta.keyword, 48),
		getPromotedBots(2).catch(() => [])
	]);

	// De-dupe: a sponsored bot pinned atop never repeats in the grid below.
	const sponsoredIds = new Set(promotedBots.map((b) => b.id));
	const filtered = sponsoredIds.size ? bots.filter((b) => !sponsoredIds.has(b.id)) : bots;

	setHeaders({
		"cache-control": "public, max-age=900, s-maxage=3600, stale-while-revalidate=3600"
	});

	return {
		slug: params.slug,
		meta,
		bots: filtered,
		promotedBots,
		relatedCategories: meta.relatedSlugs
			.map((s) => {
				const cat = CATEGORIES[s];
				if (!cat) return null;
				return { slug: s, ...cat };
			})
			.filter((c): c is NonNullable<typeof c> => c !== null)
	};
};
