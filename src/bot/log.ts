import RestClient from "./util";
import { Routes } from "discord-api-types/v10";
import { EmbedBuilder } from "@discordjs/builders";
import type { Env } from "@/lib/env";
export default async function SendLog({ env, body }: { env: Env, body: any }) {
  const rest = RestClient(env);
  await rest.post(Routes.channelMessages(env.LOGS_CHANNEL_ID), {
    body: {
      embeds: [
        new EmbedBuilder()
          .setTitle(body.title || "RDL Logging")
          .setDescription(body.desc || "No description provided.\n:/&&")
          .setColor(hexToDec(body.color || "#5865F2"))
          .setImage(body.attachment)
          .setURL(body.url || env.DOMAIN)
          .setThumbnail(
            body.img ||
            `${env.DOMAIN}/assets/img/bot/logo-512.png`
          )
          .setTimestamp()
          .toJSON()
      ]
    },
  });
}

function hexToDec(color: string) {
  return parseInt(color.replace('#', ''), 16);
}