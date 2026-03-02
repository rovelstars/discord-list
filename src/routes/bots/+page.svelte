<script lang="ts">
	import BotCard from "$lib/components/BotCard.svelte";
	import SEO from "$lib/components/SEO.svelte";
	import { CATEGORIES } from "$lib/categories";
	import { goto } from "$app/navigation";
	import { page } from "$app/stores";

	export let data: {
		bots: Array<any>;
		q: string | null;
		limit: number;
		offset: number;
		newFlag: boolean;
		trending: boolean;
		lucky: boolean;
		category: string | null;
		isSearching: boolean;
		topBots: Array<any>;
		musicBots: Array<any>;
		gameBots: Array<any>;
		modBots: Array<any>;
	};

	// Read directly from `data` so every reactive expression sees the latest
	// server payload after client-side navigations — no stale local copies.
	$: ({ bots, q, limit, offset, newFlag, trending, lucky, category, isSearching } = data);

	$: prevOffset = Math.max(0, offset - limit);
	$: nextOffset = offset + limit;
	$: hasPrev = offset > 0;
	$: hasNext = bots.length === limit;

	// Local search input value — kept in sync with URL param
	let searchInput = q ?? "";
	$: searchInput = q ?? "";

	// Popular categories to feature as chips (ordered by prominence)
	const FEATURED_CATEGORIES = [
		"music",
		"moderation",
		"gaming",
		"utility",
		"fun",
		"economy",
		"leveling",
		"anime",
		"logging",
		"roleplay",
		"announce",
		"translate"
	] as const;

	function buildHref(overrides: Record<string, string | number | boolean | null | undefined>) {
		const params = new URLSearchParams();
		const base: Record<string, any> = {
			q: data.q,
			limit: data.limit,
			offset: data.offset,
			new: data.newFlag,
			trending: data.trending,
			lucky: data.lucky,
			category: data.category,
			...overrides
		};
		if (base.q) params.set("q", String(base.q));
		if (Number(base.limit) !== 20) params.set("limit", String(base.limit));
		if (Number(base.offset) > 0) params.set("offset", String(base.offset));
		if (base.new) params.set("new", "");
		if (base.trending) params.set("trending", "");
		if (base.lucky) params.set("lucky", "");
		if (base.category) params.set("category", String(base.category));
		const qs = params.toString();
		return "/bots" + (qs ? "?" + qs : "");
	}

	function handleSearch(e: SubmitEvent) {
		e.preventDefault();
		const trimmed = searchInput.trim();
		goto(
			buildHref({
				q: trimmed || null,
				offset: 0,
				category: null,
				new: false,
				trending: false,
				lucky: false
			})
		);
	}

	function toggleCategory(slug: string) {
		const next = data.category === slug ? null : slug;
		goto(
			buildHref({ category: next, q: null, offset: 0, new: false, trending: false, lucky: false })
		);
	}

	// ── SEO title / description ────────────────────────────────────────────
	$: seoTitle = (() => {
		if (data.q) return `Results for "${data.q}" — Bots`;
		if (data.category && CATEGORIES[data.category])
			return `${CATEGORIES[data.category].name} — Browse Bots`;
		if (data.newFlag) return "Newest Bots";
		if (data.trending) return "Most Popular Bots";
		if (data.lucky) return "Feeling Lucky — Random Bots";
		return "Browse Discord Bots — Rovel Discord List";
	})();

	$: seoDesc = (() => {
		if (data.q)
			return `Search results for "${data.q}" on Rovel Discord List. Find the perfect Discord bot for your server.`;
		if (data.category && CATEGORIES[data.category]) return CATEGORIES[data.category].description;
		if (data.newFlag) return "Browse the newest Discord bots added to Rovel Discord List.";
		if (data.trending)
			return "The most popular Discord bots on Rovel Discord List, ranked by votes.";
		if (data.lucky)
			return "Discover random Discord bots on Rovel Discord List. You might just find your new favourite!";
		return "Find the perfect bot for your Discord server on Rovel Discord List. Browse hundreds of bots across every category.";
	})();

	// Active category meta
	$: activeCatMeta = data.category ? (CATEGORIES[data.category] ?? null) : null;

	// Current view label for heading
	$: viewLabel = (() => {
		if (data.q) return `Results for "${data.q}"`;
		if (activeCatMeta) return `${activeCatMeta.emoji}  ${activeCatMeta.name}`;
		if (data.newFlag) return "Newest Bots";
		if (data.trending) return "Most Popular Bots";
		if (data.lucky) return "Feeling Lucky?";
		return null; // landing — no sub-heading needed
	})();
</script>

<SEO title={seoTitle} description={seoDesc} imageSmall="/assets/img/bot/logo-512.png" />

<!-- ═══════════════════════════════════════════════════════════════════════
     HERO — always visible
