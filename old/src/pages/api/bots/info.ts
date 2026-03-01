//This route takes bot's code via Authorization headers or query and returns the bot's info.

import type { APIRoute } from "astro";
import {db, Bots, eq} from "astro:db";

export const GET: APIRoute = async ({ params, request })=> {
  const bot = await db.select({
    id: Bots.id,
    username: Bots.username,
    short: Bots.short,
    avatar: Bots.avatar,
    votes: Bots.votes,
    servers: Bots.servers,
    added_at: Bots.added_at
  }).from(Bots).where(eq(Bots.code, request.headers.get("Authorization") || params.code));
  return new Response(JSON.stringify(bot), {
    headers: {
      "content-type": "application/json"
    }
  });
}