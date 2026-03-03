import { SlashCommandBuilder } from "@discordjs/builders";
import { InteractionResponseType } from "discord-interactions";

const DISCORD_API = "https://discord.com/api/v10";

/** Rcoin custom emoji shorthand */
const RC = "<:Rcoin:948896802298548224>";

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
			"User-Agent": "discord-list/bal-command (+https://github.com)"
		},
		body: JSON.stringify({ content })
	});

	if (!res.ok) {
		const text = await res.text().catch(() => `HTTP ${res.status}`);
		console.error("[bal] editFollowup failed:", res.status, text);
	}
}

export default {
	data: new SlashCommandBuilder()
		.setName("bal")
		.setDescription("Check your Rcoin balance, or peek at someone else's.")
		.addUserOption((opt) =>
			opt
				.setName("user")
				.setDescription("The user whose balance to check (defaults to you).")
				.setRequired(false)
		),

	run(interaction: Record<string, any>, env?: Record<string, string>) {
		const appId = env?.DISCORD_BOT_ID ?? "";
		const interactionToken: string = interaction.token;
		const domain = (env?.DOMAIN ?? "http://localhost:5173").replace(/\/$/, "");
		const internalSecret = env?.INTERNAL_SECRET ?? "";

		const invokerId: string | undefined = interaction.member?.user?.id ?? interaction.user?.id;
		const invokerName: string =
			interaction.member?.user?.global_name ??
			interaction.member?.user?.username ??
			interaction.user?.global_name ??
			interaction.user?.username ??
			"You";

		// Target is the specified user, or the invoker if none given.
		const resolvedUsers = interaction.data?.resolved?.users ?? {};
		const resolvedUserIds = Object.keys(resolvedUsers);
		const targetUserId: string =
			resolvedUserIds.length > 0 ? resolvedUserIds[0] : (invokerId ?? "");

		const isSelf = targetUserId === invokerId;

		// ── Synchronous pre-flight checks ────────────────────────────────────
		if (!invokerId) {
			return {
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: {
					content: `❌ Couldn't figure out who you are — please try again.`
				}
			};
		}

		if (!targetUserId) {
			return {
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: { content: `❌ Couldn't resolve that user — please try again.` }
			};
		}

		if (!internalSecret) {
			console.error("[bal] INTERNAL_SECRET is not configured.");
			return {
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: {
					content: `⚙️ The bot isn't configured correctly. Please contact the server admin.`
				}
			};
		}

		// ── Kick off the async work ───────────────────────────────────────────
		(async () => {
			try {
				const res = await fetch(
					`${domain}/api/internals/user-exists?id=${encodeURIComponent(targetUserId)}`,
					{ headers: { "x-internal-secret": internalSecret } }
				);

				if (!res.ok) {
					await editFollowup(
						appId,
						interactionToken,
						`⚠️ Couldn't reach the Rovel Discord List service right now (HTTP ${res.status}). Try again in a moment!`
					);
					return;
				}

				const data = await res.json().catch(() => null);

				if (!data?.exists) {
					const targetUser = resolvedUsers[targetUserId];
					const targetName =
						targetUser?.global_name ?? targetUser?.username ?? `<@${targetUserId}>`;
					await editFollowup(
						appId,
						interactionToken,
						isSelf
							? `👋 Hey **${invokerName}**, looks like you don't have a Rovel Discord List account yet!\n\n👉 Head over to ${domain}/login to sign in with Discord and get started — you'll receive **50 ${RC}** just for joining!`
							: `❌ **${targetName}** doesn't have a Rovel Discord List account yet, so there's no balance to show.`
					);
					return;
				}

				const bal: number = typeof data.bal === "number" ? data.bal : Number(data.bal) || 0;

				const targetUser = resolvedUsers[targetUserId];
				const targetName = targetUser?.global_name ?? targetUser?.username ?? `<@${targetUserId}>`;

				await editFollowup(
					appId,
					interactionToken,
					isSelf
						? `${RC} **${invokerName}**, your current balance is **${bal} ${RC}**!`
						: `${RC} **${targetName}** has a balance of **${bal} ${RC}**.`
				);
			} catch (err) {
				console.error("[bal] Background task failed:", err);
				const msg = err instanceof Error ? err.message : String(err);
				await editFollowup(
					appId,
					interactionToken,
					`⚠️ Something went wrong on our end: \`${msg}\` — please try again in a moment.`
				).catch(() => {});
			}
		})();

		// Return deferred public response immediately.
		return {
			type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
		};
	}
};
