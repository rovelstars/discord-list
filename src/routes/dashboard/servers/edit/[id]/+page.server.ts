import type { PageServerLoad } from "./$types";
import { redirect, error } from "@sveltejs/kit";
import DiscordOauth2 from "discord-oauth2";
import { env } from "$env/dynamic/private";
import { getDb } from "$lib/db";
import { Servers } from "$lib/db/schema";
import { eq, or } from "drizzle-orm";

export const load: PageServerLoad = async ({ params, cookies, url }) => {
	const key = cookies.get("key");
	if (!key) {
		throw redirect(302, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}

	const oauth = new DiscordOauth2({
		clientId: env.DISCORD_BOT_ID!,
		clientSecret: env.DISCORD_SECRET!,
		redirectUri: (env.DOMAIN ?? "http://localhost:5173") + "/api/auth"
	});

	let userData: any;
	try {
		userData = await oauth.getUser(key);
	} catch {
		cookies.delete("key", { path: "/" });
		throw redirect(302, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}

	if (!userData?.id) {
		cookies.delete("key", { path: "/" });
		throw redirect(302, "/login");
	}

	const idOrSlug = params.id?.trim();
	if (!idOrSlug) {
		throw error(400, "Missing server ID");
	}

	const db = getDb();

	const rows = await db
		.select({
			id: Servers.id,
			name: Servers.name,
			short: Servers.short,
			desc: Servers.desc,
			icon: Servers.icon,
			owner: Servers.owner,
			slug: Servers.slug,
			member_count: Servers.member_count,
			votes: Servers.votes,
			added_at: Servers.added_at
		})
		.from(Servers)
		.where(or(eq(Servers.id, idOrSlug), eq(Servers.slug, idOrSlug)))
		.limit(1);

	const server = rows && rows.length > 0 ? rows[0] : null;

	if (!server) {
		throw error(404, "Server not found");
	}

	if (server.owner !== userData.id) {
		throw error(403, "You are not the owner of this server");
	}

	return {
		user: {
			id: userData.id as string,
			username: (userData.global_name ?? userData.username) as string,
			discriminator: (userData.discriminator ?? "0") as string,
			avatar: (userData.avatar ?? null) as string | null
		},
		server: {
			id: server.id,
			name: server.name,
			icon: server.icon ?? null,
			owner: server.owner,
			slug: server.slug ?? "",
			short: server.short ?? "",
			desc: server.desc ?? "",
			member_count: server.member_count ?? null,
			votes: typeof server.votes === "number" ? server.votes : Number(server.votes) || 0,
			added_at: server.added_at ?? null
		}
	};
};
