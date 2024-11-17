import { SlashCommandBuilder } from '@discordjs/builders';
import { Routes } from 'discord-api-types/v10';
import RestClient from '../util';

export default {
  data: new SlashCommandBuilder().setName("ping").setDescription("LET HIM COOK!"),
  async run(msg, env) {
    const rest = RestClient(env);
    await rest.post(Routes.interactionCallback(msg.id, msg.token), {
      body: {
        type: 4,
        data: {
          content: `Pong! <:workers:1055966302201729084> Workers said Hi to${msg.member.user.username}`
        }
      }
    });
  }
}