import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import {
	getBotByIdOrSlug,
	getRandomBots,
	getCommentsByBotId,
	getServersByBotId
} from "$lib/db/queries";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";

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

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const idOrSlug = params.id;
	if (!idOrSlug) {
		throw redirect(302, "/404");
	}

	const bot = await getBotByIdOrSlug(idOrSlug);
	if (!bot) {
		throw redirect(302, "/404");
	}

	const [randombots, comments, relatedServers] = await Promise.all([
		getRandomBots(10),
		getCommentsByBotId(bot.id),
		getServersByBotId(bot.id, 8)
	]);

	// Render markdown description to HTML server-side, same as old Astro page.
	// Unescape &gt; sequences before parsing (mirrors old repo behaviour).
	let descHtml: string | null = null;
	if (bot.desc) {
		try {
			descHtml = await marked.parse(bot.desc.replace(/&gt;+/g, ">"));
		} catch {
			// Fall back to raw text if parsing fails
			descHtml = bot.desc;
		}
	}

	setHeaders({
		"cache-control": "public, max-age=300, s-maxage=900, stale-while-revalidate=1200",
		"netlify-vary": "query=key|slug|code,cookie=code,header=user-agent"
	});

	return {
		bot,
		descHtml,
		randombots,
		comments,
		relatedServers
	};
};
