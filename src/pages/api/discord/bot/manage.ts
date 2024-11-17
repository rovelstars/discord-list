import registerCommands from "@/bot/register";
import unregisterCommands from "@/bot/unregister";

import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, request }) => {
  const url = new URL(request.url);
  const query = url.searchParams;

  if (query.has("register")) {
    await registerCommands();
    return new Response("Registered Commands");
  } else if (query.has("unregister")) {
    await unregisterCommands();
    return new Response("Unregistered Commands");
  }
  return new Response("No query provided");
}