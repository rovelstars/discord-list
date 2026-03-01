<script lang="ts">
	import SEO from "$lib/components/SEO.svelte";
	import BotCard from "$lib/components/BotCard.svelte";

	export let data: {
		slug: string;
		meta: {
			name: string;
			keyword: string;
			emoji: string;
			icon: string;
			headline: string;
			description: string;
			longDescription: string;
			faqs: { q: string; a: string }[];
			relatedSlugs: string[];
		};
		bots: Array<any>;
		relatedCategories: Array<{
			slug: string;
			name: string;
			emoji: string;
			description: string;
		}>;
	};

	const { meta, bots, relatedCategories } = data;

	const currentYear = new Date().getFullYear();

	// JSON-LD: FAQPage
	const faqSchema = {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: meta.faqs.map((f) => ({
			"@type": "Question",
			name: f.q,
			acceptedAnswer: { "@type": "Answer", text: f.a }
		}))
	};

	// JSON-LD: ItemList of the bots on this page
	const listSchema = {
		"@context": "https://schema.org",
		"@type": "ItemList",
		name: `${meta.name} — Rovel Discord List`,
		description: meta.description,
		itemListElement: bots.slice(0, 10).map((bot: any, i: number) => ({
			"@type": "ListItem",
			position: i + 1,
			name: bot.username,
			description: bot.short,
			url: `https://discord.rovelstars.com/bots/${bot.slug}`
		}))
	};

	function approx(n: number): string {
		if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
		if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
		return String(n);
	}
</script>

<SEO
	title="{meta.headline} {currentYear}"
	description="{meta.description} Browse the top {meta.name.toLowerCase()} on Rovel Discord List, ranked by community votes and server count."
	imageSmall="/assets/img/bot/logo-512.png"
