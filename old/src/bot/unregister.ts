
import RestClient from "./util";
import { Routes } from "discord-api-types/v10";

const commands = [];

export default async function unregisterCommands(env: { DISCORD_BOT_ID: string, DISCORD_GUILD_ID: string, DISCORD_TOKEN: string }) {
  const rest = RestClient(env);
  console.log("%cUnregistering commands...", "color: #5865F2");
  //get all the commands
  const registeredCommands: any[] = await rest.get(Routes.applicationCommands(env.DISCORD_BOT_ID)) as any[];
  const registeredGuildCommands: any[] = await rest.get(Routes.applicationGuildCommands(env.DISCORD_BOT_ID, env.DISCORD_GUILD_ID)) as any[];
  //unregister the commands
  for (const command of registeredCommands) {
    console.log(`%cUnregistered GLOBAL command ${command.name}`, "color: #5865F2");
    await rest.delete(Routes.applicationCommand(env.DISCORD_BOT_ID, command.id));
  }
  for (const command of registeredGuildCommands) {
    console.log(`%cUnregistered GUILD command ${command.name}`, "color: #5865F2");
    await rest.delete(Routes.applicationGuildCommand(env.DISCORD_BOT_ID, env.DISCORD_GUILD_ID, command.id));
  }
}