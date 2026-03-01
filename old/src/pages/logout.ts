import SendLog from '@/bot/log';
import getAvatarURL from '@/lib/get-avatar-url';
import type { APIRoute } from 'astro';
import { DISCORD_BOT_ID, DISCORD_SECRET, DISCORD_TOKEN, DOMAIN, FAILED_DMS_LOGS_CHANNEL_ID, LOGS_CHANNEL_ID } from 'astro:env/server';
import DiscordOauth2 from "discord-oauth2";
import crypto from "node:crypto";

export const GET: APIRoute = async ({ cookies }) => {

  try {
    const oauth = new DiscordOauth2({
      clientId: DISCORD_BOT_ID,
      clientSecret: DISCORD_SECRET,
      redirectUri: DOMAIN + "/api/auth",
    });
    const key = cookies.get("key")?.value;
    if (!key) return new Response(null, {
      status: 302,
      headers: {
        "Location": "/",
      },
    });
    if (key) {
      try {
        const user = await oauth.getUser(key);
        await SendLog({
          env: {
            LOGS_CHANNEL_ID,
            FAILED_DMS_LOGS_CHANNEL_ID,
            DISCORD_TOKEN,
            DOMAIN,
          },
          body: {
            title: `${user.username} logged out!`,
            desc: `Bye bye ${user.username}! We hope to see you soon!`,
            img: getAvatarURL(user.id, user.avatar, 128),
            color: "#ED4245",
          }
        })
      } catch (e) { };
    }
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