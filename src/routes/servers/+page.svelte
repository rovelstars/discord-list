<script lang="ts">
	import SEO from "$lib/components/SEO.svelte";
	import ServerCard from "$lib/components/ServerCard.svelte";
	import { page } from "$app/stores";
	import { goto } from "$app/navigation";

	export let data: {
		servers: any[];
		topServers: any[];
		q: string | null;
		limit: number;
		offset: number;
		newFlag: boolean;
		trending: boolean;
		isSearching: boolean;
		discordBotId: string;
	};

	$: ({ servers, topServers, q, limit, offset, newFlag, trending, isSearching } = data);

	let searchInput = q ?? "";

	const seoTitle = q
		? `Search: "${q}" — Discord Servers`
		: newFlag
			? "New Discord Servers"
			: trending
				? "Trending Discord Servers"
				: "Browse Discord Servers";

	const seoDesc =
		"Discover and join amazing Discord servers. Find communities for gaming, art, coding, music and more on Rovel Discord List.";

	$: hasPrev = offset > 0;
	$: hasNext = servers.length >= limit;
	$: currentPage = Math.floor(offset / limit) + 1;

	function buildHref(overrides: Record<string, any>): string {
		const params = new URLSearchParams();
		const base = {
			q: q ?? "",
			limit: String(limit),
			offset: String(offset),
			...(newFlag ? { new: "" } : {}),
			...(trending ? { trending: "" } : {}),
			...overrides
		};

		for (const [k, v] of Object.entries(base)) {
			if (v !== "" && v !== null && v !== undefined) {
				params.set(k, String(v));
			} else if (v === "") {
				// boolean flags like ?new or ?trending have empty string values
				params.set(k, "");
			}
		}

		// strip empty-value params that aren't boolean flags
		const boolFlags = new Set(["new", "trending"]);
		for (const [k, v] of [...params.entries()]) {
			if (v === "" && !boolFlags.has(k)) params.delete(k);
		}

		const qs = params.toString();
		return `/servers${qs ? `?${qs}` : ""}`;
	}

	function handleSearch(e: SubmitEvent) {
		e.preventDefault();
		const trimmed = searchInput.trim();
		const params = new URLSearchParams();
		if (trimmed) params.set("q", trimmed);
		params.set("offset", "0");
		goto(`/servers${params.toString() ? `?${params.toString()}` : ""}`);
	}
</script>

<SEO title={seoTitle} description={seoDesc} />

