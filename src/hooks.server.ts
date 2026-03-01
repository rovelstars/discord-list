import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
	const theme = event.cookies.get("theme");
	const isDark = theme === "dark";

	return resolve(event, {
		transformPageChunk({ html }) {
			if (isDark) {
				return html.replace("<html", '<html class="dark"');
			}
			return html;
		}
	});
};
