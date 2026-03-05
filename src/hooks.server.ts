import type { Handle } from "@sveltejs/kit";
import { parseMode, parseAccent, resolveMode } from "$lib/theme";

export const handle: Handle = async ({ event, resolve }) => {
	const rawMode = event.cookies.get("theme-mode");
	const rawAccent = event.cookies.get("theme-accent");

	// Also accept the legacy "theme" cookie (dark | light) so existing users
	// don't get a flash on their first visit after the update.
	const legacyCookie = event.cookies.get("theme");
	const mode = parseMode(
		rawMode ?? (legacyCookie === "dark" ? "dark" : legacyCookie === "light" ? "light" : undefined)
	);
	const accent = parseAccent(rawAccent);

	// For "system" mode we have no reliable server-side signal for the user's
	// OS preference (there is no HTTP header for it), so we check for the
	// optional `theme-system-dark` cookie written by the inline script in
	// app.html on the very first client-side render and sent on all subsequent
	// requests.
	const systemDarkHint = event.cookies.get("theme-system-dark");
	const systemPrefersDark = systemDarkHint === "1" ? true : systemDarkHint === "0" ? false : null;

	const resolvedPolarity = resolveMode(mode, systemPrefersDark);
	const isDark = resolvedPolarity === "dark";

	const isPageRequest = !event.url.pathname.startsWith("/api/");
	const isDashboard = event.url.pathname.startsWith("/dashboard");

	const response = await resolve(event, {
		transformPageChunk({ html }) {
			// Build the attribute string to inject into <html …>
			// We always set data-theme (even for "default") so the attribute is
			// always present and JS can read it without a null check.
			const themeAttr = `data-theme="${accent}"`;
			const darkClass = isDark ? " dark" : "";

			// Inject data-theme and, when needed, the dark class.
			// The replace targets the opening <html tag and appends our attrs.
			return html.replace(/<html([^>]*)>/, (_, existingAttrs: string) => {
				// Merge the dark class into an existing class attribute if present,
				// otherwise add a new class attribute.
				let attrs = existingAttrs;

				if (isDark) {
					if (/class="([^"]*)"/.test(attrs)) {
						attrs = attrs.replace(/class="([^"]*)"/, `class="$1${darkClass}"`);
					} else {
						attrs += ` class="${darkClass.trim()}"`;
					}
				}

				// Append data-theme (remove any pre-existing one first to be safe)
				attrs = attrs.replace(/\s*data-theme="[^"]*"/, "");
				attrs += ` ${themeAttr}`;

				return `<html${attrs}>`;
			});
		}
	});

	// ── Cache headers for page requests ──────────────────────────────────────
	//
	// Now that user authentication is deferred to the client side, ALL public
	// pages can be served from edge / CDN cache regardless of whether the
	// visitor has a `key` cookie or not. The only exception is /dashboard/**
	// routes which still perform server-side auth checks and must not be cached.
	//
	// Strategy:
	//   • /dashboard/** → private, never cache (contains per-user sensitive data)
	//   • Everything else → respect the per-page cache-control header if the
	//     page load already set one (via setHeaders). Only apply a generous
	//     default fallback when the page didn't set its own header.
	//
	// This ensures the carefully tuned per-page cache durations (e.g. bot
	// detail pages at 2 min, homepage at 10 min, categories at 30 min) are
	// never overwritten by a one-size-fits-all value, while pages that don't
	// bother setting their own header (about, terms, privacy, docs, etc.)
	// still get a sensible long-lived cache automatically.

	if (isPageRequest) {
		if (isDashboard) {
			// Dashboard pages must never be cached — they contain user-specific
			// data that was validated server-side.
			response.headers.set("Cache-Control", "private, no-store, must-revalidate");
		} else {
			// Only set a default if the page load didn't already set cache-control.
			// SvelteKit's setHeaders() writes a lowercase "cache-control" header,
			// so we check for both casings to be safe.
			const existingCC =
				response.headers.get("cache-control") ?? response.headers.get("Cache-Control");

			if (!existingCC) {
				// Generous default for public pages that didn't set their own header.
				// These are typically static / rarely-changing pages like /about,
				// /terms, /privacy, /docs, /categories (index), etc.
				//
				//   s-maxage  = 1800  (30 min at edge / CDN)
				//   max-age   = 300   (5 min in the browser — fast revisits)
				//   stale-while-revalidate = 3600 (serve stale for up to 1 hr while
				//                                  the CDN fetches a fresh copy)
				response.headers.set(
					"Cache-Control",
					"public, s-maxage=1800, max-age=300, stale-while-revalidate=3600"
				);
			} else {
				// The page set its own cache-control. Make sure it includes
				// s-maxage for CDN caching if it only specified max-age.
				// This lets individual pages just do `max-age=120` and still
				// get proper CDN caching without having to remember s-maxage.
				if (
					existingCC.includes("public") &&
					!existingCC.includes("s-maxage") &&
					existingCC.includes("max-age")
				) {
					// Extract the max-age value and use a multiplied s-maxage so
					// the CDN holds the page longer than individual browsers.
					const match = existingCC.match(/max-age=(\d+)/);
					if (match) {
						const maxAge = parseInt(match[1], 10);
						// CDN cache = 3× browser cache, capped at 1 hour
						const sMaxAge = Math.min(maxAge * 3, 3600);
						response.headers.set("Cache-Control", `${existingCC}, s-maxage=${sMaxAge}`);
					}
				}
			}
		}
	}

	return response;
};
