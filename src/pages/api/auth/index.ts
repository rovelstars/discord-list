import joinServer from '@/functions/join-server';
import type { APIRoute } from 'astro';
import DiscordOauth2 from "discord-oauth2";
import crypto from "node:crypto";
import type { Env } from '@/lib/env';
import SendLog from '@/bot/log';
import getAvatarURL from '@/lib/get-avatar-url';
export const GET: APIRoute = async ({ locals, params, request }) => {
  const env = locals.runtime?.env ?? import.meta.env ?? process.env;
  try {
    const oauth = new DiscordOauth2({
      clientId: env.DISCORD_BOT_ID,
      clientSecret: env.DISCORD_SECRET,
      redirectUri: env.DOMAIN + "/api/auth",
    });
    const url = new URL(request.url);
    let data = await oauth.tokenRequest({
      scope: ["identify", "email", "guilds.join"].join(" "),
      code: url.searchParams.get("code"),
      grantType: "authorization_code"
    });
    const userData = await oauth.getUser(data.access_token);
    await joinServer({ oauth, token: data.access_token, env: env as Env });
    await SendLog({
      env: env as Env,
      body: {
        title: `${userData.username} logged in!`,
        desc: `Hello ${userData.global_name}!\nWelcome to RDL!`,
        color: "#57F287",
        img: getAvatarURL(userData.id, userData.avatar, 128),
      }
    })
    console.log(data, userData);
    return new Response(JSON.stringify(data), {
      headers: {
        "content-type": "application/json"
      }
    });
  }
  catch (e) {
    console.log(e);
    return new Response("An error occurred", { status: 500 });
  }
};