/>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify(faqSchema)}<\/script>`}
	{@html `<script type="application/ld+json">${JSON.stringify(listSchema)}<\/script>`}
</svelte:head>

<!-- ── Hero ──────────────────────────────────────────────────────────────── -->
<section class="text-center py-12 px-4">
	<img src={meta.icon} class="w-20 h-20 mx-auto mb-6" alt={meta.name} loading="eager" />
	<div class="flex items-center justify-center gap-3 mb-4">
		<span class="text-5xl select-none" aria-hidden="true">{meta.emoji}</span>
		<h1 class="font-heading text-4xl md:text-6xl font-bold">
			{meta.headline}
		</h1>
	</div>
	<p class="text-gray-600 dark:text-gray-300 text-xl font-semibold max-w-2xl mx-auto mb-3">
		{meta.description}
	</p>
	<p class="text-muted-foreground text-base max-w-2xl mx-auto mb-6 leading-relaxed">
		{meta.longDescription}
	</p>

	<!-- Breadcrumb -->
	<nav
		class="flex items-center justify-center gap-2 text-sm text-muted-foreground"
		aria-label="Breadcrumb"
	>
		<a href="/" class="hover:text-primary transition-colors">Home</a>
		<span aria-hidden="true">›</span>
		<a href="/categories" class="hover:text-primary transition-colors">Categories</a>
		<span aria-hidden="true">›</span>
		<span class="text-foreground font-medium">{meta.name}</span>
	</nav>
</section>

<!-- ── Bot grid ───────────────────────────────────────────────────────────── -->
<section class="pb-16">
	<h2 class="font-heading text-4xl font-bold mb-4 md:text-left mt-12 md:mx-32 mx-4 text-center">
		<img
			alt=""
			src={meta.icon}
			class="w-8 h-8 inline-block text-primary -mt-2 mr-1"
			aria-hidden="true"
		/>
		{meta.name}
		{#if bots.length > 0}
			<span class="text-muted-foreground text-2xl font-semibold ml-2">({bots.length})</span>
		{/if}
	</h2>
	<p
		class="text-gray-600 dark:text-gray-300 text-xl mb-8 md:mx-32 mx-4 md:text-left text-center font-semibold"
	>
		Ranked by server count — the most widely used {meta.name.toLowerCase()} in the Discord community.
	</p>

	{#if bots.length > 0}
		<div class="flex flex-wrap justify-center gap-4 px-4">
			{#each bots as bot (bot.id)}
				<BotCard {bot} edit={false} />
			{/each}
		</div>
	{:else}
		<div class="text-center py-20 px-4">
			<img
				src="/assets/img/bot/confused.svg"
				alt="No bots found"
				class="w-20 h-20 mx-auto mb-6 opacity-60"
				loading="lazy"
			/>
			<p class="text-muted-foreground text-lg font-semibold mb-2">
				No {meta.name.toLowerCase()} found yet.
			</p>
			<p class="text-muted-foreground text-sm max-w-md mx-auto mb-6">
				Be the first to list a {meta.name.toLowerCase().replace(" bots", " bot")} on Rovel Discord List!
			</p>
			<a
				href="/dashboard/bots/new"
				class="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-md font-semibold text-sm hover:bg-primary/90 transition-colors"
			>
				Submit Your Bot
			</a>
		</div>
	{/if}
</section>

<!-- ── Stats bar (when bots exist) ───────────────────────────────────────── -->
{#if bots.length > 0}
	<section class="max-w-4xl mx-auto px-4 pb-12">
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
			<div class="bg-card border border-border rounded-xl p-4 text-center">
				<p class="text-3xl font-bold font-heading text-primary">{bots.length}</p>
				<p class="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-wide">
					Bots Listed
				</p>
			</div>
			<div class="bg-card border border-border rounded-xl p-4 text-center">
				<p class="text-3xl font-bold font-heading text-green-500">
					{approx(bots.reduce((s: number, b: any) => s + (b.votes ?? 0), 0))}
				</p>
				<p class="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-wide">
					Total Votes
				</p>
			</div>
			<div class="bg-card border border-border rounded-xl p-4 text-center">
				<p class="text-3xl font-bold font-heading text-blue-500">
					{approx(bots.reduce((s: number, b: any) => s + (b.servers ?? 0), 0))}
				</p>
				<p class="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-wide">
					Total Servers
				</p>
			</div>
			<div class="bg-card border border-border rounded-xl p-4 text-center">
				<p class="text-3xl font-bold font-heading text-orange-500">
					{bots[0]?.username ?? "—"}
				</p>
				<p class="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-wide">#1 Bot</p>
			</div>
		</div>
	</section>
{/if}

<!-- ── FAQ accordion ──────────────────────────────────────────────────────── -->
<section class="max-w-3xl mx-auto px-4 pb-16">
	<h2 class="font-heading text-2xl font-bold mb-6 flex items-center gap-2">
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
			<circle cx="12" cy="12" r="10" />
			<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
			<path d="M12 17h.01" />
		</svg>
		Frequently Asked Questions
	</h2>
	<div class="flex flex-col gap-3">
		{#each meta.faqs as faq}
			<details
				class="group bg-card border border-border rounded-lg px-5 py-4 cursor-pointer open:shadow-sm transition-shadow"
			>
				<summary
					class="font-semibold text-base list-none flex items-center justify-between gap-4 select-none"
				>
					{faq.q}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-5 h-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d="m6 9 6 6 6-6" />
					</svg>
				</summary>
				<p class="mt-3 text-muted-foreground text-sm leading-relaxed">{faq.a}</p>
			</details>
		{/each}
	</div>
</section>

<!-- ── Editorial SEO copy ─────────────────────────────────────────────────── -->
<section class="max-w-3xl mx-auto px-4 pb-16 prose prose-base dark:prose-invert">
	<h2>How to Choose the Right {meta.name}</h2>
	<p>
		With so many options available, picking the best {meta.name
			.toLowerCase()
			.replace(" bots", " bot")} for your server comes down to a few key questions: How many servers is
		it in? Is it actively maintained? Does it have a support server where you can get help? The bots listed
		above are ranked by real-world usage — the ones at the top are there because thousands of server owners
		trust them enough to keep them installed.
	</p>

	<h3>What to Check Before Adding Any Bot</h3>
	<ul>
		<li>
			<strong>Permission scope</strong> — only grant the permissions the bot actually requires. Avoid
			bots that ask for Administrator unnecessarily.
		</li>
		<li>
			<strong>Support &amp; documentation</strong> — a bot with an active support server and clear docs
			is much easier to configure and troubleshoot.
		</li>
		<li>
			<strong>Uptime &amp; reliability</strong> — check the bot's server count and vote history. Popular
			bots tend to invest more in infrastructure.
		</li>
		<li>
			<strong>Open source</strong> — if security matters to you, prefer bots with a public repository
			so the code can be audited.
		</li>
	</ul>

	<h3>Adding a Bot to Your Server</h3>
	<p>
		Click any bot above to view its full detail page, then use the <strong>Invite</strong> button to add
		it to your server. You'll be asked to select which server to add it to and to approve the permissions
		it needs. Most bots are up and running within seconds of being invited.
	</p>

	<h3>Submit Your {meta.name.replace(" Bots", " Bot")} to This List</h3>
	<p>
		Built a {meta.name.replace(" Bots", " bot").toLowerCase()} and want it featured here?
		<a href="/dashboard/bots/new">Submit it via your dashboard</a> — once approved it will appear on this
		page and become discoverable by every server owner browsing Rovel Discord List.
	</p>
</section>

<!-- ── Related categories ─────────────────────────────────────────────────── -->
{#if relatedCategories.length > 0}
	<section class="max-w-5xl mx-auto px-4 pb-20">
		<h2 class="font-heading text-2xl font-bold mb-6 text-center md:text-left">
			Related Categories
		</h2>
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
			{#each relatedCategories as cat}
				<a
					href="/categories/{cat.slug}"
					class="group flex flex-col gap-2 bg-card border border-border rounded-xl p-5 hover:border-primary/60 hover:shadow-md hover:-translate-y-1 transition-all duration-200"
				>
					<div class="flex items-center gap-3">
						<span class="text-2xl select-none" aria-hidden="true">{cat.emoji}</span>
						<span class="font-semibold text-foreground group-hover:text-primary transition-colors">
							{cat.name}
						</span>
					</div>
					<p class="text-xs text-muted-foreground leading-relaxed line-clamp-2">
						{cat.description}
					</p>
				</a>
			{/each}
		</div>
	</section>
{/if}
