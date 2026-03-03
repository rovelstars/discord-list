<script lang="ts">
	import BotCard from "$lib/components/BotCard.svelte";
	import ServerCard from "$lib/components/ServerCard.svelte";
	import EmojiCard from "$lib/components/EmojiCard.svelte";
	import Input from "$lib/components/ui/Input.svelte";
	import Label from "$lib/components/ui/Label.svelte";
	import Textarea from "$lib/components/ui/textarea/Textarea.svelte";
	import getAvatarURL from "$lib/get-avatar-url";
	import SEO from "$lib/components/SEO.svelte";

	// ── Referral milestone type helpers ──────────────────────────────────────
	type MilestoneType =
		| "retention_daily"
		| "vote_20"
		| "signup_welcome"
		| "engagement_sprint_referred"
		| "server_bounty"
		| "server_bounty_referred"
		| "self_listing_100"
		| "self_listing_500";
	type MilestoneStatus = "pending" | "paid" | "flagged";
	type RewardStatus = "pending" | "payable" | "paid" | "flagged" | "rejected";

	interface Milestone {
		id: string;
		milestone_type: MilestoneType;
		reward_amount: number;
		status: MilestoneStatus;
		meta: Record<string, unknown>;
		created_at: string;
		paid_at: string | null;
	}

	interface ReferralRow {
		id: string;
		referred_id: string;
		reward_status: RewardStatus;
		fingerprint_match: boolean;
		created_at: string;
		milestones: Milestone[];
	}

	export let data: {
		user: {
			id: string;
			username: string;
			discriminator: string;
			avatar: string | null;
			bio: string;
			banner: string;
			bal: number;
			added_at: string | null;
			nitro: boolean;
			globalname: string | null;
		};
		discordUser: {
			id: string;
			username: string;
			global_name: string | null;
			discriminator: string;
			avatar: string | null;
			email: string | null;
		};
		bots: Array<{
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
		}>;
		servers: Array<{
			id: string;
			name: string;
			short: string;
			icon: string | null;
			votes: number;
			owner: string;
			slug: string | null;
		}>;
		recentVotes: Array<{
			botId: string;
			at: number;
			botName: string;
			botSlug: string;
			botAvatar: string | null;
		}>;
		totalVotesCast: number;
		expiredCount: number;
		submittedEmojis: Array<{
			id: string;
			code: string;
			name: string;
			alt_names: string[];
			a: boolean;
			dc: number;
			added_at: string | null;
			guild: string | null;
			submitter: string | null;
		}>;
		referralLink: string;
		referralsSent: ReferralRow[];
		referralStats: {
			total: number;
			paid: number;
			pending: number;
			flagged: number;
			rejected: number;
			totalEarned: number;
			pendingEarnable: number;
		};
		wasReferredBy: { referrer_id: string; created_at: string; reward_status: string } | null;
		earnedAsReferred: Array<{
			id: string;
			referral_id: string | null;
			milestone_type: MilestoneType;
			reward_amount: number;
			status: MilestoneStatus;
			meta: Record<string, unknown>;
			created_at: string;
			paid_at: string | null;
		}>;
		totalEarnedAsReferred: number;
	};

	const {
		user,
		discordUser,
		bots = [],
		servers = [],
		submittedEmojis = [],
		recentVotes,
		totalVotesCast,
		expiredCount,
		referralLink,
		referralsSent = [],
		referralStats,
		wasReferredBy,
		earnedAsReferred = [],
		totalEarnedAsReferred = 0
	} = data;

	// ── Active section ────────────────────────────────────────────────────────
	type Section =
		| "bots"
		| "servers"
		| "emojis"
		| "profile"
		| "account"
		| "votes"
		| "referrals"
		| "danger";
	let activeSection: Section = "bots";

	// ── Modals ────────────────────────────────────────────────────────────────
	let showLogoutConfirm = false;

	// ── Avatar ────────────────────────────────────────────────────────────────
	$: avatarSrc = discordUser.avatar
		? getAvatarURL(discordUser.id, discordUser.avatar, 128)
		: "/assets/img/bot/logo-144.png";

	// ── Display name / handle ─────────────────────────────────────────────────
	$: displayName = discordUser.global_name ?? discordUser.username;
	$: handle =
		discordUser.discriminator && discordUser.discriminator !== "0"
			? `${discordUser.username}#${discordUser.discriminator}`
			: `@${discordUser.username}`;

	// ── Member since ──────────────────────────────────────────────────────────
	$: memberSince = (() => {
		if (!user.added_at) return "Unknown";
		const d = new Date(user.added_at);
		if (isNaN(d.getTime())) return "Unknown";
		return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
	})();

	// ── Profile form ──────────────────────────────────────────────────────────
	let bio = user.bio === "The user doesn't have bio set!" ? "" : (user.bio ?? "");
	let banner = user.banner ?? "";
	let saving = false;
	let saveSuccess = false;
	let saveError = "";

	$: bioOver = bio.length > 200;
	$: bioPercent = Math.min((bio.length / 200) * 100, 100);

	async function saveProfile() {
		saveError = "";
		saveSuccess = false;
		saving = true;
		try {
			const res = await fetch("/api/users/me", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ bio: bio.trim() || null, banner: banner.trim() || null })
			});
			const resData = await res.json();
			if (!res.ok || resData.err) {
				const errMap: Record<string, string> = {
					not_logged_in: "You must be logged in.",
					invalid_key: "Your session has expired. Please log in again.",
					bio_too_long: "Bio must be 200 characters or fewer.",
					invalid_banner: "Banner must be a valid http/https URL.",
					user_not_found: "User not found. Please log in again.",
					db_update_failed: "Database error — please try again."
				};
				saveError = errMap[resData.err] ?? resData.err ?? "An error occurred.";
			} else {
				saveSuccess = true;
				setTimeout(() => (saveSuccess = false), 3500);
			}
		} catch {
			saveError = "Network error — please try again.";
		} finally {
			saving = false;
		}
	}

	// ── Logout ────────────────────────────────────────────────────────────────
	function logout() {
		window.location.href = "/logout";
	}

	// ── Relative time ─────────────────────────────────────────────────────────
	function relativeTime(ts: number): string {
		const diff = Date.now() - ts;
		const mins = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);
		if (mins < 1) return "just now";
		if (mins < 60) return `${mins}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days < 30) return `${days}d ago`;
		return new Date(ts).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric"
		});
	}

	// ── Nav items ─────────────────────────────────────────────────────────────
	const navItems: Array<{ id: Section; label: string; icon: string }> = [
		{ id: "bots", label: "My Bots", icon: "bot" },
		{ id: "servers", label: "My Servers", icon: "server" },
		{ id: "emojis", label: "My Emojis", icon: "emoji" },
		{ id: "profile", label: "Profile", icon: "user" },
		{ id: "account", label: "Account", icon: "shield" },
		{ id: "votes", label: "Vote History", icon: "votes" },
		{ id: "referrals", label: "Referrals", icon: "referrals" },
		{ id: "danger", label: "Danger Zone", icon: "danger" }
	];

	// ── Referral helpers ──────────────────────────────────────────────────────

	// Copy-link state
	let linkCopied = false;
	let linkCopyTimer: ReturnType<typeof setTimeout> | null = null;

	async function copyReferralLink() {
		try {
			await navigator.clipboard.writeText(referralLink);
			linkCopied = true;
			if (linkCopyTimer) clearTimeout(linkCopyTimer);
			linkCopyTimer = setTimeout(() => (linkCopied = false), 2500);
		} catch {
			// fallback: select the input text
		}
	}

	// Which referral row is expanded in the milestone detail drawer
	let expandedReferralId: string | null = null;
	function toggleReferral(id: string) {
		expandedReferralId = expandedReferralId === id ? null : id;
	}

	// Human-readable milestone label
	function milestoneLabel(type: MilestoneType, meta: Record<string, unknown>): string {
		switch (type) {
			case "retention_daily":
				if ((meta as any).type === "signup_reward") return "Welcome Handshake";
				return `Engagement Sprint — Day ${(meta as any).day ?? "?"}`;
			case "signup_welcome":
				return "Welcome Bonus";
			case "engagement_sprint_referred":
				return `Engagement Sprint — Day ${(meta as any).day ?? "?"} (Your Bonus)`;
			case "vote_20":
				return "20-Vote Achievement";
			case "server_bounty":
				return "Growth Bounty — Referrer";
			case "server_bounty_referred":
				return "Growth Bounty — Your Reward";
			case "self_listing_100":
				return "Self-Listing Reward (50+ members)";
			case "self_listing_500":
				return "Self-Listing Reward (200+ members)";
			default:
				return type;
		}
	}

	// Status badge colours
	function statusColor(s: RewardStatus | MilestoneStatus): string {
		if (s === "paid")
			return "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/25";
		if (s === "flagged")
			return "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/25";
		if (s === "rejected") return "bg-red-500/15 text-red-500 border-red-500/25";
		if (s === "payable")
			return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25";
		return "bg-muted text-muted-foreground border-border";
	}

	function statusLabel(s: string): string {
		if (s === "payable") return "Queued";
		return s.charAt(0).toUpperCase() + s.slice(1);
	}

	// Milestone icon path
	function milestoneIcon(type: MilestoneType, meta: Record<string, unknown>): string {
		if (type === "retention_daily" && (meta as any).type === "signup_reward")
			return "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";
		if (type === "signup_welcome")
			return "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";
		if (type === "retention_daily" || type === "engagement_sprint_referred")
			return "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z";
		if (type === "vote_20") return "m18 15-6-6-6 6";
		if (
			type === "server_bounty" ||
			type === "server_bounty_referred" ||
			type === "self_listing_100" ||
			type === "self_listing_500"
		)
			return "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10";
		return "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";
	}

	// Progress bar for 5-day retention window per referral (referrer side)
	function retentionDaysPaid(r: ReferralRow): number {
		return r.milestones.filter(
			(m) =>
				m.milestone_type === "retention_daily" &&
				m.status === "paid" &&
				(m.meta as any).type !== "signup_reward" &&
				(m.meta as any).day > 0
		).length;
	}

	function hasSignupRewardPaid(r: ReferralRow): boolean {
		return r.milestones.some(
			(m) =>
				m.milestone_type === "retention_daily" &&
				m.status === "paid" &&
				(m.meta as any).type === "signup_reward"
		);
	}

	function hasVote20Paid(r: ReferralRow): boolean {
		return r.milestones.some((m) => m.milestone_type === "vote_20" && m.status === "paid");
	}

	function hasServerBountyPaid(r: ReferralRow): boolean {
		return r.milestones.some((m) => m.milestone_type === "server_bounty" && m.status === "paid");
	}

	function totalEarnedFromReferral(r: ReferralRow): number {
		// Only count the referrer-side milestones for the "earned as referrer" display
		return r.milestones
			.filter((m) => m.status === "paid" && (m.meta as any).recipient !== "referred")
			.reduce((s, m) => s + m.reward_amount, 0);
	}

	// Label for referred-user milestone types shown in their rewards panel
	function referredMilestoneLabel(type: MilestoneType, meta: Record<string, unknown>): string {
		switch (type) {
			case "signup_welcome":
				return "Welcome Bonus";
			case "engagement_sprint_referred":
				return `Engagement Sprint — Day ${(meta as any).day ?? "?"}`;
			case "server_bounty_referred":
				return "Growth Bounty (Listed Server)";
			default:
				return milestoneLabel(type, meta);
		}
	}

	function shortId(id: string): string {
		return id.length > 10 ? id.slice(0, 6) + "…" + id.slice(-4) : id;
	}

	function fmtDate(iso: string): string {
		const d = new Date(iso);
		if (isNaN(d.getTime())) return iso;
		return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
	}
</script>

<SEO
	title="Dashboard"
	description="Manage your bots, servers and account on Rovel Discord List."
	imageSmall="/assets/img/bot/logo-512.png"
/>
<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<!-- ── Logout confirmation modal ──────────────────────────────────────────── -->
{#if showLogoutConfirm}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
		on:click|self={() => (showLogoutConfirm = false)}
	>
		<div class="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
			<div class="flex items-center gap-3">
				<div
					class="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center shrink-0"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-5 h-5 text-destructive"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline
							points="16 17 21 12 16 7"
						/><line x1="21" y1="12" x2="9" y2="12" />
					</svg>
				</div>
				<div>
					<p class="font-bold text-base">Sign out?</p>
					<p class="text-sm text-muted-foreground">You can log back in any time.</p>
				</div>
			</div>
			<div class="flex gap-2 pt-1">
				<button
					on:click={() => (showLogoutConfirm = false)}
					class="flex-1 px-4 py-2 rounded-lg border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
				>
					Cancel
				</button>
				<button
					on:click={logout}
					class="flex-1 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors"
				>
					Sign Out
				</button>
			</div>
		</div>
	</div>
{/if}

<div class="min-h-screen bg-background">
	<!-- ── Hero header ──────────────────────────────────────────────────────── -->
	<div class="relative overflow-hidden border-b border-border bg-card pt-32 -mt-28">
		<div
			class="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl"
		></div>
		<div
			class="pointer-events-none absolute -bottom-16 right-0 w-80 h-80 rounded-full bg-primary/5 blur-2xl"
		></div>

		<div class="relative max-w-6xl mx-auto px-4 py-8">
			<div class="flex flex-col sm:flex-row sm:items-center gap-5">
				<!-- Avatar -->
				<div class="relative shrink-0 self-start sm:self-auto">
					<img
						src={avatarSrc}
						alt="Your avatar"
						class="w-20 h-20 rounded-full border-4 border-background object-cover shadow-xl ring-2 ring-primary/30"
					/>
					<span
						class="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-background shadow"
					></span>
				</div>

				<!-- Name / meta -->
				<div class="flex-1 min-w-0">
					<div class="flex flex-wrap items-center gap-2">
						<h1 class="text-2xl font-extrabold font-heading truncate">{displayName}</h1>
						{#if user.nitro}
							<span
								class="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30"
							>
								✦ Nitro
							</span>
						{/if}
					</div>
					<p class="text-muted-foreground text-sm mt-0.5">{handle}</p>
					<p class="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-3.5 h-3.5 shrink-0"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line
								x1="16"
								y1="2"
								x2="16"
								y2="6"
							/><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
						</svg>
						Member since {memberSince}
					</p>
				</div>

				<!-- Add bot CTA -->
				<a
					href="/dashboard/bots/new"
					class="self-start sm:self-auto shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all shadow-sm shadow-primary/20"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-4 h-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M12 5v14M5 12h14" />
					</svg>
					Add Bot
				</a>
			</div>

			<!-- Quick stats strip -->
			<div class="mt-6 grid grid-cols-4 gap-3">
				<div
					class="bg-background/60 backdrop-blur border border-border rounded-xl px-4 py-3 text-center"
				>
					<p class="text-xl font-extrabold">{bots.length}</p>
					<p class="text-xs text-muted-foreground mt-0.5">My Bots</p>
				</div>
				<div
					class="bg-background/60 backdrop-blur border border-border rounded-xl px-4 py-3 text-center"
				>
					<p class="text-xl font-extrabold">{servers.length}</p>
					<p class="text-xs text-muted-foreground mt-0.5">My Servers</p>
				</div>
				<div
					class="bg-background/60 backdrop-blur border border-border rounded-xl px-4 py-3 text-center"
				>
					<p class="text-xl font-extrabold">{user.bal.toLocaleString()}</p>
					<p class="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
						<img src="/assets/img/bot/moneh.svg" alt="coins" class="w-3.5 h-3.5" />
						Balance
					</p>
				</div>
				<div
					class="bg-background/60 backdrop-blur border border-border rounded-xl px-4 py-3 text-center"
				>
					<p class="text-xl font-extrabold">{totalVotesCast.toLocaleString()}</p>
					<p class="text-xs text-muted-foreground mt-0.5">Votes Cast</p>
				</div>
			</div>
		</div>
	</div>

	<!-- ── Body ─────────────────────────────────────────────────────────────── -->
	<section class="max-w-6xl mx-auto px-4 py-8">
		<div class="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
			<!-- ── Sidebar ────────────────────────────────────────────────────── -->
			<nav class="md:col-span-1 md:sticky md:top-6 space-y-3">
				<!-- Nav card -->
				<div class="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
					<div class="px-3 py-2.5 border-b border-border">
						<p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
							Dashboard
						</p>
					</div>
					<ul class="p-2 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
						{#each navItems as item}
							<li class="shrink-0 w-full">
								<button
									on:click={() => (activeSection = item.id)}
									class="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
										{activeSection === item.id && item.id !== 'danger'
										? 'bg-primary/10 text-primary shadow-sm'
										: activeSection === item.id && item.id === 'danger'
											? 'bg-destructive/10 text-destructive shadow-sm'
											: item.id === 'danger'
												? 'text-muted-foreground hover:bg-destructive/5 hover:text-destructive'
												: 'text-muted-foreground hover:bg-accent hover:text-foreground'}"
								>
									<!-- Icon badge -->
									<span
										class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0
										{activeSection === item.id && item.id === 'danger'
											? 'bg-destructive/15'
											: activeSection === item.id
												? 'bg-primary/15'
												: 'bg-muted/50'}"
									>
										{#if item.icon === "bot"}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="w-3.5 h-3.5"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<rect x="3" y="11" width="18" height="10" rx="2" /><circle
													cx="12"
													cy="5"
													r="2"
												/><path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" /><line
													x1="16"
													y1="16"
													x2="16"
													y2="16"
												/>
											</svg>
										{:else if item.icon === "server"}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="w-3.5 h-3.5"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
												<polyline points="9 22 9 12 15 12 15 22" />
											</svg>
										{:else if item.icon === "user"}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="w-3.5 h-3.5"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
											</svg>
										{:else if item.icon === "shield"}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="w-3.5 h-3.5"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
											</svg>
										{:else if item.icon === "votes"}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="w-3.5 h-3.5"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<polyline points="18 15 12 9 6 15" />
											</svg>
										{:else if item.icon === "emoji"}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="w-3.5 h-3.5"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<circle cx="12" cy="12" r="10" />
												<path d="M8 14s1.5 2 4 2 4-2 4-2" />
												<line x1="9" y1="9" x2="9.01" y2="9" />
												<line x1="15" y1="9" x2="15.01" y2="9" />
											</svg>
										{:else if item.icon === "referrals"}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="w-3.5 h-3.5"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
												<circle cx="9" cy="7" r="4" />
												<path d="M22 21v-2a4 4 0 0 0-3-3.87" />
												<path d="M16 3.13a4 4 0 0 1 0 7.75" />
											</svg>
										{:else if item.icon === "danger"}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="w-3.5 h-3.5"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<path
													d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
												/><line x1="12" y1="9" x2="12" y2="13" /><line
													x1="12"
													y1="17"
													x2="12.01"
													y2="17"
												/>
											</svg>
										{/if}
									</span>

									{item.label}

									<!-- Active dot -->
									{#if activeSection === item.id}
										<span
											class="ml-auto w-1.5 h-1.5 rounded-full {item.id === 'danger'
												? 'bg-destructive'
												: 'bg-primary'}"
										></span>
									{/if}

									<!-- Count badges -->
									{#if item.id === "bots" && bots.length > 0 && activeSection !== "bots"}
										<span
											class="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary opacity-70"
										>
											{bots.length}
										</span>
									{:else if item.id === "servers" && servers.length > 0 && activeSection !== "servers"}
										<span
											class="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 opacity-70"
										>
											{servers.length}
										</span>
									{:else if item.id === "emojis" && submittedEmojis.length > 0 && activeSection !== "emojis"}
										<span
											class="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 opacity-70"
										>
											{submittedEmojis.length}
										</span>
									{:else if item.id === "referrals" && referralStats.total > 0 && activeSection !== "referrals"}
										<span
											class="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 opacity-70"
										>
											{referralStats.total}
										</span>
									{/if}
								</button>
							</li>
						{/each}
					</ul>
				</div>

				<!-- Discord ID card -->
				<div class="bg-card border border-border rounded-2xl p-3 shadow-sm">
					<p class="text-xs text-muted-foreground mb-1.5 font-medium">Discord ID</p>
					<code
						class="text-xs font-mono bg-background border border-border rounded-lg px-2.5 py-1.5 block select-all text-foreground/80 truncate"
					>
						{user.id}
					</code>
				</div>
			</nav>

			<!-- ── Main content ──────────────────────────────────────────────── -->
			<div class="md:col-span-3 space-y-4">
				<!-- ════════════════════════════════════════════════════════════ -->
				<!-- MY BOTS                                                      -->
				<!-- ════════════════════════════════════════════════════════════ -->
				{#if activeSection === "bots"}
					<div class="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
						<!-- Header -->
						<div class="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
							<div class="flex items-center gap-2">
								<div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-4 h-4 text-primary"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<rect x="3" y="11" width="18" height="10" rx="2" /><circle
											cx="12"
											cy="5"
											r="2"
										/><path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" /><line
											x1="16"
											y1="16"
											x2="16"
											y2="16"
										/>
									</svg>
								</div>
								<div>
									<h2 class="text-base font-bold font-heading leading-none">My Bots</h2>
									<p class="text-xs text-muted-foreground mt-0.5">
										{bots.length === 0
											? "No bots listed yet"
											: `${bots.length} bot${bots.length !== 1 ? "s" : ""} listed`}
									</p>
								</div>
							</div>
							<a
								href="/dashboard/bots/new"
								class="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 active:scale-95 transition-all shadow-sm shadow-primary/20"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-3.5 h-3.5"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2.5"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d="M12 5v14M5 12h14" />
								</svg>
								Add New
							</a>
						</div>

						<!-- Bot grid -->
						<div class="p-6">
							{#if bots.length === 0}
								<div class="flex flex-col items-center justify-center py-16 text-center">
									<div
										class="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-4"
									>
										<img src="/assets/img/idea.svg" class="w-12 h-12 opacity-60" alt="No bots" />
									</div>
									<p class="font-bold text-base">No bots yet</p>
									<p class="text-sm text-muted-foreground mt-1.5 max-w-xs">
										You haven't listed any bots. Add your first one and share it with the world!
									</p>
									<a
										href="/dashboard/bots/new"
										class="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="w-4 h-4"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2.5"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<path d="M12 5v14M5 12h14" />
										</svg>
										List Your First Bot
									</a>
								</div>
							{:else}
								<div class="flex flex-wrap gap-4">
									{#each bots as bot}
										<BotCard
											bot={{
												id: bot.id,
												slug: bot.slug ?? bot.id,
												username: bot.username,
												discriminator: bot.discriminator ?? "0000",
												avatar: bot.avatar ?? "0",
												short: bot.short ?? "",
												votes: bot.votes ?? 0,
												servers: bot.servers ?? 0,
												invite: bot.invite ?? "",
												bg: bot.bg ?? null,
												status: (bot.status as any) ?? "online"
											}}
											edit={true}
										/>
									{/each}
								</div>
							{/if}
						</div>
					</div>

					<!-- ════════════════════════════════════════════════════════════ -->
					<!-- MY SERVERS                                                   -->
					<!-- ════════════════════════════════════════════════════════════ -->
				{:else if activeSection === "servers"}
					<div class="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
						<div class="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
							<div class="flex items-center gap-2">
								<div class="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-4 h-4 text-green-500"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										aria-hidden="true"
									>
										<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
										<polyline points="9 22 9 12 15 12 15 22" />
									</svg>
								</div>
								<div>
									<h2 class="text-base font-bold font-heading leading-none">My Servers</h2>
									<p class="text-xs text-muted-foreground mt-0.5">
										{servers.length === 0
											? "No servers registered yet"
											: `${servers.length} server${servers.length !== 1 ? "s" : ""} registered`}
									</p>
								</div>
							</div>
							<a
								href="/servers"
								class="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-green-500/40 text-green-600 dark:text-green-400 text-xs font-semibold hover:bg-green-500/10 active:scale-95 transition-all"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-3.5 h-3.5"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
								>
									<circle cx="11" cy="11" r="8" />
									<path d="m21 21-4.3-4.3" />
								</svg>
								Browse
							</a>
						</div>

						<div class="p-6">
							{#if servers.length === 0}
								<div class="flex flex-col items-center justify-center py-16 text-center">
									<div
										class="w-20 h-20 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="w-10 h-10 text-green-500 opacity-60"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="1.75"
											stroke-linecap="round"
											stroke-linejoin="round"
											aria-hidden="true"
										>
											<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
											<polyline points="9 22 9 12 15 12 15 22" />
										</svg>
									</div>
									<p class="font-bold text-base">No servers registered yet</p>
									<p class="text-sm text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
										Add our bot to your server and run
										<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">/register</code>
										inside it to get listed.
									</p>
									<a
										href="/servers"
										class="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="w-4 h-4"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											aria-hidden="true"
										>
											<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
											<polyline points="9 22 9 12 15 12 15 22" />
										</svg>
										Browse Server Listings
									</a>
								</div>
							{:else}
								<div class="flex flex-wrap gap-4">
									{#each servers as srv}
										<ServerCard
											server={{
												id: srv.id,
												name: srv.name,
												short: srv.short,
												icon: srv.icon,
												votes: srv.votes ?? 0,
												owner: srv.owner,
												slug: srv.slug
											}}
											edit={true}
										/>
									{/each}
								</div>
							{/if}
						</div>
					</div>

					<!-- How-to card -->
					<div class="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
						<div class="px-6 py-4 border-b border-border flex items-center gap-2">
							<div class="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-4 h-4 text-green-500"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
								>
									<circle cx="12" cy="12" r="10" />
									<path d="M12 16v-4" />
									<path d="M12 8h.01" />
								</svg>
							</div>
							<h2 class="text-base font-bold font-heading leading-none">
								How to Register a Server
							</h2>
						</div>
						<div class="p-6 space-y-4">
							<ol class="space-y-4 text-sm text-muted-foreground">
								<li class="flex gap-3">
									<span
										class="shrink-0 w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center"
										>1</span
									>
									<span>
										<strong class="text-foreground">Add the bot</strong> to your Discord server. It
										needs
										<em>Send Messages</em> and <em>Use Slash Commands</em> permissions at minimum.
									</span>
								</li>
								<li class="flex gap-3">
									<span
										class="shrink-0 w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center"
										>2</span
									>
									<span>
										Make sure you have the
										<strong class="text-foreground">Manage Server</strong> or
										<strong class="text-foreground">Administrator</strong> permission in that server.
									</span>
								</li>
								<li class="flex gap-3">
									<span
										class="shrink-0 w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center"
										>3</span
									>
									<span>
										Run
										<code
											class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground font-semibold"
											>/register</code
										>
										inside your server. The bot will confirm once the listing is live.
									</span>
								</li>
								<li class="flex gap-3">
									<span
										class="shrink-0 w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center"
										>4</span
									>
									<span>
										Come back here to see your server listed above. You can update its description
										from the server's listing page.
									</span>
								</li>
							</ol>
						</div>
					</div>

					<!-- ════════════════════════════════════════════════════════════ -->
					<!-- EMOJIS                                                       -->
					<!-- ════════════════════════════════════════════════════════════ -->
				{:else if activeSection === "emojis"}
					<div class="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
						<div class="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
							<div class="flex items-center gap-2">
								<div class="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-4 h-4 text-purple-500"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<circle cx="12" cy="12" r="10" />
										<path d="M8 14s1.5 2 4 2 4-2 4-2" />
										<line x1="9" y1="9" x2="9.01" y2="9" />
										<line x1="15" y1="9" x2="15.01" y2="9" />
									</svg>
								</div>
								<div>
									<h2 class="text-base font-bold font-heading leading-none">My Submitted Emojis</h2>
									<p class="text-xs text-muted-foreground mt-0.5">
										{submittedEmojis.length} emoji{submittedEmojis.length !== 1 ? "s" : ""} you submitted
										manually
									</p>
								</div>
							</div>
							<a
								href="/emojis"
								class="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-4 h-4"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<circle cx="11" cy="11" r="8" />
									<path d="m21 21-4.3-4.3" />
								</svg>
								Browse All
							</a>
						</div>
						<div class="p-6">
							{#if submittedEmojis.length === 0}
								<div class="flex flex-col items-center justify-center py-16 text-center">
									<div
										class="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4 text-3xl select-none"
									>
										😶
									</div>
									<p class="font-bold text-base">No submitted emojis yet</p>
									<p class="text-sm text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
										Emojis are automatically synced when your registered servers run
										<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">/sync</code>.
									</p>
									<a
										href="/emojis"
										class="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="w-4 h-4"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<circle cx="11" cy="11" r="8" />
											<path d="m21 21-4.3-4.3" />
										</svg>
										Browse Emojis
									</a>
								</div>
							{:else}
								<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
									{#each submittedEmojis as emoji (emoji.id)}
										<EmojiCard {emoji} />
									{/each}
								</div>
							{/if}
						</div>
					</div>

					<!-- Server emojis hint -->
					<div class="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
						<div class="px-6 py-4 border-b border-border flex items-center gap-2">
							<div class="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-4 h-4 text-green-500"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<circle cx="12" cy="12" r="10" />
									<path d="M12 16v-4" />
									<path d="M12 8h.01" />
								</svg>
							</div>
							<h2 class="text-base font-bold font-heading leading-none">Server Emojis</h2>
						</div>
						<div class="p-6 space-y-4">
							<p class="text-sm text-muted-foreground leading-relaxed">
								Emojis from your registered servers are synced automatically. To see or manage them,
								visit each server's listing page or use the
								<code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground"
									>/sync</code
								>
								command in Discord.
							</p>
							{#if servers.length > 0}
								<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
									{#each servers as srv}
										<a
											href="/emojis?guild={srv.id}"
											class="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border/60 transition-colors group"
										>
											<div
												class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0"
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													class="w-4 h-4 text-primary"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"
												>
													<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
													<polyline points="9 22 9 12 15 12 15 22" />
												</svg>
											</div>
											<div class="min-w-0 flex-1">
												<p class="font-semibold text-sm text-foreground truncate">{srv.name}</p>
												<p class="text-xs text-muted-foreground mt-0.5">View emojis →</p>
											</div>
										</a>
									{/each}
								</div>
							{/if}
						</div>
					</div>

					<!-- ════════════════════════════════════════════════════════════ -->
					<!-- PROFILE                                                      -->
					<!-- ════════════════════════════════════════════════════════════ -->
				{:else if activeSection === "profile"}
					<!-- Banner preview -->
					{#if banner}
						<div
							class="relative w-full h-36 rounded-2xl overflow-hidden border border-border shadow-sm"
						>
							<img
								src={banner}
								alt="Profile banner preview"
								class="w-full h-full object-cover"
								on:error={(e) => {
									(e.currentTarget as HTMLImageElement).closest("div")?.classList.add("hidden");
								}}
							/>
							<div
								class="absolute inset-0 bg-linear-to-t from-black/40 to-transparent pointer-events-none"
							></div>
							<span
								class="absolute bottom-2 left-3 text-xs text-white/80 font-medium backdrop-blur-sm bg-black/30 rounded-md px-2 py-0.5"
							>
								Banner preview
							</span>
						</div>
					{/if}

					<div class="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
						<!-- Card header -->
						<div class="px-6 py-4 border-b border-border flex items-center gap-2">
							<div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-4 h-4 text-primary"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
								</svg>
							</div>
							<div>
								<h2 class="text-base font-bold font-heading leading-none">Public Profile</h2>
								<p class="text-xs text-muted-foreground mt-0.5">
									Visible to everyone on your profile page
								</p>
							</div>
						</div>

						<div class="p-6 space-y-5">
							<!-- Avatar + bio -->
							<div class="flex gap-5 items-start">
								<div class="shrink-0 flex flex-col items-center gap-2">
									<img
										src={avatarSrc}
										alt="Your avatar"
										class="w-16 h-16 rounded-xl object-cover border-2 border-border shadow"
									/>
									<span class="text-xs text-muted-foreground text-center leading-tight"
										>Via Discord</span
									>
								</div>
								<div class="flex-1 space-y-1.5">
									<Label forId="bio">Bio</Label>
									<Textarea
										id="bio"
										bind:value={bio}
										rows={3}
										placeholder="Tell people a little about yourself…"
										autoGrow
									/>
									<div class="space-y-1">
										<div class="flex justify-between text-xs text-muted-foreground">
											<span>Shown on your public profile.</span>
											<span class:text-destructive={bioOver} class="font-mono font-semibold"
												>{bio.length}/200</span
											>
										</div>
										<div class="h-0.5 bg-border rounded-full overflow-hidden">
											<div
												class="h-full rounded-full transition-all duration-200 {bioOver
													? 'bg-destructive'
													: bioPercent > 80
														? 'bg-yellow-500'
														: 'bg-primary'}"
												style="width: {bioPercent}%"
											></div>
										</div>
									</div>
								</div>
							</div>

							<!-- Banner URL -->
							<div class="space-y-1.5">
								<Label forId="banner">Banner Image URL</Label>
								<div class="relative">
									<div class="absolute inset-y-0 left-3 flex items-center pointer-events-none">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="w-4 h-4 text-muted-foreground"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle
												cx="8.5"
												cy="8.5"
												r="1.5"
											/><polyline points="21 15 16 10 5 21" />
										</svg>
									</div>
									<Input
										id="banner"
										bind:value={banner}
										placeholder="https://example.com/banner.png"
										classId="pl-9"
									/>
								</div>
								<p class="text-xs text-muted-foreground">
									A direct image URL shown at the top of your profile. Leave blank to remove.
								</p>
							</div>

							<!-- Status messages -->
							{#if saveError}
								<div
									class="flex items-start gap-2.5 rounded-xl bg-destructive/8 border border-destructive/25 px-4 py-3 text-sm text-destructive"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-4 h-4 mt-0.5 shrink-0"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line
											x1="12"
											y1="16"
											x2="12.01"
											y2="16"
										/>
									</svg>
									{saveError}
								</div>
							{/if}
							{#if saveSuccess}
								<div
									class="flex items-center gap-2.5 rounded-xl bg-green-500/8 border border-green-500/25 px-4 py-3 text-sm text-green-600 dark:text-green-400"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-4 h-4 shrink-0"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline
											points="22 4 12 14.01 9 11.01"
										/>
									</svg>
									Profile saved successfully!
								</div>
							{/if}

							<!-- Save footer -->
							<div class="flex items-center justify-between pt-1">
								<p class="text-xs text-muted-foreground">
									Changes are reflected on your profile immediately.
								</p>
								<button
									on:click={saveProfile}
									disabled={saving || bioOver}
									class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 shadow-sm shadow-primary/20"
								>
									{#if saving}
										<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
											<circle
												class="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												stroke-width="4"
											/>
											<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
										</svg>
										Saving…
									{:else}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="w-4 h-4"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<path
												d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"
											/><polyline points="17 21 17 13 7 13 7 21" /><polyline
												points="7 3 7 8 15 8"
											/>
										</svg>
										Save Changes
									{/if}
								</button>
							</div>
						</div>
					</div>

					<!-- ════════════════════════════════════════════════════════════ -->
					<!-- ACCOUNT                                                      -->
					<!-- ════════════════════════════════════════════════════════════ -->
				{:else if activeSection === "account"}
					<div class="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
						<div class="px-6 py-4 border-b border-border flex items-center gap-2">
							<div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-4 h-4 text-primary"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
								</svg>
							</div>
							<div>
								<h2 class="text-base font-bold font-heading leading-none">Discord Account</h2>
								<p class="text-xs text-muted-foreground mt-0.5">
									Details synced from Discord on each login
								</p>
							</div>
						</div>

						<!-- Identity card -->
						<div
							class="m-4 flex items-center gap-4 p-4 rounded-xl bg-background border border-border"
						>
							<img
								src={avatarSrc}
								alt="Avatar"
								class="w-14 h-14 rounded-full border-2 border-border object-cover shrink-0 shadow"
							/>
							<div class="min-w-0">
								<p class="font-extrabold text-lg leading-tight truncate">{displayName}</p>
								<p class="text-muted-foreground text-sm">{handle}</p>
								{#if discordUser.email}
									<p class="text-muted-foreground text-xs mt-0.5 flex items-center gap-1">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="w-3 h-3 shrink-0"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<path
												d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
											/><polyline points="22,6 12,13 2,6" />
										</svg>
										{discordUser.email}
									</p>
								{/if}
							</div>
							{#if user.nitro}
								<span
									class="ml-auto shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20"
								>
									✦ Nitro
								</span>
							{/if}
						</div>

						<!-- Stat tiles -->
						<div class="grid grid-cols-2 gap-3 mx-4 mb-4">
							<div
								class="bg-background border border-border rounded-xl p-4 flex items-center gap-3"
							>
								<div
									class="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0"
								>
									<img src="/assets/img/bot/moneh.svg" alt="coins" class="w-5 h-5" />
								</div>
								<div class="min-w-0">
									<p class="font-extrabold text-lg leading-none">{user.bal.toLocaleString()}</p>
									<p class="text-xs text-muted-foreground mt-0.5">R$ Balance</p>
								</div>
							</div>
							<div
								class="bg-background border border-border rounded-xl p-4 flex items-center gap-3"
							>
								<div
									class="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-5 h-5 text-green-500"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<polyline points="18 15 12 9 6 15" />
									</svg>
								</div>
								<div class="min-w-0">
									<p class="font-extrabold text-lg leading-none">
										{totalVotesCast.toLocaleString()}
									</p>
									<p class="text-xs text-muted-foreground mt-0.5">Total Votes</p>
								</div>
							</div>
						</div>

						<!-- Info rows -->
						<dl class="border-t border-border divide-y divide-border">
							<div class="flex items-center justify-between px-6 py-3 text-sm">
								<dt class="text-muted-foreground font-medium flex items-center gap-2">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-3.5 h-3.5 shrink-0"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line
											x1="16"
											y1="2"
											x2="16"
											y2="6"
										/><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
									</svg>
									Member Since
								</dt>
								<dd class="font-medium">{memberSince}</dd>
							</div>
							<div class="flex items-center justify-between px-6 py-3 text-sm">
								<dt class="text-muted-foreground font-medium flex items-center gap-2">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-3.5 h-3.5 shrink-0"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<rect x="3" y="11" width="18" height="10" rx="2" /><circle
											cx="12"
											cy="5"
											r="2"
										/><path d="M12 7v4" />
									</svg>
									Bots Listed
								</dt>
								<dd class="font-semibold">{bots.length}</dd>
							</div>
							<div class="flex items-center justify-between px-6 py-3 text-sm">
								<dt class="text-muted-foreground font-medium flex items-center gap-2">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-3.5 h-3.5 shrink-0"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
										<polyline points="9 22 9 12 15 12 15 22" />
									</svg>
									Servers Listed
								</dt>
								<dd class="font-semibold">{servers.length}</dd>
							</div>
							<div class="flex items-center justify-between px-6 py-3 text-sm">
								<dt class="text-muted-foreground font-medium flex items-center gap-2">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-3.5 h-3.5 shrink-0"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path
											d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
										/>
									</svg>
									Nitro Status
								</dt>
								<dd>
									{#if user.nitro}
										<span
											class="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20"
											>✦ Active</span
										>
									{:else}
										<span
											class="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted/40 border border-border"
											>Not Active</span
										>
									{/if}
								</dd>
							</div>
						</dl>

						<p
							class="px-6 py-3 text-xs text-muted-foreground border-t border-border bg-background/40"
						>
							Account details are managed by Discord and sync automatically each time you log in.
						</p>
					</div>

					<!-- ════════════════════════════════════════════════════════════ -->
					<!-- VOTE HISTORY                                                 -->
					<!-- ════════════════════════════════════════════════════════════ -->
				{:else if activeSection === "votes"}
					<div class="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
						<div class="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
							<div class="flex items-center gap-2">
								<div class="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-4 h-4 text-green-500"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<polyline points="18 15 12 9 6 15" />
									</svg>
								</div>
								<div>
									<h2 class="text-base font-bold font-heading leading-none">Vote History</h2>
									<p class="text-xs text-muted-foreground mt-0.5">
										Your 10 most recent votes · last 30 days
									</p>
								</div>
							</div>
							<span
								class="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20"
							>
								{totalVotesCast.toLocaleString()} total
							</span>
						</div>

						{#if recentVotes.length === 0}
							<div class="flex flex-col items-center justify-center py-16 text-center px-6">
								<div
									class="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-8 h-8 text-muted-foreground/50"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="1.5"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<polyline points="18 15 12 9 6 15" />
									</svg>
								</div>
								<p class="font-bold text-base">No votes yet</p>
								<p class="text-sm text-muted-foreground mt-1.5 max-w-xs">
									Your vote history will appear here once you start voting for bots.
								</p>
								<a
									href="/bots"
									class="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-4 h-4"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
									</svg>
									Browse Bots
								</a>
							</div>
						{:else}
							<ul class="divide-y divide-border">
								{#each recentVotes as vote, i}
									<li>
										<a
											href="/bots/{vote.botSlug}"
											class="flex items-center gap-3.5 px-5 py-3.5 hover:bg-accent/40 transition-colors group"
										>
											<span
												class="w-5 text-xs font-mono text-muted-foreground/60 shrink-0 text-right"
												>{i + 1}</span
											>
											<img
												src={vote.botAvatar
													? getAvatarURL(vote.botId, vote.botAvatar, 40)
													: getAvatarURL(vote.botId, "0")}
												alt="{vote.botName} avatar"
												class="w-9 h-9 rounded-xl object-cover border border-border shrink-0 shadow-sm"
											/>
											<div class="min-w-0 flex-1">
												<p
													class="font-semibold text-sm truncate group-hover:text-primary transition-colors"
												>
													{vote.botName}
												</p>
												<p class="text-xs text-muted-foreground">{relativeTime(vote.at)}</p>
											</div>
											<span
												class="shrink-0 inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													class="w-3 h-3"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2.5"
													stroke-linecap="round"
													stroke-linejoin="round"
												>
													<polyline points="18 15 12 9 6 15" />
												</svg>
												Voted
											</span>
										</a>
									</li>
								{/each}
							</ul>

							<!-- 30-day policy note -->
							<div
								class="px-5 py-2.5 border-t border-border bg-background/40 flex items-center gap-2"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-3.5 h-3.5 text-muted-foreground/70 shrink-0"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<circle cx="12" cy="12" r="10" />
									<line x1="12" y1="8" x2="12" y2="12" />
									<line x1="12" y1="16" x2="12.01" y2="16" />
								</svg>
								<p class="text-xs text-muted-foreground">
									Votes older than 30 days are not shown.{#if expiredCount > 0}&nbsp;<span
											class="text-muted-foreground/70"
											>{expiredCount} expired {expiredCount === 1 ? "entry was" : "entries were"} removed
											this session.</span
										>{/if}
								</p>
							</div>

							{#if totalVotesCast > 10}
								<div
									class="px-5 py-2.5 border-t border-border bg-background/40 flex items-center justify-center gap-2"
								>
									<p class="text-xs text-muted-foreground">
										Showing <span class="font-semibold text-foreground">10</span> of
										<span class="font-semibold text-foreground"
											>{totalVotesCast.toLocaleString()}</span
										> recent votes
									</p>
								</div>
							{/if}
						{/if}
					</div>

					<!-- ════════════════════════════════════════════════════════════ -->
					<!-- DANGER ZONE                                                  -->
					<!-- ════════════════════════════════════════════════════════════ -->
				{:else if activeSection === "referrals"}
					<!-- ══════════════════════════════════════════════════════════════════
					     REFERRALS SECTION
					     ══════════════════════════════════════════════════════════════════ -->

					<!-- ── Referral link card ─────────────────────────────────────────── -->
					<div class="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
						<div class="px-6 py-4 border-b border-border flex items-center gap-2">
							<div
								class="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-4 h-4 text-amber-500"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
									<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
								</svg>
							</div>
							<div>
								<h2 class="text-base font-bold font-heading leading-none">Your Referral Link</h2>
								<p class="text-xs text-muted-foreground mt-0.5">
									Share this link — earn R$ when friends join and stay active
								</p>
							</div>
						</div>
						<div class="p-6 space-y-4">
							<!-- Link display + copy -->
							<div class="flex items-center gap-2">
								<div
									class="flex-1 min-w-0 bg-background border border-border rounded-xl px-3 py-2.5 flex items-center gap-2 overflow-hidden"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-3.5 h-3.5 text-muted-foreground shrink-0"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
										<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
									</svg>
									<code class="text-xs font-mono text-foreground/80 truncate select-all"
										>{referralLink}</code
									>
								</div>
								<button
									on:click={copyReferralLink}
									class="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all
										{linkCopied
										? 'bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/25'
										: 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95'}"
								>
									{#if linkCopied}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="w-3.5 h-3.5"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2.5"
											stroke-linecap="round"
											stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg
										>
										Copied!
									{:else}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="w-3.5 h-3.5"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path
												d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"
											/></svg
										>
										Copy Link
									{/if}
								</button>
							</div>

							<!-- How it works — double-sided reward table -->
							<div class="bg-muted/40 rounded-xl p-4 space-y-3">
								<p class="text-xs font-semibold text-foreground uppercase tracking-wider">
									How rewards work — both of you earn
								</p>

								<!-- Header row -->
								<div
									class="grid grid-cols-[1fr_auto_auto] gap-x-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-1"
								>
									<span>Milestone</span>
									<span class="text-right">You (referrer)</span>
									<span class="text-right">Your friend</span>
								</div>

								<!-- Row 1: Welcome Handshake -->
								<div class="grid grid-cols-[1fr_auto_auto] gap-x-3 items-start text-xs px-1">
									<div>
										<span class="inline-flex items-center gap-1.5">
											<span
												class="w-4 h-4 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 font-bold text-[9px]"
												>1</span
											>
											<strong class="text-foreground">Welcome Handshake</strong>
										</span>
										<p class="text-muted-foreground mt-0.5 pl-5.5 leading-relaxed">
											Friend joins with account ≥7 days old &amp; verified email.
										</p>
									</div>
									<span
										class="text-right font-bold text-green-600 dark:text-green-400 whitespace-nowrap mt-0.5"
										>R$100</span
									>
									<span
										class="text-right font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap mt-0.5"
										>R$50</span
									>
								</div>

								<div class="border-t border-border/60"></div>

								<!-- Row 2: Engagement Sprint -->
								<div class="grid grid-cols-[1fr_auto_auto] gap-x-3 items-start text-xs px-1">
									<div>
										<span class="inline-flex items-center gap-1.5">
											<span
												class="w-4 h-4 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 font-bold text-[9px]"
												>2</span
											>
											<strong class="text-foreground">Engagement Sprint</strong>
										</span>
										<p class="text-muted-foreground mt-0.5 pl-5.5 leading-relaxed">
											Friend visits 5 separate days <em>or</em> casts 20 unique votes in their first
											week.
											<span class="block mt-0.5 text-[11px] text-muted-foreground/70"
												>(R$50/day you · R$40/day friend, 5 days max)</span
											>
										</p>
									</div>
									<span
										class="text-right font-bold text-green-600 dark:text-green-400 whitespace-nowrap mt-0.5"
										>R$250</span
									>
									<span
										class="text-right font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap mt-0.5"
										>R$200</span
									>
								</div>

								<div class="border-t border-border/60"></div>

								<!-- Row 3: Growth Bounty -->
								<div class="grid grid-cols-[1fr_auto_auto] gap-x-3 items-start text-xs px-1">
									<div>
										<span class="inline-flex items-center gap-1.5">
											<span
												class="w-4 h-4 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 font-bold text-[9px]"
												>3</span
											>
											<strong class="text-foreground">Growth Bounty</strong>
										</span>
										<p class="text-muted-foreground mt-0.5 pl-5.5 leading-relaxed">
											Friend adds a server with 50+ members to the listing.
										</p>
									</div>
									<span
										class="text-right font-bold text-green-600 dark:text-green-400 whitespace-nowrap mt-0.5"
										>R$500</span
									>
									<span
										class="text-right font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap mt-0.5"
										>R$500</span
									>
								</div>

								<div class="border-t border-border/60"></div>

								<!-- Self-service note -->
								<div class="text-xs text-muted-foreground px-1">
									<strong class="text-foreground">Self-listing bonus</strong> (no referral needed):
									list a server with
									<strong class="text-foreground">50+ members → R$100</strong> or
									<strong class="text-foreground">200+ members → R$500</strong>.
								</div>

								<!-- Totals footer -->
								<div
									class="bg-background/60 rounded-lg px-3 py-2 flex items-center justify-between text-[11px] border border-border/50"
								>
									<span class="text-muted-foreground/70">Max per referral</span>
									<div class="flex items-center gap-4">
										<span>
											<span class="text-muted-foreground/60">You: </span>
											<strong class="text-foreground">R$850</strong>
											<span class="text-muted-foreground/50 text-[10px]">(100+250+500)</span>
										</span>
										<span>
											<span class="text-muted-foreground/60">Friend: </span>
											<strong class="text-foreground">R$750</strong>
											<span class="text-muted-foreground/50 text-[10px]">(50+200+500)</span>
										</span>
									</div>
								</div>
								<p class="text-[10px] text-muted-foreground/50 pt-0.5">
									Rewards settled daily at 02:00 UTC. Account must be ≥7 days old with a verified
									Discord email.
								</p>
							</div>
						</div>
					</div>

					<!-- ── Stats strip ────────────────────────────────────────────────── -->
					<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
						<div class="bg-card border border-border rounded-xl px-4 py-3 text-center">
							<p class="text-xl font-extrabold">{referralStats.total}</p>
							<p class="text-xs text-muted-foreground mt-0.5">Total Referred</p>
						</div>
						<div class="bg-card border border-border rounded-xl px-4 py-3 text-center">
							<p class="text-xl font-extrabold text-green-600 dark:text-green-400">
								{referralStats.paid}
							</p>
							<p class="text-xs text-muted-foreground mt-0.5">Converted</p>
						</div>
						<div class="bg-card border border-border rounded-xl px-4 py-3 text-center">
							<p class="text-xl font-extrabold flex items-center justify-center gap-1">
								<img src="/assets/img/bot/moneh.svg" alt="R$" class="w-4 h-4" />
								{referralStats.totalEarned.toLocaleString()}
							</p>
							<p class="text-xs text-muted-foreground mt-0.5">R$ Earned</p>
						</div>
						<div class="bg-card border border-border rounded-xl px-4 py-3 text-center">
							<p
								class="text-xl font-extrabold flex items-center justify-center gap-1 text-amber-500"
							>
								<img src="/assets/img/bot/moneh.svg" alt="R$" class="w-4 h-4 opacity-70" />
								{referralStats.pendingEarnable.toLocaleString()}
							</p>
							<p class="text-xs text-muted-foreground mt-0.5">R$ Pending</p>
						</div>
					</div>

					<!-- ── Was referred notice + referred-user earnings ──────────────── -->
					{#if wasReferredBy}
						<div class="bg-card border border-border rounded-2xl overflow-hidden">
							<!-- Header -->
							<div class="px-5 py-3.5 border-b border-border flex items-center gap-3">
								<div
									class="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-3.5 h-3.5 text-blue-500"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
									</svg>
								</div>
								<div class="flex-1 min-w-0">
									<p class="text-sm font-semibold leading-none">You were referred</p>
									<p class="text-xs text-muted-foreground mt-0.5">
										By <code class="font-mono bg-muted px-1 py-0.5 rounded text-[11px]"
											>{shortId(wasReferredBy.referrer_id)}</code
										>
										on {fmtDate(wasReferredBy.created_at)} —
										<span class="inline-flex items-center gap-1 font-medium">
											<span
												class="inline-block w-1.5 h-1.5 rounded-full {wasReferredBy.reward_status ===
												'paid'
													? 'bg-green-500'
													: wasReferredBy.reward_status === 'flagged'
														? 'bg-yellow-500'
														: 'bg-muted-foreground'}"
											></span>
											{statusLabel(wasReferredBy.reward_status)}
										</span>
									</p>
								</div>
								<!-- Total earned as referred user -->
								{#if totalEarnedAsReferred > 0}
									<div class="shrink-0 text-right">
										<p class="text-xs text-muted-foreground leading-none">You earned</p>
										<p
											class="text-base font-extrabold text-blue-600 dark:text-blue-400 flex items-center gap-1 justify-end mt-0.5"
										>
											<img src="/assets/img/bot/moneh.svg" alt="R$" class="w-3.5 h-3.5" />
											{totalEarnedAsReferred.toLocaleString()}
										</p>
									</div>
								{/if}
							</div>

							<!-- Referred-user reward rows -->
							{#if earnedAsReferred.length > 0}
								<ul class="divide-y divide-border">
									{#each earnedAsReferred as m (m.id)}
										<li class="flex items-center gap-3 px-5 py-3 text-sm">
											<!-- Icon -->
											<div
												class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0
													{m.status === 'paid'
													? 'bg-blue-500/10 text-blue-500'
													: m.status === 'flagged'
														? 'bg-yellow-500/10 text-yellow-500'
														: 'bg-muted text-muted-foreground'}"
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													class="w-3.5 h-3.5"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"
												>
													<path d={milestoneIcon(m.milestone_type, m.meta)} />
												</svg>
											</div>
											<!-- Label + date -->
											<div class="flex-1 min-w-0">
												<p class="font-medium leading-none text-xs">
													{referredMilestoneLabel(m.milestone_type, m.meta)}
												</p>
												<p class="text-[11px] text-muted-foreground mt-0.5">
													{m.paid_at
														? fmtDate(m.paid_at)
														: m.status === "pending"
															? "Pending settlement"
															: fmtDate(m.created_at)}
												</p>
											</div>
											<!-- Amount -->
											<div
												class="flex items-center gap-1 font-bold text-sm shrink-0 text-blue-600 dark:text-blue-400"
											>
												<img
													src="/assets/img/bot/moneh.svg"
													alt="R$"
													class="w-3.5 h-3.5 opacity-80"
												/>
												{m.reward_amount.toLocaleString()}
											</div>
											<!-- Status badge -->
											<span
												class="text-[10px] font-semibold px-1.5 py-0.5 rounded-md border {statusColor(
													m.status
												)}"
											>
												{statusLabel(m.status)}
											</span>
										</li>
									{/each}
								</ul>
							{:else if wasReferredBy.reward_status === "payable" || wasReferredBy.reward_status === "pending"}
								<p class="text-xs text-muted-foreground px-5 py-3.5">
									Your Welcome Bonus of <strong class="text-foreground">R$50</strong> is queued and will
									be credited at the next daily settlement (02:00 UTC).
								</p>
							{:else if wasReferredBy.reward_status === "flagged"}
								<p class="text-xs text-yellow-600 dark:text-yellow-400 px-5 py-3.5">
									This referral was flagged for review. Rewards are on hold pending manual
									verification.
								</p>
							{:else}
								<p class="text-xs text-muted-foreground px-5 py-3.5">
									Complete activities in your first week to earn more rewards — visit 5 days or cast
									20 votes, then list a server with 50+ members for <strong class="text-foreground"
										>R$500</strong
									>.
								</p>
							{/if}
						</div>
					{/if}

					<!-- ── Referral history list ──────────────────────────────────────── -->
					<div class="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
						<div class="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
							<div class="flex items-center gap-2">
								<div
									class="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-4 h-4 text-amber-500"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle
											cx="9"
											cy="7"
											r="4"
										/>
										<path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
									</svg>
								</div>
								<div>
									<h2 class="text-base font-bold font-heading leading-none">Referral History</h2>
									<p class="text-xs text-muted-foreground mt-0.5">
										{referralsSent.length} referral{referralsSent.length !== 1 ? "s" : ""} sent — click
										any row to see milestone details
									</p>
								</div>
							</div>
							{#if referralStats.total > 0}
								<span
									class="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
								>
									{referralStats.total} total
								</span>
							{/if}
						</div>

						{#if referralsSent.length === 0}
							<!-- Empty state -->
							<div class="flex flex-col items-center justify-center py-16 text-center px-6">
								<div
									class="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-7 h-7 text-muted-foreground/50"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="1.5"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle
											cx="9"
											cy="7"
											r="4"
										/>
										<path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
									</svg>
								</div>
								<p class="font-bold text-base">No referrals yet</p>
								<p class="text-sm text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
									Share your referral link above. Every friend who signs up and stays active earns
									you R$.
								</p>
								<button
									on:click={copyReferralLink}
									class="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-3.5 h-3.5"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path
											d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"
										/></svg
									>
									Copy Referral Link
								</button>
							</div>
						{:else}
							<ul class="divide-y divide-border">
								{#each referralsSent as referral (referral.id)}
									<!-- Row header -->
									<li>
										<button
											class="w-full text-left px-5 py-4 hover:bg-accent/40 transition-colors"
											on:click={() => toggleReferral(referral.id)}
										>
											<div class="flex items-center gap-3">
												<!-- Status dot -->
												<span
													class="shrink-0 w-2 h-2 rounded-full mt-0.5
													{referral.reward_status === 'paid'
														? 'bg-green-500'
														: referral.reward_status === 'flagged'
															? 'bg-yellow-500'
															: referral.reward_status === 'rejected'
																? 'bg-red-500'
																: referral.reward_status === 'payable'
																	? 'bg-blue-400'
																	: 'bg-muted-foreground/40'}"
												>
												</span>

												<!-- User ID + date -->
												<div class="flex-1 min-w-0">
													<div class="flex items-center gap-2 flex-wrap">
														<p class="text-sm font-semibold font-mono">
															{shortId(referral.referred_id)}
														</p>
														{#if referral.fingerprint_match}
															<span
																class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20"
															>
																⚠ Shared device
															</span>
														{/if}
													</div>
													<p class="text-xs text-muted-foreground mt-0.5">
														Joined {fmtDate(referral.created_at)}
													</p>
												</div>

												<!-- Status badge -->
												<span
													class="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border {statusColor(
														referral.reward_status
													)}"
												>
													{statusLabel(referral.reward_status)}
												</span>

												<!-- Earned amount -->
												<div class="shrink-0 text-right hidden sm:block">
													<p class="text-sm font-extrabold flex items-center gap-1 justify-end">
														<img src="/assets/img/bot/moneh.svg" alt="R$" class="w-3.5 h-3.5" />
														{totalEarnedFromReferral(referral).toLocaleString()}
													</p>
													<p class="text-[10px] text-muted-foreground">earned</p>
												</div>

												<!-- Progress indicators (mini) -->
												<div class="shrink-0 flex items-center gap-1.5">
													<!-- Sign-up tick -->
													<span
														title="Sign-up reward"
														class="w-5 h-5 rounded-full flex items-center justify-center {hasSignupRewardPaid(
															referral
														)
															? 'bg-green-500/15 text-green-500'
															: 'bg-muted text-muted-foreground/30'}"
													>
														<svg
															class="w-3 h-3"
															viewBox="0 0 24 24"
															fill="none"
															stroke="currentColor"
															stroke-width="2.5"
															stroke-linecap="round"
															stroke-linejoin="round"
															><path
																d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
															/></svg
														>
													</span>
													<!-- Vote-20 tick -->
													<span
														title="20-vote milestone"
														class="w-5 h-5 rounded-full flex items-center justify-center {hasVote20Paid(
															referral
														)
															? 'bg-green-500/15 text-green-500'
															: 'bg-muted text-muted-foreground/30'}"
													>
														<svg
															class="w-3 h-3"
															viewBox="0 0 24 24"
															fill="none"
															stroke="currentColor"
															stroke-width="2.5"
															stroke-linecap="round"
															stroke-linejoin="round"><polyline points="18 15 12 9 6 15" /></svg
														>
													</span>
													<!-- Server bounty tick -->
													<span
														title="Server bounty"
														class="w-5 h-5 rounded-full flex items-center justify-center {hasServerBountyPaid(
															referral
														)
															? 'bg-green-500/15 text-green-500'
															: 'bg-muted text-muted-foreground/30'}"
													>
														<svg
															class="w-3 h-3"
															viewBox="0 0 24 24"
															fill="none"
															stroke="currentColor"
															stroke-width="2"
															stroke-linecap="round"
															stroke-linejoin="round"
															><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline
																points="9 22 9 12 15 12 15 22"
															/></svg
														>
													</span>
												</div>

												<!-- Chevron -->
												<svg
													xmlns="http://www.w3.org/2000/svg"
													class="w-4 h-4 text-muted-foreground/50 shrink-0 transition-transform {expandedReferralId ===
													referral.id
														? 'rotate-180'
														: ''}"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg
												>
											</div>

											<!-- Retention day progress bar (always visible) -->
											{#if referral.reward_status === "paid" || referral.reward_status === "payable" || referral.reward_status === "pending"}
												{@const daysEarned = retentionDaysPaid(referral)}
												<div class="mt-3 flex items-center gap-2">
													<div class="flex gap-1">
														{#each [1, 2, 3, 4, 5] as day}
															<div
																class="w-5 h-1.5 rounded-full {day <= daysEarned
																	? 'bg-amber-500'
																	: 'bg-border'}"
															></div>
														{/each}
													</div>
													<p class="text-[11px] text-muted-foreground">
														{daysEarned}/5 retention days
													</p>
												</div>
											{/if}
										</button>

										<!-- Expanded milestone drawer -->
										{#if expandedReferralId === referral.id}
											<div class="bg-background/50 border-t border-border px-5 py-4">
												{#if referral.milestones.length === 0}
													<p class="text-xs text-muted-foreground text-center py-3">
														No milestones recorded yet — rewards are processed daily at 02:00 UTC.
													</p>
												{:else}
													<ul class="space-y-2">
														{#each referral.milestones as m (m.id)}
															<li class="flex items-center gap-3 text-sm">
																<!-- Milestone icon -->
																<div
																	class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0
																	{m.status === 'paid'
																		? 'bg-green-500/10 text-green-500'
																		: m.status === 'flagged'
																			? 'bg-yellow-500/10 text-yellow-500'
																			: 'bg-muted text-muted-foreground'}"
																>
																	<svg
																		class="w-3.5 h-3.5"
																		viewBox="0 0 24 24"
																		fill="none"
																		stroke="currentColor"
																		stroke-width="2"
																		stroke-linecap="round"
																		stroke-linejoin="round"
																	>
																		<path d={milestoneIcon(m.milestone_type, m.meta)} />
																	</svg>
																</div>

																<!-- Label + date -->
																<div class="flex-1 min-w-0">
																	<p class="font-medium leading-none">
																		{milestoneLabel(m.milestone_type, m.meta)}
																	</p>
																	<p class="text-xs text-muted-foreground mt-0.5">
																		{m.status === "paid" && m.paid_at
																			? `Paid ${fmtDate(m.paid_at)}`
																			: `Detected ${fmtDate(m.created_at)}`}
																	</p>
																</div>

																<!-- Amount -->
																<div class="flex items-center gap-1 font-bold text-sm shrink-0">
																	<img
																		src="/assets/img/bot/moneh.svg"
																		alt="R$"
																		class="w-3.5 h-3.5"
																	/>
																	+{m.reward_amount.toLocaleString()}
																</div>

																<!-- Status badge -->
																<span
																	class="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full border {statusColor(
																		m.status
																	)}"
																>
																	{statusLabel(m.status)}
																</span>
															</li>
														{/each}
													</ul>

													<!-- Referral totals footer -->
													<div
														class="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground"
													>
														<span
															>{referral.milestones.filter((m) => m.status === "paid").length} of {referral
																.milestones.length} milestones paid</span
														>
														<span class="font-bold text-foreground flex items-center gap-1">
															<img src="/assets/img/bot/moneh.svg" alt="R$" class="w-3 h-3" />
															{totalEarnedFromReferral(referral).toLocaleString()} earned
														</span>
													</div>
												{/if}

												<!-- Fraud note if flagged -->
												{#if referral.fingerprint_match || referral.reward_status === "flagged"}
													<div
														class="mt-3 flex items-start gap-2 bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2.5"
													>
														<svg
															xmlns="http://www.w3.org/2000/svg"
															class="w-4 h-4 text-yellow-500 shrink-0 mt-0.5"
															viewBox="0 0 24 24"
															fill="none"
															stroke="currentColor"
															stroke-width="2"
															stroke-linecap="round"
															stroke-linejoin="round"
															><path
																d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
															/><line x1="12" y1="9" x2="12" y2="13" /><line
																x1="12"
																y1="17"
																x2="12.01"
																y2="17"
															/></svg
														>
														<p class="text-xs text-yellow-600 dark:text-yellow-400 leading-relaxed">
															A shared device fingerprint was detected between you and this referred
															user. This referral has been soft-flagged and its rewards are pending
															manual review. If you believe this is a mistake, please contact
															support.
														</p>
													</div>
												{/if}
											</div>
										{/if}
									</li>
								{/each}
							</ul>

							<!-- Footer info bar -->
							<div
								class="px-5 py-3 border-t border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"
							>
								<span
									>Rewards settled daily · <strong class="text-foreground"
										>{referralStats.flagged}</strong
									>
									flagged · <strong class="text-foreground">{referralStats.rejected}</strong> rejected</span
								>
								<span class="flex items-center gap-1">
									<img src="/assets/img/bot/moneh.svg" alt="R$" class="w-3 h-3" />
									<strong class="text-foreground"
										>{referralStats.pendingEarnable.toLocaleString()}</strong
									> R$ pending settlement
								</span>
							</div>
						{/if}
					</div>

					<!-- ── Self-listing reward notice ────────────────────────────────── -->
					{#if servers.length > 0}
						<div class="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
							<div class="px-6 py-4 border-b border-border flex items-center gap-2">
								<div
									class="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-4 h-4 text-green-500"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline
											points="9 22 9 12 15 12 15 22"
										/>
									</svg>
								</div>
								<div>
									<h2 class="text-base font-bold font-heading leading-none">
										Server Listing Rewards
									</h2>
									<p class="text-xs text-muted-foreground mt-0.5">
										R$100 for 50+ members · R$500 for 200+ members · Awarded once per server at
										registration
									</p>
								</div>
							</div>
							<div class="divide-y divide-border">
								{#each servers as srv}
									<div class="px-5 py-3.5 flex items-center gap-3">
										{#if srv.icon}
											<img
												src="https://cdn.discordapp.com/icons/{srv.id}/{srv.icon}.webp?size=40"
												alt={srv.name}
												class="w-8 h-8 rounded-full border border-border shrink-0 object-cover"
											/>
										{:else}
											<div
												class="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0"
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													class="w-4 h-4 text-muted-foreground"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"
													><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline
														points="9 22 9 12 15 12 15 22"
													/></svg
												>
											</div>
										{/if}
										<div class="flex-1 min-w-0">
											<p class="text-sm font-semibold truncate">{srv.name}</p>
											<p class="text-xs text-muted-foreground">
												{srv.votes.toLocaleString()} votes
											</p>
										</div>
										<a
											href="/servers/{srv.slug ?? srv.id}"
											class="shrink-0 text-xs font-medium text-primary hover:underline">View →</a
										>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				{:else if activeSection === "danger"}
					<!-- Warning banner -->
					<div
						class="flex items-start gap-3 p-4 rounded-2xl bg-destructive/8 border border-destructive/25 text-sm text-destructive"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-5 h-5 shrink-0 mt-0.5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path
								d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
							/><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
						</svg>
						<div>
							<p class="font-bold">Danger Zone</p>
							<p class="mt-0.5 text-destructive/80">
								Actions here can affect your account session. Proceed carefully.
							</p>
						</div>
					</div>

					<div class="bg-card border border-destructive/20 rounded-2xl shadow-sm overflow-hidden">
						<div class="px-6 py-4 border-b border-border flex items-center gap-2">
							<div class="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-4 h-4 text-destructive"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline
										points="16 17 21 12 16 7"
									/><line x1="21" y1="12" x2="9" y2="12" />
								</svg>
							</div>
							<h2 class="text-base font-bold font-heading text-destructive leading-none">
								Session
							</h2>
						</div>

						<div class="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
							<div class="flex items-center gap-3 flex-1 min-w-0">
								<img
									src={avatarSrc}
									alt="Your avatar"
									class="w-10 h-10 rounded-xl object-cover border border-border shrink-0"
								/>
								<div class="min-w-0">
									<p class="font-semibold text-sm">Sign out of {displayName}</p>
									<p class="text-xs text-muted-foreground mt-0.5">
										Ends your current session. Your data won't be affected.
									</p>
								</div>
							</div>
							<button
								on:click={() => (showLogoutConfirm = true)}
								class="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-destructive/50 text-destructive text-sm font-semibold hover:bg-destructive/10 active:scale-95 transition-all duration-150"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-4 h-4 shrink-0"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline
										points="16 17 21 12 16 7"
									/><line x1="21" y1="12" x2="9" y2="12" />
								</svg>
								Sign Out
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</section>
</div>
