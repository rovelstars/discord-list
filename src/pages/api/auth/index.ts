import joinServer from '@/functions/join-server';
import type { APIRoute } from 'astro';
import DiscordOauth2 from "discord-oauth2";
import crypto from "node:crypto";
import type { Env } from '@/lib/env';
import SendLog from '@/bot/log';
import { db, Users, eq } from "astro:db";
import getAvatarURL from '@/lib/get-avatar-url';
export const GET: APIRoute = async ({ locals, params, request, cookies }) => {
  const env = locals.runtime?.env ?? import.meta.env ?? process.env;
  console.log(env);
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
    const user = (await db.select({ id: Users.id }).from(Users).where(eq(Users.id, userData.id)))[0];
    if (!user) console.log("User doesnt exists in DB");
    // const refreshToken = await oauth.tokenRequest({
    //   scope: ["identify", "email", "guilds.join"].join(" "),
    //   refreshToken: data.refresh_token,
    //   grantType: "refresh_token"
    // });
    // console.log(refreshToken);
    await joinServer({ oauth, token: data.access_token, env: env as Env });
    await SendLog({
      env: env as Env,
      body: {
        title: `${userData.username} logged in!`,
        desc: `Hello ${userData.global_name}!\nWelcome to RDL!`,
        color: "#57F287",
        img: getAvatarURL(userData.id, userData.avatar, 128),
      }
    });
    cookies.set("key", data.access_token, { httpOnly: true, maxAge: 90 * 3600 * 24 * 1000, path:"/" });
    console.log(data, userData);
    const redirect = cookies.get("redirect")?.value;
    cookies.delete("redirect");
    if (redirect) return new Response(null, { status: 302, headers: { Location: new URL(redirect, env.DOMAIN).toString() } });
    return new Response(null, { status: 302, headers: { Location: env.DOMAIN } });
  }
  catch (e) {
    console.log(e);
    return new Response("An error occurred", { status: 500 });
  }
};