<script lang="ts">
	import BotCard from "$lib/components/BotCard.svelte";
	import SEO from "$lib/components/SEO.svelte";

	export let data: {
		bots: Array<any>;
		q: string | null;
		limit: number;
		offset: number;
		newFlag: boolean;
		trending: boolean;
		lucky: boolean;
	};

	$: ({ bots, q, limit, offset, newFlag, trending, lucky } = data);

	$: prevOffset = Math.max(0, offset - limit);
	$: nextOffset = offset + limit;
	$: hasPrev = offset > 0;
	$: hasNext = bots.length === limit;

	function buildHref(overrides: Record<string, string | number | boolean | null>) {
		const params = new URLSearchParams();
		const base = { q, limit, offset, new: newFlag, trending, lucky, ...overrides };
		if (base.q) params.set("q", String(base.q));
		if (Number(base.limit) !== 20) params.set("limit", String(base.limit));
		if (Number(base.offset) > 0) params.set("offset", String(base.offset));
		if (base.new) params.set("new", "");
		if (base.trending) params.set("trending", "");
		if (base.lucky) params.set("lucky", "");
		const qs = params.toString();
		return "/bots" + (qs ? "?" + qs : "");
	}
</script>

{#if q}
	<SEO
		title={`Results for "${q}" — Bots`}
		description={`Search results for "${q}" on Rovel Discord List. Find the perfect Discord bot for your server.`}
		imageSmall="/assets/img/bot/logo-512.png"
	/>
{:else if newFlag}
	<SEO
		title="Newest Bots"
		description="Browse the newest Discord bots added to Rovel Discord List. Be the first to discover fresh additions to your server."
		imageSmall="/assets/img/bot/logo-512.png"
	/>
{:else if trending}
	<SEO
		title="Most Popular Bots"
		description="The most popular Discord bots on Rovel Discord List, ranked by votes. Find the bots everyone is using."
		imageSmall="/assets/img/bot/logo-512.png"
	/>
{:else if lucky}
	<SEO
		title="Feeling Lucky — Random Bots"
		description="Discover random Discord bots on Rovel Discord List. You might just find your new favourite!"
		imageSmall="/assets/img/bot/logo-512.png"
	/>
{:else}
	<SEO
		title="Browse All Bots"
		description="Find the perfect bot for your Discord server on Rovel Discord List. Browse hundreds of bots across every category."
		imageSmall="/assets/img/bot/logo-512.png"
	/>
{/if}

<section class="py-8">
	<!-- Page header -->
	<div class="text-center mb-10 px-4">
		<img src="/assets/img/bot/logo-512.png" class="w-20 h-20 mx-auto mb-6" alt="logo" />
		<h1 class="font-heading text-4xl md:text-6xl font-bold mb-3">Rovel Discord List</h1>
		<h2
			class="font-heading text-xl md:text-2xl font-semibold mb-4 text-gray-600 dark:text-gray-300"
		>
			Find your next favorite bot on the best Discord bot list!
		</h2>

		<!-- Current view label -->
		<h3 class="font-heading text-3xl font-bold mt-8 mb-2">
			{#if q}
				Search Results for &quot;{q}&quot;
			{:else if newFlag}
				<!-- Chemical icon -->
				<img src="/assets/img/chemical.svg" alt="" class="w-8 h-8 inline-block -mt-2 mr-1" />
				Newest Bots
			{:else if trending}
				<!-- Flame icon -->
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="w-8 h-8 inline-block -mt-2 mr-1 text-primary"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path
						d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
					/>
				</svg>
				Most Popular Bots
			{:else if lucky}
				Feeling Lucky? Here are some bots!
			{:else}
				All Bots
			{/if}
		</h3>

		<p class="text-center text-lg font-semibold mb-6 text-gray-600 dark:text-gray-400">
			Search for bots by name or description, and find the perfect bot for your server!
		</p>

		<!-- Filter action buttons -->
		<div class="flex flex-wrap gap-2 justify-center mb-6">
			<a
				href={buildHref({ lucky: true, new: false, trending: false, offset: 0 })}
				class="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md font-medium hover:bg-primary/90 transition-colors"
			>
				<img src="/assets/img/bot/wink.svg" alt="" class="w-5 h-5 -mt-0.5" />
				Feeling Lucky?
			</a>

			{#if newFlag}
				<a
					href={buildHref({ trending: true, new: false, offset: 0 })}
					class="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md font-medium hover:bg-primary/90 transition-colors"
				>
					<img src="/assets/img/popularity.svg" alt="" class="w-5 h-5 -mt-0.5" />
					Find Popular Bots
				</a>
			{:else if trending}
				<a
					href={buildHref({ new: true, trending: false, offset: 0 })}
					class="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md font-medium hover:bg-primary/90 transition-colors"
				>
					<img src="/assets/img/chemical.svg" alt="" class="w-5 h-5 -mt-0.5" />
					Find New Bots
				</a>
			{:else}
				<a
					href={buildHref({ trending: true, new: false, offset: 0 })}
					class="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md font-medium hover:bg-primary/90 transition-colors"
				>
					<img src="/assets/img/popularity.svg" alt="" class="w-5 h-5 -mt-0.5" />
					Find Popular Bots
				</a>
				<a
					href={buildHref({ new: true, trending: false, offset: 0 })}
					class="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md font-medium hover:bg-primary/90 transition-colors"
				>
					<img src="/assets/img/chemical.svg" alt="" class="w-5 h-5 -mt-0.5" />
					Find New Bots
				</a>
			{/if}
		</div>

		<!-- Search form -->
		<form method="get" action="/bots" class="flex gap-2 justify-center mb-2">
			<input
				type="text"
				name="q"
				placeholder="Search for bots..."
				value={q ?? ""}
				class="border border-neutral-400 dark:border-neutral-700 rounded-md p-2 w-full md:w-1/2 bg-neutral-100 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary"
			/>
			<button
				type="submit"
				class="px-4 py-2 bg-primary text-white rounded-md font-medium hover:bg-primary/90 transition-colors"
			>
				Search
			</button>
			{#if q}
				<a
					href="/bots"
					class="px-4 py-2 border border-input bg-background rounded-md font-medium hover:bg-accent transition-colors"
				>
					Clear
				</a>
			{/if}
		</form>
	</div>

	<!-- Results -->
	{#if bots.length === 0}
		<div class="py-16 text-center">
			<p class="text-xl font-semibold">No bots found</p>
			<p class="text-muted-foreground mt-2">Try a different search term or browse all bots.</p>
			{#if q}
				<a
					href="/bots"
					class="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
				>
					Browse All Bots
				</a>
			{/if}
		</div>
	{:else}
		<div class="flex flex-wrap justify-center gap-4 px-4">
			{#each bots as bot}
				<BotCard {bot} edit={false} />
			{/each}
		</div>

		<!-- Offset-based pagination — mirrors old site behavior -->
		{#if !lucky}
			<div class="mt-10 flex items-center justify-center gap-3">
				{#if hasPrev}
					<a
						href={buildHref({ offset: prevOffset })}
						class="inline-flex items-center gap-1 px-4 py-2 bg-primary text-white rounded-md font-medium hover:bg-primary/90 transition-colors"
					>
						<!-- Arrow left -->
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-5 h-5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="m11.25 9-3 3m0 0 3 3m-3-3h7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
						</svg>
						Previous
					</a>
				{/if}

				{#if hasNext}
					<a
						href={buildHref({ offset: nextOffset })}
						class="inline-flex items-center gap-1 px-4 py-2 bg-primary text-white rounded-md font-medium hover:bg-primary/90 transition-colors"
					>
						Next
						<!-- Arrow right -->
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-5 h-5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="m12.75 15 3-3m0 0-3-3m3 3h-7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
						</svg>
					</a>
				{/if}
			</div>
		{/if}
	{/if}
</section>
