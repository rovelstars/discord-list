import { SlashCommandBuilder } from '@discordjs/builders';
import { Routes } from 'discord-api-types/v10';
import RestClient from '../util';

export default {
  data: new SlashCommandBuilder().setName("ping").setDescription("LET HIM COOK!"),
  async run(interaction, env: { DISCORD_BOT_ID: string, DISCORD_GUILD_ID: string, MODE: string, DISCORD_TOKEN: string }) {
    const rest = RestClient(env);
    await rest.post(Routes.interactionCallback(interaction.id, interaction.token), {
      body: {
        type: 4,
        data: {
          content: `Pong! <:workers:1055966302201729084> Workers said Hi to${interaction.member.user.username}`
        }
      }
    });
  }
}