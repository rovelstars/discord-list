/**
 * Barrel module for database utilities and schema.
 *
 * Import from "$lib/db" (or the project's configured alias) to access:
 *  - getClient, getDb, ping
 *  - schema objects: Bots, Users, Servers
 *  - query helpers and types (BotSummary, BotDetail, User, etc.)
 *
 * This file intentionally re-exports concrete implementations from the
 * runtime helper (`./index`), the typed schema (`./schema`) and the
 * query helpers (`./queries/helpers`).
 *
 * Keep this file minimal — implementation details live in their own modules.
 */

import { getClient, getDb, ping, withDb } from "./index";
export { getClient, getDb, ping, withDb } from "./index";
export type { DrizzleDb } from "./index";
export * from "./schema";
export * from "./queries/helpers";
export { updateServerSnapshot } from "./queries/index";
export type { ServerDetail, ServerSummary } from "./queries/index";
export {
	listEmojis,
	getEmojiById,
	getEmojisByGuild,
	searchEmojis,
	incrementEmojiDownload,
	getRandomEmojis
} from "./queries/emojis";
export type { EmojiSummary, EmojiDetail } from "./queries/emojis";

export {
	listStickers,
	countStickers,
	getStickerById,
	getStickersByGuild,
	countStickersByGuild,
	incrementStickerDownload,
	syncGuildStickers,
	getRandomStickers,
	getTopStickers,
	getNewestStickers,
	getStickerUrl,
	getStickerExtension,
	getStickerFormatLabel,
	isStickerAnimated,
	STICKER_FORMAT
} from "./queries/stickers";
export type { StickerSummary, StickerDetail, StickerFormatType } from "./queries/stickers";

// Default export provides the most commonly-used runtime helpers for convenience.
export default {
	getClient,
	getDb,
	ping,
	withDb
};
