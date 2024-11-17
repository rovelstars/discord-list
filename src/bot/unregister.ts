import RestClient from "./util";
import { Routes } from "discord-api-types/v10";

const commands = [];

export default async function unregisterCommands(env) {
  const rest = RestClient(env);
  console.log("%cUnregistering commands...", "color: #5865F2");
  //get all the commands
  const registeredCommands: any[] = await rest.get(Routes.applicationCommands(env.DISCORD_BOT_ID)) as any[];
  //unregister the commands
  for (const command of registeredCommands) {
    console.log(`%cUnregistered command ${command.name}`, "color: #5865F2");
    await rest.delete(Routes.applicationCommand(env.DISCORD_BOT_ID, command.id));
  }
}