import type { RequestHandler } from "@sveltejs/kit";
import { getStickerById } from "$lib/db/queries/stickers";
import { getStickerUrl, getStickerExtension } from "$lib/sticker-utils";

const FETCH_TIMEOUT_MS = 10_000;

/**
 * GET /api/stickers/[id]/preview
 *
 * Proxies the sticker image from the Discord CDN and adds
 * Access-Control-Allow-Origin so the browser can load it into a canvas
 * (required by ColorThief for dominant-colour extraction).
 *
 * The visible <img> on the page still points directly at the CDN - only a
 * small hidden image used by ColorThief hits this endpoint, so there is no
 * perceptible latency cost to the user.
 */
export const GET: RequestHandler = async ({ params, setHeaders }) => {
	const { id } = params;

	if (!id || typeof id !== "string") {
		return new Response("missing id", { status: 400 });
	}

	let sticker: Awaited<ReturnType<typeof getStickerById>>;
	try {
		sticker = await getStickerById(id);
	} catch {
		return new Response("internal error", { status: 500 });
	}

	if (!sticker) {
		return new Response("not found", { status: 404 });
	}

	const cdnUrl = getStickerUrl(id, sticker.format, 160);

	let cdnRes: Response;
	try {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
		try {
			cdnRes = await fetch(cdnUrl, {
				signal: controller.signal,
				headers: {
					"User-Agent": "RovelDiscordList/1.0 (+https://discord.rovelstars.com)"
				}
			});
		} finally {
			clearTimeout(timer);
		}
	} catch {
		return new Response("cdn fetch failed", { status: 502 });
	}

	if (!cdnRes.ok) {
		return new Response("cdn error", { status: 502 });
	}

	const ext = getStickerExtension(sticker.format);
	const mimeTypes: Record<string, string> = {
		png: "image/png",
		gif: "image/gif",
		json: "application/json"
	};
	const contentType =
		mimeTypes[ext] ?? cdnRes.headers.get("content-type") ?? "application/octet-stream";

	setHeaders({
		"Content-Type": contentType,
		"Access-Control-Allow-Origin": "*",
		"Cache-Control": "public, max-age=86400, immutable"
	});

	return new Response(cdnRes.body, { status: 200 });
};
