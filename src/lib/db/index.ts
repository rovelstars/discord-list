/**
 * Centralized DB helper for LibSQL (Turso) + Drizzle integration.
 *
 * This file is the refactored, minimal runtime wrapper:
 * - Lazily creates a single libsql client and a Drizzle instance on demand.
 * - Reads connection info from SvelteKit server env at runtime.
 * - Exposes `getClient`, `getDb` and `ping` helpers for server-only code.
 * - Automatically resets stale singletons and retries once on connection errors
 *   (common with libsql:// WebSocket connections that go idle and drop).
 *
 * Notes:
 * - Keep this module server-only. Don't import it from client/browser code.
 */

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { env } from '$env/dynamic/private';

type LibSQLClient = ReturnType<typeof createClient>;
export type DrizzleDb = ReturnType<typeof drizzle>;

// Read DB URL + optional auth token from server env.
// Supports multiple environment variable names for backwards compatibility.
function readEnv() {
	const url = env.ASTRO_DB_REMOTE_URL ?? env.DATABASE_URL ?? null;
	const token = env.ASTRO_DB_APP_TOKEN ?? env.TURSO_TOKEN ?? undefined;
	return { url, token };
}

// Module-level singletons (lazy init, reset on connection failure)
let libsqlClient: LibSQLClient | null = null;
let drizzleDb: DrizzleDb | null = null;

/**
 * Destroy and null out both singletons so the next call to getClient/getDb
 * creates a fresh connection. Called automatically when a query error looks
 * like a dead WebSocket or closed transport.
 */
function resetSingletons() {
	try {
		libsqlClient?.close?.();
	} catch {
		// ignore errors from closing an already-dead client
	}
	libsqlClient = null;
	drizzleDb = null;
}

/**
 * Heuristic: does this error look like a dropped/closed connection rather than
 * a real query error (syntax, constraint, etc.)?
 *
 * libsql surfaces these as generic Error objects whose message contains phrases
 * like "WebSocket", "closed", "CLOSED", "stream", "connection", "network", etc.
 */
function isConnectionError(err: unknown): boolean {
	if (!(err instanceof Error)) return false;
	const msg = err.message.toLowerCase();
	return (
		msg.includes('websocket') ||
		msg.includes('closed') ||
		msg.includes('connection') ||
		msg.includes('network') ||
		msg.includes('stream') ||
		msg.includes('econnreset') ||
		msg.includes('socket hang up') ||
		msg.includes('failed to fetch') ||
		msg.includes('transport')
	);
}

/**
 * Return (and lazily create) the libsql client.
 * Throws a helpful error when no DB URL is configured.
 */
export function getClient(): LibSQLClient {
	if (libsqlClient) return libsqlClient;

	const { url, token } = readEnv();
	if (!url) {
		throw new Error(
			'Missing database URL. Set ASTRO_DB_REMOTE_URL or DATABASE_URL in server environment.'
		);
	}

	libsqlClient = createClient({ url, authToken: token });
	return libsqlClient;
}

/**
 * Return (and lazily create) the Drizzle instance bound to the libsql client.
 */
export function getDb(): DrizzleDb {
	if (drizzleDb) return drizzleDb;
	const client = getClient();
	drizzleDb = drizzle(client);
	return drizzleDb;
}

/**
 * Execute a database operation with automatic retry on connection errors.
 *
 * If the callback throws an error that looks like a stale/dead WebSocket
 * connection, the singletons are reset and the callback is retried exactly
 * once with a freshly created client. Any other error (or a second failure)
 * is rethrown normally.
 *
 * Usage:
 *   const rows = await withDb((db) => db.select().from(Bots).limit(20));
 */
export async function withDb<T>(fn: (db: DrizzleDb) => Promise<T>): Promise<T> {
	try {
		return await fn(getDb());
	} catch (firstErr) {
		if (!isConnectionError(firstErr)) throw firstErr;

		// Stale connection — reset and retry once with a fresh client
		console.warn('[db] Connection error detected, reconnecting…', (firstErr as Error).message);
		resetSingletons();

		try {
			return await fn(getDb());
		} catch (secondErr) {
			console.error('[db] Retry also failed:', secondErr);
			throw secondErr;
		}
	}
}

/**
 * Lightweight connectivity check.
 * Returns `true` when the DB appears reachable, `false` otherwise.
 */
export async function ping(): Promise<boolean> {
	try {
		await withDb((db) => (db as any).run?.('SELECT 1') ?? Promise.resolve());
		return true;
	} catch {
		return false;
	}
}
