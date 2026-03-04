import type OAuth2 from "discord-oauth2";
import { assignUserRole } from "$lib/assign-guild-role";

export default async function joinServer({
	oauth,
	token,
	env
}: {
	oauth: OAuth2;
	token: string;
	env: {
		DISCORD_GUILD_ID: string;
		DISCORD_BOT_ID: string;
		DISCORD_TOKEN: string;
		DISCORD_USER_ROLE?: string;
	};
}) {
	try {
		// Add the user to the guild via OAuth (no roles passed here - we assign
		// roles separately via the bot token so we are not limited to roles the
		// OAuth scope would allow).
		const result = await oauth.addMember({
			accessToken: token,
			guildId: env.DISCORD_GUILD_ID,
			userId: env.DISCORD_BOT_ID,
			botToken: env.DISCORD_TOKEN
		});

		// Assign the user role to the newly joined member (best-effort, non-fatal).
		await assignUserRole(env.DISCORD_BOT_ID, {
			DISCORD_TOKEN: env.DISCORD_TOKEN,
			DISCORD_GUILD_ID: env.DISCORD_GUILD_ID,
			DISCORD_USER_ROLE: env.DISCORD_USER_ROLE
		});

		return result;
	} catch (e: any) {
		return { error: e?.message ?? String(e) };
	}
}
