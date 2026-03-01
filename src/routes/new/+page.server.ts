import type { PageServerLoad } from './$types';
import { getNewestBots } from '$lib/db/queries';

export const load: PageServerLoad = async ({ setHeaders }) => {
	const bots = await getNewestBots(48);

	setHeaders({
		'cache-control': 'public, max-age=300, stale-while-revalidate=900'
	});

	return { bots };
};
