import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import DiscordOauth2 from "discord-oauth2";
import { getDb } from "$lib/db";
import { Bots, Users } from "$lib/schema";
import { eq } from "drizzle-orm";
import { formSchema as BotFormSchema } from "$lib/components/bot-form-schema";
import isValidHttpUrl from "$lib/functions/valid-url";
import UserAccountFetch from "$lib/functions/user-bot";
import SendLog from "@/bot/log";
import { notifyBotChanged } from "$lib/indexnow";
import { assignBotdevRole } from "$lib/assign-guild-role";
import { env } from "$env/dynamic/private";

/**
 * POST /api/bots/[id]/new
 *
 * Create a new bot entry. Body must match the legacy `BotFormSchema`.
 * Auth:
 *  - Accepts access token in query `key`, Authorization header, RDL-key header or `key` cookie.
 *
 * Behavior mirrors the old Astro endpoint:
 *  - Validates the caller is authenticated and that the caller is the main owner (owners[0])
 *  - Validates field shapes, slug uniqueness, URL formats
 *  - Validates given bot id refers to a bot account (via legacy UserAccountFetch)
 *  - Inserts a new row into Bots table and emits a SendLog (best-effort)
 */
export const POST: RequestHandler = async ({ request, params, cookies }) => {
	try {
		const db = getDb();
		const url = new URL(request.url);

		const paramKey = url.searchParams.get("key");
		const headerAuth = request.headers.get("authorization") ?? request.headers.get("RDL-key");
		const cookieKey = cookies.get("key");

		const key = paramKey ?? headerAuth ?? cookieKey;
		if (!key) {
			return json({ err: "not_logged_in" }, { status: 400 });
		}

		const id = params.id;
		if (!id) {
			return json({ err: "missing_bot_id" }, { status: 400 });
		}

		// Validate OAuth token and fetch userData
		const oauth2 = new DiscordOauth2({
			clientId: env.DISCORD_BOT_ID,
			clientSecret: env.DISCORD_SECRET,
			redirectUri: (env.DOMAIN ?? "") + "/api/auth"
		});

		let userData: any;
		try {
			userData = await oauth2.getUser(String(key));
		} catch (e) {
			try {
				cookies.delete("key", { path: "/" });
			} catch {}
			return json({ err: "invalid_key" }, { status: 400 });
		}

		// Ensure the user record exists (parity with legacy flow)
		const userRows = await db
			.select({ bal: Users.bal, votes: Users.votes })
			.from(Users)
			.where(eq(Users.id, userData.id))
			.limit(1);
		if (!userRows || userRows.length === 0) {
			return json({ err: "invalid_key" }, { status: 400 });
		}

		// Parse body and validate shape using legacy schema
		const body = await request.json().catch(() => null);
		if (!body) return json({ err: "invalid_body" }, { status: 400 });

		try {
			const validation = (BotFormSchema as any).safeParse
				? (BotFormSchema as any).safeParse(body)
				: { success: true };
			if (!validation.success) {
				const msg = validation.error?.errors?.[0]?.message ?? "validation_failed";
				return json({ err: msg }, { status: 400 });
			}
		} catch {
			// If validation helper throws/unavailable, continue with manual checks below
		}

		// Slug uniqueness check
		if (body.slug) {
			const existing = await db
				.select({ id: Bots.id })
				.from(Bots)
				.where(eq(Bots.slug, String(body.slug)))
				.limit(1);
			if (existing && existing.length > 0) {
				return json({ err: "slug_taken" }, { status: 400 });
			}
		}

		// owners must be array and caller must be main owner
		if (!Array.isArray(body.owners)) {
			return json({ err: "owners_not_array" }, { status: 400 });
		}
		if (body.owners[0] !== userData.id) {
			return json({ err: "main_owner_cant_be_changed" }, { status: 403 });
		}

		// Validate URLs
		const urlFields = ["webhook", "source_repo", "website", "donate", "bg", "invite"];
		for (const f of urlFields) {
			if (body[f]) {
				if (!isValidHttpUrl(body[f])) {
					return json({ err: `invalid_${f}` }, { status: 400 });
				}
			}
		}

		// Normalize and validate support invite if present
		if (body.support) {
			if (isValidHttpUrl(body.support)) {
				try {
					const u = new URL(body.support);
					if (u.hostname === "discord.gg") body.support = u.pathname.slice(1);
					else if (u.hostname === "discord.com") body.support = u.pathname.split("/")[2];
					else return json({ err: "invalid_support" }, { status: 400 });
				} catch {
					return json({ err: "invalid_support" }, { status: 400 });
				}
			}
			// Check invite exists (best-effort)
			try {
				const inviteResp = await fetch(`https://discord.com/api/invites/${body.support}`);
				const inviteJson = await inviteResp.json();
				if (inviteJson && inviteJson.message === "Unknown Invite") {
					return json({ err: "expired_support" }, { status: 400 });
				}
			} catch {
				// ignore Discord API transient errors
			}
		}

		// Fetch bot info from Discord (legacy helper). This verifies the id provided is a bot account.
		const SELFBOT_TOKEN = env.SELFBOT_TOKEN ?? "";
		let botInfo: any;
		try {
			botInfo = await UserAccountFetch(`/oauth2/authorize?client_id=${id}&scope=bot`, {
				SELFBOT_TOKEN
			});
		} catch (e) {
			return json({ err: "invalid_bot" }, { status: 400 });
		}

		// Validate known error codes from legacy helper
		if (
			botInfo?.code === 50010 ||
			botInfo?.code === 10002 ||
			botInfo?.code === 10013 ||
			botInfo?.code === 20026
		) {
			return json({ err: "invalid_bot" }, { status: 400 });
		}
		if (!botInfo?.bot?.bot) {
			return json({ err: "bot_is_user" }, { status: 400 });
		}

		// Insert new bot row
		try {
			await db.insert(Bots).values({
				id: id,
				slug: body.slug ? String(body.slug).toLowerCase() : id,
				owners: JSON.stringify(body.owners),
				username: botInfo.bot.username,
				discriminator: botInfo.bot.discriminator,
				avatar: botInfo.bot.avatar || "0",
				servers: botInfo.bot.approximate_guild_count ?? 0,
				tags: JSON.stringify(body.tags ?? []),
				invite: body.invite ?? "",
				desc: body.desc ?? "",
				source_repo: body.source_repo ?? "",
				support: body.support ?? "",
				website: body.website ?? "",
				webhook: body.webhook ?? "",
				donate: body.donate ?? "",
				bg: body.bg ?? "",
				lib: body.lib ?? "",
				prefix: body.prefix ?? "",
				short: body.short ?? "",
				votes: 0,
				approved: false,
				badges: JSON.stringify([]),
				promoted: false,
				opted_coins: body.opted_coins ?? false
			});
		} catch (e) {
			console.error("/api/bots/[id]/new DB insert error:", e);
			return json({ err: "db_insert_failed" }, { status: 500 });
		}

		// Send best-effort log
		try {
			await SendLog({
				env: {
					DOMAIN: env.DOMAIN ?? "",
					FAILED_DMS_LOGS_CHANNEL_ID: env.FAILED_DMS_LOGS_CHANNEL_ID ?? "",
					LOGS_CHANNEL_ID: env.LOGS_CHANNEL_ID ?? "",
					DISCORD_TOKEN: env.DISCORD_TOKEN ?? ""
				},
				body: {
					title: `Bot ${botInfo.bot.username} Added!`,
					desc: `Bot ${botInfo.bot.username}#${botInfo.bot.discriminator} has been added by ${(userData as any).global_name ?? userData.username}!`,
					color: "#57F287",
					img: botInfo.bot.avatar
						? `https://cdn.discordapp.com/avatars/${botInfo.bot.id}/${botInfo.bot.avatar}?size=128`
						: undefined,
					url: `${env.DOMAIN ?? ""}/bots/${botInfo.bot.id}`,
					owners: body.owners
				}
			});
		} catch {
			// non-fatal if logging fails
		}

		// Notify IndexNow that a new bot page exists (fire-and-forget).
		notifyBotChanged(body.slug ? String(body.slug).toLowerCase() : id);

		// Assign the "botdev" role to every owner who is already in the guild.
		// Non-fatal: 404 = owner not in server yet (fine), other errors are
		// logged inside assignBotdevRole and swallowed.
		await Promise.all(
			body.owners.map((ownerId: string) =>
				assignBotdevRole(ownerId, {
					DISCORD_TOKEN: env.DISCORD_TOKEN ?? "",
					DISCORD_GUILD_ID: env.DISCORD_GUILD_ID ?? "",
					DISCORD_BOTDEV_ROLE: env.DISCORD_BOTDEV_ROLE ?? ""
				})
			)
		);

		return json({ success: true }, { status: 200 });
	} catch (err) {
		console.error("/api/bots/[id]/new error:", err);
		return json(
			{ err: "server_error", message: err instanceof Error ? err.message : String(err) },
			{ status: 500 }
		);
	}
};
