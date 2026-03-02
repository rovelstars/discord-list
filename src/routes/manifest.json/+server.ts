/**
 * GET /manifest.json
 *
 * Returns a W3C Web App Manifest so browsers can offer an "Add to Home Screen"
 * / PWA install prompt, and so the site behaves well when pinned / installed.
 *
 * The `<link rel="manifest" href="/manifest.json" />` tag is already present in
 * SEO.svelte, so this route is the missing other half.
 *
 * Icons referenced here already exist under /static/assets/img/bot/:
 *   logo-36.png, logo-48.png, logo-72.png, logo-96.png,
 *   logo-144.png, logo-512.png
 *
 * Caching: the manifest rarely changes, so it is served with a 24-hour
 * Cache-Control and a stale-while-revalidate window of 7 days.
 */

import type { RequestHandler } from "@sveltejs/kit";

const SITE_NAME = "Rovel Discord List";
const SITE_SHORT_NAME = "RDL";
const SITE_URL = "https://discord.rovelstars.com";
const DESCRIPTION =
	"Imagine a place — where you find everything about Discord! Bots, Servers, Emojis, Templates and more. We got you covered!";
const THEME_COLOR = "#5865F2";
const BACKGROUND_COLOR = "#0b0d12";

const manifest = {
	name: SITE_NAME,
	short_name: SITE_SHORT_NAME,
	description: DESCRIPTION,
	start_url: "/",
	scope: "/",
	display: "standalone",
	orientation: "portrait-primary",
	theme_color: THEME_COLOR,
	background_color: BACKGROUND_COLOR,
	lang: "en",
	dir: "ltr",

	// ── Icons ─────────────────────────────────────────────────────────────────
	// All sizes that exist in /static/assets/img/bot/ are listed here so
	// browsers and OS launchers can pick the most appropriate resolution.
	icons: [
		{
			src: "/assets/img/bot/logo-36.png",
			sizes: "36x36",
			type: "image/png",
			purpose: "any"
		},
		{
			src: "/assets/img/bot/logo-48.png",
			sizes: "48x48",
			type: "image/png",
			purpose: "any"
		},
		{
			src: "/assets/img/bot/logo-72.png",
			sizes: "72x72",
			type: "image/png",
			purpose: "any"
		},
		{
			src: "/assets/img/bot/logo-96.png",
			sizes: "96x96",
			type: "image/png",
			purpose: "any"
		},
		{
			src: "/assets/img/bot/logo-144.png",
			sizes: "144x144",
			type: "image/png",
			purpose: "any"
		},
		{
			src: "/assets/img/bot/logo-512.png",
			sizes: "512x512",
			type: "image/png",
			// "maskable" lets Android adaptive icons crop/pad the icon safely.
			// "any" keeps the full logo for every other context.
			purpose: "any maskable"
		},
		// SVG — scalable, used by modern Chromium-based browsers
		{
			src: "/favicon.svg",
			sizes: "any",
			type: "image/svg+xml",
			purpose: "any"
		}
	],

	// ── Shortcuts ─────────────────────────────────────────────────────────────
	// Appear in the OS right-click / long-press context menu for the installed app.
	shortcuts: [
		{
			name: "Browse Bots",
			short_name: "Bots",
			description: "Explore all listed Discord bots",
			url: "/bots",
			icons: [
				{
					src: "/assets/img/bot/logo-96.png",
					sizes: "96x96",
					type: "image/png"
				}
			]
		},
		{
			name: "Top Bots",
			short_name: "Top",
			description: "See the highest-voted Discord bots",
			url: "/top",
			icons: [
				{
					src: "/assets/img/bot/logo-96.png",
					sizes: "96x96",
					type: "image/png"
				}
			]
		},
		{
			name: "New Bots",
			short_name: "New",
			description: "Discover recently added Discord bots",
			url: "/new",
			icons: [
				{
					src: "/assets/img/bot/logo-96.png",
					sizes: "96x96",
					type: "image/png"
				}
			]
		},
		{
			name: "Add a Bot",
			short_name: "Add Bot",
			description: "Submit your Discord bot to the list",
			url: "/bots/add",
			icons: [
				{
					src: "/assets/img/bot/logo-96.png",
					sizes: "96x96",
					type: "image/png"
				}
			]
		}
	],

	// ── Screenshots ───────────────────────────────────────────────────────────
	// Chrome on Android shows these in the install bottom-sheet.
	// Add real screenshots under /static/assets/screenshots/ and uncomment
	// when they are available.
	//
	// screenshots: [
	//   {
	//     src: "/assets/screenshots/home-desktop.png",
	//     sizes: "1280x800",
	//     type: "image/png",
	//     form_factor: "wide",
	//     label: "Home page on desktop"
	//   },
	//   {
	//     src: "/assets/screenshots/home-mobile.png",
	//     sizes: "390x844",
	//     type: "image/png",
	//     form_factor: "narrow",
	//     label: "Home page on mobile"
	//   }
	// ],

	// ── Related applications ──────────────────────────────────────────────────
	// Tells browsers not to prefer a native app over this web app.
	prefer_related_applications: false,

	// ── Categories ────────────────────────────────────────────────────────────
	// https://w3c.github.io/manifest/#categories-member
	categories: ["social", "utilities", "entertainment"]
};

export const GET: RequestHandler = () => {
	return new Response(JSON.stringify(manifest, null, 2), {
		status: 200,
		headers: {
			"Content-Type": "application/manifest+json; charset=utf-8",
			// Cache for 24 hours; serve stale for up to 7 days while revalidating.
			"Cache-Control": "public, max-age=86400, stale-while-revalidate=604800"
		}
	});
};
