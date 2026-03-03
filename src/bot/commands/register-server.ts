import { SlashCommandBuilder } from "@discordjs/builders";
import { InteractionResponseType } from "discord-interactions";

/**
 * /register — Register the current Discord server on the listing site.
 *
 * Requirements:
 *  1. The invoking member must have "Manage Guild" (0x20) or "Administrator"
 *     (0x8) permission.
 *  2. The invoking user must already have an account on the site (i.e. a row
 *     in the Users table keyed by their Discord user id).
 *  3. On success the server is upserted into the Servers table with the
 *     invoking user recorded as owner.
 *
 * Response strategy:
 *  - All synchronous pre-flight checks (guild-only, permissions, missing config)
 *    return an immediate ephemeral CHANNEL_MESSAGE_WITH_SOURCE so Discord never
 *    times out waiting for us.
 *  - Once we know we need to do async work (network calls) we return
 *    DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE (ephemeral) immediately — Discord shows
 *    "Bot is thinking…" — and kick off a background IIFE that edits the original
 *    deferred message when it's done.
 *
 * This function NEVER throws — every code path returns a valid Discord
 * interaction response object so the caller never has to worry about
 * unhandled rejections causing "application did not respond" errors.
 */

const DISCORD_API = "https://discord.com/api/v10";

const MANAGE_GUILD = BigInt(0x20);
const ADMINISTRATOR = BigInt(0x8);

/** Timeout for every outbound fetch (ms). */
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

/** Immediate ephemeral reply — for synchronous pre-flight errors. */
function reply(content: string) {
	return {
		type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
		data: { content, flags: 64 }
	};
}

/** Deferred ephemeral response — tells Discord "Bot is thinking…" ephemerally. */
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
 * fetch() with an AbortController timeout so a slow/unreachable upstream
 * never hangs the background task indefinitely.
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
		const internalSecret: string = env?.INTERNAL_SECRET ?? "";
		const botToken: string = env?.DISCORD_TOKEN ?? "";

		if (!internalSecret) {
			console.error("[register] INTERNAL_SECRET is not configured.");
			return reply(
				"⚙️ The bot is not configured correctly (missing internal secret). Please contact the server admin."
			);
		}

		// ── All synchronous checks passed — defer and do the rest async ───────
		(async () => {
			try {
				// ── 5. Verify the user has a site account ─────────────────────
				let userExists = false;
				try {
					const res = await fetchWithTimeout(
						`${domain}/api/internals/user-exists?id=${encodeURIComponent(discordUserId)}`,
						{ headers: { "x-internal-secret": internalSecret } }
					);

					if (res.ok) {
						const body = await res.json().catch(() => null);
						userExists = body?.exists === true;
					} else {
						const text = await res.text().catch(() => `HTTP ${res.status}`);
						console.error(`[register] user-exists check failed (${res.status}):`, text);
						await editFollowup(
							appId,
							interactionToken,
							`⚠️ Could not verify your account status (HTTP ${res.status}). Please try again in a moment.`
						);
						return;
					}
				} catch (err) {
					const msg = err instanceof Error ? err.message : String(err);
					const isTimeout = msg.includes("abort") || msg.includes("timed out");
					console.error("[register] user-exists fetch error:", err);
					await editFollowup(
						appId,
						interactionToken,
						isTimeout
							? "⏱️ The listing service timed out while checking your account. Please try again in a moment."
							: `⚠️ Could not reach the listing service: \`${msg}\`. Please try again later.`
					);
					return;
				}

				if (!userExists) {
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

				// ── 7. Register / update the server via the internal API ──────
				let regResBody: any = null;
				let regResOk = false;
				let regResStatus = 0;

				try {
					const regRes = await fetchWithTimeout(`${domain}/api/internals/register-server`, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"x-internal-secret": internalSecret
						},
						body: JSON.stringify({
							id: guildId,
							name: guildName,
							icon: guildIcon,
							owner: discordUserId
						})
					});

					regResOk = regRes.ok;
					regResStatus = regRes.status;
					regResBody = await regRes.json().catch(() => null);
				} catch (err) {
					const msg = err instanceof Error ? err.message : String(err);
					const isTimeout = msg.includes("abort") || msg.includes("timed out");
					console.error("[register] register-server fetch error:", err);
					await editFollowup(
						appId,
						interactionToken,
						isTimeout
							? "⏱️ The registration request timed out. Please try again in a moment."
							: `⚠️ Could not complete registration: \`${msg}\`. Please try again later.`
					);
					return;
				}

				if (!regResOk) {
					const errDetail = regResBody?.error ?? regResBody?.message ?? `HTTP ${regResStatus}`;
					console.error(
						`[register] register-server API returned ${regResStatus} for guild ${guildId}:`,
						regResBody
					);
					await editFollowup(
						appId,
						interactionToken,
						[
							`❌ Registration failed (${errDetail}).`,
							"",
							"This usually means a database constraint wasn't met. Please contact the bot developer with this error code so they can investigate."
						].join("\n")
					);
					return;
				}

				const isNew: boolean = regResBody?.created === true;
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
						"You can update your server's description and details from your dashboard."
					].join("\n")
				);
			} catch (fatalErr) {
				// Absolute last-resort — something totally unexpected slipped through.
				const msg = fatalErr instanceof Error ? fatalErr.message : String(fatalErr);
				console.error("[register] Fatal unhandled error in background task:", fatalErr);
				await editFollowup(
					appId,
					interactionToken,
					`💥 An unexpected error occurred: \`${msg}\`\nPlease try again or report this to the bot developer.`
				).catch(() => {});
			}
		})();

		// Return the deferred ephemeral response immediately — Discord shows
		// "Bot is thinking…" (visible only to the invoker) while the async
		// work above runs in the background.
		return DEFERRED_EPHEMERAL;
	}
};
