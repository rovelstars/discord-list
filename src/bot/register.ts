import RestClient from "./util";
import { Routes } from "discord-api-types/v10";
import { commandFns, commands } from "./data";
console.log("%cLoaded commands:", "color: #5865F2");
commands.forEach((command, index) => {
	console.log(`%c${index + 1}. ${command.name}`, "color: #57F287");
});
export default async function registerCommands(env: {
	DISCORD_BOT_ID: string;
	DISCORD_GUILD_ID: string;
	MODE: string;
	DISCORD_TOKEN: string;
}) {
	const rest = RestClient(env);
	console.log("%cRegistering commands...", "color: #5865F2");
	await rest.put(
		env.MODE == "development"
			? Routes.applicationGuildCommands(env.DISCORD_BOT_ID, env.DISCORD_GUILD_ID)
			: Routes.applicationCommands(env.DISCORD_BOT_ID),
		{
			body: commands
		}
	);
	console.log(
		`%cSuccessfully registered commands %c${env.MODE == "development" ? "locally" : "globally"}!`,
		"color: #57F287",
		"color: #EB459E"
	);
}

export { commandFns as runs, commands };
