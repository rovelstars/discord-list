import { SlashCommandBuilder } from "@discordjs/builders";
import { InteractionResponseType } from "discord-interactions";

/**
 * /sync — Force-sync all custom emojis from the current server into the listing.
 *
 * Requirements:
 *  1. Must be run inside a server (no DMs).
 *  2. Invoking member must have "Manage Guild" (0x20) or "Administrator" (0x8).
 *  3. The server must already be registered on the listing site.
 *
 * Response strategy:
 *  - Synchronous pre-flight checks return an immediate ephemeral reply.
 *  - Actual sync work is deferred (DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE) so
 *    Discord never times out while we hit the internal API.
 */

const DISCORD_API = "https://discord.com/api/v10";
const MANAGE_GUILD = BigInt(0x20);
const ADMINISTRATOR = BigInt(0x8);
const FETCH_TIMEOUT_MS = 15_000;

function hasRequiredPermission(permissionsString: string | null | undefined): boolean {
	if (!permissionsString) return false;
	try {
		const perms = BigInt(permissionsString);
		return (perms & ADMINISTRATOR) === ADMINISTRATOR || (perms & MANAGE_GUILD) === MANAGE_GUILD;
	} catch {
		return false;
	}
}

function reply(content: string) {
	return {
		type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
		data: { content, flags: 64 }
	};
}

const DEFERRED_EPHEMERAL = {
	type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
	data: { flags: 64 }
};

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
			"User-Agent": "discord-list/sync-emojis-command"
		},
		body: JSON.stringify({ content })
	});

	if (!res.ok) {
		const text = await res.text().catch(() => `HTTP ${res.status}`);
		console.error("[sync] editFollowup failed:", res.status, text);
	}
}

export default {
	data: new SlashCommandBuilder()
		.setName("sync")
		.setDescription("Force-sync this server's custom emojis into the Rovel Discord List.")
		.setDMPermission(false),

	run(interaction: Record<string, any>, env?: Record<string, any>) {
		// ── 1. Guild-only guard ────────────────────────────────────────────────
		const guildId: string | undefined = interaction.guild_id;
		if (!guildId) {
			return reply("❌ This command can only be used inside a server.");
		}

		// ── 2. Permission check ────────────────────────────────────────────────
		const memberPermissions: string | null | undefined = interaction.member?.permissions;
		if (!hasRequiredPermission(memberPermissions)) {
			return reply(
				"❌ You need the **Manage Server** or **Administrator** permission to sync emojis."
			);
		}

		// ── 3. Resolve env values ──────────────────────────────────────────────
		const appId: string = env?.DISCORD_BOT_ID ?? "";
		const interactionToken: string = interaction.token;
		const domain: string = (env?.DOMAIN ?? "http://localhost:5173").replace(/\/$/, "");
		const internalSecret: string = env?.INTERNAL_SECRET ?? "";

		if (!internalSecret) {
			console.error("[sync] INTERNAL_SECRET is not configured.");
			return reply(
				"⚙️ The bot is not configured correctly (missing internal secret). Please contact the server admin."
			);
		}

		// ── All synchronous checks passed — defer and do the rest async ────────
		(async () => {
			try {
				// ── 4. Trigger sync via the internal API ───────────────────────
				let syncResBody: any = null;
				let syncResOk = false;
				let syncResStatus = 0;

				try {
					const syncRes = await fetchWithTimeout(
						`${domain}/api/internals/sync-emojis`,
						{
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								"x-internal-secret": internalSecret
							},
							body: JSON.stringify({ guildId })
						}
					);

					syncResOk = syncRes.ok;
					syncResStatus = syncRes.status;
					syncResBody = await syncRes.json().catch(() => null);
				} catch (err) {
					const msg = err instanceof Error ? err.message : String(err);
					const isTimeout = msg.includes("abort") || msg.includes("timed out");
					console.error("[sync] sync-emojis fetch error:", err);
					await editFollowup(
						appId,
						interactionToken,
						isTimeout
							? "⏱️ The sync request timed out. Please try again in a moment."
							: `⚠️ Could not reach the listing service: \`${msg}\`. Please try again later.`
					);
					return;
				}

				if (!syncResOk) {
					// 404 means the server isn't registered yet
					if (syncResStatus === 404) {
						await editFollowup(
							appId,
							interactionToken,
							[
								"❌ This server is not yet registered on **Rovel Discord List**.",
								"",
								"Run `/register` first to add your server to the listing, then use `/sync` to update its emojis."
							].join("\n")
						);
						return;
					}

					const errDetail =
						syncResBody?.error ?? syncResBody?.message ?? `HTTP ${syncResStatus}`;
					console.error(
						`[sync] sync-emojis API returned ${syncResStatus} for guild ${guildId}:`,
						syncResBody
					);
					await editFollowup(
						appId,
						interactionToken,
						`❌ Sync failed (${errDetail}). Please try again or contact the bot developer.`
					);
					return;
				}

				// ── 5. Report results ──────────────────────────────────────────
				const created: number = syncResBody?.created ?? 0;
				const updated: number = syncResBody?.updated ?? 0;
				const total: number = syncResBody?.total ?? 0;
				const emojisUrl = `${domain}/emojis?guild=${encodeURIComponent(guildId)}`;

				if (total === 0) {
					await editFollowup(
						appId,
						interactionToken,
						[
							"ℹ️ No custom emojis found in this server.",
							"",
							"Once you add custom emojis to your server, run `/sync` again to list them."
						].join("\n")
					);
					return;
				}

				const lines: string[] = [
					`✅ Emoji sync complete for **${interaction.guild?.name ?? guildId}**!`,
					"",
					`📊 **Results:**`,
					`• 🆕 New emojis added: **${created}**`,
					`• 🔄 Existing emojis updated: **${updated}**`,
					`• 📦 Total emojis synced: **${total}**`,
					"",
					`🔗 View your server's emojis: ${emojisUrl}`
				];

				await editFollowup(appId, interactionToken, lines.join("\n"));
			} catch (fatalErr) {
				const msg = fatalErr instanceof Error ? fatalErr.message : String(fatalErr);
				console.error("[sync] Fatal unhandled error in background task:", fatalErr);
				await editFollowup(
					appId,
					interactionToken,
					`💥 An unexpected error occurred: \`${msg}\`\nPlease try again or report this to the bot developer.`
				).catch(() => {});
			}
		})();

		return DEFERRED_EPHEMERAL;
	}
};
