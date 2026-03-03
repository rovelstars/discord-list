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
			"User-Agent": "discord-list/transfer-command (+https://github.com)"
		},
		body: JSON.stringify({ content })
	});

	if (!res.ok) {
		const text = await res.text().catch(() => `HTTP ${res.status}`);
		console.error("[transfer] editFollowup failed:", res.status, text);
	}
}

export default {
	data: new SlashCommandBuilder()
		.setName("transfer")
		.setDescription("Send some of your R$ to another user on Rovel Discord List.")
		.addUserOption((opt) =>
			opt.setName("user").setDescription("The user you want to send R$ to.").setRequired(true)
		)
		.addIntegerOption((opt) =>
			opt
				.setName("amount")
				.setDescription("How many R$ to send (whole numbers only).")
				.setRequired(true)
				.setMinValue(1)
		),

	run(interaction: Record<string, any>, env?: Record<string, string>) {
		const appId = env?.DISCORD_BOT_ID ?? "";
		const interactionToken: string = interaction.token;
		const domain = (env?.DOMAIN ?? "http://localhost:5173").replace(/\/$/, "");
		const internalSecret = env?.INTERNAL_SECRET ?? "";

		const senderId: string | undefined = interaction.member?.user?.id ?? interaction.user?.id;
		const senderName: string =
			interaction.member?.user?.global_name ??
			interaction.member?.user?.username ??
			interaction.user?.global_name ??
			interaction.user?.username ??
			"You";

		// Resolve the target user from the resolved data Discord sends
		const resolvedUsers = interaction.data?.resolved?.users ?? {};
		const targetUserId: string | undefined = Object.keys(resolvedUsers)[0];
		const targetUser = targetUserId ? resolvedUsers[targetUserId] : undefined;
		const targetName =
			targetUser?.global_name ??
			targetUser?.username ??
			(targetUserId ? `<@${targetUserId}>` : "that user");

		const rawAmount: number | undefined = interaction.data?.options?.find(
			(o: any) => o.name === "amount"
		)?.value;

		// ── Synchronous pre-flight checks (before deferring) ─────────────────
		if (!senderId) {
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

		if (senderId === targetUserId) {
			return {
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: {
					content: `${RC} You can't send R$ to yourself, **${senderName}**!`
				}
			};
		}

		if (rawAmount === undefined || rawAmount === null) {
			return {
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: { content: `❌ Please specify how many ${RC} to send.` }
			};
		}

		// Enforce integer — Discord's addIntegerOption already prevents floats
		// from the client side, but guard server-side too.
		const amount = Math.floor(rawAmount);
		if (amount <= 0 || !Number.isFinite(amount)) {
			return {
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: { content: `❌ The amount must be a positive whole number.` }
			};
		}

		if (!internalSecret) {
			console.error("[transfer] INTERNAL_SECRET is not configured.");
			return {
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: {
					content: `⚙️ The bot isn't configured correctly. Please contact the server admin.`
				}
			};
		}

		// ── Kick off the async work — no await so we return immediately ───────
		(async () => {
			try {
				const res = await fetch(`${domain}/api/internals/transfer-bal`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-internal-secret": internalSecret
					},
					body: JSON.stringify({
						from: senderId,
						to: targetUserId,
						amount
					})
				});

				const data = await res.json().catch(() => null);

				if (!res.ok || !data?.success) {
					const errKey = data?.error ?? "";
					const errMap: Record<string, string> = {
						sender_not_found: `👋 Hey **${senderName}**, looks like you don't have a Rovel Discord List account yet!\n\n👉 Head over to ${domain}/login to sign in with Discord — you'll receive **50 ${RC}** just for joining!`,
						recipient_not_found: `❌ **${targetName}** doesn't have a Rovel Discord List account yet, so the transfer couldn't go through.`,
						insufficient_balance: `❌ Not enough ${RC}, **${senderName}**! You only have **${data?.have ?? "?"} ${RC}** but tried to send **${amount} ${RC}**.`,
						same_user: `❌ You can't send ${RC} to yourself, **${senderName}**!`,
						invalid_amount: `❌ The amount must be a positive whole number.`,
						db_error: `⚠️ Something went wrong on our end while processing the transfer. Please try again in a moment!`,
						Unauthorized: `⚙️ Internal auth error. Please contact the server admin.`
					};

					const msg =
						errMap[errKey] ??
						`⚠️ Transfer failed: \`${errKey || "unknown error"}\` — please try again.`;
					await editFollowup(appId, interactionToken, msg);
					return;
				}

				await editFollowup(
					appId,
					interactionToken,
					[
						`${RC} **${senderName}** just sent **R$ ${amount}** to **${targetName}**!`,
						``,
						`> 💸 **${senderName}**'s new balance: **R$ ${data.fromBal}**`
					].join("\n")
				);
			} catch (err) {
				console.error("[transfer] Background task failed:", err);
				const msg = err instanceof Error ? err.message : String(err);
				await editFollowup(
					appId,
					interactionToken,
					`⚠️ Something went wrong on our end: \`${msg}\` — please try again in a moment.`
				).catch(() => {});
			}
		})();

		// Return deferred public response immediately — Discord shows "Bot is thinking…"
		// while the transfer processes in the background.
		return {
			type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
		};
	}
};
