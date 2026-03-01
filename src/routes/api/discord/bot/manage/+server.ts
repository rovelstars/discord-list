import type { RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import registerCommands from '@/bot/register';
import unregisterCommands from '@/bot/unregister';

/**
 * GET /api/discord/bot/manage
 *
 * Query flags:
 *  - ?register  -> register guild/global commands (legacy behavior)
 *  - ?unregister -> unregister commands
 *
 * This endpoint is intended for administrative use. It invokes the bot command
 * registration helpers included in the repository. It returns a plain text
 * response describing the outcome.
 */
export const GET: RequestHandler = async ({ url }) => {
  const query = url.searchParams;

  try {
    if (query.has('register')) {
      await registerCommands({
        DISCORD_BOT_ID: env.DISCORD_BOT_ID ?? '',
        DISCORD_GUILD_ID: env.DISCORD_GUILD_ID ?? '',
        DISCORD_TOKEN: env.DISCORD_TOKEN ?? '',
        MODE: env.MODE ?? ''
      });
      return new Response('Registered Commands', { status: 200 });
    } else if (query.has('unregister')) {
      await unregisterCommands({
        DISCORD_BOT_ID: env.DISCORD_BOT_ID ?? '',
        DISCORD_GUILD_ID: env.DISCORD_GUILD_ID ?? '',
        DISCORD_TOKEN: env.DISCORD_TOKEN ?? ''
      });
      return new Response('Unregistered Commands', { status: 200 });
    }

    return new Response('No query provided', { status: 200 });
  } catch (err) {
    console.error('/api/discord/bot/manage error:', err);
    return new Response('server_error', { status: 500 });
  }
};
