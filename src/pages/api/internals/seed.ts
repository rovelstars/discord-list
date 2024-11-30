import type { APIRoute } from "astro";
import type { Env } from "@/lib/env";
import { db, Bots, Users } from "astro:db";
export const GET: APIRoute = async ({ locals }) => {
  const env = locals.runtime?.env ?? import.meta.env ?? process.env;
  return new Response("This route is disabled in production", { status: 403 });
  console.log("%cSeeding data from discord.rovelstars.com", "color: #57F287");
  const data = await fetch(`http://localhost:3000/api/download?pass=${env.DOWNLOAD_PASS}`).then(res => res.json());
  console.log(`%cReceived %c${data.bots.length} %cBots, %c${data.users.length} %cUsers, %c${data.servers.length} %cServers`,
    "color: #57F287", "color: #FEE75C", "color: #57F287", "color: #FEE75C", "color: #57F287", "color: #FEE75C", "color: #57F287");

  await Promise.all(data.bots.filter(b => !b.username.toLowerCase().startsWith("deleted")).map(async bot => {
    try {
      await db.insert(Bots).values({
        card: bot.card,
        approved: bot.verified || bot.added, //approve bots on our list if they are verified by discord or added by us.
        servers: bot.servers,
        promoted: bot.promoted,
        votes: bot.votes,//+(Math.floor(Math.random()*bot.servers/1000)+Math.floor(Math.random()*10)),
        badges: bot.badges,
        opted_coins: bot.opted_coins, //if the bot has opted for coins, default is false
        id: bot.id,
        username: bot.username,
        discriminator: bot.discriminator,
        avatar: bot.avatar,
        short: bot.short, //short description
        desc: bot.desc, //full page description
        prefix: bot.prefix, //bot prefix
        lib: bot.lib,
        support: bot.support, //support server id
        bg: bot.bg, //background image url
        source_repo: bot.github, //github or gitlab repo url
        website: bot.website, //bot website url
        donate: bot.donate, //donate link
        invite: bot.invite, //invite link
        slug: bot.slug, // bot vanity url, e.g. /bots/:slug. if not set, it will be bot id
        added_at: new Date(bot._id), //added at
        owners: bot.owners,
        code: bot.code,
        webhook: bot.webhook
      });
    } catch (error) {
      console.log(`%cFailed to insert bot ${bot.username}#${bot.discriminator} due to %c${error.message}`, "color: #FEE75C", "color: #FF0000");
      return new Response(`Failed to insert bot: ${bot.username}#${bot.discriminator} (${bot.id})`, { status: 500 });
    }
  }));
  await Promise.all(data.users.map(async user => {
    try {
      await db.insert(Users).values({
        id: user.id,
        added_at: new Date(user._id), //added at
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar,
        email: user.email,
        bal: user.bal,
        bio: user.bio,
        banner: user.banner,
        badges: user.badges,
        lang: user.lang,
        lastLogin: new Date(user.lastLogin),
        nitro: user.nitro,
        old: user.old,
        votes: user.votes,
        keys: user.keys,
      });
    } catch (error) {
      console.log(`%cFailed to insert user ${user.username}#${user.discriminator} due to %c${error.message}`, "color: #FEE75C", "color: #FF0000");
    }
  }));
  return new Response("Successfully seeded data from discord.rovelstars.com", { status: 200 });
};