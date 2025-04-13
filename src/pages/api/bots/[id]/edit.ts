import type { APIRoute } from "astro";
import { db, Bots, Users, eq, or } from "astro:db";
import DiscordOauth2 from "discord-oauth2";
import { formSchema as BotFormSchema } from "@/components/bot-form-schema";
import { DISCORD_BOT_ID, DISCORD_SECRET, DOMAIN, FAILED_DMS_LOGS_CHANNEL_ID, LOGS_CHANNEL_ID } from "astro:env/server";
import type { Bot } from "@/components/bot-card";
import isValidHttpUrl from "@/functions/valid-url";
import { GET as UpdateBotInfo } from "@/pages/api/internals/update/bot/[id]";


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

  const bot: Bot = (await db.select({
    id: Bots.id,
    slug: Bots.slug,
    avatar: Bots.avatar,
    username: Bots.username,
    discriminator: Bots.discriminator,
    short: Bots.short,
    invite: Bots.invite,
    bg: Bots.bg,
    owners: Bots.owners,
    lib: Bots.lib,
    prefix: Bots.prefix,
    desc: Bots.desc,
    source_repo: Bots.source_repo,
    support: Bots.support,
    website: Bots.website,
    webhook: Bots.webhook,
    donate: Bots.donate,
  }).from(Bots).where(or(eq(Bots.id, params.id), eq(Bots.slug, params.id))))[0];
  if (!bot) return new Response(JSON.stringify({ err: "no_bot_found" }), { status: 404, headers: { "Content-Type": "application/json" } });
  if (!(bot.owners as string[]).includes(userData.id)) return new Response(JSON.stringify({ err: "not_owner" }), { status: 403, headers: { "Content-Type": "application/json" } });
  const body = await request.json();
  const validation = BotFormSchema.safeParse(body);
  if (!validation.success) return new Response(JSON.stringify({ err: validation.error.errors[0].message }), { status: 400, headers: { "Content-Type": "application/json" } });

  if (body.slug && body.slug !== bot.slug) {
    const slug = await db.select({ id: Bots.id }).from(Bots).where(eq(Bots.slug, body.slug));
    if (slug.length > 0) return new Response(JSON.stringify({ err: "slug_taken" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  //if owners are changed, check if the user is the index 0 of the owners array. if not, he is not the main owner, hence cant modify the owners
  if (body.owners && body.owners.toString() !== bot.owners.toString()) {

    if (!Array.isArray(body.owners)) return new Response(JSON.stringify({ err: "owners_not_array" }), { status: 400, headers: { "Content-Type": "application/json" } });
    console.log(bot.owners, body.owners);
    if (bot.owners[0] !== userData.id) return new Response(JSON.stringify({ err: "not_main_owner" }), { status: 403, headers: { "Content-Type": "application/json" } });
    if (body.owners[0] !== userData.id) return new Response(JSON.stringify({ err: "main_owner_cant_be_changed" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }

  if (body.webhook && body.webhook !== bot.webhook) {
    if (!isValidHttpUrl(body.webhook)) return new Response(JSON.stringify({ err: "invalid_webhook" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  if (body.source_repo && body.source_repo !== bot.source_repo) {
    if (!isValidHttpUrl(body.source_repo)) return new Response(JSON.stringify({ err: "invalid_source_repo" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  if (body.website && body.website !== bot.website) {
    if (!isValidHttpUrl(body.website)) return new Response(JSON.stringify({ err: "invalid_website" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  if (body.donate && body.donate !== bot.donate) {
    if (!isValidHttpUrl(body.donate)) return new Response(JSON.stringify({ err: "invalid_donate" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  if (body.bg && body.bg !== bot.bg) {
    if (!isValidHttpUrl(body.bg)) return new Response(JSON.stringify({ err: "invalid_bg" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  if (body.invite && body.invite !== bot.invite) {
    if (!isValidHttpUrl(body.invite)) return new Response(JSON.stringify({ err: "invalid_invite" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  if (body.lib && body.lib !== bot.lib) {
    if (body.lib.length > 20) return new Response(JSON.stringify({ err: "lib_too_long" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  if (body.support && body.support !== bot.support) {
    if (isValidHttpUrl(body.support)) {
      body.support = new URL(body.support)
      if (body.support.hostname == "discord.gg") body.support = body.support.pathname.slice(1);
      else if (body.support.hostname == "discord.com") body.support = body.support.pathname.split("/")[2];
      else return new Response(JSON.stringify({ err: "invalid_support" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    //bot.support is just the invite code now. perfect for the discord api
    const apiData = await fetch(`https://discord.com/api/invites/${body.support}`).then((res) => res.json());
    console.log(apiData);
    if (apiData.message == "Unknown Invite") return new Response(JSON.stringify({ err: "expired_support" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  //finally, update the bot
  await db.update(Bots).set({
    lib: body.lib,
    owners: body.owners as string[],
    prefix: body.prefix,
    short: body.short,
    desc: body.desc,
    support: body.support,
    source_repo: body.source_repo,
    website: body.website,
    webhook: body.webhook,
    bg: body.bg,
    donate: body.donate,
    invite: body.invite,
    slug: body.slug.toLowerCase(),
    opted_coins: body.opted_coins,
  }).where(eq(Bots.id, bot.id));

  //@ts-ignore
  await UpdateBotInfo({ params: { id: bot.id, modified: userData.id } });


  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
};