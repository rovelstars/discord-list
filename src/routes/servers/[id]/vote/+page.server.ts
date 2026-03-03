import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { getDb } from "$lib/db";
import { Servers, Users } from "$lib/schema";
import { eq, or } from "drizzle-orm";
import DiscordOauth2 from "discord-oauth2";
import { env } from "$env/dynamic/private";

export const load: PageServerLoad = async ({ params, cookies, setHeaders }) => {
	const idOrSlug = params.id;
	if (!idOrSlug) throw redirect(302, "/404");

	const db = getDb();

	// Fetch the minimal server info needed for the vote page
	const rows = await db
		.select({
			id: Servers.id,
			slug: Servers.slug,
			name: Servers.name,
			icon: Servers.icon,
			votes: Servers.votes
		})
		.from(Servers)
		.where(or(eq(Servers.slug, idOrSlug), eq(Servers.id, idOrSlug)))
		.limit(1);

	if (!rows || rows.length === 0) throw redirect(302, "/404");

	const server = rows[0] as {
		id: string;
		slug: string | null;
		name: string;
		icon: string | null;
		votes: number | null;
	};

	// Resolve user from cookie
	const key = cookies.get("key");
	let user: { id: string; username: string; avatar: string | null } | null = null;

	if (key) {
		try {
			const oauth = new DiscordOauth2({
				clientId: env.DISCORD_BOT_ID!,
				clientSecret: env.DISCORD_SECRET!,
				redirectUri: (env.DOMAIN ?? "http://localhost:5173") + "/api/auth"
			});

			const userData = await oauth.getUser(key);

			// Confirm user exists in DB
			const userRows = await db
				.select({ id: Users.id })
				.from(Users)
				.where(eq(Users.id, userData.id))
				.limit(1);

			if (userRows.length > 0) {
				user = {
					id: userData.id,
					username: ((userData as any).global_name ?? userData.username) as string,
					avatar: userData.avatar ?? null
				};
			}
		} catch {
			// Invalid / expired token — treat as logged out
			user = null;
		}
	}

	setHeaders({
		"cache-control": "private, max-age=0",
		"netlify-vary": "cookie=key|code,header=user-agent"
	});

	return {
		server: {
			id: server.id,
			slug: server.slug ?? server.id,
			name: server.name,
			icon: server.icon ?? null,
			votes: Number(server.votes) || 0
		},
		user
	};
};
