import type { PageServerLoad } from "./$types";
import { redirect, error } from "@sveltejs/kit";
import DiscordOauth2 from "discord-oauth2";
import { env } from "$env/dynamic/private";
import { getDb } from "$lib/db";
import { Bots } from "$lib/db/schema";
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

	const idOrSlug = params.id;
	if (!idOrSlug) {
		throw error(400, "Missing bot ID");
	}

	const db = getDb();

	const rows = await db
		.select({
			id: Bots.id,
			slug: Bots.slug,
			username: Bots.username,
			discriminator: Bots.discriminator,
			avatar: Bots.avatar,
			short: Bots.short,
			desc: Bots.desc,
			prefix: Bots.prefix,
			lib: Bots.lib,
			invite: Bots.invite,
			bg: Bots.bg,
			support: Bots.support,
			source_repo: Bots.source_repo,
			website: Bots.website,
			webhook: Bots.webhook,
			donate: Bots.donate,
			owners: Bots.owners,
			code: Bots.code,
			opted_coins: Bots.opted_coins
		})
		.from(Bots)
		.where(or(eq(Bots.id, idOrSlug), eq(Bots.slug, idOrSlug)))
		.limit(1);

	const bot = rows && rows.length > 0 ? rows[0] : null;

	if (!bot) {
		throw error(404, "Bot not found");
	}

	// Parse owners from stored JSON text (the column may arrive as a raw JSON
	// string from libSQL even though the schema declares mode:'json')
	let owners: string[] = [];
	try {
		const raw = bot.owners;
		if (Array.isArray(raw)) {
			owners = raw;
		} else if (typeof raw === "string") {
			const parsed = JSON.parse(raw);
			owners = Array.isArray(parsed) ? parsed : [];
		}
	} catch {
		owners = [];
	}

	// Only an owner may access the edit page
	console.log("Bot owners:", owners, "Current user ID:", userData.id);
	if (!owners.includes(userData.id)) {
		throw error(403, "You are not an owner of this bot");
	}

	return {
		user: {
			id: userData.id as string,
			username: (userData.global_name ?? userData.username) as string,
			discriminator: (userData.discriminator ?? "0") as string,
			avatar: (userData.avatar ?? null) as string | null
		},
		bot: {
			id: bot.id,
			slug: bot.slug ?? bot.id,
			username: bot.username,
			discriminator: bot.discriminator,
			avatar: bot.avatar,
			short: bot.short ?? "",
			desc: bot.desc ?? "",
			prefix: bot.prefix ?? "",
			lib: bot.lib ?? "",
			invite: bot.invite ?? "",
			bg: bot.bg ?? "",
			support: bot.support ?? "",
			source_repo: bot.source_repo ?? "",
			website: bot.website ?? "",
			webhook: bot.webhook ?? "",
			donate: bot.donate ?? "",
			owners,
			code: bot.code ?? "",
			opted_coins: Boolean(bot.opted_coins)
		}
	};
};
