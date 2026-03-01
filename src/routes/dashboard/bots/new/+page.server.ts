import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import DiscordOauth2 from "discord-oauth2";
import { env } from "$env/dynamic/private";

export const load: PageServerLoad = async ({ url, cookies }) => {
	const key = cookies.get("key");
	if (!key) {
		throw redirect(302, `/login?redirect=${encodeURIComponent(url.pathname + url.search)}`);
	}

	const oauth = new DiscordOauth2({
		clientId: env.DISCORD_BOT_ID!,
		clientSecret: env.DISCORD_SECRET!,
		redirectUri: (env.DOMAIN ?? "http://localhost:5173") + "/api/auth"
	});

	let user: any = null;
	try {
		user = await oauth.getUser(key);
	} catch {
		throw redirect(302, `/login?redirect=${encodeURIComponent(url.pathname + url.search)}`);
	}

	// If ?id is provided, fetch basic bot info from Discord so we can pre-fill the form header
	const botId = url.searchParams.get("id") ?? null;
	let botInfo: {
		id: string;
		username: string;
		discriminator: string;
		avatar: string | null;
	} | null = null;

	if (botId) {
		try {
			const res = await fetch(`https://discord.com/api/v10/users/${botId}`, {
				headers: { Authorization: `Bot ${env.DISCORD_TOKEN}` }
			});
			if (res.ok) {
				const data = await res.json();
				botInfo = {
					id: data.id,
					username: data.username,
					discriminator: data.discriminator ?? "0",
					avatar: data.avatar ?? null
				};
			}
		} catch {
			// non-fatal — form will still render without pre-fill
		}
	}

	return {
		user: {
			id: user.id as string,
			username: (user.global_name ?? user.username) as string,
			discriminator: (user.discriminator ?? "0") as string,
			avatar: (user.avatar ?? null) as string | null
		},
		botId,
		botInfo
	};
};
