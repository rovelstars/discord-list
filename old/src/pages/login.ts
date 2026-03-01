import type { APIRoute } from 'astro';
import DiscordOauth2 from "discord-oauth2";
import crypto from "node:crypto";
import { DOMAIN, DISCORD_SECRET, DISCORD_BOT_ID, MODE } from "astro:env/server";

export const GET: APIRoute = async ({ request,cookies }) => {
  const noServerScope = new URL(request.url).searchParams.get("servers") === "false";
  const noEmailScope = new URL(request.url).searchParams.get("email") === "false";
  try {
    const oauth = new DiscordOauth2({
      clientId: DISCORD_BOT_ID,
      clientSecret: DISCORD_SECRET,
      redirectUri: DOMAIN + "/api/auth",
    });
    const scopes = ["identify"];
    if (!noEmailScope) scopes.push("email");
    if (!noServerScope) scopes.push("guilds.join");
    //save cookie for scopes used
    cookies.set("scopes", JSON.stringify(scopes), { path: "/" });
    const url = oauth.generateAuthUrl({
      scope: scopes.join(" "),
      state: crypto.randomBytes(16).toString("hex"),
      prompt: MODE == "production" ? "none" : "consent",
    });
    //redirect to the url
    return new Response(null, {
      status: 302,
      headers: {
        "Location": url,
      },
    });
  }
  catch (e) {
    console.log(e);
    return new Response("An error occurred", { status: 500 });
  }
};