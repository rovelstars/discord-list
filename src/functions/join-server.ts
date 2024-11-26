import type { Env } from "@/lib/env";
import type OAuth2 from "discord-oauth2";
export default async function joinServer({oauth, token, env}:{oauth: OAuth2, token: string, env: Env}) {
  try {
    return await oauth.addMember({
      accessToken: token,
      guildId: env.DISCORD_GUILD_ID,
      userId: env.DISCORD_BOT_ID,
      roles: ["889746995034587146"],
      botToken: env.DISCORD_TOKEN,
    });
  }
  catch (e) {
    return { error: e.message };
  }
}
