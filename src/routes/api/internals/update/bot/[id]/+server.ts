import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { getDb } from "$lib/db";
import SendLog from "@/bot/log";
import UserAccountFetch from "$lib/functions/user-bot";
import getAvatarURL from "$lib/get-avatar-url";
import { Bots } from "$lib/schema";
import { eq } from "drizzle-orm";
import { env } from "$env/dynamic/private";

/**
 * GET /api/internals/update/bot/[id]
 *
 * Legacy-internal endpoint used to:
 *  - validate bot account still exists on Discord
 *  - refresh bot username/discriminator/avatar/servers/tags
 *  - delete the bot if Discord reports it doesn't exist (legacy error codes)
 *
 * This route mirrors the behavior of the original Astro implementation.
 */
export const GET: RequestHandler = async ({ params }) => {
	try {
		const db = getDb();
		const id = params.id;
		if (!id) {
			return json({ success: false, error: "missing_id" }, { status: 400 });
		}

		const SELFBOT_TOKEN = env.SELFBOT_TOKEN ?? "";

		// Ask Discord for up-to-date bot info via the legacy helper.
		// The helper returns a payload similar to the legacy service (data.application, data.bot, data.code, etc).
		const data = await UserAccountFetch(`/oauth2/authorize?client_id=${id}&scope=bot`, {
			SELFBOT_TOKEN
		});

		if (!data) {
			// If the helper didn't return anything, respond non-fatally (legacy returned success:false)
			return json({ success: false }, { status: 200 });
		}

		// Known Discord error codes which indicate the bot doesn't exist / should be removed.
		const removalCodes = [50010, 10002, 10013, 20026];
		if (removalCodes.includes(Number(data.code))) {
			// Retrieve bot info from DB to notify owners before deletion
			const botRow = await db
				.select({
					id: Bots.id,
					username: Bots.username,
					discriminator: Bots.discriminator,
					owners: Bots.owners
				})
				.from(Bots)
				.where(eq(Bots.id, id))
				.limit(1);

			const bot = botRow && botRow.length > 0 ? botRow[0] : null;

			if (bot) {
				// Best-effort: notify admins/owners via SendLog before deletion
				try {
					await SendLog({
						env: {
							DOMAIN: env.DOMAIN ?? "",
							FAILED_DMS_LOGS_CHANNEL_ID: env.FAILED_DMS_LOGS_CHANNEL_ID ?? "",
							LOGS_CHANNEL_ID: env.LOGS_CHANNEL_ID ?? "",
							DISCORD_TOKEN: env.DISCORD_TOKEN ?? ""
						},
						body: {
							owners: (bot as any).owners || null,
							title: `Bot ${(bot as any).username}#${(bot as any).discriminator} sent for removal`,
							desc: `Bot (${id}) is being deleted as Discord reports the Bot doesn't exist. (Error Code: \`${data.code}\`)\nIf this is a mistake, please contact the admins!\nThe admins of this bot are: ${((bot as any).owners || []).map((o: string) => `<@!${o}>`).join(", ")}`,
							color: "#ED4245"
						}
					});
				} catch (e) {
					// swallow logging errors
					console.warn("SendLog failed during removal notification:", e);
				}
			}

			// Delete the bot record from DB (legacy behavior)
			try {
				await db.delete(Bots).where(eq(Bots.id, id));
			} catch (e) {
				console.error("DB delete error in internals update route:", e);
			}

			return json({ success: false, error: "Bot not found!" }, { status: 200 });
		}

		// Fetch current DB row for comparison
		const botDBRows = await db
			.select({
				username: Bots.username,
				discriminator: Bots.discriminator,
				avatar: Bots.avatar,
				servers: Bots.servers,
				tags: Bots.tags
			})
			.from(Bots)
			.where(eq(Bots.id, id))
			.limit(1);

		const botDBData = botDBRows && botDBRows.length > 0 ? botDBRows[0] : null;
		if (!botDBData) {
			return json({ success: false }, { status: 200 });
		}

		// Compare and update name/discriminator/avatar if changed (or if modified flag passed)
		const modifiedBy = (params as any).modified;
		const botUsernameChanged = botDBData.username !== data.bot.username;
		const botDiscrChanged = botDBData.discriminator !== data.bot.discriminator;
		const botAvatarChanged = botDBData.avatar !== (data.bot.avatar || "0");

		if (botUsernameChanged || botDiscrChanged || botAvatarChanged || modifiedBy) {
			try {
				await db
					.update(Bots)
					.set({
						username: data.bot.username,
						discriminator: data.bot.discriminator,
						avatar: data.bot.avatar || "0"
					})
					.where(eq(Bots.id, id));
			} catch (e) {
				console.error("DB update error when syncing bot identity:", e);
			}

			// send a notification to logs about the update (best-effort)
			try {
				await SendLog({
					env: {
						DOMAIN: env.DOMAIN ?? "",
						FAILED_DMS_LOGS_CHANNEL_ID: env.FAILED_DMS_LOGS_CHANNEL_ID ?? "",
						LOGS_CHANNEL_ID: env.LOGS_CHANNEL_ID ?? "",
						DISCORD_TOKEN: env.DISCORD_TOKEN ?? ""
					},
					body: {
						title: `Bot ${data.bot.username}#${data.bot.discriminator} ${modifiedBy ? "has been modified!" : "Data updated!"}`,
						desc: `Bot ${data.bot.username}#${data.bot.discriminator} has been updated${modifiedBy ? ` by <@!${modifiedBy}>` : ""}!`,
						color: "#FEE75C",
						img: getAvatarURL(data.bot.id, data.bot.avatar)
					}
				});
			} catch (e) {
				// logging failures are non-fatal
				console.warn("SendLog failed after updating bot identity:", e);
			}
		}

		// Sync servers count if changed
		if (botDBData.servers !== data.bot.approximate_guild_count) {
			try {
				await db
					.update(Bots)
					.set({ servers: data.bot.approximate_guild_count })
					.where(eq(Bots.id, id));
			} catch (e) {
				console.error("DB update error when syncing servers count:", e);
			}
		}

		// Sync tags if changed
		// Note: depending on representation this may be a deep compare; legacy used simple equality.
		if (JSON.stringify(botDBData.tags) !== JSON.stringify(data.application?.tags)) {
			try {
				// Store tags as serialized JSON TEXT in the portable schema.
				await db
					.update(Bots)
					.set({ tags: JSON.stringify(data.application?.tags || []) })
					.where(eq(Bots.id, id));
			} catch (e) {
				console.error("DB update error when syncing tags:", e);
			}
		}

		// Clean up sensitive/unused fields from the returned object (legacy behavior)
		if (data && data.bot) {
			delete data.bot.public_flags;
			delete data.bot.clan;
			delete data.bot.bot;
			delete data.bot.avatar_decoration_data;
			delete data.bot.primary_guild;
			delete data.bot.global_name;
		}

		return json({ success: true, bot: data.bot }, { status: 200 });
	} catch (err) {
		console.error("/api/internals/update/bot/[id] error:", err);
		return json({ success: false }, { status: 500 });
	}
};
