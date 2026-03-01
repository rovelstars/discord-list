
import DiscordOauth2 from "discord-oauth2";
import type { APIRoute } from "astro";
import { DISCORD_BOT_ID, DISCORD_SECRET, DOMAIN } from "astro:env/server";

export const GET: APIRoute = async ({  request, cookies }) => {
  const key = new URL(request.url).searchParams.get("key") ?? request.headers.get("Authorization") ?? request.headers.get("RDL-key") ?? cookies.get("key")?.value;
  if (!key) return new Response(JSON.stringify({ err: "no_key" }), { status: 400, headers: { "Content-Type": "application/json" } });
  const oauth = new DiscordOauth2({
    clientId: DISCORD_BOT_ID,
    clientSecret: DISCORD_SECRET,
    redirectUri: DOMAIN + "/api/auth",
  });
  try {
    const userData = await oauth.getUser(key);
    return new Response(JSON.stringify(userData), { headers: { "Content-Type": "application/json" } });
  } catch {
    cookies.delete("key");
    return new Response(JSON.stringify({ error: "invalid_key" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
}