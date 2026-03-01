import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import DiscordOauth2 from 'discord-oauth2';
import { env } from '$env/dynamic/private';
import { getDb } from '$lib/db';
import { Bots } from '$lib/schema';
import { inArray } from 'drizzle-orm';

/**
 * GET /api/auth/bots
 *
 * Accepts an access token via:
 *  - query param `key`
 *  - `Authorization` header
 *  - `RDL-key` header
 *  - cookie named `key`
 *
 * Optional query param:
 *  - owner: owner id to filter bots by (array semantics simulated by single value)
 *
 * Returns an array of { id, username } for bots owned by the requested owner(s).
 *
 * This mirrors the behavior of the old Astro endpoint: if no owner param is provided,
 * it falls back to a default owner id used in the original implementation to preserve parity.
 */
export const GET: RequestHandler = async ({ request, cookies }) => {
  const url = new URL(request.url);

  const paramKey = url.searchParams.get('key');
  const headerAuth = request.headers.get('authorization') ?? request.headers.get('RDL-key');
  const cookieKey = cookies.get('key');

  const key = paramKey ?? headerAuth ?? cookieKey;
  if (!key) {
    return json({ err: 'no_key' }, { status: 400 });
  }

  const oauth = new DiscordOauth2({
    clientId: env.DISCORD_BOT_ID,
    clientSecret: env.DISCORD_SECRET,
    redirectUri: (env.DOMAIN ?? '') + '/api/auth'
  });

  try {
    // Validate token by fetching the user. We don't need the user object for the query
    // in the original endpoint; this primarily serves to verify the token is valid.
    await oauth.getUser(String(key));

    const db = getDb();

    // The old implementation searched owners for a fixed id in the example.
    // To preserve original parity we default to that id when no owner param is supplied.
    const ownerParam = url.searchParams.get('owner');
    const ownersToSearch = ownerParam ? [ownerParam] : ['189759562910400512'];

    // Query bots where the owners JSON array contains one of the provided owner ids.
    const bots = await db
      .select({ id: Bots.id, username: Bots.username })
      .from(Bots)
      .where(inArray(Bots.owners, ownersToSearch));

    return json(bots, { status: 200 });
  } catch (e) {
    // Invalid token -> clear cookie and return a uniform error
    try {
      cookies.delete('key', { path: '/' });
    } catch {
      // ignore cookie deletion errors
    }
    return json({ error: 'invalid_key' }, { status: 400 });
  }
};
