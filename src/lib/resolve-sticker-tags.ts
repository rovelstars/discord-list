/**
 * Shared server-only utility for resolving sticker tag strings into typed
 * tokens, including looking up custom emoji IDs against our database.
 *
 * A sticker's `tags` field is a comma-separated string where each token is:
 *   - A unicode emoji or plain text  (e.g. "😄", "wave")
 *   - A Discord snowflake ID         (e.g. "783358486275817472") — a custom
 *     emoji that the guild owner chose as the sticker's autocomplete tag.
 *
 * This module is SERVER-ONLY. It imports from $lib/db and must never be
 * imported from a .svelte component or any client-side module.
 */

import { getEmojisByIds } from "$lib/db/queries/emojis";
import type { EmojiSummary } from "$lib/db/queries/emojis";

// ---------------------------------------------------------------------------
// Types (re-exported so pages and components can share them)
// ---------------------------------------------------------------------------

export type ResolvedTagText = {
	type: "text";
	value: string;
};

export type ResolvedTagCustomEmoji = {
	type: "custom_emoji";
	id: string;
	/** null when the ID isn't in our Emojis table */
	emoji: EmojiSummary | null;
};

export type ResolvedTag = ResolvedTagText | ResolvedTagCustomEmoji;

// ---------------------------------------------------------------------------
// Snowflake detection
// ---------------------------------------------------------------------------

/** Discord snowflakes are 17–20 digit unsigned integers. */
const SNOWFLAKE_RE = /^\d{17,20}$/;

export function isSnowflake(token: string): boolean {
	return SNOWFLAKE_RE.test(token);
}

// ---------------------------------------------------------------------------
// Core resolver
// ---------------------------------------------------------------------------

/**
 * Parse a raw sticker tags string and resolve any custom emoji snowflake IDs
 * against the database in a single batched query.
 *
 * Returns an empty array when `tags` is null/empty.
 *
 * @param tags  The raw `sticker.tags` value (comma-separated string or null).
 */
export async function resolveStickerTags(tags: string | null | undefined): Promise<ResolvedTag[]> {
	if (!tags?.trim()) return [];

	const tokens = tags
		.split(",")
		.map((t) => t.trim())
		.filter(Boolean);

	if (!tokens.length) return [];

	// Collect every token that looks like a snowflake so we can batch-fetch.
	const snowflakeIds = tokens.filter(isSnowflake);

	// One DB round-trip for all custom emoji IDs at once.
	let emojiMap: Map<string, EmojiSummary> = new Map();
	if (snowflakeIds.length > 0) {
		try {
			emojiMap = await getEmojisByIds(snowflakeIds);
		} catch (err) {
			// Non-fatal — fall back to rendering unknown chips for all snowflakes.
			console.warn("[resolve-sticker-tags] Emoji batch lookup failed (non-fatal):", err);
		}
	}

	return tokens.map((token): ResolvedTag => {
		if (isSnowflake(token)) {
			return {
				type: "custom_emoji",
				id: token,
				emoji: emojiMap.get(token) ?? null
			};
		}
		return { type: "text", value: token };
	});
}

// ---------------------------------------------------------------------------
// Bulk resolver for sticker lists (e.g. listing page with 48 cards)
// ---------------------------------------------------------------------------

/**
 * Resolve tags for multiple stickers in one database round-trip.
 *
 * Collects every unique snowflake ID across all stickers' tags, fetches them
 * in a single batched query, then maps results back per sticker.
 *
 * @param stickers  Array of objects that have an `id` and `tags` field.
 * @returns         A Map keyed by sticker id → ResolvedTag[].
 */
export async function resolveStickerTagsBulk(
	stickers: Array<{ id: string; tags: string | null }>
): Promise<Map<string, ResolvedTag[]>> {
	const result = new Map<string, ResolvedTag[]>();
	if (!stickers.length) return result;

	// 1. Parse every sticker's tags into raw token arrays (no DB yet).
	type ParsedEntry = { stickerId: string; tokens: string[] };
	const parsed: ParsedEntry[] = stickers.map((s) => ({
		stickerId: s.id,
		tokens: s.tags
			? s.tags
					.split(",")
					.map((t) => t.trim())
					.filter(Boolean)
			: []
	}));

	// 2. Collect the union of all snowflake IDs across every sticker.
	const allSnowflakes = new Set<string>();
	for (const { tokens } of parsed) {
		for (const t of tokens) {
			if (isSnowflake(t)) allSnowflakes.add(t);
		}
	}

	// 3. One DB round-trip for all of them.
	let emojiMap: Map<string, EmojiSummary> = new Map();
	if (allSnowflakes.size > 0) {
		try {
			emojiMap = await getEmojisByIds([...allSnowflakes]);
		} catch (err) {
			console.warn("[resolve-sticker-tags] Bulk emoji lookup failed (non-fatal):", err);
		}
	}

	// 4. Build per-sticker resolved tag arrays.
	for (const { stickerId, tokens } of parsed) {
		const resolvedTags: ResolvedTag[] = tokens.map((token): ResolvedTag => {
			if (isSnowflake(token)) {
				return {
					type: "custom_emoji",
					id: token,
					emoji: emojiMap.get(token) ?? null
				};
			}
			return { type: "text", value: token };
		});
		result.set(stickerId, resolvedTags);
	}

	return result;
}
