import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { getServerByIdOrSlug, getRandomServers } from "$lib/db/queries";
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

export const load: PageServerLoad = async ({ params, setHeaders, parent }) => {
	const idOrSlug = params.id;
	if (!idOrSlug) {
		throw redirect(302, "/404");
	}

	const server = await getServerByIdOrSlug(idOrSlug);
	if (!server) {
		throw redirect(302, "/404");
	}

	const layoutData = await parent();

	const randomServers = await getRandomServers(6);

	let descHtml: string | null = null;
	if (server.desc && server.desc !== "Description is not updated.") {
		try {
			descHtml = await marked.parse(server.desc.replace(/&gt;+/g, ">"));
		} catch {
			descHtml = server.desc;
		}
	}

	setHeaders({
		"cache-control": "public, max-age=120, stale-while-revalidate=1200",
		"netlify-vary": "query=key|slug,cookie=key|code,header=user-agent"
	});

	return {
		server,
		descHtml,
		randomServers,
		user: layoutData.user ?? null
	};
};
