import type { PageServerLoad } from './$types';
import { getTopBotsFull } from '$lib/db/queries';

export const load: PageServerLoad = async ({ setHeaders }) => {
	const bots = await getTopBotsFull(100);

	setHeaders({
		'cache-control': 'public, max-age=600, stale-while-revalidate=1800'
	});

	return { bots };
};
