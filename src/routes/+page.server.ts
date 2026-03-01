import type { PageServerLoad } from './$types';
import { getTopBots, getMusicBots, getGameBots, getModBots } from '$lib/db/queries';

export const load: PageServerLoad = async ({ setHeaders }) => {
  try {
    // Run the queries in parallel for speed (each helper defaults to 10 results)
    const [topbotsdata, musicbotsdata, gamebotsdata, modbotsdata] = await Promise.all([
      getTopBots(10),
      getMusicBots(10),
      getGameBots(10),
      getModBots(10)
    ]);

    // Mirror the caching behavior from the original Astro site
    setHeaders({
      'cache-control': 'public, max-age=600, stale-while-revalidate=1200',
      'netlify-vary': 'query=key|slug|code,cookie=key|code,header=user-agent'
    });

    return {
      topbotsdata,
      musicbotsdata,
      gamebotsdata,
      modbotsdata
    };
  } catch (err) {
    // If something fails, return empty arrays so the frontend can render a fallback UI.
    // Still set cache headers to avoid masking transient errors forever.
    setHeaders({
      'cache-control': 'public, max-age=60, stale-while-revalidate=120',
      'netlify-vary': 'query=key|slug|code,cookie=key|code,header=user-agent'
    });

    return {
      topbotsdata: [],
      musicbotsdata: [],
      gamebotsdata: [],
      modbotsdata: []
    };
  }
};
