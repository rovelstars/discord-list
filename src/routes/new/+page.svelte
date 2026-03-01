<script lang="ts">
	import SEO from '$lib/components/SEO.svelte';
	import BotCard from '$lib/components/BotCard.svelte';

	export let data: { bots: Array<any> };

	const { bots } = data;

	const currentYear = new Date().getFullYear();

	function timeAgo(ts: number | null | undefined): string {
		if (!ts) return 'recently';
		const diff = Date.now() - ts;
		const days = Math.floor(diff / 86_400_000);
		if (days === 0) return 'today';
		if (days === 1) return 'yesterday';
		if (days < 7) return `${days} days ago`;
		if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
		if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
		return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? 's' : ''} ago`;
	}
</script>

<SEO
	title="New Discord Bots {currentYear} — Latest Additions"
	description="Discover the newest Discord bots added to Rovel Discord List in {currentYear}. Be the first to find fresh bots before they blow up — updated continuously."
	imageSmall="/assets/img/bot/logo-512.png"
/>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		name: `New Discord Bots ${currentYear}`,
		description: `The newest Discord bots added to Rovel Discord List in ${currentYear}.`,
		url: 'https://discord.rovelstars.com/new'
	})}</script>`}
</svelte:head>

<!-- ── Hero ──────────────────────────────────────────────────────────────── -->
<section class="text-center py-12 px-4">
	<img
		src="/assets/img/chemical.svg"
		class="w-20 h-20 mx-auto mb-6"
		alt="New bots"
		loading="eager"
	/>
	<h1 class="font-heading text-4xl md:text-6xl font-bold mb-4">
		New Discord Bots {currentYear}
	</h1>
	<p class="text-gray-600 dark:text-gray-300 text-xl font-semibold max-w-2xl mx-auto mb-4">
		The freshest bots on the list — added by developers just like you. Discover hidden gems
		before they climb the charts.
	</p>
	<p class="text-muted-foreground text-base max-w-xl mx-auto mb-8">
		New bots are listed here as soon as they're approved. Check back often — this page updates
		continuously as the community grows.
	</p>
	<a
		href="/dashboard/bots/new"
		class="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-md font-semibold hover:bg-primary/90 transition-colors"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="w-5 h-5"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M5 12h14" /><path d="M12 5v14" />
		</svg>
		Submit Your Bot
	</a>
</section>

<!-- ── Bot grid ───────────────────────────────────────────────────────────── -->
<section class="pb-16">
	<h2 class="font-heading text-4xl font-bold mb-4 md:text-left mt-12 md:mx-32 mx-4 text-center">
		<img
			alt=""
			src="/assets/img/chemical.svg"
			class="w-8 h-8 inline-block text-primary -mt-2 mr-1"
			aria-hidden="true"
		/>
		Recently Added
	</h2>
	<p class="text-gray-600 dark:text-gray-300 text-xl mb-8 md:mx-32 mx-4 md:text-left text-center font-semibold">
		Showing the {bots.length} most recently listed bots, newest first.
	</p>

	{#if bots.length > 0}
		<div class="flex flex-wrap justify-center gap-4 px-4">
			{#each bots as bot (bot.id)}
				<BotCard {bot} edit={false} />
			{/each}
		</div>
	{:else}
		<p class="text-center text-muted-foreground py-20 text-lg">
			No bots found — check back soon!
		</p>
	{/if}
</section>

<!-- ── Editorial copy ─────────────────────────────────────────────────────── -->
<section class="max-w-3xl mx-auto px-4 pb-16 prose prose-base dark:prose-invert">
	<h2>Why Discover New Discord Bots Early?</h2>
	<p>
		The Discord bot ecosystem moves fast. New bots launch every week, often with innovative
		features that established bots haven't caught up to yet. Being an early adopter means you get
		to shape a bot's development — many developers actively listen to their first users and build
		features on request.
	</p>
	<p>
		Early adoption also means your server benefits before competitors do. A unique moderation
		workflow, a music bot with better audio quality, or a levelling system your members haven't
		seen before can set your community apart.
	</p>

	<h3>What to Look for in a New Bot</h3>
	<ul>
		<li>
			<strong>Active development</strong> — check if the bot has a support server and whether the
			developer responds to issues.
		</li>
		<li>
			<strong>Uptime</strong> — newer bots sometimes have reliability growing pains. Give them a
			few days before judging.
		</li>
		<li>
			<strong>Permissions</strong> — only grant the permissions a bot actually needs. Prefer bots
			that request the minimum required.
		</li>
		<li>
			<strong>Open source</strong> — bots with a public GitHub repository are generally more
			trustworthy and auditable.
		</li>
	</ul>

	<h3>Submit Your Own Bot</h3>
	<p>
		Built a Discord bot and want it featured here? Log in with your Discord account and head to
		the <a href="/dashboard/bots/new">submission page</a>. Once approved by our moderators, your
		bot will appear on this page and become discoverable by thousands of server owners browsing
		Rovel Discord List every day.
	</p>
</section>
