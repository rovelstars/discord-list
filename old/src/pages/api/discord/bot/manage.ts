import registerCommands from "@/bot/register";
import unregisterCommands from "@/bot/unregister";

import type { APIContext, APIRoute } from 'astro';
import { DISCORD_BOT_ID, DISCORD_GUILD_ID, MODE, DISCORD_TOKEN } from "astro:env/server";

export const GET: APIRoute = async ({ request, locals }: { request: Request, locals: any }) => {
  const url = new URL(request.url);
  const query = url.searchParams;

  if (query.has("register")) {
    await registerCommands({ DISCORD_BOT_ID, DISCORD_GUILD_ID, DISCORD_TOKEN, MODE });
    return new Response("Registered Commands");
  } else if (query.has("unregister")) {
    await unregisterCommands({ DISCORD_BOT_ID, DISCORD_GUILD_ID, DISCORD_TOKEN });
    return new Response("Unregistered Commands");
  }
  return new Response("No query provided");
}