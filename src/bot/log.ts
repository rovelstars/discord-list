import RestClient from "./util";
import { Routes } from "discord-api-types/v10";
import { EmbedBuilder } from "@discordjs/builders";
import type { Env } from "@/lib/env";
export default async function SendLog({ env, body }: { env: Env, body: any }) {
  const rest = RestClient(env);
  const owners = body.owners || [];
  const Body = {
    embeds: [
      new EmbedBuilder()
        .setTitle(body.title || "RDL Logging")
        .setDescription(body.desc || "No description provided.\n:/&&")
        .setColor(hexToDec(body.color || "#5865F2"))
        .setImage(body.attachment)
        .setURL(body.url || env.DOMAIN)
        .setThumbnail(
          body.img ||
          `${env.DOMAIN}/img/bot/logo-512.png`
        )
        .setTimestamp()
        .toJSON()
    ]
  };
  await rest.post(Routes.channelMessages(env.LOGS_CHANNEL_ID), {
    body: Body
  });
  if (owners.length) {
    await Promise.all(owners.map(async (owner: string) => {
      const channel: any = await rest.post(Routes.userChannels(), {
        body: {
          recipient_id: owner,
        }
      });
      try {
        await rest.post(Routes.channelMessages(channel.id), {
          body: Body
        });
      } catch (e) {
        const failedBody = {
          content: `<@!${owner}>`,
          embeds: [
            new EmbedBuilder()
              .setTitle("Failed to send logs!")
              .setDescription(`Failed to send logs to <@${owner}>. Keep your DMs opened, atleast with me.`)
              .setColor(hexToDec("#ED4245"))
              .setTimestamp()
              .toJSON(),
            Body.embeds[0]
          ]
        };
        await rest.post(Routes.channelMessages(env.FAILED_DMS_LOGS_CHANNEL_ID), {
          body: failedBody
        });
      }
    }));
  }
}

function hexToDec(color: string) {
  return parseInt(color.replace('#', ''), 16);
}