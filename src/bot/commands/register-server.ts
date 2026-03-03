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
 * This function NEVER throws — every code path returns a valid Discord
 * interaction response object so the caller never has to worry about
 * unhandled rejections causing "application did not respond" errors.
 */

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

/** Ephemeral reply helper — keeps call sites tidy. */
function reply(content: string) {
	return {
		type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
		data: { content, flags: 64 }
	};
}

/**
 * fetch() with an AbortController timeout so a slow/unreachable upstream
 * never hangs the interaction past Discord's 3-second deadline.
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

	async run(interaction: Record<string, any>, env?: Record<string, any>) {
		try {
			// ── 1. Guild-only guard ───────────────────────────────────────────
			const guildId: string | undefined = interaction.guild_id;
			if (!guildId) {
				return reply("❌ This command can only be used inside a server.");
			}

			// ── 2. Permission check ───────────────────────────────────────────
			const memberPermissions: string | null | undefined = interaction.member?.permissions;
			if (!hasRequiredPermission(memberPermissions)) {
				return reply(
					"❌ You need the **Manage Server** or **Administrator** permission to register this server."
				);
			}

			// ── 3. Resolve invoking user's Discord id ─────────────────────────
			const discordUserId: string | undefined =
				interaction.member?.user?.id ?? interaction.user?.id;
			if (!discordUserId) {
				return reply("❌ Could not determine your Discord user id. Please try again.");
			}

			// ── 4. Build env values ───────────────────────────────────────────
			const domain: string = (env?.DOMAIN ?? "http://localhost:5173").replace(/\/$/, "");
			const internalSecret: string = env?.INTERNAL_SECRET ?? "";
			const botToken: string = env?.DISCORD_TOKEN ?? "";

			if (!internalSecret) {
				console.error("[register] INTERNAL_SECRET is not configured.");
				return reply(
					"⚙️ The bot is not configured correctly (missing internal secret). Please contact the server admin."
				);
			}

			// ── 5. Verify the user has a site account ─────────────────────────
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
					return reply(
						`⚠️ Could not verify your account status (HTTP ${res.status}). Please try again in a moment.`
					);
				}
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				const isTimeout = msg.includes("abort") || msg.includes("timed out");
				console.error("[register] user-exists fetch error:", err);
				return reply(
					isTimeout
						? "⏱️ The listing service timed out while checking your account. Please try again in a moment."
						: `⚠️ Could not reach the listing service: \`${msg}\`. Please try again later.`
				);
			}

			if (!userExists) {
				const loginUrl = `${domain}/login`;
				return reply(
					[
						"❌ You don't have an account on **Rovel Discord List** yet.",
						"",
						`👉 Please [create a free account](${loginUrl}) by logging in with Discord, then run \`/register\` again.`
					].join("\n")
				);
			}

			// ── 6. Fetch guild info from Discord ──────────────────────────────
			let guildName = guildId;
			let guildIcon: string | null = null;

			if (botToken) {
				try {
					const guildRes = await fetchWithTimeout(
						`https://discord.com/api/v10/guilds/${encodeURIComponent(guildId)}`,
						{
							headers: {
								Authorization: `Bot ${botToken}`,
								"User-Agent": "RovelDiscordList/1.0 (+https://rovelstars.com)"
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
						// Non-fatal: we'll fall back to the guild id as name.
						console.warn(
							`[register] Discord guild fetch returned ${guildRes.status} for guild ${guildId}`
						);
					}
				} catch (err) {
					// Non-fatal: continue with what we have.
					console.warn("[register] Could not fetch guild info from Discord:", err);
				}
			}

			// ── 7. Register / update the server via the internal API ──────────
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

				let resBody: any = null;
				try {
					resBody = await regRes.json();
				} catch {
					// body may be empty on some error paths
				}

				if (!regRes.ok) {
					// Surface the exact error from the API so we can debug it.
					const errDetail = resBody?.error ?? resBody?.message ?? `HTTP ${regRes.status}`;
					console.error(
						`[register] register-server API returned ${regRes.status} for guild ${guildId}:`,
						resBody
					);
					return reply(
						[
							`❌ Registration failed (${errDetail}).`,
							"",
							"This usually means a database constraint wasn't met. Please contact the bot developer with this error code so they can investigate."
						].join("\n")
					);
				}

				const isNew: boolean = resBody?.created === true;
				const serverUrl = `${domain}/servers/${encodeURIComponent(guildId)}`;

				return reply(
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
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				const isTimeout = msg.includes("abort") || msg.includes("timed out");
				console.error("[register] register-server fetch error:", err);
				return reply(
					isTimeout
						? "⏱️ The registration request timed out. Please try again in a moment."
						: `⚠️ Could not complete registration: \`${msg}\`. Please try again later.`
				);
			}
		} catch (fatalErr) {
			// Absolute last-resort — something totally unexpected happened.
			// Log the full error and return a graceful message instead of letting
			// the interaction expire with "application did not respond".
			const msg = fatalErr instanceof Error ? fatalErr.message : String(fatalErr);
			console.error("[register] Fatal unhandled error:", fatalErr);
			return {
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: {
					content: `💥 An unexpected error occurred: \`${msg}\`\nPlease try again or report this to the bot developer.`,
					flags: 64
				}
			};
		}
	}
};
