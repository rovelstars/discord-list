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

	return resolve(event, {
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
};
