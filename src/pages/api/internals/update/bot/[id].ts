import SendLog from "@/bot/log";
import UserAccountFetch from "@/functions/user-bot";
import getAvatarURL from "@/lib/get-avatar-url";
import type { APIRoute } from "astro";
import { db, Bots, eq } from "astro:db";
import { DISCORD_TOKEN, DOMAIN, FAILED_DMS_LOGS_CHANNEL_ID, LOGS_CHANNEL_ID, SELFBOT_TOKEN } from "astro:env/server";

export const GET: APIRoute = async ({ params }) => {
  let data = await UserAccountFetch(`/oauth2/authorize?client_id=${params.id}&scope=bot`, { SELFBOT_TOKEN });
  console.log(data);
  const botDBData = (await db.select({ username: Bots.username, discriminator: Bots.discriminator, avatar: Bots.avatar, servers: Bots.servers, tags: Bots.tags }).from(Bots).where(eq(Bots.id, params.id)).limit(1))[0];
  if (!botDBData) return new Response(JSON.stringify({ success: false }), { status: 200, headers: { "content-type": "application/json" } });
  //compare the data, and update as according, and also send a sendLog to the logs channel
  if ((botDBData.username != data.bot.username || botDBData.discriminator != data.bot.discriminator || botDBData.avatar != data.bot.avatar) || params.modified) {
    await db.update(Bots).set({ username: data.bot.username, discriminator: data.bot.discriminator, avatar: data.bot.avatar }).where(eq(Bots.id, params.id));
    //send a sendLog to the logs channel
    await SendLog({

      env: { DOMAIN, FAILED_DMS_LOGS_CHANNEL_ID, LOGS_CHANNEL_ID, DISCORD_TOKEN },
      body: {
        title: `Bot ${data.bot.username}#${data.bot.discriminator} ${params.modified ? "has been modified!" : "Data updated!"}`,
        desc: `Bot ${data.bot.username}#${data.bot.discriminator} has been updated${params.modified ? ` by <@!${params.modified}>` : ""}!`,
        color: "#FEE75C",
        img: getAvatarURL(data.bot.id, data.bot.avatar)
      }
    })
  }
  if (botDBData.servers != data.bot.approximate_guild_count)
    await db.update(Bots).set({ servers: data.bot.approximate_guild_count }).where(eq(Bots.id, params.id));
  if (botDBData.tags != data.application.tags)
    await db.update(Bots).set({ tags: data.application.tags }).where(eq(Bots.id, params.id));
  delete data.bot.public_flags;
  delete data.bot.clan;
  delete data.bot.bot;
  delete data.bot.avatar_decoration_data;
  delete data.bot.primary_guild;
  delete data.bot.global_name;
  return new Response(JSON.stringify({ success: true, bot: data.bot }), { status: 200, headers: { "content-type": "application/json" } });
};