import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { ping } from '$lib/db';

/**
 * Simple health-check endpoint to validate DB connectivity.
 *
 * GET /api/dbtest
 * Returns:
 *  - 200 { ok: true } when a minimal query to the DB succeeds
 *  - 500 { ok: false, error: '...' } when there's an error
 *
 * Note: this endpoint must run on the server (SvelteKit server routes).
 * It uses the `ping` helper exported from $lib/db which tries a minimal
 * raw query against the libSQL/Turso client.
 */
export const GET: RequestHandler = async () => {
  try {
    const ok = await ping();
    return json({ ok }, { status: 200 });
  } catch (err) {
    // Return a sanitized error message; keep sensitive details out of responses.
    const message = err instanceof Error ? err.message : String(err);
    return json({ ok: false, error: message }, { status: 500 });
  }
};
