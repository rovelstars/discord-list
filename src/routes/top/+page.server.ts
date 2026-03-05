import type { PageServerLoad } from "./$types";
import { getTopBotsFull } from "$lib/db/queries";

export const load: PageServerLoad = async ({ setHeaders }) => {
	const bots = await getTopBotsFull(100);

	setHeaders({
		"cache-control": "public, max-age=900, s-maxage=1800, stale-while-revalidate=3600"
	});

	return { bots };
};
