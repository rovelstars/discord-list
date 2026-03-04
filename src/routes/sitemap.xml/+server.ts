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
 */

import type { RequestHandler } from "@sveltejs/kit";
import { getAllBotSlugs, getAllServerSlugs } from "$lib/db/queries";
import { getAllEmojiIds } from "$lib/db/queries/emojis";
import { getAllStickerIds } from "$lib/db/queries/stickers";
import { docs } from "virtual:docs";

const SITE_URL = "https://discord.rovelstars.com";

/** Format a JS Date, epoch-ms number, or ISO string as YYYY-MM-DD for lastmod */
function toDateStr(ts: number | string | null | undefined): string {
	if (!ts) return new Date().toISOString().slice(0, 10);
	return new Date(typeof ts === "string" ? ts : ts).toISOString().slice(0, 10);
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
	const today = new Date().toISOString().slice(0, 10);

	// ── Static pages ──────────────────────────────────────────────────────────
	const staticEntries = [
		// Home page - highest priority, changes frequently
		urlEntry({ loc: SITE_URL + "/", lastmod: today, changefreq: "daily", priority: "1.0" }),

		// Bot listing pages
		urlEntry({
			loc: SITE_URL + "/bots",
			lastmod: today,
			changefreq: "hourly",
			priority: "0.9"
		}),
		urlEntry({
			loc: SITE_URL + "/bots?new",
			lastmod: today,
			changefreq: "hourly",
			priority: "0.8"
		}),
		urlEntry({
			loc: SITE_URL + "/bots?trending",
			lastmod: today,
			changefreq: "daily",
			priority: "0.8"
		}),

		// Server listing pages
		urlEntry({
			loc: SITE_URL + "/servers",
			lastmod: today,
			changefreq: "hourly",
			priority: "0.9"
		}),
		urlEntry({
			loc: SITE_URL + "/servers?new",
			lastmod: today,
			changefreq: "hourly",
			priority: "0.8"
		}),
		urlEntry({
			loc: SITE_URL + "/servers?trending",
			lastmod: today,
			changefreq: "daily",
			priority: "0.8"
		}),

		// Emoji listing pages
		urlEntry({
			loc: SITE_URL + "/emojis",
			lastmod: today,
			changefreq: "hourly",
			priority: "0.8"
		}),
		urlEntry({
			loc: SITE_URL + "/emojis?sort=newest",
			lastmod: today,
			changefreq: "hourly",
			priority: "0.7"
		}),
		urlEntry({
			loc: SITE_URL + "/emojis?sort=popular",
			lastmod: today,
			changefreq: "daily",
			priority: "0.7"
		}),

		// Sticker listing pages
		urlEntry({
			loc: SITE_URL + "/stickers",
			lastmod: today,
			changefreq: "hourly",
			priority: "0.8"
		}),
		urlEntry({
			loc: SITE_URL + "/stickers?sort=newest",
			lastmod: today,
			changefreq: "hourly",
			priority: "0.7"
		}),
		urlEntry({
			loc: SITE_URL + "/stickers?sort=popular",
			lastmod: today,
			changefreq: "daily",
			priority: "0.7"
		}),

		// Docs - main page
		urlEntry({
			loc: SITE_URL + "/docs",
			lastmod: today,
			changefreq: "monthly",
			priority: "0.7"
		}),

		// Legal & informational pages
		urlEntry({
			loc: SITE_URL + "/about",
			lastmod: today,
			changefreq: "monthly",
			priority: "0.6"
		}),
		urlEntry({
			loc: SITE_URL + "/privacy",
			lastmod: today,
			changefreq: "monthly",
			priority: "0.5"
		}),
		urlEntry({
			loc: SITE_URL + "/terms",
			lastmod: today,
			changefreq: "monthly",
			priority: "0.5"
		}),

		// Dedicated feature pages
		urlEntry({
			loc: SITE_URL + "/top",
			lastmod: today,
			changefreq: "daily",
			priority: "0.9"
		}),
		urlEntry({
			loc: SITE_URL + "/new",
			lastmod: today,
			changefreq: "hourly",
			priority: "0.8"
		}),

		// Category landing pages
		urlEntry({
			loc: SITE_URL + "/categories",
			lastmod: today,
			changefreq: "weekly",
			priority: "0.8"
		}),
		urlEntry({
			loc: SITE_URL + "/categories/music",
			lastmod: today,
			changefreq: "weekly",
			priority: "0.8"
		}),
		urlEntry({
			loc: SITE_URL + "/categories/moderation",
			lastmod: today,
			changefreq: "weekly",
			priority: "0.8"
		}),
		urlEntry({
			loc: SITE_URL + "/categories/gaming",
			lastmod: today,
			changefreq: "weekly",
			priority: "0.8"
		}),
		urlEntry({
			loc: SITE_URL + "/categories/economy",
			lastmod: today,
			changefreq: "weekly",
			priority: "0.7"
		}),
		urlEntry({
			loc: SITE_URL + "/categories/utility",
			lastmod: today,
			changefreq: "weekly",
			priority: "0.7"
		}),
		urlEntry({
			loc: SITE_URL + "/categories/fun",
			lastmod: today,
			changefreq: "weekly",
			priority: "0.7"
		}),
		urlEntry({
			loc: SITE_URL + "/categories/anime",
			lastmod: today,
			changefreq: "weekly",
			priority: "0.7"
		}),
		urlEntry({
			loc: SITE_URL + "/categories/logging",
			lastmod: today,
			changefreq: "weekly",
			priority: "0.6"
		}),
		urlEntry({
			loc: SITE_URL + "/categories/leveling",
			lastmod: today,
			changefreq: "weekly",
			priority: "0.6"
		}),
		urlEntry({
			loc: SITE_URL + "/categories/roleplay",
			lastmod: today,
			changefreq: "weekly",
			priority: "0.6"
		})
	];

	// ── Docs sections (hash-anchored deep links) ──────────────────────────────
	// The docs page is a single SPA with hash-based section navigation, so each
	// section gets its own URL entry so crawlers can discover individual topics.
	const docsEntries = docs.map((section) =>
		urlEntry({
			loc: `${SITE_URL}/docs#${encodeURIComponent(section.slug)}`,
			lastmod: today,
			changefreq: "monthly",
			priority: "0.6"
		})
	);

	// ── Dynamic bot pages ─────────────────────────────────────────────────────
	let botEntries: string[] = [];
	try {
		const slugs = await getAllBotSlugs();
		botEntries = slugs
			.filter((s) => s.slug && s.slug.trim() !== "")
			.map((s) =>
				urlEntry({
					loc: `${SITE_URL}/bots/${encodeURIComponent(s.slug)}`,
					lastmod: toDateStr(s.added_at ?? undefined),
					changefreq: "weekly",
					priority: "0.6"
				})
			);
	} catch (err) {
		// Non-fatal - serve static-only sitemap if DB is unavailable
		console.error("[sitemap.xml] Failed to fetch bot slugs:", err);
	}

	// ── Dynamic server pages ──────────────────────────────────────────────────
	let serverEntries: string[] = [];
	try {
		const servers = await getAllServerSlugs();
		serverEntries = servers
			.filter((s) => s.id && s.id.trim() !== "")
			.map((s) => {
				// Prefer the human-readable slug when available, fall back to the
				// numeric Discord snowflake id so every server is always reachable.
				const segment = s.slug && s.slug.trim() !== "" ? s.slug : s.id;
				return urlEntry({
					loc: `${SITE_URL}/servers/${encodeURIComponent(segment)}`,
					lastmod: toDateStr(s.added_at ?? undefined),
					changefreq: "weekly",
					priority: "0.6"
				});
			});
	} catch (err) {
		console.error("[sitemap.xml] Failed to fetch server slugs:", err);
	}

	// ── Dynamic emoji pages ───────────────────────────────────────────────────
	let emojiEntries: string[] = [];
	try {
		const emojis = await getAllEmojiIds();
		emojiEntries = emojis
			.filter((e) => e.id && e.id.trim() !== "")
			.map((e) =>
				urlEntry({
					loc: `${SITE_URL}/emojis/${encodeURIComponent(e.id)}`,
					lastmod: toDateStr(e.added_at ?? undefined),
					changefreq: "monthly",
					priority: "0.5"
				})
			);
	} catch (err) {
		console.error("[sitemap.xml] Failed to fetch emoji ids:", err);
	}

	// ── Dynamic sticker pages ─────────────────────────────────────────────────
	let stickerEntries: string[] = [];
	try {
		const stickers = await getAllStickerIds();
		stickerEntries = stickers
			.filter((s) => s.id && s.id.trim() !== "")
			.map((s) =>
				urlEntry({
					loc: `${SITE_URL}/stickers/${encodeURIComponent(s.id)}`,
					lastmod: toDateStr(s.added_at ?? undefined),
					changefreq: "monthly",
					priority: "0.5"
				})
			);
	} catch (err) {
		console.error("[sitemap.xml] Failed to fetch sticker ids:", err);
	}

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
