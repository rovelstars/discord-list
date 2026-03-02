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
 * The command is guild-only (it makes no sense in DMs) so we always read
 * interaction.member instead of interaction.user.
 */

const MANAGE_GUILD = BigInt(0x20);
const ADMINISTRATOR = BigInt(0x8);

function hasRequiredPermission(permissionsString: string | null | undefined): boolean {
	if (!permissionsString) return false;
	try {
		const perms = BigInt(permissionsString);
		return (perms & ADMINISTRATOR) === ADMINISTRATOR || (perms & MANAGE_GUILD) === MANAGE_GUILD;
	} catch {
		return false;
	}
}

export default {
	data: new SlashCommandBuilder()
		.setName("register")
		.setDescription("Register this server on the Rovel Discord List.")
		.setDMPermission(false),

	async run(interaction: Record<string, any>, env?: Record<string, any>) {
		// ── 1. Guild-only guard ───────────────────────────────────────────────
		const guildId: string | undefined = interaction.guild_id;
		if (!guildId) {
			return {
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: {
					content: "❌ This command can only be used inside a server.",
					flags: 64 // ephemeral
				}
			};
		}

		// ── 2. Permission check ───────────────────────────────────────────────
		const member = interaction.member;
		const memberPermissions: string | null | undefined = member?.permissions;

		if (!hasRequiredPermission(memberPermissions)) {
			return {
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: {
					content:
						"❌ You need the **Manage Server** or **Administrator** permission to register this server.",
					flags: 64
				}
			};
		}

		// ── 3. Resolve the invoking user's Discord id ─────────────────────────
		const discordUserId: string | undefined =
			member?.user?.id ?? interaction.user?.id;

		if (!discordUserId) {
			return {
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: {
					content: "❌ Could not determine your Discord user id. Please try again.",
					flags: 64
				}
			};
		}

		// ── 4. Verify the user has a site account ────────────────────────────
		// We call our own internal API endpoint so we don't need to import DB
		// helpers directly into the command (keeps the command portable).
		const domain: string = env?.DOMAIN ?? "http://localhost:5173";
		const internalSecret: string = env?.INTERNAL_SECRET ?? "";

		let userExists = false;
		try {
			const res = await fetch(
				`${domain}/api/internals/user-exists?id=${encodeURIComponent(discordUserId)}`,
				{
					headers: {
						"x-internal-secret": internalSecret
					}
				}
			);
			if (res.ok) {
				const body = await res.json().catch(() => null);
				userExists = body?.exists === true;
			}
		} catch {
			return {
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: {
					content:
						"⚠️ Could not reach the listing service right now. Please try again in a moment.",
					flags: 64
				}
			};
		}

		if (!userExists) {
			const loginUrl = `${domain}/login`;
			return {
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: {
					content: [
						"❌ You don't have an account on **Rovel Discord List** yet.",
						"",
						`👉 Please [create a free account](${loginUrl}) by logging in with Discord, then run \`/register\` again.`
					].join("\n"),
					flags: 64
				}
			};
		}

		// ── 5. Fetch guild info from Discord so we can store icon + name ──────
		const botToken: string = env?.DISCORD_TOKEN ?? "";
		let guildName = guildId;
		let guildIcon: string | null = null;

		try {
			const guildRes = await fetch(
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
			}
		} catch {
			// Non-fatal — we'll register with just the id as name
		}

		// ── 6. Register / update the server via the internal API ─────────────
		try {
			const body = {
				id: guildId,
				name: guildName,
				icon: guildIcon,
				owner: discordUserId
			};

			const regRes = await fetch(`${domain}/api/internals/register-server`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-internal-secret": internalSecret
				},
				body: JSON.stringify(body)
			});

			if (!regRes.ok) {
				const errBody = await regRes.json().catch(() => null);
				const message = errBody?.error ?? `HTTP ${regRes.status}`;
				return {
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						content: `❌ Registration failed: ${message}`,
						flags: 64
					}
				};
			}

			const result = await regRes.json().catch(() => null);
			const isNew: boolean = result?.created === true;
			const serverUrl = `${domain}/servers/${encodeURIComponent(guildId)}`;

			return {
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: {
					content: [
						isNew
							? `✅ **${guildName}** has been successfully listed on Rovel Discord List!`
							: `✅ **${guildName}**'s listing has been updated on Rovel Discord List!`,
						"",
						`🔗 View your server's page: ${serverUrl}`,
						"",
						"You can update your server's description and tags from your dashboard."
					].join("\n"),
					flags: 64
				}
			};
		} catch {
			return {
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: {
					content: "⚠️ Something went wrong while registering. Please try again later.",
					flags: 64
				}
			};
		}
	}
};
