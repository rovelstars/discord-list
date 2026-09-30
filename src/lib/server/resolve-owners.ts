import { getUsersByIds } from "$lib/db/queries";
import { env } from "$env/dynamic/private";

/**
 * A bot/server owner resolved into display-ready info.
 *  - `hasProfile` is true only when the user exists in our Users table, which
 *    means /users/[id] will resolve to a real page (and the owner is therefore
 *    a registered member). Owners resolved purely via the Discord fallback get
 *    `hasProfile: false` and should NOT be linked to a profile page.
 *  - `private` mirrors the user's profile visibility flag (DB users only).
 */
export type ResolvedOwner = {
	id: string;
	name: string;
	/** Raw Discord avatar hash (or null). Render via getAvatarURL(id, avatar ?? "0"). */
	avatar: string | null;
	hasProfile: boolean;
	private: boolean;
};

/**
 * Resolve an array of Discord user ids (a bot's `owners` or a server's `owner`)
 * into display records, preserving input order.
 *
 * Strategy: one batched DB read for registered users, then a best-effort Discord
 * API lookup (using the bot token) for any ids not present locally. All Discord
 * failures degrade gracefully to an "Unknown user" entry - the page never breaks
 * because an owner couldn't be resolved.
 */
export async function resolveOwners(ids: string[]): Promise<ResolvedOwner[]> {
	const ordered = ids.filter(Boolean).map(String);
	if (ordered.length === 0) return [];

	const known = await getUsersByIds(ordered);
	const knownMap = new Map(known.map((u) => [u.id, u]));

	const token = env.DISCORD_TOKEN;

	return Promise.all(
		ordered.map(async (id) => {
			const u = knownMap.get(id);
			if (u) {
				return {
					id,
					name: u.globalname || u.username || "Unknown user",
					avatar: u.avatar,
					hasProfile: true,
					private: u.private
				} satisfies ResolvedOwner;
			}

			// Not a registered member - best-effort Discord lookup for a face + name.
			if (token) {
				try {
					const res = await fetch(`https://discord.com/api/v10/users/${id}`, {
						headers: { Authorization: `Bot ${token}` }
					});
					if (res.ok) {
						const d = await res.json();
						return {
							id,
							name: d.global_name || d.username || "Unknown user",
							avatar: (d.avatar ?? null) as string | null,
							hasProfile: false,
							private: false
						} satisfies ResolvedOwner;
					}
				} catch {
					/* fall through to unknown */
				}
			}

			return {
				id,
				name: "Unknown user",
				avatar: null,
				hasProfile: false,
				private: false
			} satisfies ResolvedOwner;
		})
	);
}
