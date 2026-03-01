import joinServer from '@/functions/join-server';
import type { APIRoute } from 'astro';
import DiscordOauth2, { type TokenRequestResult } from "discord-oauth2";
import SendLog from '@/bot/log';
import { db, Users, eq } from "astro:db";
import getAvatarURL from '@/lib/get-avatar-url';
import { DISCORD_BOT_ID, DISCORD_GUILD_ID, DISCORD_SECRET, DISCORD_TOKEN, FAILED_DMS_LOGS_CHANNEL_ID, LOGS_CHANNEL_ID, DOMAIN } from 'astro:env/server';
export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const oauth = new DiscordOauth2({
      clientId: DISCORD_BOT_ID,
      clientSecret: DISCORD_SECRET,
      redirectUri: DOMAIN + "/api/auth",
    });
    let scopes: string[];
    if(cookies.get("scopes")) {
      try{
      scopes = JSON.parse(cookies.get("scopes").value);
      }
      catch(e){
        scopes = ["identify"];
      }
    }
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    console.log(scopes, code);
    let data = await oauth.tokenRequest({
      scope: scopes.join(" "),
      code: code,
      grantType: "authorization_code"
    }) as TokenRequestResult & { expireTimestamp: EpochTimeStamp }; //expireTimestamp isnt available by default, we add it to improve compatibility with our existing old db.
    data.expireTimestamp = Date.now() + data.expires_in * 1000 - 10000;
    const userData = await oauth.getUser(data.access_token);
    const user = (await db.select({ id: Users.id, keys: Users.keys }).from(Users).where(eq(Users.id, userData.id)))[0] as
      {
        id: string,
        keys: {
          _id?: string,
          access_token: string,
          expires_in: number,
          refresh_token: string,
          scope: string,
          expireTimestamp: EpochTimeStamp
        }[]
      };
    if (user) {
      try {
        if (typeof user.keys == "string") user.keys = JSON.parse(user.keys);
      } catch (_) { user.keys = [] }
      //user exists, update the user's keys
      user.keys = user.keys.map(k => {
        if (k._id) delete k._id;
        if (new Date(k.expireTimestamp) < new Date()) //token expired. delete it
          return null;
        return k;
      });
      user.keys = user.keys.filter(k => k !== null);
      //check if any key's scope is less than the current key's scope
      const currentKey = data;
      if (!user.keys.length || user.keys.some(k => k.scope.split(" ").length < currentKey.scope.split(" ").length)) {
        user.keys.push(currentKey);
      }
      await db.update(Users).set({
        keys: user.keys
      }).where(eq(Users.id, userData.id));
      console.log("Saving DB for ", userData.username);
    }
    //user doesnt exist, create a new user
    else {
      await db.insert(Users).values({
        id: userData.id,
        keys: [data],
        added_at: new Date(),
        username: userData.username,
        globalname: userData.global_name,
        accent_color: userData.accent_color,
        discriminator: userData.discriminator,
        avatar: userData.avatar,
        email: userData.email,
        bal: 100,
        bio: "The user doesn't have bio set!",
        banner: userData.banner,
        badges: [],
        votes: [],
        lang: userData.locale || "en-US",
        lastLogin: new Date(),
        nitro: userData.premium_type,
      });
      await SendLog({
        env: { DOMAIN, FAILED_DMS_LOGS_CHANNEL_ID, LOGS_CHANNEL_ID, DISCORD_TOKEN },
        body: {
          title: `${userData.username} account created!`,
          desc: `Hey new user **${userData.global_name}**\nWelcome to Rovel Discord List!\nHere you can add your bots, servers, emojis, find your friends, and earn money to vote for your favourite bot!\nSo let's get started on your new journey on RDL!`,
          owners: userData.id,
          img: getAvatarURL(userData.id, userData.avatar, 128),
          url: `${DOMAIN}/users/${user.id}`,
        }
      })
    }
    await db.update(Users).set({ lastLogin: new Date() }).where(eq(Users.id, userData.id));
    await joinServer({ oauth, token: data.access_token, env: { DISCORD_GUILD_ID, DISCORD_BOT_ID, DISCORD_TOKEN } });
    await SendLog({
      env: { DOMAIN, FAILED_DMS_LOGS_CHANNEL_ID, LOGS_CHANNEL_ID, DISCORD_TOKEN },
      body: {
        title: `${userData.username} logged in!`,
        desc: `Hello ${userData.global_name}!\nWelcome to RDL!`,
        color: "#57F287",
        img: getAvatarURL(userData.id, userData.avatar, 128),
      }
    });
    cookies.set("key", data.access_token, { maxAge: data.expires_in, path: "/" });

    const redirect = cookies.get("redirect")?.value;
    cookies.delete("redirect");
    if (redirect) return new Response(null, { status: 302, headers: { Location: new URL(redirect, DOMAIN).toString() } });
    return new Response(null, { status: 302, headers: { Location: DOMAIN } });
  }
  catch (e) {
    console.log(e);
    return new Response("An error occurred", { status: 500 });
  }
};