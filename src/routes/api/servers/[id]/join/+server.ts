// discord-list/src/routes/api/servers/[id]/join/+server.ts
import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import DiscordOauth2 from "discord-oauth2";
import { getServerByIdOrSlug } from "$lib/db/queries";
import { env } from "$env/dynamic/private";

/**
 * POST /api/servers/[id]/join
 *
 * Gets the visitor into a listed server without relying on a static invite link.
 * Tries three strategies, in order, and returns the first that works:
 *
 *   1. DIRECT ADD - if the visitor is logged in with the `guilds.join` OAuth
 *      scope, our bot adds them straight into the guild via
 *      PUT /guilds/{id}/members/{user} (using their access token). One click,
 *      no invite page. Requires the bot to be in the guild with CREATE_INSTANT_INVITE.
 *
 *   2. ONE-TIME INVITE - the bot mints a fresh invite on a suitable channel with
 *      max_uses=1 and a short max_age (1 day) so it can't flood the guild's
 *      invite list. Returns the discord.gg URL to redirect to.
 *
 *   3. EXISTING INVITE - as a last resort, fetch the guild's current invites
 *      (needs MANAGE_GUILD) and hand back any one of them.
 *
 * Response:
 *   200 { joined: true, already }           - strategy 1 succeeded
 *   200 { inviteUrl }                        - strategy 2 or 3 succeeded
 *   404 { err: 'server_not_found' }
 *   502 { err: 'no_join_method' }            - every strategy failed
 *   500 { err: 'missing_token' | 'server_error' }
 */

const DISCORD_API = "https://discord.com/api/v10";

/** Channel types we can mint an invite on, in preference order. */
const INVITABLE_TYPES = [
	0, // GUILD_TEXT
	5, // GUILD_ANNOUNCEMENT
	2 // GUILD_VOICE
];

function botHeaders(token: string) {
	return {
		Authorization: `Bot ${token}`,
		"Content-Type": "application/json",
		"User-Agent": "discord-list/join"
	};
}

/** Parse the (possibly raw-JSON-text) channels column into an array. */
function parseChannels(raw: unknown): Array<{ id: string; type: number; name?: string }> {
	if (Array.isArray(raw)) return raw as any[];
	if (typeof raw === "string") {
		try {
			const p = JSON.parse(raw);
			return Array.isArray(p) ? p : [];
		} catch {
			return [];
		}
	}
	return [];
}

export const POST: RequestHandler = async ({ params, cookies }) => {
	try {
		const token = (env.DISCORD_TOKEN ?? "").trim();
		if (!token) {
			return json({ err: "missing_token" }, { status: 500 });
		}

		const idOrSlug = params.id;
		if (!idOrSlug) {
			return json({ err: "server_not_found" }, { status: 404 });
		}

		const server = await getServerByIdOrSlug(idOrSlug);
		if (!server) {
			return json({ err: "server_not_found" }, { status: 404 });
		}

		const guildId = server.id;

		// ── Strategy 1: direct add (logged-in + guilds.join scope) ──────────────
		const userKey = cookies.get("key");
		let loggedIn = false;
		if (userKey) {
			try {
				const oauth2 = new DiscordOauth2({
					clientId: env.DISCORD_BOT_ID,
					clientSecret: env.DISCORD_SECRET,
					redirectUri: (env.DOMAIN ?? "http://localhost:5173") + "/api/auth"
				});
				const viewer = await oauth2.getUser(String(userKey));
				if (viewer?.id) {
					loggedIn = true;
					const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${viewer.id}`, {
						method: "PUT",
						headers: botHeaders(token),
						body: JSON.stringify({ access_token: userKey })
					});
					// 201 = added, 204 = was already a member. Both mean "they're in".
					if (res.status === 201 || res.status === 204) {
						return json({ joined: true, already: res.status === 204 }, { status: 200 });
					}
					// Any other status (403 missing scope/perms, etc.) → fall through.
				}
			} catch {
				/* token invalid/expired or Discord error → fall through to invite */
			}
		}

		// ── Strategy 2: mint a one-time, short-lived invite ─────────────────────
		let channels = parseChannels((server as any).channels);

		// If we have no stored channel list, fetch it live so we can still invite.
		if (channels.length === 0) {
			try {
				const res = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
					headers: botHeaders(token)
				});
				if (res.ok) channels = (await res.json()) as any[];
			} catch {
				/* ignore - handled by the no-channel fallthrough below */
			}
		}

		const candidates = channels
			.filter((c) => INVITABLE_TYPES.includes(Number(c.type)))
			.sort((a, b) => INVITABLE_TYPES.indexOf(Number(a.type)) - INVITABLE_TYPES.indexOf(Number(b.type)))
			.slice(0, 5);

		for (const ch of candidates) {
			try {
				const res = await fetch(`${DISCORD_API}/channels/${ch.id}/invites`, {
					method: "POST",
					headers: botHeaders(token),
					body: JSON.stringify({
						max_age: 86400, // 1 day - minimum sane expiry, keeps the invite list clean
						max_uses: 1, // single use
						unique: true,
						temporary: false
					})
				});
				if (res.ok) {
					const inv = await res.json();
					if (inv?.code) {
						return json({ inviteUrl: `https://discord.gg/${inv.code}` }, { status: 200 });
					}
				}
				// 403 on this channel → try the next candidate.
			} catch {
				/* try next channel */
			}
		}

		// ── Strategy 3: reuse an existing guild invite ──────────────────────────
		try {
			const res = await fetch(`${DISCORD_API}/guilds/${guildId}/invites`, {
				headers: botHeaders(token)
			});
			if (res.ok) {
				const invites = (await res.json()) as Array<{ code: string }>;
				const existing = Array.isArray(invites) ? invites.find((i) => i?.code) : null;
				if (existing) {
					return json({ inviteUrl: `https://discord.gg/${existing.code}` }, { status: 200 });
				}
			}
		} catch {
			/* fall through to the final error */
		}

		// ── Nothing worked ──────────────────────────────────────────────────────
		// If the visitor isn't logged in, the one path we haven't tried is direct
		// add (which needs their token). Ask them to log in so we can attempt it.
		if (!loggedIn) {
			return json({ err: "needs_login" }, { status: 401 });
		}
		// Logged in and still stuck → our bot lacks invite/add permission in this
		// guild and there's no existing invite to hand out. Be honest about it.
		return json({ err: "cannot_join" }, { status: 502 });
	} catch (err) {
		console.error("[POST /api/servers/[id]/join] Unexpected error:", err);
		return json(
			{ err: "server_error", message: err instanceof Error ? err.message : String(err) },
			{ status: 500 }
		);
	}
};
