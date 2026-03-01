/**
 * Compatibility re-export for schema
 *
 * Many files in the repo import the Drizzle schema from "$lib/schema".
 * The canonical schema was moved to "$lib/db/schema". This file re-exports
 * the schema symbols so existing imports keep working.
 *
 * Do not add runtime logic here — this is purely a compile-time/type re-export.
 */

export { Bots, Users, Servers } from './db/schema';
export type { /* re-export schema types if needed */ } from './db/schema';
