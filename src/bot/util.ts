import { REST } from "@discordjs/rest";
export default (env: { DISCORD_TOKEN: string }) => {
  if (!env.DISCORD_TOKEN)
    throw new Error("DISCORD_TOKEN not found in env");
  return new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);
}