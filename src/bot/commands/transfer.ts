import { SlashCommandBuilder } from "@discordjs/builders";
import { InteractionResponseType } from "discord-interactions";
import { eq } from "drizzle-orm";
import { withDb, type DrizzleDb } from "$lib/db";
import { Users } from "$lib/db/schema";
import { reportError } from "$lib/error-reporter";

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

/** Discriminated outcome of a balance transfer. */
type TransferResult =
	| { ok: true; fromBal: number; toBal: number }
	| {
			ok: false;
			error:
				| "sender_not_found"
				| "recipient_not_found"
				| "insufficient_balance"
				| "db_error";
			have?: number;
	  };

/**
 * Atomically* move R$ from one user to another, in-process.
 *
 * (* Not a true SQL transaction - libSQL via Drizzle doesn't expose interactive
 * transactions here - but the read-then-write order with a balance check
 * ensures we never go negative. Same guarantee the old HTTP endpoint provided.)
 */
async function transferBalance(
	fromId: string,
	toId: string,
	amount: number
): Promise<TransferResult> {
	try {
		const [senderRows, recipientRows] = await Promise.all([
			withDb((db: DrizzleDb) =>
				db
					.select({ id: Users.id, bal: Users.bal })
					.from(Users)
					.where(eq(Users.id, fromId))
					.limit(1)
			),
			withDb((db: DrizzleDb) =>
				db
					.select({ id: Users.id, bal: Users.bal })
					.from(Users)
					.where(eq(Users.id, toId))
					.limit(1)
			)
		]);

		const sender = Array.isArray(senderRows) && senderRows.length > 0 ? senderRows[0] : null;
		const recipient =
			Array.isArray(recipientRows) && recipientRows.length > 0 ? recipientRows[0] : null;

		if (!sender) return { ok: false, error: "sender_not_found" };
		if (!recipient) return { ok: false, error: "recipient_not_found" };

		const senderBal = typeof sender.bal === "number" ? sender.bal : Number(sender.bal) || 0;
		const recipientBal =
			typeof recipient.bal === "number" ? recipient.bal : Number(recipient.bal) || 0;

		if (senderBal < amount) {
			return { ok: false, error: "insufficient_balance", have: senderBal };
		}

		const newSenderBal = senderBal - amount;
		const newRecipientBal = recipientBal + amount;

		await Promise.all([
			withDb((db: DrizzleDb) =>
				db.update(Users).set({ bal: newSenderBal }).where(eq(Users.id, fromId))
			),
			withDb((db: DrizzleDb) =>
				db.update(Users).set({ bal: newRecipientBal }).where(eq(Users.id, toId))
			)
		]);

		return { ok: true, fromBal: newSenderBal, toBal: newRecipientBal };
	} catch (err) {
		await reportError(`[transfer] DB error transferring R$${amount} ${fromId} → ${toId}`, err);
		return { ok: false, error: "db_error" };
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
					content: `❌ Couldn't figure out who you are - please try again.`
				}
			};
		}

		if (!targetUserId) {
			return {
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: { content: `❌ Couldn't resolve that user - please try again.` }
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

		const amount = Math.floor(rawAmount);
		if (amount <= 0 || !Number.isFinite(amount)) {
			return {
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: { content: `❌ The amount must be a positive whole number.` }
			};
		}

		// ── Kick off the async work - no await so we return immediately ───────
		(async () => {
			try {
				const result = await transferBalance(senderId, targetUserId, amount);

				if (!result.ok) {
					const errMap: Record<string, string> = {
						sender_not_found: `👋 Hey **${senderName}**, looks like you don't have a Rovel Discord List account yet!\n\n👉 Head over to ${domain}/login to sign in with Discord - you'll receive **50 ${RC}** just for joining!`,
						recipient_not_found: `❌ **${targetName}** doesn't have a Rovel Discord List account yet, so the transfer couldn't go through.`,
						insufficient_balance: `❌ Not enough ${RC}, **${senderName}**! You only have **${result.have ?? "?"} ${RC}** but tried to send **${amount} ${RC}**.`,
						db_error: `⚠️ Something went wrong on our end while processing the transfer. Please try again in a moment!`
					};

					const msg =
						errMap[result.error] ??
						`⚠️ Transfer failed: \`${result.error}\` - please try again.`;
					await editFollowup(appId, interactionToken, msg);
					return;
				}

				await editFollowup(
					appId,
					interactionToken,
					[
						`${RC} **${senderName}** just sent **R$ ${amount}** to **${targetName}**!`,
						``,
						`> 💸 **${senderName}**'s new balance: **R$ ${result.fromBal}**`
					].join("\n")
				);
			} catch (err) {
				await reportError("[transfer] Background task failed", err);
				const msg = err instanceof Error ? err.message : String(err);
				await editFollowup(
					appId,
					interactionToken,
					`⚠️ Something went wrong on our end: \`${msg}\` - please try again in a moment.`
				).catch(() => {});
			}
		})();

		return {
			type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
		};
	}
};
