import { REST } from "@discordjs/rest";

declare global {
  type Module = {
    default: any;
    //any other exports is also allowed
    [key: string]: any;
  };
  function Import(path: string): Promise<Module>;
}

export default (env) => {
  if (!env.DISCORD_TOKEN)
    throw new Error("DISCORD_TOKEN not found in env");
  return new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);
}