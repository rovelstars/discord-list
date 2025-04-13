import type { APIRoute } from "astro";
import { db, Bots, Users, eq, or } from "astro:db";
import DiscordOauth2 from "discord-oauth2";
import { formSchema as BotFormSchema } from "@/components/bot-form-schema";
import { DISCORD_BOT_ID, DISCORD_SECRET, DISCORD_TOKEN, DOMAIN, FAILED_DMS_LOGS_CHANNEL_ID, LOGS_CHANNEL_ID, SELFBOT_TOKEN } from "astro:env/server";
import type { Bot } from "@/components/bot-card";
import isValidHttpUrl from "@/functions/valid-url";
import { GET as UpdateBotInfo } from "@/pages/api/internals/update/bot/[id]";
import UserAccountFetch from "@/functions/user-bot";
import SendLog from "@/bot/log";
import getAvatarURL from "@/lib/get-avatar-url";


export const POST: APIRoute = async ({ params, request, cookies }) => {
  /* START USER AUTH */
  const key = new URL(request.url).searchParams.get("key") ?? request.headers.get("Authorization") ?? request.headers.get("RDL-key") ?? cookies.get("key")?.value;
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

  const body = await request.json();
  const validation = BotFormSchema.safeParse(body);
  if (!validation.success) return new Response(JSON.stringify({ err: validation.error.errors[0].message }), { status: 400, headers: { "Content-Type": "application/json" } });

  if (body.slug) {
    const slug = await db.select({ id: Bots.id }).from(Bots).where(eq(Bots.slug, body.slug)).limit(1);
    if (slug.length > 0) return new Response(JSON.stringify({ err: "slug_taken" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  //if owners are changed, check if the user is the index 0 of the owners array. if not, he is not the main owner, hence cant modify the owners
  if (!Array.isArray(body.owners)) return new Response(JSON.stringify({ err: "owners_not_array" }), { status: 400, headers: { "Content-Type": "application/json" } });
  if (body.owners[0] !== userData.id) return new Response(JSON.stringify({ err: "main_owner_cant_be_changed" }), { status: 403, headers: { "Content-Type": "application/json" } });


  if (body.webhook) {
    if (!isValidHttpUrl(body.webhook)) return new Response(JSON.stringify({ err: "invalid_webhook" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  if (body.source_repo) {
    if (!isValidHttpUrl(body.source_repo)) return new Response(JSON.stringify({ err: "invalid_source_repo" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  if (body.website) {
    if (!isValidHttpUrl(body.website)) return new Response(JSON.stringify({ err: "invalid_website" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  if (body.donate) {
    if (!isValidHttpUrl(body.donate)) return new Response(JSON.stringify({ err: "invalid_donate" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  if (body.bg) {
    if (!isValidHttpUrl(body.bg)) return new Response(JSON.stringify({ err: "invalid_bg" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  if (body.invite) {
    if (!isValidHttpUrl(body.invite)) return new Response(JSON.stringify({ err: "invalid_invite" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  if (body.support) {
    if (isValidHttpUrl(body.support)) {
      body.support = new URL(body.support)
      if (body.support.hostname == "discord.gg") body.support = body.support.pathname.slice(1);
      else if (body.support.hostname == "discord.com") body.support = body.support.pathname.split("/")[2];
      else return new Response(JSON.stringify({ err: "invalid_support" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    //bot.support is just the invite code now. perfect for the discord api
    const apiData = await fetch(`https://discord.com/api/invites/${body.support}`).then((res) => res.json());
    if (apiData.message == "Unknown Invite") return new Response(JSON.stringify({ err: "expired_support" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

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

  //finally, create a new bot
  await db.insert(Bots).values({
    id: id,
    slug: body.slug.toLowerCase(),
    owners: body.owners,
    username: botInfo.bot.username,
    discriminator: botInfo.bot.discriminator,
    avatar: botInfo.bot.avatar || "0",
    servers: botInfo.bot.approximate_guild_count,
    tags: body.tags || [],
    invite: body.invite || "",
    desc: body.desc || "",
    source_repo: body.source_repo || "",
    support: body.support || "",
    website: body.website || "",
    webhook: body.webhook || "",
    donate: body.donate || "",
    bg: body.bg || "",
    lib: body.lib || "",
    prefix: body.prefix || "",
    short: body.short || "",
    votes: 0,
    approved: false,
    badges: [],
    promoted: false,
    opted_coins: body.opted_coins || false,
  });

  await SendLog({

    env: { DOMAIN, FAILED_DMS_LOGS_CHANNEL_ID, LOGS_CHANNEL_ID, DISCORD_TOKEN },
    body: {
      title: `Bot ${botInfo.bot.username} Added!`,
      desc: `Bot ${botInfo.bot.username}#${botInfo.bot.discriminator} has been added by ${userData.global_name} (<@!${body.owners[0]}>)!`,
      color: "#57F287",
      img: getAvatarURL(botInfo.bot.id, botInfo.bot.avatar)
    }
  })

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
};