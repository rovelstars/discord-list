/**
 * GET /sitemap.xml
 *
 * Dynamically generates a sitemap that includes:
 *  - Static high-value pages (home, /bots, /top, /new, /categories/*)
 *  - Every individual bot page (/bots/[slug])
 *
 * Search engines (and Googlebot) fetch this to discover all indexable URLs.
 * Cached for 12 hours so it doesn't hit the DB on every crawl request.
 */

import type { RequestHandler } from "@sveltejs/kit";
import { getAllBotSlugs } from "$lib/db/queries";
import { env } from "$env/dynamic/private";

const SITE_URL = "https://discord.rovelstars.com";

/** Format a JS Date or epoch-ms number as YYYY-MM-DD for lastmod */
function toDateStr(ts: number | null | undefined): string {
	if (!ts) return new Date().toISOString().slice(0, 10);
	return new Date(ts).toISOString().slice(0, 10);
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
		// Home page — highest priority, changes frequently
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
		// Non-fatal — serve static-only sitemap if DB is unavailable
		console.error("[sitemap.xml] Failed to fetch bot slugs:", err);
	}

	const xml = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...staticEntries,
		...botEntries,
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
