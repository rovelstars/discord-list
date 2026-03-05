import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { getEmojiById } from "$lib/db/queries/emojis";
import { getRandomEmojis } from "$lib/db/queries/emojis";
import { getServerByIdOrSlug } from "$lib/db/queries";

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const { id } = params;
	if (!id) throw redirect(302, "/emojis");

	const [emoji, related] = await Promise.all([getEmojiById(id), getRandomEmojis(12)]);

	if (!emoji) throw redirect(302, "/emojis");

	// Fetch guild info if the emoji is linked to a server
	let guildInfo: {
		id: string;
		name: string;
		short: string;
		icon: string | null;
		slug: string;
	} | null = null;
	if (emoji.guild) {
		try {
			const server = await getServerByIdOrSlug(emoji.guild);
			if (server) {
				guildInfo = {
					id: server.id,
					name: server.name,
					short: server.short ?? "",
					icon: server.icon ?? null,
					slug: server.slug ?? server.id
				};
			}
		} catch {
			// Non-fatal - fall back to showing the raw guild ID
		}
	}

	setHeaders({
		"cache-control": "public, max-age=300, s-maxage=900, stale-while-revalidate=1200"
	});

	return {
		emoji,
		related: related.filter((e) => e.id !== emoji.id).slice(0, 11),
		guildInfo
	};
};
