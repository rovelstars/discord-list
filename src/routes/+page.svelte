<script>
	import BotCard from '$lib/components/BotCard.svelte';
	import SEO from '$lib/components/SEO.svelte';

	export let data;

	const { topbotsdata, musicbotsdata, gamebotsdata, modbotsdata } = data;
</script>

<SEO
	title="The Best Discord List for Bots, Servers, Emojis..."
	description="Imagine a place — where you find everything about Discord! Bots, Servers, Emojis, Templates, PFPs and Banners, we got you covered!"
	imageSmall="/assets/img/bot/logo-512.png"
	noSuffix={true}
/>
<!-- ── Hero ─────────────────────────────────────────────────────────────── -->
<section class="text-center py-12 px-4">
	<img
		src="/assets/img/bot/logo-512.png"
		class="w-24 h-24 mx-auto my-12"
		alt="Rovel Discord List logo"
		loading="eager"
	/>
	<h1 class="font-heading text-4xl md:text-6xl font-bold mb-4">Rovel Discord List</h1>
	<h2 class="font-heading text-2xl md:text-4xl font-bold mb-4 text-gray-600 dark:text-gray-300">
		Imagine a better place - where you can find everything about discord!
	</h2>
	<p class="text-gray-600 dark:text-gray-300 text-xl mb-8 font-semibold">
		Discover community bots, tools and servers.
	</p>
</section>

<!-- ── Bot sections ──────────────────────────────────────────────────────── -->
<div class="pb-16">
	<!-- Best Bots of the Month -->
	<section class="mt-12">
		<h3 class="font-heading text-4xl font-bold mb-4 md:text-left mt-12 md:mx-32 mx-4 text-center">
			<img
				alt=""
				src="/assets/img/mostvote.svg"
				class="w-8 h-8 inline-block text-primary -mt-2 mr-1"
				aria-hidden="true"
			/>
			Best Bots of the Month
		</h3>
		<p
			class="text-gray-600 dark:text-gray-300 text-xl mb-8 md:mx-32 mx-4 md:text-left text-center font-semibold"
		>
			The best Discord bots, voted by you! Find the top-rated bots to supercharge your server.
		</p>

		{#if topbotsdata && topbotsdata.length > 0}
			<div class="flex flex-wrap justify-center gap-4 px-4">
				{#each topbotsdata as bot}
					<BotCard {bot} edit={false} />
				{/each}
			</div>
		{:else}
			<p class="text-center text-muted-foreground text-lg py-8">
				No bots here yet — check back soon!
			</p>
		{/if}
	</section>

	<!-- Featured Music Bots -->
	<section class="mt-16">
		<h3 class="font-heading text-4xl font-bold mb-4 md:text-left mt-12 md:mx-32 mx-4 text-center">
			<!-- Lucide Music icon (strokeWidth 4, matching old site) -->
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="w-8 h-8 inline-block text-primary -mt-2 mr-1"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="4"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M9 18V5l12-2v13" />
				<circle cx="6" cy="18" r="3" />
				<circle cx="18" cy="16" r="3" />
			</svg>
			Featured Music Bots
		</h3>
		<p
			class="text-gray-600 dark:text-gray-300 text-xl mb-8 md:mx-32 mx-4 md:text-left text-center font-semibold"
		>
			Bring the music to your community! Discover highly-used and reliable music bots that offer
			seamless playback and enjoyable listening experiences for your Discord server.
		</p>

		{#if musicbotsdata && musicbotsdata.length > 0}
			<div class="flex flex-wrap justify-center gap-4 px-4">
				{#each musicbotsdata as bot}
					<BotCard {bot} edit={false} />
				{/each}
			</div>
		{:else}
			<p class="text-center text-muted-foreground text-lg py-8">
				No music bots found — check back soon!
			</p>
		{/if}
	</section>

	<!-- Esports Tools & Text Adventures -->
	<section class="mt-16">
		<h3 class="font-heading text-4xl font-bold mb-4 md:text-left mt-12 md:mx-32 mx-4 text-center">
			<img
				alt=""
				src="/assets/img/game-controller.svg"
				class="w-8 h-8 inline-block text-primary -mt-2 mr-1"
				aria-hidden="true"
			/>
			Esports Tools &amp; Text Adventures
		</h3>
		<p
			class="text-gray-600 dark:text-gray-300 text-xl mb-8 md:mx-32 mx-4 md:text-left text-center font-semibold"
		>
			Get the competitive edge and have some text-based fun! Find Discord bots designed for esports
			organisation and those offering engaging in-channel games.
		</p>

		{#if gamebotsdata && gamebotsdata.length > 0}
			<div class="flex flex-wrap justify-center gap-4 px-4">
				{#each gamebotsdata as bot}
					<BotCard {bot} edit={false} />
				{/each}
			</div>
		{:else}
			<p class="text-center text-muted-foreground text-lg py-8">
				No gaming bots found — check back soon!
			</p>
		{/if}
	</section>

	<!-- Community Care Bots -->
	<section class="mt-16">
		<h3 class="font-heading text-4xl font-bold mb-4 md:text-left mt-12 md:mx-32 mx-4 text-center">
			<img
				alt=""
				src="/assets/img/mod.svg"
				class="w-8 h-8 inline-block text-primary -mt-2 mr-1"
				aria-hidden="true"
			/>
			Community Care Bots
		</h3>
		<p
			class="text-gray-600 dark:text-gray-300 text-xl mb-8 md:mx-32 mx-4 md:text-left text-center font-semibold"
		>
			Ensure a healthy and positive environment in your Discord server with these moderation bots,
			offering tools for filtering, managing, and protecting your members.
		</p>

		{#if modbotsdata && modbotsdata.length > 0}
			<div class="flex flex-wrap justify-center gap-4 px-4">
				{#each modbotsdata as bot}
					<BotCard {bot} edit={false} />
				{/each}
			</div>
		{:else}
			<p class="text-center text-muted-foreground text-lg py-8">
				No moderation bots found — check back soon!
			</p>
		{/if}
	</section>
</div>
