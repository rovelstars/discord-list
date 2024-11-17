import rest from "./util";
import { Routes } from "discord-api-types/v10";
import ping from "./commands/ping";

const commands = [ping.data];
const commandFns = [ping.run];

export default async function registerCommands() {
    //register the commands
    console.log("%cRegistering commands...", "color: #5865F2");
    await rest.put(
        import.meta.env.MODE == "development" ? Routes.applicationGuildCommands(import.meta.env.DISCORD_BOT_ID, import.meta.env.DISCORD_GUILD_ID) :
            Routes.applicationCommands(import.meta.env.DISCORD_BOT_ID), {
        body: commands
    });
    console.log("%cSuccessfully registered commands!", "color: #57F287");
}

export { commandFns as runs, commands };