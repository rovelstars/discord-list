/**
 * discord-list/src/routes/api/bots/[id]/slug/+server.ts
 *
 * Placeholder for the slug endpoint.
 *
 * The original Astro implementation had a slug route that:
 *  - validated an access token
 *  - ensured the authenticated user is an owner of the bot
 *  - if `slug` query param provided: validated uniqueness and set the bot.slug
 *  - otherwise returned the current slug
 *
 * This SvelteKit handler intentionally returns 501 "Not Implemented" so callers see
 * a clear, consistent response while the full behavior is implemented later.
 *
 * When you replace this placeholder, implement the following:
 *  - Accept auth token from: query `key`, `Authorization` header, `RDL-key` header, or `key` cookie
 *  - Validate token using Discord OAuth (`discord-oauth2`) and ensure the user exists in `Users`
 *  - Load the bot row from `Bots` by `id` (or slug)
 *  - If the caller is an owner:
 *      - If `slug` provided in query or body: validate slug format, ensure uniqueness, update DB
 *      - Otherwise return { slug: currentSlug }
 *  - Return appropriate error codes for missing token, invalid token, not owner, slug taken, etc.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params }) => {
  if (!params.id) {
    return json({ err: 'missing_bot_id' }, { status: 400 });
  }

  return json(
    {
      err: 'not_implemented',
      message:
        'The slug endpoint is a placeholder. To enable slug inspection/assignment implement ownership checks, slug validation, uniqueness checks and DB updates.'
    },
    { status: 501 }
  );
};

export const POST: RequestHandler = async ({ params }) => {
  if (!params.id) {
    return json({ err: 'missing_bot_id' }, { status: 400 });
  }

  return json(
    {
      err: 'not_implemented',
      message:
        'The slug endpoint is a placeholder. To enable slug assignment implement ownership checks, slug validation, uniqueness checks and DB updates.'
    },
    { status: 501 }
  );
};
