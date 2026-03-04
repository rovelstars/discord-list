import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { getStickerById, incrementStickerDownload } from "$lib/db/queries/stickers";
import { getStickerUrl, getStickerExtension } from "$lib/sticker-utils";

const FETCH_TIMEOUT_MS = 15_000;

/**
 * POST /api/stickers/[id]/download
 *
 * Increments the download counter for a sticker, fetches the binary from the
 * Discord CDN server-side (bypassing the browser's CORS restrictions - the CDN
 * does not send Access-Control-Allow-Origin headers), and streams the file
 * directly back to the client as an attachment.
 *
 * Proxying is necessary for stickers because unlike the emoji CDN, the Discord
 * sticker CDN does not include CORS headers, so a client-side fetch() to it is
 * blocked by the browser's Same-Origin Policy.
 *
 * Response:
 *   200  binary file with Content-Disposition: attachment; filename="..."
 *   400  { error: "missing_id" }
 *   404  { error: "not_found" }
 *   502  { error: "cdn_fetch_failed" }
 *   500  { error: string }
 */
export const POST: RequestHandler = async ({ params }) => {
	const { id } = params;

	if (!id || typeof id !== "string") {
		return json({ error: "missing_id" }, { status: 400 });
	}

	let sticker: Awaited<ReturnType<typeof getStickerById>>;
	try {
		sticker = await getStickerById(id);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		console.error(`[sticker-download] DB error for sticker ${id}:`, msg);
		return json({ error: "internal_error" }, { status: 500 });
	}

	if (!sticker) {
		return json({ error: "not_found" }, { status: 404 });
	}

	// Increment download counter fire-and-forget - never block the response.
	incrementStickerDownload(id).catch((err) => {
		console.warn(`[sticker-download] Failed to increment dc for sticker ${id}:`, err);
	});

	const ext = getStickerExtension(sticker.format);
	const cdnUrl = getStickerUrl(id, sticker.format, 320);
	// Sanitise the sticker name for use in a Content-Disposition filename.
	const safeName =
		sticker.name
			.replace(/[^\w\s-]/g, "")
			.trim()
			.replace(/\s+/g, "_") || id;
	const filename = `${safeName}.${ext}`;

	// ── Proxy the CDN binary ─────────────────────────────────────────────────
	// The Discord sticker CDN does not send CORS headers, so the browser cannot
	// fetch it directly. We fetch it server-side and pipe the bytes back.
	let cdnRes: Response;
	try {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
		try {
			cdnRes = await fetch(cdnUrl, {
				signal: controller.signal,
				headers: {
					// Identify ourselves; some CDNs block requests without a UA.
					"User-Agent": "RovelDiscordList/1.0 (+https://discord.rovelstars.com)"
				}
			});
		} finally {
			clearTimeout(timer);
		}
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		const isTimeout = msg.includes("abort") || msg.includes("timed out");
		console.error(`[sticker-download] CDN fetch error for sticker ${id}:`, msg);
		return json({ error: isTimeout ? "cdn_timeout" : "cdn_fetch_failed" }, { status: 502 });
	}

	if (!cdnRes.ok) {
		console.error(`[sticker-download] CDN returned ${cdnRes.status} for sticker ${id} (${cdnUrl})`);
		return json({ error: "cdn_fetch_failed", status: cdnRes.status }, { status: 502 });
	}

	// Determine the correct MIME type to forward to the browser.
	const mimeTypes: Record<string, string> = {
		png: "image/png",
		gif: "image/gif",
		json: "application/json"
	};
	const contentType =
		mimeTypes[ext] ?? cdnRes.headers.get("content-type") ?? "application/octet-stream";

	// Stream the CDN response body straight back - no buffering into memory.
	return new Response(cdnRes.body, {
		status: 200,
		headers: {
			"Content-Type": contentType,
			"Content-Disposition": `attachment; filename="${filename}"`,
			// Forward the content-length if the CDN provided it so the browser
			// can show a progress indicator.
			...(cdnRes.headers.has("content-length")
				? { "Content-Length": cdnRes.headers.get("content-length")! }
				: {}),
			// Cache the proxied file briefly on the client - the sticker binary
			// never changes for a given id, so a short cache is safe.
			"Cache-Control": "public, max-age=86400, immutable"
		}
	});
};
