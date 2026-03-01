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

import { getClient, getDb, ping, withDb } from './index';
export { getClient, getDb, ping, withDb } from './index';
export type { DrizzleDb } from './index';
export * from './schema';
export * from './queries/helpers';

// Default export provides the most commonly-used runtime helpers for convenience.
export default {
	getClient,
	getDb,
	ping,
	withDb
};
