/**
 * resolve-support.ts
 *
 * Helpers for linking a bot to its support server. A bot's `support` field is a
 * Discord invite (full URL or bare code); we resolve it to a guild id so we can
 * check whether that guild is also listed on RDL and cross-link the two pages.
 */

/**
 * Extract the invite code from a `support` value, handling the common forms:
 *   https://discord.gg/abc, discord.gg/abc, https://discord.com/invite/abc,
 *   discordapp.com/invite/abc, or a bare "abc" code.
 * Returns null if no plausible code is found.
 */
export function extractInviteCode(support: string | null | undefined): string | null {
	if (!support) return null;
	const s = support.trim();
	// Strict: the WHOLE value must be a clean discord invite URL whose code is a
	// single path segment (letters/digits/dashes), optionally followed by a
	// trailing slash and/or ?query / #hash. This rejects malformed values like
	// "discord.gg/code.evil.com/x" or "code.tracker.me/discord" so we never
	// extract a partial code that could resolve to an unrelated/hijacked server.
	const m = s.match(
		/^(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/([A-Za-z0-9-]+)\/?(?:[?#].*)?$/i
	);
	if (m) return m[1];
	// Bare code (no scheme/host) - letters, digits and dashes only, nothing else.
	if (/^[A-Za-z0-9-]+$/.test(s)) return s;
	return null;
}

/**
 * Resolve a bot's `support` invite to the Discord guild id it points to.
 * Returns null when the value isn't an invite, the invite is invalid/expired,
 * or Discord is unreachable. Bounded by a short timeout so it never hangs a load.
 */
export async function resolveSupportGuildId(
	support: string | null | undefined,
	botToken: string
): Promise<string | null> {
	if (!support) return null;

	// RDL's deliberate "linked support server" format encodes the guild id as
	// "<slug>-<guildId>" (e.g. "intramind-786554286934327327"). Trust THAT, since
	// the slug prefix means it was set intentionally. A *bare* snowflake is NOT
	// trusted - it's usually junk/legacy data and would otherwise create a false
	// link to whatever server happens to own that id.
	const slugId = String(support).match(/^(.+)-(\d{17,20})$/);
	if (slugId && /[A-Za-z]/.test(slugId[1])) return slugId[2];

	const code = extractInviteCode(support);
	if (!code) return null;
	try {
		const res = await fetch(`https://discord.com/api/v10/invites/${encodeURIComponent(code)}`, {
			headers: {
				Authorization: `Bot ${botToken}`,
				"User-Agent": "discord-list/support"
			},
			signal: AbortSignal.timeout(4000)
		});
		if (!res.ok) return null;
		const data = await res.json();
		return (data?.guild?.id as string | undefined) ?? null;
	} catch {
		return null;
	}
}

/**
 * Resolve a bot's `support` invite to the target guild's display info (id, name,
 * icon hash). Used to render a rich support card even when the guild ISN'T listed
 * on RDL. Returns null for non-invites, dead invites, or Discord errors.
 */
export async function resolveSupportGuild(
	support: string | null | undefined,
	botToken: string
): Promise<{ id: string; name: string; icon: string | null } | null> {
	const code = extractInviteCode(support);
	if (!code) return null;
	try {
		const res = await fetch(`https://discord.com/api/v10/invites/${encodeURIComponent(code)}`, {
			headers: {
				Authorization: `Bot ${botToken}`,
				"User-Agent": "discord-list/support"
			},
			signal: AbortSignal.timeout(4000)
		});
		if (!res.ok) return null;
		const data = await res.json();
		const g = data?.guild;
		if (!g?.id) return null;
		return { id: String(g.id), name: String(g.name ?? "Discord Server"), icon: g.icon ?? null };
	} catch {
		return null;
	}
}
