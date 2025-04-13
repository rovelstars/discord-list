import type { APIRoute } from "astro";
import { db, Bots, Users, eq, or } from "astro:db";
import DiscordOauth2 from "discord-oauth2";
import { formSchema as BotFormSchema } from "@/components/bot-form-schema";
import { DISCORD_BOT_ID, DISCORD_SECRET, DISCORD_TOKEN, DOMAIN, FAILED_DMS_LOGS_CHANNEL_ID, LOGS_CHANNEL_ID, SELFBOT_TOKEN, TOPTOKEN } from "astro:env/server";
import type { Bot } from "@/components/bot-card";
import isValidHttpUrl from "@/functions/valid-url";
import { GET as UpdateBotInfo } from "@/pages/api/internals/update/bot/[id]";
import UserAccountFetch from "@/functions/user-bot";
import SendLog from "@/bot/log";
import getAvatarURL from "@/lib/get-avatar-url";


export const GET: APIRoute = async ({ params, request, cookies }) => {
  /* START USER AUTH */
  const key = new URL(request.url).searchParams.get("key") ?? request.headers.get("Authorization") ?? request.headers.get("RDL-key") ?? cookies.get("key")?.value;
  const type = new URL(request.url).searchParams.get("type");
  //get id from params, and code from query or authentification header
  const id = params.id;
  if (!key) return new Response(JSON.stringify({ err: "not_logged_in" }), { status: 400, headers: { "Content-Type": "application/json" } });
  const oauth2 = new DiscordOauth2({
    clientId: DISCORD_BOT_ID,
    clientSecret: DISCORD_SECRET,
    redirectUri: DOMAIN + "/api/auth",
  });
  const userData = await oauth2.getUser(key);
  const user = (await db.select({ bal: Users.bal, votes: Users.votes }).from(Users).where(eq(Users.id, userData.id)))[0] as { bal: number, votes: { bot: string, at: number }[] };
  if (!user) return new Response(JSON.stringify({ err: "invalid_key" }), { status: 400, headers: { "Content-Type": "application/json" } });
  /* END USER AUTH */

  const botInfo = await UserAccountFetch(
    `/oauth2/authorize?client_id=${id}&scope=bot`,
    { SELFBOT_TOKEN },
  );

  if (botInfo.code == 50010 ||
    botInfo.code == 10002 ||
    botInfo.code == 10013 ||
    botInfo.code == 20026) {
    return new Response(JSON.stringify({ err: "invalid_bot" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  if (!botInfo.bot.bot) {
    return new Response(JSON.stringify({ err: "bot_is_user" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  let importedBot: Bot | undefined = undefined;
  if (type == "topgg") {
    const bot = (await fetch(`https://top.gg/api/bots/${params.id}`, {
      method: "GET",
      headers: {
      Authorization: TOPTOKEN.split("|").map(x => x.trim())[Math.floor(Math.random() * TOPTOKEN.split("|").length)],
      },
    }).then(res => res.json()));
    console.log(bot);
    if (bot.error)
      return new Response(JSON.stringify({
        err: bot.error.toLowerCase().split(" ").join("_"),
      }), { status: 400, headers: { "Content-Type": "application/json" } });

    if (bot.message)
      return new Response(JSON.stringify({
        err: bot.message.toLowerCase().split(" ").join("_"),
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    if (!bot.owners.includes(userData.id)) {
      return new Response(JSON.stringify({ err: "not_owner" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    importedBot = {
      id: bot.id,
      username: botInfo.bot.username,
      discriminator: botInfo.bot.discriminator,
      avatar: botInfo.bot.avatar || "0",
      servers: botInfo.bot.approximate_guild_count,
      lib: bot.lib == "" ? "none" : bot.lib,
      prefix: bot.prefix,
      short: bot.shortdesc,
      desc: bot.longdesc,
      support: bot.support,
      bg: bot.bannerUrl,
      owners: bot.owners,
      invite: bot.invite,
      source_repo: bot.github,
      website: bot.website,
    };
  }


  //finally, create a new bot
  if (importedBot) {
    await db.insert(Bots).values({
      id: importedBot.id,
      slug: importedBot.id,
      owners: importedBot.owners,
      username: importedBot.username,
      discriminator: importedBot.discriminator,
      avatar: importedBot.avatar || "0",
      servers: importedBot.servers,
      tags: [],
      invite: importedBot.invite || "",
      desc: importedBot.desc || "",
      source_repo: importedBot.source_repo || "",
      support: importedBot.support || "",
      website: importedBot.website || "",
      webhook: "",
      donate: "",
      bg: importedBot.bg || "",
      lib: importedBot.lib || "",
      prefix: importedBot.prefix || "",
      short: importedBot.short || "",
      votes: 0,
      approved: false,
      promoted: false,
      opted_coins: false,
      badges: [],
    });
  }
  await SendLog({

    env: { DOMAIN, FAILED_DMS_LOGS_CHANNEL_ID, LOGS_CHANNEL_ID, DISCORD_TOKEN },
    body: {
      title: `Bot ${botInfo.bot.username} Imported!`,
      desc: `Bot ${botInfo.bot.username}#${botInfo.bot.discriminator} has been imported by ${userData.global_name} (<@!${userData.id}>) from ${type == "topgg" ? "Top.gg" : (type == "void" ? "Void Bots" : "nowhere?!")}!`,
      color: "#57F287",
      img: getAvatarURL(botInfo.bot.id, botInfo.bot.avatar)
    }
  })

  return Response.redirect(`${DOMAIN}/bots/${botInfo.bot.id}`, 302);
};