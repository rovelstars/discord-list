import type { PageServerLoad } from "./$types";
import { docs } from "virtual:docs";

export const load: PageServerLoad = async ({ setHeaders }) => {
	// Docs are generated at build time from static markdown files, so they
	// only change on deploy. Cache very aggressively:
	//   max-age   = 1800  (30 min in the browser)
	//   s-maxage  = 86400 (24 hrs at edge / CDN — until next deploy)
	//   stale-while-revalidate = 86400 (serve stale for up to 24 hrs)
	setHeaders({
		"cache-control": "public, max-age=1800, s-maxage=86400, stale-while-revalidate=86400"
	});

	return { docs };
};
