import type { APIRoute } from 'astro';
import DiscordOauth2 from "discord-oauth2";
import crypto from "node:crypto";

export const GET: APIRoute = async ({ locals, params, request }) => {
  const { env } = locals.runtime || import.meta;
  try {
    const oauth = new DiscordOauth2({
      clientId: env.DISCORD_BOT_ID,
      clientSecret: env.DISCORD_SECRET,
      redirectUri: env.DOMAIN + "/api/auth",
    });
    const url = oauth.generateAuthUrl({
      scope: ["identify", "email","guilds.join"].join(" "),
      state: crypto.randomBytes(16).toString("hex"),
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