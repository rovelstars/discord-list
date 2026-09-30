/**
 * Centralized DB helper for LibSQL (Turso) + Drizzle integration.
 *
 * This file is the refactored, minimal runtime wrapper:
 * - Lazily creates a single libsql client and a Drizzle instance on demand.
 * - Reads connection info from SvelteKit server env at runtime.
 * - Exposes `getClient`, `getDb` and `ping` helpers for server-only code.
 * - Automatically resets stale singletons and retries up to 3x with backoff
 *   on transient transport failures (Turso HTTP 429/5xx, dropped WebSocket,
 *   network blips).
 *
 * Notes:
 * - Keep this module server-only. Don't import it from client/browser code.
 */

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { env } from "$env/dynamic/private";

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
 * Heuristic: does this error look like a transient transport failure (dropped
 * WebSocket, Turso HTTP 429/5xx, network blip) rather than a real query error
 * (syntax, constraint, etc.)?
 *
 * Background: @libsql/hrana-client@0.9.0 (via cross-fetch/node-fetch) crashed
 * in `errorFromResponse` with `TypeError: resp.body?.cancel is not a function`
 * whenever Turso returned a non-JSON/text HTTP error, masking the real status.
 * We upgraded to @libsql/client@0.18.0 (hrana-client@0.10.0, native fetch) so
 * new deploys surface a proper `HttpServerError` instead — but old bundles,
 * CDN-cached renders, and any future transport regression still produce the
 * TypeError shape, so it must keep matching here.
 *
 * Drizzle wraps every query failure with `new Error("Failed query: ...",
 * { cause })`, so we walk the Error.cause chain. HttpServerError also carries
 * a numeric `.status`, which we check directly (429 + 5xx = transient).
 */
function isTransientError(err: unknown): boolean {
	const seen = new Set<unknown>();
	let cur: unknown = err;
	while (cur && !seen.has(cur)) {
		seen.add(cur);
		if (cur instanceof Error) {
			// Numeric status on Hrana HttpServerError (or a fetch Response error).
			const status = (cur as Error & { status?: unknown }).status;
			if (typeof status === "number" && (status === 429 || status >= 500)) {
				return true;
			}
			const name = cur.name.toLowerCase();
			if (name.includes("httpservererror")) {
				// No numeric status attached — treat as transient; a real 4xx
				// from Turso (auth, bad request) still gets retried at most
				// twice with backoff, which is harmless and self-healing.
				return true;
			}
			const msg = cur.message.toLowerCase();
			if (
				msg.includes("websocket") ||
				msg.includes("closed") ||
				msg.includes("connection") ||
				msg.includes("network") ||
				msg.includes("stream") ||
				msg.includes("econnreset") ||
				msg.includes("socket hang up") ||
				msg.includes("failed to fetch") ||
				msg.includes("transport") ||
				msg.includes("timed out") ||
				msg.includes("timeout") ||
				msg.includes("hyper") ||
				// hrana-client@0.9.0 masking bug (see docblock above)
				msg.includes("cancel is not a function") ||
				msg.includes("resp.body") ||
				msg.includes("hrana") ||
				msg.includes("httpservererror") ||
				msg.includes("server returned http status") ||
				msg.includes("too many requests") ||
				msg.includes("rate limit") ||
				msg.includes("rate_limited") ||
				msg.includes("service unavailable") ||
				msg.includes("bad gateway") ||
				msg.includes("gateway timeout") ||
				msg.includes("internal server error") ||
				// Bare status codes surfacing inside LibsqlError messages
				// ("HTTP 429", "status 503", ...). Checked as substrings on
				// the lowercased message; real query errors never contain these.
				msg.includes(" 429") ||
				msg.includes(" 500") ||
				msg.includes(" 502") ||
				msg.includes(" 503") ||
				msg.includes(" 504")
			) {
				return true;
			}
			cur = (cur as Error & { cause?: unknown }).cause;
		} else {
			break;
		}
	}
	return false;
}

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
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
			"Missing database URL. Set ASTRO_DB_REMOTE_URL or DATABASE_URL in server environment."
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
 * Execute a database operation with automatic retry on transient failures.
 *
 * Turso over HTTP throws on 429/5xx edge blips that clear on their own, so a
 * single attempt turns a momentary spike into a user-facing 500 + webhook
 * spam. We retry up to MAX_ATTEMPTS with exponential backoff + jitter,
 * resetting the singletons (stale baton/WebSocket) before each retry. Any
 * non-transient error (syntax, constraint, auth) or the final failure is
 * rethrown normally.
 *
 * Usage:
 *   const rows = await withDb((db) => db.select().from(Bots).limit(20));
 */
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 250;

export async function withDb<T>(fn: (db: DrizzleDb) => Promise<T>): Promise<T> {
	let lastErr: unknown = null;
	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		try {
			return await fn(getDb());
		} catch (err) {
			lastErr = err;
			if (!isTransientError(err) || attempt === MAX_ATTEMPTS) throw err;

			// Transient blip - reset (clears stale baton/socket) and back off.
			console.warn(
				`[db] Transient error (attempt ${attempt}/${MAX_ATTEMPTS}), retrying…`,
				(err as Error).message
			);
			resetSingletons();
			const backoff = BASE_DELAY_MS * 2 ** (attempt - 1);
			const jitter = backoff * (0.7 + Math.random() * 0.6);
			await sleep(jitter);
		}
	}
	throw lastErr;
}

/**
 * Lightweight connectivity check.
 * Returns `true` when the DB appears reachable, `false` otherwise.
 */
export async function ping(): Promise<boolean> {
	try {
		await withDb((db) => (db as any).run?.("SELECT 1") ?? Promise.resolve());
		return true;
	} catch {
		return false;
	}
}
