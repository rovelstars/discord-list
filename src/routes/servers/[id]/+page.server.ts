import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { getServerByIdOrSlug, getRandomServers, getBotsByServerId } from "$lib/db/queries";
import { refreshServer } from "$lib/server-refresh";
import { env } from "$env/dynamic/private";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import { getEmojisByGuild, countEmojisByGuild } from "$lib/db/queries/emojis";
import { getStickersByGuild, countStickersByGuild } from "$lib/db/queries/stickers";

const marked = new Marked(
	markedHighlight({
		emptyLangClass: "hljs",
		langPrefix: "hljs language-",
		highlight(code, lang) {
			const language = hljs.getLanguage(lang) ? lang : "plaintext";
			return hljs.highlight(code, { language }).value;
		}
	})
);

/** How old synced_at must be before we fire a background refresh (10 minutes). */
const SYNC_STALE_MS = 10 * 60 * 1000;

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const idOrSlug = params.id;
	if (!idOrSlug) {
		throw redirect(302, "/404");
	}

	const server = await getServerByIdOrSlug(idOrSlug);
	if (!server) {
		throw redirect(302, "/404");
	}

	const [randomServers, relatedBots] = await Promise.all([
		getRandomServers(6),
		getBotsByServerId(server.id, 8)
	]);

	let emojis: Awaited<ReturnType<typeof getEmojisByGuild>> = [];
	let emojiCount = 0;
	try {
		[emojis, emojiCount] = await Promise.all([
			getEmojisByGuild(server.id, 32),
			countEmojisByGuild(server.id)
		]);
	} catch (emojiErr) {
		// Non-fatal - page renders without the emoji section if the table
		// isn't ready yet or a transient DB error occurs.
		console.warn("[server-page] Emoji query failed (non-fatal):", emojiErr);
	}

	let stickers: Awaited<ReturnType<typeof getStickersByGuild>> = [];
	let stickerCount = 0;
	try {
		[stickers, stickerCount] = await Promise.all([
			getStickersByGuild(server.id, 32),
			countStickersByGuild(server.id)
		]);
	} catch (stickerErr) {
		// Non-fatal - page renders without the sticker section if the table
		// isn't ready yet or a transient DB error occurs.
		console.warn("[server-page] Sticker query failed (non-fatal):", stickerErr);
	}

	let descHtml: string | null = null;
	if (server.desc && server.desc !== "Description is not updated.") {
		try {
			descHtml = await marked.parse(server.desc.replace(/&gt;+/g, ">"));
		} catch {
			descHtml = server.desc;
		}
	}

	// ── Background guild snapshot refresh ──────────────────────────────────
	// Fire-and-forget: if data is stale (never synced, or synced >10 min ago)
	// kick off a refresh so the *next* page load gets fresh data. We don't
	// await it so it never slows down the response.
	const discordToken = (env.DISCORD_TOKEN ?? "").trim();
	const isStale =
		!server.synced_at || Date.now() - new Date(server.synced_at).getTime() > SYNC_STALE_MS;

	if (discordToken && isStale) {
		// minAgeMs=0 - the stale check above is our guard; no need to double-check.
		refreshServer(server.id, discordToken, {
			triggeredBy: "page-load",
			minAgeMs: 0
		}).catch((err) => {
			// Non-fatal - page still renders with whatever data is in the DB.
			console.warn("[server-page] Background refresh failed (non-fatal):", err);
		});
	}

	setHeaders({
		"cache-control": "public, max-age=300, s-maxage=900, stale-while-revalidate=1200",
		"netlify-vary": "query=key|slug,cookie=code,header=user-agent"
	});

	return {
		server,
		descHtml,
		randomServers,
		relatedBots,
		emojis,
		emojiCount,
		stickers,
		stickerCount
	};
};
