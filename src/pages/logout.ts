import type { APIRoute } from 'astro';
import DiscordOauth2 from "discord-oauth2";
import crypto from "node:crypto";

export const GET: APIRoute = async ({ locals, params, request,cookies }) => {
  const env = locals.runtime?.env ?? import.meta.env ?? process.env;
  try {
    const oauth = new DiscordOauth2({
      clientId: env.DISCORD_BOT_ID,
      clientSecret: env.DISCORD_SECRET,
      redirectUri: env.DOMAIN + "/api/auth",
    });
    const key = cookies.get("key")?.value;
    if(!key) return new Response(null, {
      status: 302,
      headers: {
        "Location": "/",
      },
    });
    cookies.delete("key");
    return new Response(null, {
      status: 302,
      headers: {
        "Location": `/`,
      },
    });
  } catch (e) {
    console.log(e);
    return new Response("An error occurred", { status: 500 });
  }
}