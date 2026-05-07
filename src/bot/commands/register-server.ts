import { SlashCommandBuilder } from "@discordjs/builders";
import { InteractionResponseType } from "discord-interactions";
import { eq } from "drizzle-orm";
import { withDb, type DrizzleDb } from "$lib/db";
import { Servers, Users } from "$lib/db/schema";
import { syncServerEmojis } from "$lib/emoji-sync";
import { syncServerStickers } from "$lib/sticker-sync";
import { notifyServerChanged } from "$lib/indexnow";
import { reportError } from "$lib/error-reporter";

/**
 * /register - Register the current Discord server on the listing site.
 *
 * Talks to the database in-process (no HTTP roundtrip) - the bot runs in the
 * same SvelteKit server as the listing app, so going out over the network just
 * to come back to ourselves is wasteful and trips Cloudflare's bot challenge.
 *
 * Requirements:
 *  1. The invoking member must have "Manage Guild" (0x20) or "Administrator"
 *     (0x8) permission.
 *  2. The invoking user must already have an account on the site (i.e. a row
 *     in the Users table keyed by their Discord user id).
 *  3. On success the server is upserted into the Servers table with the
 *     invoking user recorded as owner.
 */

const DISCORD_API = "https://discord.com/api/v10";

const MANAGE_GUILD = BigInt(0x20);
const ADMINISTRATOR = BigInt(0x8);

/** Timeout for outbound Discord API calls (ms). */
const FETCH_TIMEOUT_MS = 8_000;

function hasRequiredPermission(permissionsString: string | null | undefined): boolean {
	if (!permissionsString) return false;
	try {
		const perms = BigInt(permissionsString);
		return (perms & ADMINISTRATOR) === ADMINISTRATOR || (perms & MANAGE_GUILD) === MANAGE_GUILD;
	} catch {
		return false;
	}
}

/** Immediate ephemeral reply - for synchronous pre-flight errors. */
function reply(content: string) {
	return {
		type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
		data: { content, flags: 64 }
	};
}

/** Deferred ephemeral response - tells Discord "Bot is thinking…" ephemerally. */
const DEFERRED_EPHEMERAL = {
	type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
	data: { flags: 64 }
};

/**
 * Edit the deferred "thinking" message with the final content.
 * Uses PATCH /webhooks/:appId/:token/messages/@original.
 */
async function editFollowup(
	appId: string,
	interactionToken: string,
	content: string
): Promise<void> {
	const url = `${DISCORD_API}/webhooks/${appId}/${interactionToken}/messages/@original`;
	const res = await fetch(url, {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
			"User-Agent": "discord-list/register-server-command"
		},
		body: JSON.stringify({ content })
	});

	if (!res.ok) {
		const text = await res.text().catch(() => `HTTP ${res.status}`);
		console.error("[register] editFollowup failed:", res.status, text);
	}
}

/**
 * fetch() with an AbortController timeout so a slow/unreachable Discord
 * upstream never hangs the background task indefinitely.
 */
async function fetchWithTimeout(
	url: string,
	options: RequestInit = {},
	timeoutMs = FETCH_TIMEOUT_MS
): Promise<Response> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetch(url, { ...options, signal: controller.signal });
	} finally {
		clearTimeout(timer);
	}
}

/** True iff a user with this Discord id has a row in the Users table. */
async function userExists(discordUserId: string): Promise<boolean> {
	const rows = await withDb((db: DrizzleDb) =>
		db.select({ id: Users.id }).from(Users).where(eq(Users.id, discordUserId)).limit(1)
	);
	return Array.isArray(rows) && rows.length > 0;
}

/**
 * Upsert a server row. On insert, returns `created: true` and seeds default
 * customisation fields. On update, only identity fields (name/icon/owner) are
 * touched so dashboard customisations (short, desc, slug, badges, votes) are
 * preserved.
 */
