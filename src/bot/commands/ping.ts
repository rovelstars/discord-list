import {SlashCommandBuilder} from '@discordjs/builders';
import {Routes} from 'discord-api-types/v10';
import rest from '../util';

export default {
  data: new SlashCommandBuilder().setName("ping").setDescription("2024 PONGING!"),
  async run(msg){
    await rest.post(Routes.interactionCallback(msg.id, msg.token), {
      body: {
        type: 4,
        data: {
          content: `Pong! ${msg.member.user.username}`
        }
      }
    });
  }
}