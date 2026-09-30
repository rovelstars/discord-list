import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import {
	getBotByIdOrSlug,
	getRandomBots,
	getCommentsByBotId,
	getServersByBotId,
	getServerByIdOrSlug,
	setBotSupportGuildId
} from "$lib/db/queries";
import { resolveOwners } from "$lib/server/resolve-owners";
import {
	resolveSupportGuildId,
	resolveSupportGuild,
	extractInviteCode
} from "$lib/server/resolve-support";
import { env } from "$env/dynamic/private";
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

	const [randombots, comments, relatedServers, owners] = await Promise.all([
		getRandomBots(10),
		getCommentsByBotId(bot.id),
		getServersByBotId(bot.id, 8),
		resolveOwners(bot.owners ?? [])
	]);

	// ── Support-server integration ──────────────────────────────────────────
	// If the bot's support invite points to a guild that is ALSO listed on RDL,
	// surface the listed server (so we link to its RDL page instead of the raw
	// invite). The resolved guild id is cached on the bot row to avoid re-hitting
	// Discord on every load. If the server isn't listed (or gets removed later),
	// supportServer stays null and the page falls back to the raw invite link.
	let supportServer: {
		/** true = the guild is listed on RDL → link to its RDL page + show a star. */
		listed: boolean;
		id: string;
		/** RDL slug when listed; null otherwise. */
		slug: string | null;
		name: string;
		/** Discord icon hash or a full URL. */
		icon: string | null;
		/** Discord invite URL when not listed; null when listed. */
		inviteUrl: string | null;
	} | null = null;

	if (bot.support) {
		const token = (env.DISCORD_TOKEN ?? "").trim();

		let guildId = bot.support_guild_id ?? null;
		if (!guildId && token) {
			guildId = await resolveSupportGuildId(bot.support, token);
			// Cache only successful resolutions; leaving null lets it retry later.
			if (guildId) setBotSupportGuildId(bot.id, guildId).catch(() => {});
		}

		// Listed on RDL → use the fresh Servers row (name/icon) and link internally.
		const srv = guildId ? await getServerByIdOrSlug(guildId) : null;
		if (srv) {
			supportServer = {
				listed: true,
				id: srv.id,
				slug: srv.slug ?? srv.id,
				name: srv.name,
				icon: srv.icon ?? null,
				inviteUrl: null
			};
		} else if (token) {
			// Not listed → still show a rich card using the invite's guild name/icon.
			const g = await resolveSupportGuild(bot.support, token);
			if (g) {
				const code = extractInviteCode(bot.support);
				const inviteUrl = bot.support.startsWith("http")
					? bot.support
					: code
						? `https://discord.gg/${code}`
						: null;
				supportServer = {
					listed: false,
					id: g.id,
					slug: null,
					name: g.name,
					icon: g.icon,
					inviteUrl
				};
			}
		}
	}

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
		relatedServers,
		owners,
		supportServer
	};
};
