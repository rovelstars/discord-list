import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { CATEGORIES } from '$lib/categories';
import { getBotsByCategory } from '$lib/db/queries';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const meta = CATEGORIES[params.slug];

	if (!meta) {
		throw error(404, `No category found for "${params.slug}"`);
	}

	const bots = await getBotsByCategory(meta.keyword, 48);

	setHeaders({
		'cache-control': 'public, max-age=600, stale-while-revalidate=1800'
	});

	return {
		slug: params.slug,
		meta,
		bots,
		relatedCategories: meta.relatedSlugs
			.map((s) => {
				const cat = CATEGORIES[s];
				if (!cat) return null;
				return { slug: s, ...cat };
			})
			.filter((c): c is NonNullable<typeof c> => c !== null)
	};
};
