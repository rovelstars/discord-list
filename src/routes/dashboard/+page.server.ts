import type { PageServerLoad, Actions } from "./$types";
import { redirect } from "@sveltejs/kit";
import DiscordOauth2 from "discord-oauth2";
import { env } from "$env/dynamic/private";
import { getDb } from "$lib/db";
import { Users, Bots, Servers } from "$lib/db/schema";
import { eq, and, sql, inArray, like } from "drizzle-orm";

/** Minimal user profile shape used for referral display. */
type UserProfile = { id: string; username: string; avatar: string | null };
import { getServersByOwner } from "$lib/db/queries";
import { listEmojis } from "$lib/db/queries/emojis";
import {
	getReferralsByReferrer,
	getMilestonesForReferral,
	getMilestonesForUser,
	type ReferralSummary,
	type MilestoneType,
	type MilestoneStatus
} from "$lib/db/queries/referrals";
import { Referrals } from "$lib/db/schema";
import { withDb, type DrizzleDb } from "$lib/db";

export const load: PageServerLoad = async ({ cookies, url }) => {
	const key = cookies.get("key");
	if (!key) {
		throw redirect(302, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}

	const oauth = new DiscordOauth2({
		clientId: env.DISCORD_BOT_ID!,
		clientSecret: env.DISCORD_SECRET!,
		redirectUri: (env.DOMAIN ?? "http://localhost:5173") + "/api/auth"
	});

	let discordUser: any;
	try {
		discordUser = await oauth.getUser(key);
	} catch {
		cookies.delete("key", { path: "/" });
		throw redirect(302, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}

	if (!discordUser?.id) {
		cookies.delete("key", { path: "/" });
		throw redirect(302, "/login");
	}

	const db = getDb();

	// ── User row ─────────────────────────────────────────────────────────────
	const userRows = await db
		.select({
			id: Users.id,
			username: Users.username,
			discriminator: Users.discriminator,
			avatar: Users.avatar,
			bio: Users.bio,
			banner: Users.banner,
			bal: Users.bal,
			added_at: Users.added_at,
			votes: Users.votes,
			badges: Users.badges,
			nitro: Users.nitro,
			globalname: Users.globalname
		})
		.from(Users)
		.where(eq(Users.id, discordUser.id))
		.limit(1);

	if (!userRows || userRows.length === 0) {
		cookies.delete("key", { path: "/" });
		throw redirect(302, "/login");
	}

	const dbUser = userRows[0];

	// ── Owned bots ───────────────────────────────────────────────────────────
	let ownedBots: Array<{
		id: string;
		slug: string;
		username: string;
		discriminator: string;
		avatar: string | null;
		short: string;
		votes: number;
		servers: number;
		invite: string | null;
		bg: string | null;
		status: string;
	}> = [];

	try {
		const botRows = await db
			.select({
				id: Bots.id,
				slug: Bots.slug,
				username: Bots.username,
				discriminator: Bots.discriminator,
				avatar: Bots.avatar,
				short: Bots.short,
				votes: Bots.votes,
				servers: Bots.servers,
				invite: Bots.invite,
				bg: Bots.bg
			})
			.from(Bots)
			.where(like(Bots.owners, `%${discordUser.id}%`))
			.limit(50);

		ownedBots = botRows.map((b) => ({
			id: String(b.id),
			slug: String(b.slug ?? b.id),
			username: String(b.username ?? ""),
			discriminator: String(b.discriminator ?? "0000"),
			avatar: b.avatar ?? null,
			short: String(b.short ?? ""),
			votes: typeof b.votes === "number" ? b.votes : Number(b.votes) || 0,
			servers: typeof b.servers === "number" ? b.servers : Number(b.servers) || 0,
			invite: b.invite ?? null,
			bg: b.bg ?? null,
			status: "online"
		}));
	} catch {
		// non-fatal - show empty bot list
	}

	// ── Vote history ─────────────────────────────────────────────────────────
	let voteHistory: { bot?: string; server?: string; at: number }[] = [];
	let expiredCount = 0;

	try {
		const parsed = JSON.parse((dbUser.votes as string) ?? "[]");
		const raw: { bot?: string; server?: string; at: unknown }[] = Array.isArray(parsed)
			? parsed
			: [];
		// Normalise `at` to a numeric ms timestamp.
		// Old AstroDB rows stored `at` as ISO strings (e.g. "2022-07-16T00:00:00.000Z"),
		// while new votes written by the app use Date.now() (a number).
		// Mixing the two makes the numeric sort produce NaN, so we coerce here.
		// Each entry is either { bot: string } or { server: string } - preserve whichever is set.
		const normalised = raw
			.filter((v) => v.bot || v.server)
			.map((v) => ({
				...(v.bot ? { bot: String(v.bot) } : {}),
				...(v.server ? { server: String(v.server) } : {}),
				at: typeof v.at === "number" ? v.at : new Date(v.at as string).getTime() || 0
			}));

		// Drop votes older than 30 days
		const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
		voteHistory = normalised.filter((v) => v.at >= cutoff);
		expiredCount = normalised.length - voteHistory.length;

		// Persist the pruned list back to the DB if anything was removed
		if (expiredCount > 0) {
			try {
				await db
					.update(Users)
					.set({ votes: JSON.stringify(voteHistory) as any })
					.where(eq(Users.id, discordUser.id));
			} catch {
				// non-fatal - stale votes will just be pruned again next load
			}
		}
	} catch {
		voteHistory = [];
	}

	// voteHistory entries are a union of { bot?: string; server?: string; at: number }
	const typedHistory = voteHistory as Array<{ bot?: string; server?: string; at: number }>;
	const recentVotes = [...typedHistory].sort((a, b) => b.at - a.at).slice(0, 10);

	let votedBotNames: Record<string, { username: string; slug: string; avatar: string | null }> = {};
	let votedServerNames: Record<string, { name: string; slug: string; icon: string | null }> = {};

	const botVoteIds = [...new Set(recentVotes.filter((v) => v.bot).map((v) => v.bot as string))];
	const serverVoteIds = [
		...new Set(recentVotes.filter((v) => v.server).map((v) => v.server as string))
	];

	await Promise.all([
		botVoteIds.length > 0
			? (async () => {
					try {
						const botRows = await db
							.select({
								id: Bots.id,
								username: Bots.username,
								slug: Bots.slug,
								avatar: Bots.avatar
							})
							.from(Bots)
							.where(inArray(Bots.id, botVoteIds));
						for (const b of botRows) {
							votedBotNames[b.id] = {
								username: b.username,
								slug: b.slug ?? b.id,
								avatar: b.avatar ?? null
							};
						}
					} catch {
						// non-fatal
					}
				})()
			: Promise.resolve(),

		serverVoteIds.length > 0
			? (async () => {
					try {
						const serverRows = await db
							.select({
								id: Servers.id,
								name: Servers.name,
								slug: Servers.slug,
								icon: Servers.icon
							})
							.from(Servers)
							.where(inArray(Servers.id, serverVoteIds));
						for (const s of serverRows) {
							votedServerNames[s.id] = {
								name: s.name,
								slug: s.slug ?? s.id,
								icon: s.icon ?? null
							};
						}
					} catch {
						// non-fatal
					}
				})()
			: Promise.resolve()
	]);

	// ── Owned servers ────────────────────────────────────────────────────────
	let ownedServers: Array<{
		id: string;
		name: string;
		short: string;
		icon: string | null;
		votes: number;
		owner: string;
		slug: string | null;
	}> = [];

	try {
		ownedServers = await getServersByOwner(discordUser.id);
	} catch {
		// non-fatal
	}

	// ── Manually submitted emojis ─────────────────────────────────────────────
	let submittedEmojis: Array<{
		id: string;
		code: string;
		name: string;
		alt_names: string[];
		a: boolean;
		dc: number;
		added_at: string | null;
		guild: string | null;
		submitter: string | null;
	}> = [];

	try {
		submittedEmojis = await listEmojis({
			// We filter by submitter at the app layer since there's no dedicated
			// submitter filter in listEmojis; use a small limit for the dashboard.
			limit: 100,
			sort: "newest"
		}).then((all) => all.filter((e) => e.submitter === discordUser.id));
	} catch {
		// non-fatal - show empty list
	}

	// ── Referral data ─────────────────────────────────────────────────────────
	// 1. All referrals sent by this user (referrer view)
	let referralsSent: Array<{
		id: string;
		referred_id: string;
		reward_status: string;
		fingerprint_match: boolean;
		created_at: string;
		referredProfile: UserProfile | null;
		// milestones for this specific referral, resolved below
		milestones: Array<{
			id: string;
			milestone_type: MilestoneType;
			reward_amount: number;
			status: MilestoneStatus;
			meta: Record<string, unknown>;
			created_at: string;
			paid_at: string | null;
		}>;
	}> = [];

	// 2. Whether this user was referred by someone (referred view)
	let wasReferredBy: {
		referrer_id: string;
		created_at: string;
		reward_status: string;
		referrerProfile: UserProfile | null;
	} | null = null;

	// 3. Aggregate stats
	let referralStats = {
		total: 0,
		paid: 0,
		pending: 0,
		flagged: 0,
		rejected: 0,
		totalEarned: 0, // sum of paid milestone reward_amount values (referrer side)
		pendingEarnable: 0 // sum of pending milestone reward_amount values (referrer side)
	};

	// 4. Rewards earned BY this user as the referred party
	let earnedAsReferred: Array<{
		id: string;
		referral_id: string | null;
		milestone_type: MilestoneType;
		reward_amount: number;
		status: MilestoneStatus;
		meta: Record<string, unknown>;
		created_at: string;
		paid_at: string | null;
	}> = [];
	let totalEarnedAsReferred = 0;

	try {
		// Rewards this user earned as the referred party (welcome bonus, engagement sprint, bounty)
		const allUserMilestones = await getMilestonesForUser(discordUser.id);
		// Only surface milestones where this user is the referred recipient
		earnedAsReferred = allUserMilestones.filter((m) =>
			["signup_welcome", "engagement_sprint_referred", "server_bounty_referred"].includes(
				m.milestone_type
			)
		);
		totalEarnedAsReferred = earnedAsReferred
			.filter((m) => m.status === "paid")
			.reduce((sum, m) => sum + m.reward_amount, 0);
	} catch {
		// non-fatal - show empty section
	}

	try {
		// Referrals this user sent
		const sent = await getReferralsByReferrer(discordUser.id, 50);

		// For each referral, pull its milestone history
		const withMilestones = await Promise.all(
			sent.map(async (r) => {
				let milestones: Awaited<ReturnType<typeof getMilestonesForReferral>> = [];
				try {
					milestones = await getMilestonesForReferral(r.id);
				} catch {
					// non-fatal
				}
				return { ...r, milestones };
			})
		);

		referralsSent = withMilestones.map((r) => ({ ...r, referredProfile: null }));

		// Compute aggregate stats
		referralStats.total = referralsSent.length;
		for (const r of referralsSent) {
			if (r.reward_status === "paid") referralStats.paid++;
			else if (r.reward_status === "pending" || r.reward_status === "payable")
				referralStats.pending++;
			else if (r.reward_status === "flagged") referralStats.flagged++;
			else if (r.reward_status === "rejected") referralStats.rejected++;

			for (const m of r.milestones) {
				// Exclude companion rows written for the referred user - those belong
				// to the referred user's earnings, not the referrer's.
				if ((m.meta as any).recipient === "referred") continue;

				if (m.status === "paid") referralStats.totalEarned += m.reward_amount;
				else if (m.status === "pending") referralStats.pendingEarnable += m.reward_amount;
			}
		}
	} catch {
		// non-fatal - show empty referral section
	}

	try {
		// Check if this user was referred by someone
		const referredRows = await withDb((db: DrizzleDb) =>
			db
				.select({
					referrer_id: Referrals.referrer_id,
					created_at: Referrals.created_at,
					reward_status: Referrals.reward_status
				})
				.from(Referrals)
				.where(eq(Referrals.referred_id, discordUser.id))
				.limit(1)
		);
		if (Array.isArray(referredRows) && referredRows.length > 0) {
			const row = referredRows[0] as {
				referrer_id: string;
				created_at: string;
				reward_status: string;
			};
			wasReferredBy = {
				referrer_id: row.referrer_id,
				created_at: row.created_at,
				reward_status: row.reward_status,
				referrerProfile: null
			};
		}
	} catch {
		// non-fatal
	}

	// ── Resolve referral user profiles (username + avatar) ───────────────────
	// Collect all user IDs that appear as referred_id or referrer_id, then do
	// a single inArray query against Users so the UI can show name + avatar
	// instead of raw snowflake IDs.
	try {
		const profileIds = new Set<string>();
		for (const r of referralsSent) profileIds.add(r.referred_id);
		if (wasReferredBy) profileIds.add(wasReferredBy.referrer_id);

		if (profileIds.size > 0) {
			const profileRows = await db
				.select({ id: Users.id, username: Users.username, avatar: Users.avatar })
				.from(Users)
				.where(inArray(Users.id, [...profileIds]));

			const profileMap = new Map<string, UserProfile>();
			for (const row of profileRows) {
				profileMap.set(String(row.id), {
					id: String(row.id),
					username: String(row.username ?? "Unknown"),
					avatar: row.avatar ?? null
				});
			}

			// Attach profile to each sent referral
			referralsSent = referralsSent.map((r) => ({
				...r,
				referredProfile: profileMap.get(r.referred_id) ?? null
			}));

			// Attach referrer profile to wasReferredBy
			if (wasReferredBy) {
				wasReferredBy = {
					...wasReferredBy,
					referrerProfile: profileMap.get(wasReferredBy.referrer_id) ?? null
				};
			}
		}
	} catch {
		// non-fatal - pages degrade to showing the raw ID if this fails
	}

	// Referral link is simply /login?ref=<userId>
	const domain = (env.DOMAIN ?? "https://discord.rovelstars.com").replace(/\/$/, "");
	const referralLink = `${domain}/login?ref=${discordUser.id}`;

	return {
		// DB user (profile data, balance, etc.)
		user: {
			id: dbUser.id,
			username: dbUser.username,
			discriminator: dbUser.discriminator,
			avatar: dbUser.avatar,
			bio: dbUser.bio ?? "",
			banner: dbUser.banner ?? "",
			bal: typeof dbUser.bal === "number" ? dbUser.bal : Number(dbUser.bal) || 0,
			added_at: dbUser.added_at != null ? String(dbUser.added_at) : null,
			nitro: Boolean(dbUser.nitro),
			globalname: dbUser.globalname ?? null
		},
		// Fresh Discord OAuth data (display name, avatar, email)
		discordUser: {
			id: discordUser.id as string,
			username: discordUser.username as string,
			global_name: (discordUser.global_name ?? null) as string | null,
			discriminator: (discordUser.discriminator ?? "0") as string,
			avatar: (discordUser.avatar ?? null) as string | null,
			email: (discordUser.email ?? null) as string | null
		},
		// Bots this user owns
		bots: ownedBots,
		// Servers this user owns
		servers: ownedServers,
		// Manually submitted emojis
		submittedEmojis,
		// Vote history - union of bot and server votes
		recentVotes: recentVotes.map((v) => {
			if (v.bot) {
				return {
					type: "bot" as const,
					id: v.bot,
					at: v.at,
					name: votedBotNames[v.bot]?.username ?? v.bot,
					slug: votedBotNames[v.bot]?.slug ?? v.bot,
					avatar: votedBotNames[v.bot]?.avatar ?? null
				};
			} else {
				const sid = v.server as string;
				return {
					type: "server" as const,
					id: sid,
					at: v.at,
					name: votedServerNames[sid]?.name ?? sid,
					slug: votedServerNames[sid]?.slug ?? sid,
					avatar: votedServerNames[sid]?.icon ?? null
				};
			}
		}),
		totalVotesCast: voteHistory.length,
		expiredCount,
		// Referral system
		referralLink,
		referralsSent,
		referralStats,
		wasReferredBy,
		// Rewards this user earned as the referred user
		earnedAsReferred,
		totalEarnedAsReferred
	};
};
