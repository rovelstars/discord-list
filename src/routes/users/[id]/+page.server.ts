import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { getUserProfile, getBotsByOwner, getServersByOwner } from "$lib/db/queries";
import { refreshUser } from "$lib/user-refresh";
import DiscordOauth2 from "discord-oauth2";
import { env } from "$env/dynamic/private";

/** Re-sync a profile's Discord identity when its data is older than this (24h). */
const USER_SYNC_STALE_MS = 24 * 60 * 60 * 1000;

/**
 * /users/[id] - public-facing user profile.
 *
 * Visibility model (privacy-first):
 *   - A profile is PUBLICLY viewable only when the user is a "developer"
 *     (owns at least one listed bot or server) AND has not flipped their
 *     profile to private. This protects the ~80% of normal accounts that
 *     have nothing listed - their page is never exposed to strangers.
 *   - The owner can always view their own page (self-view), regardless of
 *     the dev/private state, so they can preview what others would see.
 *
 * The route is deliberately NOT indexable: an X-Robots-Tag header is set here,
 * a matching <meta name="robots"> is rendered in +page.svelte, the path is
 * excluded from the sitemap, and robots.txt disallows /users/.
 */
export const load: PageServerLoad = async ({ params, cookies, setHeaders }) => {
	const id = params.id?.trim();
	if (!id) {
		throw redirect(302, "/404");
	}

	let profile = await getUserProfile(id);
	if (!profile) {
		throw redirect(302, "/404");
	}

	// Lazily re-sync the user's Discord identity (avatar/username/globalname) when
	// stale, reusing the same fire-on-load pattern as bot/server pages. Awaited
	// (not fire-and-forget) because this page is never CDN-cached, so the visitor
	// sees the fresh data on this very load. Failures are swallowed inside
	// refreshUser, so this never breaks the page.
	const token = (env.DISCORD_TOKEN ?? "").trim();
	const isStale =
		!profile.synced_at || Date.now() - new Date(profile.synced_at).getTime() > USER_SYNC_STALE_MS;
	if (token && isStale) {
		try {
			const res = await refreshUser(id, token, { triggeredBy: "profile-page-load", minAgeMs: 0 });
			if (res.updated) {
				const fresh = await getUserProfile(id);
				if (fresh) profile = fresh;
			}
		} catch {
			/* non-fatal - render with the data we already have */
		}
	}

	const [bots, servers] = await Promise.all([getBotsByOwner(id), getServersByOwner(id)]);

	const isDev = bots.length > 0 || servers.length > 0;
	const publiclyViewable = isDev && !profile.private;

	// Only resolve the viewer (a Discord round-trip) when the page would
	// otherwise be hidden - i.e. we need to check whether this is a self-view.
	let isSelf = false;
	if (!publiclyViewable) {
		const key = cookies.get("key");
		if (key) {
			try {
				const oauth2 = new DiscordOauth2({
					clientId: env.DISCORD_BOT_ID,
					clientSecret: env.DISCORD_SECRET,
					redirectUri: (env.DOMAIN ?? "http://localhost:5173") + "/api/auth"
				});
				const viewer = await oauth2.getUser(String(key));
				if (viewer?.id && viewer.id === profile.id) isSelf = true;
			} catch {
				/* invalid/expired key - treat as anonymous */
			}
		}
	}

	const visible = publiclyViewable || isSelf;

	// Never let a CDN cache a visibility-sensitive profile page, and keep every
	// profile out of search indexes.
	setHeaders({
		"X-Robots-Tag": "noindex, nofollow, noarchive",
		"cache-control": "private, no-store"
	});

	// When hidden, leak nothing beyond the always-public Discord identity
	// (name + avatar) so the "private profile" card can still render a face.
	if (!visible) {
		return {
			visible: false as const,
			isSelf: false,
			isDev,
			profile: {
				id: profile.id,
				username: profile.username,
				globalname: profile.globalname,
				discriminator: profile.discriminator,
				avatar: profile.avatar
			},
			bots: [],
			servers: [],
			stats: { botCount: 0, serverCount: 0, totalVotes: 0, totalServers: 0 }
		};
	}

	const totalVotes = bots.reduce((s, b) => s + (b.votes ?? 0), 0);
	const totalServers = bots.reduce((s, b) => s + (b.servers ?? 0), 0);

	return {
		visible: true as const,
		isSelf,
		isDev,
		profile,
		bots,
		servers,
		stats: {
			botCount: bots.length,
			serverCount: servers.length,
			totalVotes,
			totalServers
		}
	};
};
