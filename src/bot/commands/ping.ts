import { SlashCommandBuilder } from "@discordjs/builders";
import { InteractionResponseType } from "discord-interactions";

export default {
	data: new SlashCommandBuilder().setName("ping").setDescription("Replies with Goo Goo Gaga!"),
	run(interaction: Record<string, any>, _env?: Record<string, any>) {
		const username = interaction.member?.user?.username ?? interaction.user?.username ?? "stranger";

		return {
			type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
			data: {
				content: `~~Pong!~~ Goo Goo Gaga ${username}`
			}
		};
	}
};