════════════════════════════════════════════════════════════════════════ -->
<section class="relative overflow-hidden -mt-24 pt-28 pb-6 px-4">
	<!-- Subtle radial glow behind hero -->
	<div
		class="pointer-events-none absolute inset-0 -z-10 flex items-start justify-center"
		aria-hidden="true"
	>
		<div class="w-175 h-100 rounded-full bg-primary/10 blur-3xl"></div>
	</div>

	<div class="text-center max-w-3xl mx-auto">
		<img
			src="/assets/img/bot/logo-512.png"
			class="w-20 h-20 mx-auto mb-5 drop-shadow-xl"
			alt="Rovel Discord List logo"
			loading="eager"
		/>
		<h1 class="font-heading text-4xl md:text-6xl font-bold mb-3 tracking-tight">
			Rovel Discord List
		</h1>
		<p class="text-lg md:text-xl text-gray-600 dark:text-gray-300 font-medium mb-8">
			Discover the perfect bot for your Discord server — search, filter, and explore hundreds of
			bots.
		</p>

		<!-- ── Search bar ─────────────────────────────────────────────── -->
		<form on:submit={handleSearch} class="flex gap-2 max-w-xl mx-auto mb-6">
			<div class="relative flex-1">
				<!-- Search icon -->
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
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
				<input
					type="text"
					bind:value={searchInput}
					placeholder="Search for bots by name or description…"
					aria-label="Search bots"
					class="w-full pl-9 pr-4 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700
					       bg-white dark:bg-neutral-900 shadow-sm
					       focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
					       text-sm transition-shadow"
				/>
			</div>
			<button
				type="submit"
				class="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold text-sm transition-colors shadow-sm"
			>
				Search
			</button>
			{#if q}
				<a
					href="/bots"
					class="px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-lg font-semibold text-sm
					       hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
					aria-label="Clear search"
				>
					Clear
				</a>
			{/if}
		</form>

		<!-- ── Quick-filter buttons ───────────────────────────────────── -->
		<div class="flex flex-wrap gap-2 justify-center mb-2">
			<a
				href={buildHref({
					lucky: true,
					new: false,
					trending: false,
					category: null,
					q: null,
					offset: 0
				})}
				class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all
					       {data.lucky
					? 'bg-primary text-white border-primary shadow-md shadow-primary/30'
					: 'border-neutral-300 dark:border-neutral-600 hover:border-primary hover:text-primary dark:hover:border-primary'}"
			>
				<img src="/assets/img/bot/wink.svg" alt="" class="w-4 h-4" aria-hidden="true" />
				Feeling Lucky
			</a>
			<a
				href={buildHref({
					trending: true,
					new: false,
					lucky: false,
					category: null,
					q: null,
					offset: 0
				})}
				class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all
					       {data.trending
					? 'bg-primary text-white border-primary shadow-md shadow-primary/30'
					: 'border-neutral-300 dark:border-neutral-600 hover:border-primary hover:text-primary dark:hover:border-primary'}"
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
					<path
						d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
					/>
				</svg>
				Popular
			</a>
			<a
				href={buildHref({
					new: true,
					trending: false,
					lucky: false,
					category: null,
					q: null,
					offset: 0
				})}
				class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all
					       {data.newFlag
					? 'bg-primary text-white border-primary shadow-md shadow-primary/30'
					: 'border-neutral-300 dark:border-neutral-600 hover:border-primary hover:text-primary dark:hover:border-primary'}"
			>
				<img src="/assets/img/chemical.svg" alt="" class="w-4 h-4" aria-hidden="true" />
				Newest
			</a>
		</div>
	</div>
</section>

<!-- ═══════════════════════════════════════════════════════════════════════
     CATEGORY CHIPS
════════════════════════════════════════════════════════════════════════ -->
<section class="px-4 py-4 max-w-5xl mx-auto">
	<div class="flex flex-wrap gap-2 justify-center">
		{#each FEATURED_CATEGORIES as slug}
			{@const meta = CATEGORIES[slug]}
			{#if meta}
				<button
					type="button"
					on:click={() => toggleCategory(slug)}
					class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all cursor-pointer select-none
						       {data.category === slug
						? 'bg-primary text-white border-primary shadow-md shadow-primary/25 scale-105'
						: 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 hover:border-primary hover:text-primary dark:hover:border-primary hover:scale-105'}"
					aria-pressed={data.category === slug}
				>
					<span class="text-base leading-none" aria-hidden="true">{meta.emoji}</span>
					{meta.name.replace(/ Bots$/, "").replace(/ & .*$/, "")}
				</button>
			{/if}
		{/each}
	</div>
</section>

<!-- ═══════════════════════════════════════════════════════════════════════
     ACTIVE FILTER BANNER  (shown when any filter is active)
════════════════════════════════════════════════════════════════════════ -->
{#if data.isSearching && viewLabel}
	<div class="px-4 pt-2 pb-4 max-w-5xl mx-auto">
		<div class="flex items-center justify-between gap-4 flex-wrap">
			<div>
				<h2 class="font-heading text-2xl md:text-3xl font-bold flex items-center gap-2 flex-wrap">
					{#if data.newFlag}
						<img src="/assets/img/chemical.svg" alt="" class="w-7 h-7" aria-hidden="true" />
					{:else if data.trending}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-7 h-7 text-primary"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path
								d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
							/>
						</svg>
					{:else if data.q}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-7 h-7 text-primary"
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
					{/if}
					{viewLabel}
				</h2>
				{#if activeCatMeta}
					<p class="text-gray-500 dark:text-gray-400 text-sm mt-1 max-w-xl">
						{activeCatMeta.description}
					</p>
				{/if}
			</div>
			<a
				href="/bots"
				class="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-semibold rounded-lg
				       border border-neutral-300 dark:border-neutral-600
				       hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
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
					<path d="M18 6 6 18" /><path d="m6 6 12 12" />
				</svg>
				Clear filters
			</a>
		</div>
	</div>
{/if}

<!-- ═══════════════════════════════════════════════════════════════════════
     SEARCH / FILTER RESULTS
════════════════════════════════════════════════════════════════════════ -->
{#if data.isSearching}
	<section class="px-4 pb-16">
		{#if bots.length === 0}
			<div class="py-20 text-center">
				<div class="text-5xl mb-4" aria-hidden="true">🤖</div>
				<p class="text-xl font-semibold mb-2">No bots found</p>
				<p class="text-gray-500 dark:text-gray-400">
					{#if data.q}
						No results for <strong>"{data.q}"</strong>. Try different keywords or browse a category.
					{:else if activeCatMeta}
						No <strong>{activeCatMeta.name}</strong> have been listed yet. Check back soon!
					{:else}
						Try a different filter or <a href="/bots" class="text-primary underline"
							>browse all bots</a
						>.
					{/if}
				</p>
				<a
					href="/bots"
					class="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
				>
					Browse All Bots
				</a>
			</div>
		{:else}
			<div class="flex flex-wrap justify-center gap-4 pt-2">
				{#each bots as bot}
					<BotCard {bot} edit={false} />
				{/each}
			</div>

			<!-- Pagination -->
			{#if !data.lucky}
				<div class="mt-10 flex items-center justify-center gap-3">
					{#if hasPrev}
						<a
							href={buildHref({ offset: prevOffset })}
							class="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors"
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
								<path d="m15 18-6-6 6-6" />
							</svg>
							Previous
						</a>
					{/if}
					{#if hasPrev || hasNext}
						<span class="text-sm text-gray-500 dark:text-gray-400 px-2">
							Page {Math.floor(offset / limit) + 1}
						</span>
					{/if}
					{#if hasNext}
						<a
							href={buildHref({ offset: nextOffset })}
							class="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors"
						>
							Next
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
								<path d="m9 18 6-6-6-6" />
							</svg>
						</a>
					{/if}
				</div>
			{/if}
		{/if}
	</section>

	<!-- ═══════════════════════════════════════════════════════════════════════
     LANDING — curated sections  (only shown on bare /bots with no filters)
════════════════════════════════════════════════════════════════════════ -->
{:else}
	<div class="pb-16">
		<!-- ── Best Bots of the Month ─────────────────────────────────── -->
		<section class="mt-10 px-4">
			<!-- topBots read directly from data to stay reactive after client-side nav -->
			<div class="flex items-end justify-between mb-2 md:mx-4">
				<div>
					<h2 class="font-heading text-3xl font-bold flex items-center gap-2">
						<img src="/assets/img/mostvote.svg" alt="" class="w-8 h-8" aria-hidden="true" />
						Best Bots of the Month
					</h2>
					<p class="text-gray-500 dark:text-gray-400 mt-1 font-medium max-w-xl">
						The best Discord bots, voted by you! Find the top-rated bots to supercharge your server.
					</p>
				</div>
				<a
					href={buildHref({ trending: true, offset: 0 })}
					class="shrink-0 hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
				>
					See more
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-4 h-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg
					>
				</a>
			</div>

			{#if data.topBots && data.topBots.length > 0}
				<div class="flex flex-wrap justify-center gap-4 pt-2">
					{#each data.topBots as bot}
						<BotCard {bot} edit={false} />
					{/each}
				</div>
			{:else}
				<p class="text-center text-gray-400 py-10">No bots here yet — check back soon!</p>
			{/if}
		</section>

		<!-- ── Featured Music Bots ────────────────────────────────────── -->
		<section class="mt-14 px-4">
			<div class="flex items-end justify-between mb-2 md:mx-4">
				<div>
					<h2 class="font-heading text-3xl font-bold flex items-center gap-2">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-8 h-8 text-primary"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="3"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path d="M9 18V5l12-2v13" />
							<circle cx="6" cy="18" r="3" />
							<circle cx="18" cy="16" r="3" />
						</svg>
						Featured Music Bots
					</h2>
					<p class="text-gray-500 dark:text-gray-400 mt-1 font-medium max-w-xl">
						Bring the music to your community — seamless playback from YouTube, Spotify and beyond.
					</p>
				</div>
				<button
					type="button"
					on:click={() => toggleCategory("music")}
					class="shrink-0 hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
				>
					See all music bots
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-4 h-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg
					>
				</button>
			</div>

			{#if data.musicBots && data.musicBots.length > 0}
				<div class="flex flex-wrap justify-center gap-4 pt-2">
					{#each data.musicBots as bot}
						<BotCard {bot} edit={false} />
					{/each}
				</div>
			{:else}
				<p class="text-center text-gray-400 py-10">No music bots found — check back soon!</p>
			{/if}
		</section>

		<!-- ── Esports Tools & Text Adventures ──────────────────────── -->
		<section class="mt-14 px-4">
			<div class="flex items-end justify-between mb-2 md:mx-4">
				<div>
					<h2 class="font-heading text-3xl font-bold flex items-center gap-2">
						<img src="/assets/img/game-controller.svg" alt="" class="w-8 h-8" aria-hidden="true" />
						Esports Tools &amp; Text Adventures
					</h2>
					<p class="text-gray-500 dark:text-gray-400 mt-1 font-medium max-w-xl">
						Get the competitive edge — tournament bots, stat trackers and in-chat mini-games.
					</p>
				</div>
				<button
					type="button"
					on:click={() => toggleCategory("gaming")}
					class="shrink-0 hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
				>
					See all gaming bots
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-4 h-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg
					>
				</button>
			</div>

			{#if data.gameBots && data.gameBots.length > 0}
				<div class="flex flex-wrap justify-center gap-4 pt-2">
					{#each data.gameBots as bot}
						<BotCard {bot} edit={false} />
					{/each}
				</div>
			{:else}
				<p class="text-center text-gray-400 py-10">No gaming bots found — check back soon!</p>
			{/if}
		</section>

		<!-- ── Community Care / Moderation ──────────────────────────── -->
		<section class="mt-14 px-4">
			<div class="flex items-end justify-between mb-2 md:mx-4">
				<div>
					<h2 class="font-heading text-3xl font-bold flex items-center gap-2">
						<img src="/assets/img/mod.svg" alt="" class="w-8 h-8" aria-hidden="true" />
						Community Care Bots
					</h2>
					<p class="text-gray-500 dark:text-gray-400 mt-1 font-medium max-w-xl">
						Keep your server safe — auto-mod, anti-spam, logging and raid protection.
					</p>
				</div>
				<button
					type="button"
					on:click={() => toggleCategory("moderation")}
					class="shrink-0 hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
				>
					See all moderation bots
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-4 h-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg
					>
				</button>
			</div>

			{#if data.modBots && data.modBots.length > 0}
				<div class="flex flex-wrap justify-center gap-4 pt-2">
					{#each data.modBots as bot}
						<BotCard {bot} edit={false} />
					{/each}
				</div>
			{:else}
				<p class="text-center text-gray-400 py-10">No moderation bots found — check back soon!</p>
			{/if}
		</section>

		<!-- ── Browse by category grid ───────────────────────────────── -->
		<section class="mt-16 px-4">
			<div class="md:mx-4 mb-6">
				<h2 class="font-heading text-3xl font-bold">Browse by Category</h2>
				<p class="text-gray-500 dark:text-gray-400 mt-1 font-medium">
					Pick a category to instantly filter hundreds of bots.
				</p>
			</div>

			<div
				class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-w-5xl mx-auto"
			>
				{#each FEATURED_CATEGORIES as slug}
					{@const meta = CATEGORIES[slug]}
					{#if meta}
						<button
							type="button"
							on:click={() => toggleCategory(slug)}
							class="group flex flex-col items-center gap-2 p-4 rounded-xl border text-center
							       bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700
							       hover:border-primary hover:shadow-md hover:-translate-y-0.5 transition-all
							       cursor-pointer"
							aria-label="Browse {meta.name}"
						>
							<span class="text-3xl leading-none" aria-hidden="true">{meta.emoji}</span>
							<span
								class="text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors leading-tight"
							>
								{meta.name.replace(/ & .*$/, "")}
							</span>
						</button>
					{/if}
				{/each}
			</div>
		</section>
	</div>
{/if}
