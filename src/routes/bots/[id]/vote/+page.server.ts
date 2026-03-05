import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { getDb } from "$lib/db";
import { Bots } from "$lib/schema";
import { eq, or } from "drizzle-orm";

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const idOrSlug = params.id;
	if (!idOrSlug) throw redirect(302, "/404");

	const db = getDb();

	// Fetch the minimal bot info needed for the vote page
	const rows = await db
		.select({
			id: Bots.id,
			slug: Bots.slug,
			username: Bots.username,
			discriminator: Bots.discriminator,
			avatar: Bots.avatar,
			opted_coins: Bots.opted_coins
		})
		.from(Bots)
		.where(or(eq(Bots.slug, idOrSlug), eq(Bots.id, idOrSlug)))
		.limit(1);

	if (!rows || rows.length === 0) throw redirect(302, "/404");

	const bot = rows[0] as {
		id: string;
		slug: string | null;
		username: string;
		discriminator: string;
		avatar: string | null;
		opted_coins: boolean | number | null;
	};

	// User resolution is now handled client-side via the auth store.
	// This page can be cached publicly since it no longer varies by cookie.
	setHeaders({
		"cache-control": "public, max-age=300, s-maxage=600, stale-while-revalidate=1200",
		"netlify-vary": "query=key|slug|code,header=user-agent"
	});

	return {
		bot: {
			id: bot.id,
			slug: bot.slug ?? bot.id,
			username: bot.username,
			discriminator: bot.discriminator,
			avatar: bot.avatar,
			opted_coins: Boolean(bot.opted_coins)
		}
	};
};
