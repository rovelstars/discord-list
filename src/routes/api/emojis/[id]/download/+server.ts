import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { getEmojiById, incrementEmojiDownload } from "$lib/db/queries/emojis";

const DISCORD_CDN = "https://cdn.discordapp.com/emojis";

/**
 * POST /api/emojis/[id]/download
 *
 * Increments the download counter for an emoji and returns the CDN URL
 * to download it. The actual file fetch happens client-side via the returned
 * URL so we never proxy large binary payloads through the server.
 *
 * Response:
 *   200 { url: string, filename: string, animated: boolean }
 *   404 { error: "not_found" }
 *   500 { error: string }
 */
export const POST: RequestHandler = async ({ params }) => {
	const { id } = params;

	if (!id || typeof id !== "string") {
		return json({ error: "missing_id" }, { status: 400 });
	}

	try {
		const emoji = await getEmojiById(id);
		if (!emoji) {
			return json({ error: "not_found" }, { status: 404 });
		}

		// Increment download counter (fire-and-forget — never block the response)
		incrementEmojiDownload(id).catch((err) => {
			console.warn(`[emoji-download] Failed to increment dc for emoji ${id}:`, err);
		});

		const ext = emoji.a ? "gif" : "webp";
		const sizeParam = emoji.a ? "" : "?size=256";
		const url = `${DISCORD_CDN}/${id}.${ext}${sizeParam}`;
		const filename = `${emoji.code}.${ext}`;

		return json(
			{
				url,
				filename,
				animated: emoji.a,
				name: emoji.name,
				code: emoji.code
			},
			{ status: 200 }
		);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		console.error(`[emoji-download] Error for emoji ${id}:`, msg);
		return json({ error: "internal_error" }, { status: 500 });
	}
};
