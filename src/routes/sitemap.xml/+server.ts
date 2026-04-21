/**
 * GET /sitemap.xml
 *
 * Dynamically generates a sitemap that includes:
 *  - Static high-value pages (home, /bots, /top, /new, /categories/*, etc.)
 *  - Every individual bot page (/bots/[slug])
 *  - Every individual server page (/servers/[id] or /servers/[slug])
 *  - Every individual emoji page (/emojis/[id])
 *  - Every individual sticker page (/stickers/[id])
 *  - Docs page with per-section hash anchors (/docs#[slug])
 *
 * Search engines (and Googlebot) fetch this to discover all indexable URLs.
 * Cached for 12 hours so it doesn't hit the DB on every crawl request.
 *
 * `<lastmod>` policy:
 *   - Dynamic entity pages use that entity's `added_at`.
 *   - Listing pages (/, /bots, /servers, /emojis, /stickers, /top, /new,
 *     /categories, /categories/*) use the newest `added_at` across the
 *     relevant entity set — so the date actually reflects when the listing
 *     last changed.
 *   - Truly static-content pages (/about, /privacy, /terms, /docs, docs
 *     hash anchors) omit `<lastmod>` entirely. Google penalises sitemaps
 *     that stamp every URL with "today", so omitting is better than lying.
 */

import type { RequestHandler } from "@sveltejs/kit";
import { getAllBotSlugs, getAllServerSlugs } from "$lib/db/queries";
import { getAllEmojiIds } from "$lib/db/queries/emojis";
import { getAllStickerIds } from "$lib/db/queries/stickers";
import { docs } from "virtual:docs";

const SITE_URL = "https://discord.rovelstars.com";

/** Format a JS Date, epoch-ms number, or ISO string as YYYY-MM-DD for lastmod */
function toDateStr(ts: number | string | null | undefined): string | undefined {
	if (ts == null || ts === "") return undefined;
	const d = new Date(typeof ts === "string" ? ts : ts);
	if (Number.isNaN(d.getTime())) return undefined;
	return d.toISOString().slice(0, 10);
}

/** Pick the newest timestamp from an array of entity rows. Returns a
 *  YYYY-MM-DD string or undefined if the set is empty / all nullish. */
function newestDate<T>(
	rows: T[],
	getTs: (row: T) => number | string | null | undefined
): string | undefined {
	let maxMs = 0;
	for (const r of rows) {
		const v = getTs(r);
		if (v == null || v === "") continue;
		const t = typeof v === "string" ? Date.parse(v) : Number(v);
		if (Number.isFinite(t) && t > maxMs) maxMs = t;
	}
	return maxMs > 0 ? toDateStr(maxMs) : undefined;
}

/** Escape XML special characters in URL strings */
function escapeXml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/'/g, "&apos;")
		.replace(/"/g, "&quot;")
		.replace(/>/g, "&gt;")
		.replace(/</g, "&lt;");
}

function urlEntry({
	loc,
	lastmod,
	changefreq,
	priority
}: {
	loc: string;
	lastmod?: string;
	changefreq?: string;
	priority?: string;
}): string {
	return [
		"  <url>",
		`    <loc>${escapeXml(loc)}</loc>`,
		lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
		changefreq ? `    <changefreq>${changefreq}</changefreq>` : "",
		priority ? `    <priority>${priority}</priority>` : "",
		"  </url>"
	]
		.filter(Boolean)
		.join("\n");
}

