import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { getEmojiById } from "$lib/db/queries/emojis";
import { getRandomEmojis } from "$lib/db/queries/emojis";

export const load: PageServerLoad = async ({ params, setHeaders, parent }) => {
	const { id } = params;
	if (!id) throw redirect(302, "/emojis");

	const [emoji, related, layoutData] = await Promise.all([
		getEmojiById(id),
		getRandomEmojis(12),
		parent()
	]);

	if (!emoji) throw redirect(302, "/emojis");

	setHeaders({
		"cache-control": "public, max-age=120, stale-while-revalidate=600"
	});

	return {
		emoji,
		related: related.filter((e) => e.id !== emoji.id).slice(0, 11),
		user: layoutData.user ?? null
	};
};
