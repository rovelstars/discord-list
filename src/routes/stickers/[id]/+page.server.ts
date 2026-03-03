import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { getStickerById, getRandomStickers } from "$lib/db/queries/stickers";
import { getServerByIdOrSlug } from "$lib/db/queries";
import { resolveStickerTags, resolveStickerTagsBulk } from "$lib/resolve-sticker-tags";

export const load: PageServerLoad = async ({ params, setHeaders, parent }) => {
	const { id } = params;
	if (!id) throw redirect(302, "/stickers");

	const [sticker, related, layoutData] = await Promise.all([
		getStickerById(id),
		getRandomStickers(12),
		parent()
	]);

	if (!sticker) throw redirect(302, "/stickers");

	// Fetch guild info if the sticker is linked to a server
	let guildInfo: {
		id: string;
		name: string;
		short: string;
		icon: string | null;
		slug: string;
	} | null = null;

	if (sticker.guild) {
		try {
			const server = await getServerByIdOrSlug(sticker.guild);
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
			// Non-fatal — fall back to showing the raw guild ID
		}
	}

	// Resolve custom emoji IDs embedded in sticker tags via the shared utility.
	const relatedSlice = related.filter((s) => s.id !== sticker.id).slice(0, 11);

	const [resolvedTags, relatedTagsMap] = await Promise.all([
		resolveStickerTags(sticker.tags).catch(() => []),
		resolveStickerTagsBulk(relatedSlice).catch(() => new Map())
	]);

	const relatedWithTags = relatedSlice.map((s) => ({
		...s,
		resolvedTags: relatedTagsMap.get(s.id) ?? []
	}));

	setHeaders({
		"cache-control": "public, max-age=120, stale-while-revalidate=600"
	});

	return {
		sticker,
		related: relatedWithTags,
		user: layoutData.user ?? null,
		guildInfo,
		resolvedTags
	};
};