<!-- Hero / search header -->
<section class="relative overflow-hidden -mt-24 pt-28 pb-6 px-4">
	<!-- Decorative blobs -->
	<div class="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
		<div class="absolute -top-24 -left-24 w-175 h-100 rounded-full bg-green-500/10 blur-3xl"></div>
		<div class="absolute -bottom-16 -right-16 w-120 h-80 rounded-full bg-primary/10 blur-3xl"></div>
	</div>

	<div class="text-center max-w-3xl mx-auto relative z-10">
		<!-- Icon -->
		<div
			class="w-20 h-20 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6 shadow-lg"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="w-10 h-10 text-green-500"
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

		<h1 class="font-heading text-4xl md:text-6xl font-bold mb-3 tracking-tight">
			Discord <span class="text-green-500">Servers</span>
		</h1>
		<p class="text-lg md:text-xl text-gray-600 dark:text-gray-300 font-medium mb-8">
			Discover communities built by real people — for gaming, art, coding, and everything in
			between.
		</p>

		<!-- Search bar -->
		<form on:submit={handleSearch} class="flex gap-2 max-w-xl mx-auto mb-6">
			<div class="relative flex-1">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
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
					placeholder="Search servers…"
					bind:value={searchInput}
					class="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/60"
				/>
			</div>
			<button
				type="submit"
				class="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors"
			>
				Search
			</button>
			{#if q}
				<a
					href="/servers"
					class="px-4 py-2 rounded-lg border border-border bg-card hover:bg-accent text-foreground font-semibold transition-colors flex items-center gap-1"
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
						<path d="M18 6 6 18" />
						<path d="m6 6 12 12" />
					</svg>
					Clear
				</a>
			{/if}
		</form>

		<!-- Filter pills -->
		<div class="flex flex-wrap gap-2 justify-center">
			<a
				href={buildHref({ trending: "", new: undefined, offset: 0 })}
				class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors
					{trending && !newFlag
					? 'bg-green-600 border-green-600 text-white'
					: 'border-border bg-card hover:border-green-500/60 text-muted-foreground hover:text-foreground'}"
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
					<path
						d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"
					/>
				</svg>
				Trending
			</a>
			<a
				href={buildHref({ new: "", trending: undefined, offset: 0 })}
				class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors
					{newFlag
					? 'bg-green-600 border-green-600 text-white'
					: 'border-border bg-card hover:border-green-500/60 text-muted-foreground hover:text-foreground'}"
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
					<path d="M12 5v14M5 12h14" />
				</svg>
				New
			</a>
			<a
				href="/servers"
				class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors
					{!isSearching
					? 'bg-green-600 border-green-600 text-white'
					: 'border-border bg-card hover:border-green-500/60 text-muted-foreground hover:text-foreground'}"
			>
				All Servers
			</a>
		</div>
	</div>
</section>

<!-- Active search label -->
{#if isSearching && (q || newFlag || trending)}
	<div class="px-4 pt-2 pb-4 max-w-5xl mx-auto">
		<div class="flex items-center justify-between gap-4 flex-wrap">
			<div>
				<h2 class="font-heading text-2xl md:text-3xl font-bold flex items-center gap-2 flex-wrap">
					{#if newFlag}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-7 h-7 text-green-500"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path d="M12 5v14M5 12h14" />
						</svg>
						New Servers
					{:else if trending}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-7 h-7 text-green-500"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path
								d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"
							/>
						</svg>
						Trending Servers
					{:else if q}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-7 h-7 text-green-500"
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
						Results for "<span class="text-green-500">{q}</span>"
					{/if}
				</h2>
			</div>
			<a
				href="/servers"
				class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-accent text-sm font-semibold transition-colors text-muted-foreground hover:text-foreground"
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
					<path d="M18 6 6 18" />
					<path d="m6 6 12 12" />
				</svg>
				Clear filters
			</a>
		</div>
	</div>
{/if}

<!-- Results / Landing -->
{#if isSearching}
	<!-- ── Filtered results ── -->
	<section class="px-4 pb-16 max-w-5xl mx-auto">
		{#if servers.length === 0}
			<div class="py-20 text-center">
				<div class="text-5xl mb-4" aria-hidden="true">🏘️</div>
				<p class="text-xl font-semibold mb-2">No servers found</p>
				<p class="text-gray-500 dark:text-gray-400">
					{#if q}
						Nothing matched "<strong>{q}</strong>". Try a different search term.
					{:else}
						No servers match this filter yet. Check back soon!
					{/if}
				</p>
				<a
					href="/servers"
					class="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold transition-colors"
				>
					Browse All Servers
				</a>
			</div>
		{:else}
			<div class="flex flex-wrap justify-center gap-4 pt-2">
				{#each servers as server}
					<ServerCard {server} edit={false} />
				{/each}
			</div>

			<!-- Pagination -->
			<div class="mt-10 flex items-center justify-center gap-3">
				{#if hasPrev}
					<a
						href={buildHref({ offset: Math.max(0, offset - limit) })}
						class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-card hover:bg-accent font-semibold text-sm transition-colors"
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
						Page {currentPage}
					</span>
				{/if}

				{#if hasNext}
					<a
						href={buildHref({ offset: offset + limit })}
						class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-card hover:bg-accent font-semibold text-sm transition-colors"
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
	</section>
{:else}
	<!-- ── Landing view ── -->
	<div class="pb-16">
		<!-- Top servers -->
		<section class="mt-10 px-4 max-w-5xl mx-auto">
			<div class="flex items-end justify-between mb-4 md:mx-4 flex-wrap gap-2">
				<div>
					<h2 class="font-heading text-3xl font-bold flex items-center gap-2">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-8 h-8 text-green-500"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
							<path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
							<path d="M4 22h16" />
							<path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
							<path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
							<path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
						</svg>
						Top Servers
					</h2>
					<p class="text-gray-500 dark:text-gray-400 mt-1 font-medium max-w-xl">
						The most popular Discord communities right now.
					</p>
				</div>
				<a
					href={buildHref({ trending: "", offset: 0 })}
					class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-card hover:bg-accent font-semibold text-sm transition-colors text-muted-foreground hover:text-foreground"
				>
					View all
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
			</div>

			{#if topServers && topServers.length > 0}
				<div class="flex flex-wrap justify-center gap-4 pt-2">
					{#each topServers as server}
						<ServerCard {server} edit={false} />
					{/each}
				</div>
			{:else}
				<div class="py-16 text-center">
					<div class="text-4xl mb-3" aria-hidden="true">🏗️</div>
					<p class="text-muted-foreground font-medium">
						No servers listed yet. Be the first to
						<a href="/servers/how-to-add" class="text-green-500 hover:underline font-semibold">
							add yours!
						</a>
					</p>
				</div>
			{/if}
		</section>

		<!-- How to add section -->
		<section class="mt-20 px-4 max-w-4xl mx-auto">
			<div class="rounded-2xl border border-green-500/20 bg-green-500/5 p-8">
				<div class="flex flex-col md:flex-row md:items-center gap-6">
					<div
						class="shrink-0 w-16 h-16 rounded-2xl bg-green-500/15 border border-green-500/25 flex items-center justify-center"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-8 h-8 text-green-500"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<circle cx="12" cy="12" r="10" />
							<path d="M12 8v8" />
							<path d="M8 12h8" />
						</svg>
					</div>
					<div class="flex-1">
						<h3 class="font-heading text-2xl font-bold mb-2">List Your Server</h3>
						<p class="text-muted-foreground leading-relaxed mb-4">
							Getting your server listed is easy. Add our bot to your server, make sure you have
							<strong class="text-foreground">Manage Server</strong> or
							<strong class="text-foreground">Administrator</strong> permission, then run
							<code
								class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground font-semibold"
								>/register</code
							>
							inside your server. That's it!
						</p>
						<div class="flex flex-wrap gap-3">
							<a
								href="https://discord.com/oauth2/authorize?client_id={data.discordBotId}&permissions=5640910726360128&integration_type=0&scope=bot+applications.commands"
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold transition-colors text-sm"
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
									<path d="M12 5v14M5 12h14" />
								</svg>
								Add Bot to Server
							</a>
							<a
								href="/login"
								class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-green-500/40 hover:bg-green-500/10 font-bold transition-colors text-sm"
							>
								Create Account First
							</a>
						</div>
					</div>
				</div>
			</div>
		</section>
	</div>
{/if}
