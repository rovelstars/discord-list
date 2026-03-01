/**
 * Top-level DB barrel for "$lib/db"
 *
 * This file re-exports the canonical DB runtime helpers, schema and query helpers
 * that live under "./db/*". Importing from "$lib/db" (or the repo alias)
 * provides a single, stable entrypoint for server code:
 *
 *  import { getDb, getClient, ping, Bots, getTopBots } from '$lib/db';
 *
 * Notes:
 * - This module is a light re-export only; keep runtime initialization inside
 *   the implementation modules under "./db".
 * - Only use these helpers from server-side code (routes, server modules).
 */
export * from './db/exports';
export { default } from './db/exports';