async function upsertServer(opts: {
	guildId: string;
	name: string;
	icon: string | null;
	ownerId: string;
}): Promise<{ created: boolean }> {
	const { guildId, name, icon, ownerId } = opts;

	const existing = await withDb((db: DrizzleDb) =>
		db.select({ id: Servers.id }).from(Servers).where(eq(Servers.id, guildId)).limit(1)
	);

	const isNew = !Array.isArray(existing) || existing.length === 0;

	if (isNew) {
		const now = new Date().toISOString();
		await withDb((db: DrizzleDb) =>
			db.insert(Servers).values({
				id: guildId,
				name,
				short: "Short description is not Updated.",
				desc: "Description is not updated.",
				icon: icon ?? "",
				owner: ownerId,
				slug: "",
				added_at: now,
				votes: 0,
				promoted: false,
				badges: JSON.stringify([])
			})
		);
	} else {
		await withDb((db: DrizzleDb) =>
			db
				.update(Servers)
				.set({ name, icon: icon ?? "", owner: ownerId })
				.where(eq(Servers.id, guildId))
		);
	}

	return { created: isNew };
}

export default {
	data: new SlashCommandBuilder()
		.setName("register")
		.setDescription("Register this server on the Rovel Discord List.")
		.setDMPermission(false),

	run(interaction: Record<string, any>, env?: Record<string, any>) {
		// ── 1. Guild-only guard (synchronous) ─────────────────────────────────
		const guildId: string | undefined = interaction.guild_id;
		if (!guildId) {
			return reply("❌ This command can only be used inside a server.");
		}

		// ── 2. Permission check (synchronous) ─────────────────────────────────
		const memberPermissions: string | null | undefined = interaction.member?.permissions;
		if (!hasRequiredPermission(memberPermissions)) {
			return reply(
				"❌ You need the **Manage Server** or **Administrator** permission to register this server."
			);
		}

		// ── 3. Resolve invoking user's Discord id (synchronous) ───────────────
		const discordUserId: string | undefined = interaction.member?.user?.id ?? interaction.user?.id;
		if (!discordUserId) {
			return reply("❌ Could not determine your Discord user id. Please try again.");
		}

		// ── 4. Resolve env values (synchronous) ──────────────────────────────
		const appId: string = env?.DISCORD_BOT_ID ?? "";
		const interactionToken: string = interaction.token;
		const domain: string = (env?.DOMAIN ?? "http://localhost:5173").replace(/\/$/, "");
		const botToken: string = env?.DISCORD_TOKEN ?? "";

		// ── All synchronous checks passed - defer and do the rest async ───────
		(async () => {
			try {
				// ── 5. Verify the user has a site account (in-process DB) ────
				let userIsRegistered = false;
				try {
					userIsRegistered = await userExists(discordUserId);
				} catch (err) {
					await reportError("[register] user-exists DB error", err);
					await editFollowup(
						appId,
						interactionToken,
						"⚠️ Could not verify your account status right now. Please try again in a moment."
					);
					return;
				}

				if (!userIsRegistered) {
					const loginUrl = `${domain}/login`;
					await editFollowup(
						appId,
						interactionToken,
						[
							"❌ You don't have an account on **Rovel Discord List** yet.",
							"",
							`👉 Please [create a free account](${loginUrl}) by logging in with Discord, then run \`/register\` again.`
						].join("\n")
					);
					return;
				}

				// ── 6. Fetch guild info from Discord ──────────────────────────
				let guildName = guildId;
				let guildIcon: string | null = null;

				if (botToken) {
					try {
						const guildRes = await fetchWithTimeout(
							`${DISCORD_API}/guilds/${encodeURIComponent(guildId)}`,
							{
								headers: {
									Authorization: `Bot ${botToken}`,
									"User-Agent": "RovelDiscordList/1.0 (+https://discord.rovelstars.com)"
								}
							}
						);

						if (guildRes.ok) {
							const guildData = await guildRes.json().catch(() => null);
							if (guildData) {
								guildName = guildData.name ?? guildId;
								guildIcon = guildData.icon ?? null;
							}
						} else {
							// Non-fatal: fall back to guild id as name.
							console.warn(
								`[register] Discord guild fetch returned ${guildRes.status} for guild ${guildId}`
							);
						}
					} catch (err) {
						// Non-fatal: continue with what we have.
						console.warn("[register] Could not fetch guild info from Discord:", err);
					}
				}

				// ── 7. Upsert the server row (in-process DB) ──────────────────
				let isNew = false;
				try {
					const result = await upsertServer({
						guildId,
						name: guildName.trim() || guildId,
						icon: guildIcon,
						ownerId: discordUserId
					});
					isNew = result.created;
				} catch (err) {
					const msg = err instanceof Error ? err.message : String(err);
					await reportError(`[register] DB upsert failed for guild ${guildId}`, err);
					await editFollowup(
						appId,
						interactionToken,
						[
							`❌ Registration failed (\`${msg}\`).`,
							"",
							"This usually means a database constraint wasn't met. Please contact the bot developer with this error code so they can investigate."
						].join("\n")
					);
					return;
				}

				// ── 8. Background side effects (fire-and-forget) ──────────────
				// Emoji + sticker sync run independently so a failure in one never
				// blocks the other - and neither blocks the user-facing reply.
				if (botToken) {
					syncServerEmojis(guildId, botToken)
						.then((result) => {
							if (result.error) {
								console.warn(
									`[register] Emoji sync for guild ${guildId} encountered an error: ${result.error}`
								);
							} else {
								console.info(
									`[register] Emoji sync complete for guild ${guildId}: ` +
										`+${result.created} new, ~${result.updated} updated (${result.total} total)`
								);
							}
						})
						.catch((err) => {
							console.warn(
								`[register] Background emoji sync threw unexpectedly for guild ${guildId}:`,
								err
							);
						});

					syncServerStickers(guildId, botToken)
						.then((result) => {
							if (result.error) {
								console.warn(
									`[register] Sticker sync for guild ${guildId} encountered an error: ${result.error}`
								);
							} else {
								console.info(
									`[register] Sticker sync complete for guild ${guildId}: ` +
										`+${result.created} new, ~${result.updated} updated (${result.total} total)`
								);
							}
						})
						.catch((err) => {
							console.warn(
								`[register] Background sticker sync threw unexpectedly for guild ${guildId}:`,
								err
							);
						});
				}

				// Notify IndexNow that a server page was created or updated.
				notifyServerChanged(guildId);

				// ── 9. Final user-facing reply ────────────────────────────────
				const serverUrl = `${domain}/servers/${encodeURIComponent(guildId)}`;

				await editFollowup(
					appId,
					interactionToken,
					[
						isNew
							? `✅ **${guildName}** has been successfully listed on Rovel Discord List!`
							: `✅ **${guildName}**'s listing has been updated on Rovel Discord List!`,
						"",
						`🔗 View your server's page: ${serverUrl}`,
						"",
						"😄 Custom emojis and 🪄 stickers are being synced in the background and will appear in the listing shortly.",
						`• Emojis: ${domain}/emojis?guild=${encodeURIComponent(guildId)}`,
						`• Stickers: ${domain}/stickers?guild=${encodeURIComponent(guildId)}`,
						"",
						"You can update your server's description and details from your dashboard."
					].join("\n")
				);
			} catch (fatalErr) {
				// Absolute last-resort - something totally unexpected slipped through.
				const msg = fatalErr instanceof Error ? fatalErr.message : String(fatalErr);
				await reportError("[register] Fatal unhandled error in background task", fatalErr);
				await editFollowup(
					appId,
					interactionToken,
					`💥 An unexpected error occurred: \`${msg}\`\nPlease try again or report this to the bot developer.`
				).catch(() => {});
			}
		})();

		// Return the deferred ephemeral response immediately - Discord shows
		// "Bot is thinking…" (visible only to the invoker) while the async
		// work above runs in the background.
		return DEFERRED_EPHEMERAL;
	}
};
