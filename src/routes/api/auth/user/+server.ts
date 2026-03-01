import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import DiscordOauth2 from 'discord-oauth2';
import { env } from '$env/dynamic/private';

/**
 * GET /api/auth/user
 *
 * Accepts an access token via:
 *  - query param `key`
 *  - `Authorization` header
 *  - `RDL-key` header
 *  - cookie named `key`
 *
 * Returns Discord's user object for the token or a 400 with { err: 'no_key' } / { error: 'invalid_key' }.
 */
export const GET: RequestHandler = async ({ request, cookies }) => {
  const url = new URL(request.url);
  const paramKey = url.searchParams.get('key');

  // Accept either Authorization / RDL-key (case-insensitive) or cookie
  const headerAuth = request.headers.get('authorization') ?? request.headers.get('RDL-key') ?? request.headers.get('rDL-key');
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
    const userData = await oauth.getUser(String(key));
    return json(userData, { status: 200 });
  } catch (e) {
    // Invalid token -> clear cookie and return error
    try {
      cookies.delete('key', { path: '/' });
    } catch {
      // ignore cookie deletion errors
    }
    return json({ error: 'invalid_key' }, { status: 400 });
  }
};
