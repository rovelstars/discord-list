import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { getDb } from "$lib/db";
import { Servers } from "$lib/schema";
import { eq, or } from "drizzle-orm";

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const idOrSlug = params.id;
	if (!idOrSlug) throw redirect(302, "/404");

	const db = getDb();

	// Fetch the minimal server info needed for the vote page
	const rows = await db
		.select({
			id: Servers.id,
			slug: Servers.slug,
			name: Servers.name,
			icon: Servers.icon,
			votes: Servers.votes
		})
		.from(Servers)
		.where(or(eq(Servers.slug, idOrSlug), eq(Servers.id, idOrSlug)))
		.limit(1);

	if (!rows || rows.length === 0) throw redirect(302, "/404");

	const server = rows[0] as {
		id: string;
		slug: string | null;
		name: string;
		icon: string | null;
		votes: number | null;
	};

	// User resolution is now handled client-side via the auth store.
	// This page can be cached publicly since it no longer varies by cookie.
	setHeaders({
		"cache-control": "public, max-age=300, s-maxage=600, stale-while-revalidate=1200",
		"netlify-vary": "query=key|slug|code,header=user-agent"
	});

	return {
		server: {
			id: server.id,
			slug: server.slug ?? server.id,
			name: server.name,
			icon: server.icon ?? null,
			votes: Number(server.votes) || 0
		}
	};
};
