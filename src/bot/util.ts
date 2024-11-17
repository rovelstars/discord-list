import { REST } from "@discordjs/rest";

declare global {
  type Module = {
    default: any;
    //any other exports is also allowed
    [key: string]: any;
  };
  function Import(path: string): Promise<Module>;
}
if(!import.meta.env.DISCORD_TOKEN)
  throw new Error("DISCORD_TOKEN not found in env");
const rest = new REST({ version: "10" }).setToken(import.meta.env.DISCORD_TOKEN);

export default rest;