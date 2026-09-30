<script lang="ts">
	import BotCard from "$lib/components/BotCard.svelte";
	import ServerCard from "$lib/components/ServerCard.svelte";
	import getAvatarURL from "$lib/get-avatar-url";
	import approx from "$lib/approx-num";

	export let data: any;

	$: profile = data.profile;
	$: visible = data.visible;
	$: isSelf = data.isSelf;
	$: bots = data.bots ?? [];
	$: servers = data.servers ?? [];
	$: stats = data.stats;

	$: displayName = profile?.globalname || profile?.username || "Unknown User";
	$: avatarSrc = profile?.avatar
		? getAvatarURL(profile.id, profile.avatar, 256)
		: "/assets/img/bot/logo-144.png";
	// Gold profile border cosmetic (R$ spend sink): badge "cosmetic:profile_border".
	$: hasGoldBorder =
		Array.isArray(profile?.badges) && profile.badges.includes("cosmetic:profile_border");

	// Resolve the banner to a usable URL. `profile.banner` is either a custom URL
	// the user set in their dashboard (starts with http) or a raw Discord banner
	// hash synced from Discord - the latter must be expanded to a CDN URL, the
	// same way BotCard handles bot banners. Animated banners (a_ prefix) are gifs.
	$: bannerUrl = (() => {
		const raw = visible ? (profile?.banner ?? null) : null;
		if (!raw || typeof raw !== "string") return null;
		if (/^https?:\/\//.test(raw)) return raw;
		const ext = raw.startsWith("a_") ? "gif" : "webp";
		return `https://cdn.discordapp.com/banners/${profile.id}/${raw}.${ext}?size=600`;
	})();
	// When there's no banner image, fall back to the user's Discord accent colour
	// (stored as an integer string) before the generic gradient.
	$: accentBg = (() => {
		if (!visible || bannerUrl) return null;
		const a = profile?.accent_color;
		if (a == null || a === "") return null;
		const n = Number(a);
		if (Number.isNaN(n)) return null;
		return `#${(n & 0xffffff).toString(16).padStart(6, "0")}`;
	})();
	// Inline style carries the banner image or accent colour; the gradient fallback
	// is a Tailwind class so it stays correct across light/dark themes.
	$: hasBanner = !!bannerUrl;
	$: bannerStyle = hasBanner
		? `background-image:url('${bannerUrl}');background-size:cover;background-position:center;`
		: accentBg
			? `background-color:${accentBg};`
			: "";

	function joinedLabel(iso: string | null): string {
		if (!iso) return "";
		const d = new Date(iso);
		if (isNaN(d.getTime())) return "";
		return d.toLocaleDateString("en-US", { year: "numeric", month: "long" });
	}

	function prettyBadge(slug: string): string {
		return slug
			.replace(/[_-]+/g, " ")
			.replace(/\b\w/g, (c) => c.toUpperCase());
	}
</script>

<svelte:head>
	<title>{displayName} - Rovel Discord List</title>
	<!-- User profiles are never indexed (see also robots.txt + X-Robots-Tag header). -->
	<meta name="robots" content="noindex, nofollow, noarchive" />
	<meta name="googlebot" content="noindex, nofollow" />
</svelte:head>

{#if !visible}
	<!-- ── Private / non-public profile ─────────────────────────────────────── -->
	<section class="max-w-md mx-auto px-4 py-24 text-center">
		<img
			src={avatarSrc}
			alt={displayName}
			class="w-24 h-24 rounded-full mx-auto mb-6 border-4 border-card shadow-xl object-cover"
			loading="eager"
		/>
		<h1 class="font-heading text-2xl font-bold mb-2">{displayName}</h1>
		<div
			class="inline-flex items-center gap-2 text-muted-foreground text-sm font-medium bg-muted/50 border border-border rounded-full px-4 py-1.5 mb-5"
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
				<rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
				<path d="M7 11V7a5 5 0 0 1 10 0v4" />
			</svg>
			Private profile
		</div>
		<p class="text-muted-foreground text-sm leading-relaxed">
			This profile isn't public. Only members who have listed a bot or server appear here, and this
			user has either nothing listed or has chosen to keep their profile private.
		</p>
		<a
			href="/bots"
			class="inline-flex items-center gap-2 mt-8 px-5 py-2.5 bg-primary text-primary-foreground rounded-md font-semibold text-sm hover:bg-primary/90 transition-colors"
		>
			Browse Bots
		</a>
	</section>
{:else}
	<!-- ── Profile header ───────────────────────────────────────────────────── -->
	<section class="max-w-5xl mx-auto px-4 pt-6">
		<div class="rounded-2xl overflow-hidden border border-border bg-card shadow-sm">
			<!-- Banner -->
			<div
				class="relative h-40 sm:h-52 w-full {hasBanner || accentBg
					? ''
					: 'bg-linear-to-br from-primary/30 to-primary/5'}"
				style={bannerStyle}
			>
				<div
					class="absolute inset-0 bg-linear-to-t from-card via-card/20 to-transparent pointer-events-none"
				></div>
			</div>

			<!-- Identity row -->
			<div class="px-5 sm:px-8 pb-6">
				<div class="flex flex-col sm:flex-row sm:items-end gap-4 -mt-14 sm:-mt-16">
					<img
						src={avatarSrc}
						alt={displayName}
						class="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 bg-card shadow-xl object-cover shrink-0 {hasGoldBorder
							? 'border-yellow-400 ring-2 ring-yellow-400/60'
							: 'border-card'}"
						loading="eager"
					/>
					<div class="flex-1 min-w-0 sm:pb-2">
						<h1 class="font-heading text-3xl font-bold leading-tight truncate">{displayName}</h1>
						<p class="text-muted-foreground text-sm font-medium">
							@{profile.username}{#if profile.discriminator && profile.discriminator !== "0"}<span
									class="opacity-70">#{profile.discriminator}</span
								>{/if}
						</p>
					</div>

					{#if isSelf}
						<a
							href="/dashboard"
							class="self-start sm:self-auto sm:mb-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-muted/40 hover:bg-muted hover:border-primary/40 text-sm font-semibold transition-all"
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
								<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
								<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
							</svg>
							Edit Profile
						</a>
					{/if}
				</div>

				<!-- Meta row: joined + private hint -->
				<div class="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-sm text-muted-foreground">
					{#if profile.added_at && joinedLabel(profile.added_at)}
						<span class="inline-flex items-center gap-1.5">
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
								<path d="M8 2v4M16 2v4M3 10h18" />
								<rect width="18" height="18" x="3" y="4" rx="2" />
							</svg>
							Joined {joinedLabel(profile.added_at)}
						</span>
					{/if}
					{#if isSelf && profile.private}
						<span
							class="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium"
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
								<rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
								<path d="M7 11V7a5 5 0 0 1 10 0v4" />
							</svg>
							Private - only visible to you
						</span>
					{/if}
				</div>

				<!-- Bio -->
				{#if profile.bio && profile.bio !== "The user doesn't have bio set!"}
					<p class="mt-4 text-foreground/90 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
						{profile.bio}
					</p>
				{:else if isSelf}
					<!-- Nudge: only the owner sees this when their bio is empty -->
					<a
						href="/dashboard"
						class="group mt-4 flex items-center gap-2.5 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-4 h-4 shrink-0 text-primary"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
							<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
						</svg>
						<span>
							Your bio is empty -
							<span class="font-semibold text-foreground group-hover:text-primary transition-colors"
								>add one</span
							> so visitors know who you are.
						</span>
					</a>
				{/if}

				<!-- Badges -->
				{#if profile.badges && profile.badges.length > 0}
					<div class="flex flex-wrap gap-2 mt-4">
						{#each profile.badges as badge}
							<span
								class="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20"
							>
								{prettyBadge(badge)}
							</span>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</section>

	<!-- ── Stats ────────────────────────────────────────────────────────────── -->
	<section class="max-w-5xl mx-auto px-4 mt-6">
		<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
			<div class="bg-card border border-border rounded-xl p-4 text-center">
				<p class="text-2xl font-bold font-heading text-primary">{stats.botCount}</p>
				<p class="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-wide">Bots</p>
			</div>
			<div class="bg-card border border-border rounded-xl p-4 text-center">
				<p class="text-2xl font-bold font-heading text-blue-500">{stats.serverCount}</p>
				<p class="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-wide">Servers</p>
			</div>
			<div class="bg-card border border-border rounded-xl p-4 text-center">
				<p class="text-2xl font-bold font-heading text-green-500">{approx(stats.totalVotes)}</p>
				<p class="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-wide">
					Upvotes
				</p>
			</div>
			<div class="bg-card border border-border rounded-xl p-4 text-center">
				<p class="text-2xl font-bold font-heading text-orange-500">{approx(stats.totalServers)}</p>
				<p class="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-wide">
					Communities Reached
				</p>
			</div>
		</div>
	</section>

	<!-- ── Owned bots ───────────────────────────────────────────────────────── -->
	{#if bots.length > 0}
		<section class="max-w-5xl mx-auto px-4 mt-12">
			<h2 class="font-heading text-2xl font-bold mb-1 flex items-center gap-2">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="w-6 h-6 text-primary"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<rect width="18" height="10" x="3" y="11" rx="2" />
					<circle cx="12" cy="5" r="2" /><path d="M12 7v4" />
					<line x1="8" x2="8" y1="16" y2="16" /><line x1="16" x2="16" y1="16" y2="16" />
				</svg>
				Bots by {displayName}
				<span class="text-muted-foreground text-lg font-semibold">({bots.length})</span>
			</h2>
			<p class="text-muted-foreground text-sm mb-6">Bots {displayName} has built.</p>
			<div class="flex flex-wrap justify-center sm:justify-start gap-4">
				{#each bots as bot (bot.id)}
					<BotCard {bot} edit={false} />
				{/each}
			</div>
		</section>
	{/if}

	<!-- ── Owned servers ────────────────────────────────────────────────────── -->
	{#if servers.length > 0}
		<section class="max-w-5xl mx-auto px-4 mt-12 pb-16">
			<h2 class="font-heading text-2xl font-bold mb-1 flex items-center gap-2">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="w-6 h-6 text-blue-500"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
					<rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
					<line x1="6" x2="6.01" y1="6" y2="6" /><line x1="6" x2="6.01" y1="18" y2="18" />
				</svg>
				Servers by {displayName}
				<span class="text-muted-foreground text-lg font-semibold">({servers.length})</span>
			</h2>
			<p class="text-muted-foreground text-sm mb-6">Communities {displayName} runs.</p>
			<div class="flex flex-wrap justify-center sm:justify-start gap-4">
				{#each servers as server (server.id)}
					<ServerCard {server} edit={false} />
				{/each}
			</div>
		</section>
	{/if}

	<!-- ── Empty state (dev with nothing currently listed - rare) ───────────── -->
	{#if bots.length === 0 && servers.length === 0}
		<section class="max-w-md mx-auto px-4 py-20 text-center">
			<p class="text-muted-foreground text-sm">
				{displayName} hasn't shared any bots or communities yet.
			</p>
		</section>
	{/if}
{/if}
