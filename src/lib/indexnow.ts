/**
 * indexnow.ts
 *
 * Shared utility for submitting URLs to the IndexNow API so search engines
 * (Bing, Yandex, Naver, Seznam, etc.) are instantly notified when a page is
 * created or updated.
 *
 * Usage:
 *   import { submitToIndexNow } from "$lib/indexnow";
 *
 *   // Single URL
 *   submitToIndexNow("https://discord.rovelstars.com/bots/123456");
 *
 *   // Multiple URLs
 *   submitToIndexNow([
 *     "https://discord.rovelstars.com/bots/123456",
 *     "https://discord.rovelstars.com/servers/789012",
 *   ]);
 *
 * The function is fire-and-forget by design — it never throws and logs
 * warnings on failure so callers don't need try/catch.
 *
 * Configuration:
 *   INDEXNOW_KEY  — env var containing the IndexNow key string.
 *                   The same key must be hosted at
 *                   https://<host>/<key>.txt containing the key value.
 *                   If not set, submissions are silently skipped.
 */

import { env } from "$env/dynamic/private";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/IndexNow";
const SITE_HOST = "discord.rovelstars.com";
const SITE_ORIGIN = `https://${SITE_HOST}`;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Submit one or more URLs to the IndexNow API.
 *
 * This function is intentionally fire-and-forget:
 *  - It never throws.
 *  - It logs warnings on non-2xx responses but does not propagate errors.
 *  - If INDEXNOW_KEY is not configured, it returns immediately.
 *
 * @param urls  A single URL string or an array of URL strings to submit.
 *              Relative paths (e.g. "/bots/123") are accepted and will be
 *              expanded to full URLs using the site origin.
 */
export async function submitToIndexNow(urls: string | string[]): Promise<void> {
	const key = (env.INDEXNOW_KEY ?? "").trim();
	if (!key) {
		// IndexNow is not configured — silently skip.
		return;
	}

	const urlList = (Array.isArray(urls) ? urls : [urls])
		.map((u) => {
			const trimmed = u.trim();
			if (!trimmed) return null;
			// Expand relative paths to full URLs
			if (trimmed.startsWith("/")) return `${SITE_ORIGIN}${trimmed}`;
			return trimmed;
		})
		.filter((u): u is string => u !== null);

	if (urlList.length === 0) return;

	const keyLocation = `${SITE_ORIGIN}/${key}.txt`;

	try {
		const body = JSON.stringify({
			host: SITE_HOST,
			key,
			keyLocation,
			urlList
		});

		const res = await fetch(INDEXNOW_ENDPOINT, {
			method: "POST",
			headers: {
				"Content-Type": "application/json; charset=utf-8",
				"User-Agent": "discord-list/indexnow"
			},
			body
		});

		if (res.ok) {
			console.info(
				`[indexnow] Submitted ${urlList.length} URL(s) — HTTP ${res.status}`
			);
		} else {
			const text = await res.text().catch(() => `(unreadable body)`);
			console.warn(
				`[indexnow] Submission failed — HTTP ${res.status}: ${text}`,
				`URLs: ${urlList.join(", ")}`
			);
		}
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		console.warn(`[indexnow] Submission error: ${msg}`);
	}
}

// ---------------------------------------------------------------------------
// Convenience helpers for common entity types
// ---------------------------------------------------------------------------

/**
 * Notify IndexNow that a bot page was created or updated.
 *
 * Submits both the canonical `/bots/<slug>` URL and the listing pages
 * that may display the bot (home, /bots, /bots?new, /bots?trending).
 *
 * @param slugOrId  The bot's slug (preferred) or numeric ID.
 */
export function notifyBotChanged(slugOrId: string): void {
	submitToIndexNow([
		`${SITE_ORIGIN}/bots/${encodeURIComponent(slugOrId)}`
	]).catch(() => {});
}

/**
 * Notify IndexNow that a server page was created or updated.
 *
 * @param slugOrId  The server's slug (preferred) or numeric guild ID.
 */
export function notifyServerChanged(slugOrId: string): void {
	submitToIndexNow([
		`${SITE_ORIGIN}/servers/${encodeURIComponent(slugOrId)}`
	]).catch(() => {});
}
