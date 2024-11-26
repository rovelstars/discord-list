import registerCommands from "@/bot/register";
import unregisterCommands from "@/bot/unregister";

import type { APIContext, APIRoute } from 'astro';

export const GET: APIRoute = async ({ request, locals }: { request: Request, locals: any }) => {
  const {env} = locals.runtime || import.meta;
  const url = new URL(request.url);
  const query = url.searchParams;

  if (query.has("register")) {
    await registerCommands(env);
    return new Response("Registered Commands");
  } else if (query.has("unregister")) {
    await unregisterCommands(env);
    return new Response("Unregistered Commands");
  }
  return new Response("No query provided");
}