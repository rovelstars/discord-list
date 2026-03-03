import { REST } from "@discordjs/rest";

export default function RestClient(env: { DISCORD_TOKEN: string }) {
	return new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);
}
