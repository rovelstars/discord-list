import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { getDb } from "$lib/db";
import { Bots, Users } from "$lib/schema";
import { eq, or } from "drizzle-orm";
import DiscordOauth2 from "discord-oauth2";
import { env } from "$env/dynamic/private";

export const load: PageServerLoad = async ({ params, cookies, setHeaders }) => {
	const idOrSlug = params.id;
	if (!idOrSlug) throw redirect(302, "/404");

	const db = getDb();

	// Fetch the minimal bot info needed for the vote page
	const rows = await db
		.select({
			id: Bots.id,
			slug: Bots.slug,
			username: Bots.username,
			discriminator: Bots.discriminator,
			avatar: Bots.avatar,
			opted_coins: Bots.opted_coins
		})
		.from(Bots)
		.where(or(eq(Bots.slug, idOrSlug), eq(Bots.id, idOrSlug)))
		.limit(1);

	if (!rows || rows.length === 0) throw redirect(302, "/404");

	const bot = rows[0] as {
		id: string;
		slug: string | null;
		username: string;
		discriminator: string;
		avatar: string | null;
		opted_coins: boolean | number | null;
	};

	// Resolve user from cookie (same pattern as layout server load)
	const key = cookies.get("key");
	let user: { id: string; username: string; avatar: string | null; bal: number } | null = null;

	if (key) {
		try {
			const oauth = new DiscordOauth2({
				clientId: env.DISCORD_BOT_ID!,
				clientSecret: env.DISCORD_SECRET!,
				redirectUri: (env.DOMAIN ?? "http://localhost:5173") + "/api/auth"
			});

			const userData = await oauth.getUser(key);

			const userRows = await db
				.select({ bal: Users.bal })
				.from(Users)
				.where(eq(Users.id, userData.id))
				.limit(1);

			const bal = userRows.length > 0 ? Number((userRows[0] as any).bal) || 0 : 0;

			user = {
				id: userData.id,
				username: (userData.global_name ?? userData.username) as string,
				avatar: userData.avatar ?? null,
				bal
			};
		} catch {
			// Invalid / expired token - treat as logged out, don't crash the page
			user = null;
		}
	}

	setHeaders({
		"cache-control": "private, max-age=0",
		"netlify-vary": "cookie=key|code,header=user-agent"
	});

	return {
		bot: {
			id: bot.id,
			slug: bot.slug ?? bot.id,
			username: bot.username,
			discriminator: bot.discriminator,
			avatar: bot.avatar,
			opted_coins: Boolean(bot.opted_coins)
		},
		user
	};
};
