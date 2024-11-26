import { REST } from "@discordjs/rest";
import type { Env } from "@/lib/env";
export default (env: Env) => {
  if (!env.DISCORD_TOKEN)
    throw new Error("DISCORD_TOKEN not found in env");
  return new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);
}