/**
 * Sticker utility functions - client-safe
 *
 * This module contains ONLY pure functions with zero server-side imports.
 * It is safe to import from both +page.svelte files and +server.ts files.
 *
 * The DB query module ($lib/db/queries/stickers) re-exports everything from
 * here so server-side code can keep using the same import path it always did.
 * Client-side code (Svelte components, +page.svelte) must import from here
 * directly to avoid pulling $env/dynamic/private into the browser bundle.
 */

// ---------------------------------------------------------------------------
// Format constants
// ---------------------------------------------------------------------------

/**
 * Discord sticker format type integers.
 *  1 = PNG   (static)
 *  2 = APNG  (animated PNG)
 *  3 = LOTTIE (animated vector)
 *  4 = GIF   (animated)
 */
export const STICKER_FORMAT = {
	PNG: 1,
	APNG: 2,
	LOTTIE: 3,
	GIF: 4
} as const;

export type StickerFormatType = (typeof STICKER_FORMAT)[keyof typeof STICKER_FORMAT];

// ---------------------------------------------------------------------------
// Pure utility functions
// ---------------------------------------------------------------------------

/** Returns true if the format is animated (APNG, LOTTIE, or GIF). */
export function isStickerAnimated(format: number): boolean {
	return (
		format === STICKER_FORMAT.APNG ||
		format === STICKER_FORMAT.LOTTIE ||
		format === STICKER_FORMAT.GIF
	);
}

/**
 * Build the CDN URL for a sticker given its id and format.
 *
 * Discord CDN sticker endpoints:
 *  PNG    → https://cdn.discordapp.com/stickers/{id}.png?size={size}
 *  APNG   → https://cdn.discordapp.com/stickers/{id}.png?size={size}&passthrough=true
 *  LOTTIE → https://cdn.discordapp.com/stickers/{id}.json
 *  GIF    → https://cdn.discordapp.com/stickers/{id}.gif
 */
export function getStickerUrl(id: string, format: number, size: number = 160): string {
	const base = "https://cdn.discordapp.com/stickers";
	switch (format) {
		case STICKER_FORMAT.GIF:
			return `${base}/${id}.gif`;
		case STICKER_FORMAT.LOTTIE:
			return `${base}/${id}.json`;
		case STICKER_FORMAT.APNG:
			return `${base}/${id}.png?size=${size}&passthrough=true`;
		default:
			// PNG (format 1)
			return `${base}/${id}.png?size=${size}`;
	}
}

/**
 * Get the file extension for downloading a sticker.
 */
export function getStickerExtension(format: number): string {
	switch (format) {
		case STICKER_FORMAT.GIF:
			return "gif";
		case STICKER_FORMAT.LOTTIE:
			return "json";
		case STICKER_FORMAT.APNG:
		default:
			return "png";
	}
}

/**
 * Human-readable format label.
 */
export function getStickerFormatLabel(format: number): string {
	switch (format) {
		case STICKER_FORMAT.GIF:
			return "GIF";
		case STICKER_FORMAT.LOTTIE:
			return "LOTTIE";
		case STICKER_FORMAT.APNG:
			return "APNG";
		default:
			return "PNG";
	}
}
