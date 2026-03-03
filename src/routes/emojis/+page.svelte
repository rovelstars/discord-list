<script lang="ts">
	import SEO from "$lib/components/SEO.svelte";
	import EmojiCard from "$lib/components/EmojiCard.svelte";
	import { goto } from "$app/navigation";
	import { page } from "$app/stores";

	export let data: {
		emojis: Array<{
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
		total: number;
		page: number;
		totalPages: number;
		q: string | null;
		animated: boolean | null;
		guildId: string | null;
		sort: "newest" | "popular" | "az";
		user: any | null;
	};

	$: ({ emojis, total, page: currentPage, totalPages, q, animated, guildId, sort } = data);

	// Local filter state (mirrors URL params)
	let searchInput = q ?? "";
	let animatedFilter: "all" | "animated" | "static" =
		animated === true ? "animated" : animated === false ? "static" : "all";
	let sortBy = sort ?? "newest";

	let searchTimer: ReturnType<typeof setTimeout> | null = null;

	function buildUrl(overrides: Record<string, string | null> = {}) {
		const params = new URLSearchParams();
		const s = "search" in overrides ? overrides.search : searchInput.trim();
		const a = "animated" in overrides ? overrides.animated : animatedFilter;
		const so = "sort" in overrides ? overrides.sort : sortBy;
		const pg = "page" in overrides ? overrides.page : "1";

		if (s) params.set("q", s);
		if (a === "animated") params.set("animated", "true");
		if (a === "static") params.set("animated", "false");
		if (guildId && !("guild" in overrides)) params.set("guild", guildId);
		if (overrides.guild) params.set("guild", overrides.guild);
		if (so && so !== "newest") params.set("sort", so);
		if (pg && pg !== "1") params.set("page", pg);

		const qs = params.toString();
		return `/emojis${qs ? `?${qs}` : ""}`;
	}

	function onSearchInput() {
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			goto(buildUrl({ search: searchInput.trim(), page: "1" }), { replaceState: true });
		}, 400);
	}

	function onFilterChange() {
		goto(buildUrl({ page: "1" }), { replaceState: true });
	}

	function goToPage(p: number) {
		goto(buildUrl({ page: String(p) }));
	}

	$: seoTitle = q
		? `"${q}" — Emoji Search · Rovel Discord List`
		: guildId
			? `Server Emojis · Rovel Discord List`
			: "Discord Emojis · Rovel Discord List";

	$: seoDescription = `Browse ${total.toLocaleString()} custom Discord emojis${q ? ` matching "${q}"` : ""}. Download high-quality animated and static emojis for your Discord server.`;
</script>

<SEO title={seoTitle} description={seoDescription} />

<div class="max-w-7xl mx-auto px-4 py-8">
	<!-- Header -->
	<div class="mb-8">
		<div class="flex items-center gap-3 mb-2">
			<div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="w-5 h-5 text-primary"
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
				<h1 class="text-3xl font-extrabold font-heading leading-tight text-foreground">
					Discord Emojis
				</h1>
				<p class="text-sm text-muted-foreground mt-0.5">
					{total.toLocaleString()} emoji{total !== 1 ? "s" : ""} available to browse &amp; download
				</p>
			</div>
		</div>

		{#if guildId}
			<div
				class="mt-3 inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-1.5 text-sm font-medium text-primary"
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
					<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
					<polyline points="9 22 9 12 15 12 15 22" />
				</svg>
				Filtered by server
				<a
					href="/emojis"
					class="ml-1 text-muted-foreground hover:text-foreground transition-colors"
					aria-label="Clear server filter"
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
						<path d="M18 6 6 18M6 6l12 12" />
					</svg>
				</a>
			</div>
		{/if}
	</div>

	<!-- Filters bar -->
	<div
		class="flex flex-col sm:flex-row gap-3 mb-6 bg-card border border-border rounded-xl p-3 shadow-sm"
	>
		<!-- Search -->
		<div class="relative flex-1">
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
					<circle cx="11" cy="11" r="8" />
					<path d="m21 21-4.3-4.3" />
				</svg>
			</div>
			<input
				type="search"
				bind:value={searchInput}
				on:input={onSearchInput}
				placeholder="Search emojis by name or code…"
				class="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
			/>
		</div>

		<!-- Animated filter -->
		<div class="flex items-center gap-1.5 bg-background border border-border rounded-lg p-1">
			{#each [["all", "All"], ["animated", "GIF"], ["static", "PNG"]] as [val, label]}
				<button
					class="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer
						{animatedFilter === val
						? 'bg-primary text-primary-foreground shadow-sm'
						: 'text-muted-foreground hover:text-foreground hover:bg-muted'}"
					on:click={() => {
						animatedFilter = val as typeof animatedFilter;
						onFilterChange();
					}}
				>
					{label}
				</button>
			{/each}
		</div>

		<!-- Sort -->
		<select
			bind:value={sortBy}
			on:change={onFilterChange}
			class="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors cursor-pointer"
		>
			<option value="newest">Newest</option>
			<option value="popular">Most Downloaded</option>
			<option value="az">A–Z</option>
		</select>
	</div>

	<!-- Emoji grid -->
	{#if emojis.length === 0}
		<div class="flex flex-col items-center justify-center py-24 text-center">
			<div
				class="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-4 text-4xl select-none"
			>
				😶
			</div>
			<p class="font-bold text-lg text-foreground">No emojis found</p>
			<p class="text-sm text-muted-foreground mt-1.5 max-w-xs">
				{#if q}
					No emojis match <strong>"{q}"</strong>. Try a different search term.
				{:else if guildId}
					This server hasn't synced any emojis yet.
				{:else}
					No emojis have been added to the listing yet.
				{/if}
			</p>
			{#if q || guildId || animated !== null}
				<a
					href="/emojis"
					class="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
				>
					Clear filters
				</a>
			{/if}
		</div>
	{:else}
		<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
			{#each emojis as emoji (emoji.id)}
				<EmojiCard {emoji} />
			{/each}
		</div>

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="flex items-center justify-center gap-2 mt-10">
				<!-- Prev -->
				<button
					disabled={currentPage <= 1}
					on:click={() => goToPage(currentPage - 1)}
					class="px-3 py-2 rounded-lg border border-border bg-card text-sm font-semibold
						disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors cursor-pointer"
					aria-label="Previous page"
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
						<path d="m15 18-6-6 6-6" />
					</svg>
				</button>

				<!-- Page numbers -->
				{#each Array.from({ length: totalPages }, (_, i) => i + 1) as p}
					{#if p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2}
						<button
							on:click={() => goToPage(p)}
							class="w-9 h-9 rounded-lg border text-sm font-semibold transition-colors cursor-pointer
								{p === currentPage
								? 'bg-primary text-primary-foreground border-primary shadow-sm'
								: 'border-border bg-card hover:bg-muted text-foreground'}"
						>
							{p}
						</button>
					{:else if Math.abs(p - currentPage) === 3}
						<span class="text-muted-foreground text-sm px-1">…</span>
					{/if}
				{/each}

				<!-- Next -->
				<button
					disabled={currentPage >= totalPages}
					on:click={() => goToPage(currentPage + 1)}
					class="px-3 py-2 rounded-lg border border-border bg-card text-sm font-semibold
						disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors cursor-pointer"
					aria-label="Next page"
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
						<path d="m9 18 6-6-6-6" />
					</svg>
				</button>
			</div>

			<p class="text-center text-xs text-muted-foreground mt-3">
				Page {currentPage} of {totalPages} &middot; {total.toLocaleString()} total
			</p>
		{/if}
	{/if}
</div>
