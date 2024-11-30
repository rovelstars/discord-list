import type { APIRoute } from 'astro';
import DiscordOauth2 from "discord-oauth2";
import crypto from "node:crypto";

export const GET: APIRoute = async ({ locals, params, request }) => {
  const noServerScope = new URL(request.url).searchParams.get("servers") === "false";
  const noEmailScope = new URL(request.url).searchParams.get("email") === "false";
  const env = locals.runtime?.env ?? import.meta.env ?? process.env;
  try {
    const oauth = new DiscordOauth2({
      clientId: env.DISCORD_BOT_ID,
      clientSecret: env.DISCORD_SECRET,
      redirectUri: env.DOMAIN + "/api/auth",
    });
    const scopes = ["identify"];
    if (!noEmailScope) scopes.push("email");
    if (!noServerScope) scopes.push("guilds.join");

    const url = oauth.generateAuthUrl({
      scope: scopes.join(" "),
      state: crypto.randomBytes(16).toString("hex"),
      prompt: import.meta.env.PROD ? "none" : "consent",
    });
    console.log(url);
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