export const GET: RequestHandler = async () => {
	// ── Fetch dynamic entity lists first so static listings can derive an
	// accurate <lastmod> from them. Each fetch is independent and non-fatal:
	// if any single query fails we log and continue with an empty array,
	// which just suppresses the corresponding <lastmod>.
	const [botSlugs, serverSlugs, emojiIds, stickerIds] = await Promise.all([
		getAllBotSlugs().catch((err) => {
			console.error("[sitemap.xml] Failed to fetch bot slugs:", err);
			return [] as Awaited<ReturnType<typeof getAllBotSlugs>>;
		}),
		getAllServerSlugs().catch((err) => {
			console.error("[sitemap.xml] Failed to fetch server slugs:", err);
			return [] as Awaited<ReturnType<typeof getAllServerSlugs>>;
		}),
		getAllEmojiIds().catch((err) => {
			console.error("[sitemap.xml] Failed to fetch emoji ids:", err);
			return [] as Awaited<ReturnType<typeof getAllEmojiIds>>;
		}),
		getAllStickerIds().catch((err) => {
			console.error("[sitemap.xml] Failed to fetch sticker ids:", err);
			return [] as Awaited<ReturnType<typeof getAllStickerIds>>;
		})
	]);

	// ── Derived listing-page lastmod values ──────────────────────────────────
	const newestBotDate = newestDate(botSlugs, (b) => b.added_at);
	const newestServerDate = newestDate(serverSlugs, (s) => s.added_at);
	const newestEmojiDate = newestDate(emojiIds, (e) => e.added_at);
	const newestStickerDate = newestDate(stickerIds, (s) => s.added_at);
	// Homepage reflects "anything new on the site" — use the max of all four.
	const siteNewestDate = [newestBotDate, newestServerDate, newestEmojiDate, newestStickerDate]
		.filter((d): d is string => !!d)
		.sort()
		.pop();

	// ── Static pages ──────────────────────────────────────────────────────────
	const staticEntries = [
		// Home page — lastmod = any entity added anywhere on the site
		urlEntry({
			loc: SITE_URL + "/",
			lastmod: siteNewestDate,
			changefreq: "daily",
			priority: "1.0"
		}),

		// Bot listing pages — lastmod = newest bot added
		urlEntry({
			loc: SITE_URL + "/bots",
			lastmod: newestBotDate,
			changefreq: "hourly",
			priority: "0.9"
		}),
		urlEntry({
			loc: SITE_URL + "/bots?new",
			lastmod: newestBotDate,
			changefreq: "hourly",
			priority: "0.8"
		}),
		urlEntry({
			loc: SITE_URL + "/bots?trending",
			lastmod: newestBotDate,
			changefreq: "daily",
			priority: "0.8"
		}),

		// Server listing pages — lastmod = newest server added
		urlEntry({
			loc: SITE_URL + "/servers",
			lastmod: newestServerDate,
			changefreq: "hourly",
			priority: "0.9"
		}),
		urlEntry({
			loc: SITE_URL + "/servers?new",
			lastmod: newestServerDate,
			changefreq: "hourly",
			priority: "0.8"
		}),
		urlEntry({
			loc: SITE_URL + "/servers?trending",
			lastmod: newestServerDate,
			changefreq: "daily",
			priority: "0.8"
		}),

		// Emoji listing pages — lastmod = newest emoji added
		urlEntry({
			loc: SITE_URL + "/emojis",
			lastmod: newestEmojiDate,
			changefreq: "hourly",
			priority: "0.8"
		}),
		urlEntry({
			loc: SITE_URL + "/emojis?sort=newest",
			lastmod: newestEmojiDate,
			changefreq: "hourly",
			priority: "0.7"
		}),
		urlEntry({
			loc: SITE_URL + "/emojis?sort=popular",
			lastmod: newestEmojiDate,
			changefreq: "daily",
			priority: "0.7"
		}),

		// Sticker listing pages — lastmod = newest sticker added
		urlEntry({
			loc: SITE_URL + "/stickers",
			lastmod: newestStickerDate,
			changefreq: "hourly",
			priority: "0.8"
		}),
		urlEntry({
			loc: SITE_URL + "/stickers?sort=newest",
			lastmod: newestStickerDate,
			changefreq: "hourly",
			priority: "0.7"
		}),
		urlEntry({
			loc: SITE_URL + "/stickers?sort=popular",
			lastmod: newestStickerDate,
			changefreq: "daily",
			priority: "0.7"
		}),

		// Docs — static content page; omit <lastmod> rather than lie with today.
		urlEntry({ loc: SITE_URL + "/docs", changefreq: "monthly", priority: "0.7" }),

		// Legal & informational pages — truly static, no reliable lastmod.
		urlEntry({ loc: SITE_URL + "/about", changefreq: "monthly", priority: "0.6" }),
		urlEntry({ loc: SITE_URL + "/privacy", changefreq: "monthly", priority: "0.5" }),
		urlEntry({ loc: SITE_URL + "/terms", changefreq: "monthly", priority: "0.5" }),

		// Dedicated feature pages — reflect bot additions
		urlEntry({
			loc: SITE_URL + "/top",
			lastmod: newestBotDate,
			changefreq: "daily",
			priority: "0.9"
		}),
		urlEntry({
			loc: SITE_URL + "/new",
			lastmod: newestBotDate,
			changefreq: "hourly",
			priority: "0.8"
		}),

		// Category landing pages — populated by filtering bots, so they track the
		// newest bot addition. Not perfect (a new bot may not match this category)
		// but significantly more accurate than a daily-churning placeholder.
		urlEntry({
			loc: SITE_URL + "/categories",
			lastmod: newestBotDate,
			changefreq: "weekly",
			priority: "0.8"
		}),
		urlEntry({
			loc: SITE_URL + "/categories/music",
			lastmod: newestBotDate,
			changefreq: "weekly",
			priority: "0.8"
		}),
		urlEntry({
			loc: SITE_URL + "/categories/moderation",
			lastmod: newestBotDate,
			changefreq: "weekly",
			priority: "0.8"
		}),
		urlEntry({
			loc: SITE_URL + "/categories/gaming",
			lastmod: newestBotDate,
			changefreq: "weekly",
			priority: "0.8"
		}),
		urlEntry({
			loc: SITE_URL + "/categories/economy",
			lastmod: newestBotDate,
			changefreq: "weekly",
			priority: "0.7"
		}),
		urlEntry({
			loc: SITE_URL + "/categories/utility",
			lastmod: newestBotDate,
			changefreq: "weekly",
			priority: "0.7"
		}),
		urlEntry({
			loc: SITE_URL + "/categories/fun",
			lastmod: newestBotDate,
			changefreq: "weekly",
			priority: "0.7"
		}),
		urlEntry({
			loc: SITE_URL + "/categories/anime",
			lastmod: newestBotDate,
			changefreq: "weekly",
			priority: "0.7"
		}),
		urlEntry({
			loc: SITE_URL + "/categories/logging",
			lastmod: newestBotDate,
			changefreq: "weekly",
			priority: "0.6"
		}),
		urlEntry({
			loc: SITE_URL + "/categories/leveling",
			lastmod: newestBotDate,
			changefreq: "weekly",
			priority: "0.6"
		}),
		urlEntry({
			loc: SITE_URL + "/categories/roleplay",
			lastmod: newestBotDate,
			changefreq: "weekly",
			priority: "0.6"
		})
	];

	// ── Docs sections (hash-anchored deep links) ──────────────────────────────
	// Docs are compiled from source markdown; we don't track per-section
	// timestamps, so omit <lastmod> rather than stamp every section with today.
	const docsEntries = docs.map((section) =>
		urlEntry({
			loc: `${SITE_URL}/docs#${encodeURIComponent(section.slug)}`,
			changefreq: "monthly",
			priority: "0.6"
		})
	);

	// ── Dynamic bot pages ─────────────────────────────────────────────────────
	const botEntries = botSlugs
		.filter((s) => s.slug && s.slug.trim() !== "")
		.map((s) =>
			urlEntry({
				loc: `${SITE_URL}/bots/${encodeURIComponent(s.slug)}`,
				lastmod: toDateStr(s.added_at),
				changefreq: "weekly",
				priority: "0.6"
			})
		);

	// ── Dynamic server pages ──────────────────────────────────────────────────
	const serverEntries = serverSlugs
		.filter((s) => s.id && s.id.trim() !== "")
		.map((s) => {
			// Prefer the human-readable slug when available, fall back to the
			// numeric Discord snowflake id so every server is always reachable.
			const segment = s.slug && s.slug.trim() !== "" ? s.slug : s.id;
			return urlEntry({
				loc: `${SITE_URL}/servers/${encodeURIComponent(segment)}`,
				lastmod: toDateStr(s.added_at),
				changefreq: "weekly",
				priority: "0.6"
			});
		});

	// ── Dynamic emoji pages ───────────────────────────────────────────────────
	const emojiEntries = emojiIds
		.filter((e) => e.id && e.id.trim() !== "")
		.map((e) =>
			urlEntry({
				loc: `${SITE_URL}/emojis/${encodeURIComponent(e.id)}`,
				lastmod: toDateStr(e.added_at),
				changefreq: "monthly",
				priority: "0.5"
			})
		);

	// ── Dynamic sticker pages ─────────────────────────────────────────────────
	const stickerEntries = stickerIds
		.filter((s) => s.id && s.id.trim() !== "")
		.map((s) =>
			urlEntry({
				loc: `${SITE_URL}/stickers/${encodeURIComponent(s.id)}`,
				lastmod: toDateStr(s.added_at),
				changefreq: "monthly",
				priority: "0.5"
			})
		);

	const xml = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...staticEntries,
		...docsEntries,
		...botEntries,
		...serverEntries,
		...emojiEntries,
		...stickerEntries,
		"</urlset>"
	].join("\n");

	return new Response(xml, {
		status: 200,
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			// Cache for 12 hours at CDN, serve stale for up to 24 h while revalidating
			"Cache-Control": "public, max-age=43200, stale-while-revalidate=86400",
			"X-Robots-Tag": "noindex" // don't index the sitemap itself
		}
	});
};
