<script lang="ts">
	import SEO from "$lib/components/SEO.svelte";
	import BotCard from "$lib/components/BotCard.svelte";
	import getAvatarURL from "$lib/get-avatar-url";

	export let data: {
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
			rank: number;
			lib?: string | null;
			prefix?: string | null;
		}>;
	};

	// Reactive — stays fresh after client-side navigations
	$: ({ bots } = data);

	const currentYear = new Date().getFullYear();

	function approx(n: number): string {
		if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
		if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
		return String(n);
	}

	function rankMedal(rank: number): string {
		if (rank === 1) return "🥇";
		if (rank === 2) return "🥈";
		if (rank === 3) return "🥉";
		return String(rank);
	}

	// FAQ items — reactive so bots[0] is always defined (avoids SSR crash)
	$: faqs = [
		{
			q: `What are the best Discord bots in ${currentYear}?`,
			a: `The top Discord bots are ranked by community votes on Rovel Discord List. The current #1 bot is ${bots?.[0]?.username ?? "updated regularly"}. Rankings update in real time as users cast votes every 12 hours.`
		},
		{
			q: "How is the leaderboard ranking calculated?",
			a: "Each bot is ranked purely by the total number of votes received from real Discord users. Anyone logged in with their Discord account can vote for their favourite bot once every 12 hours."
		},
		{
			q: "How do I vote for a bot?",
			a: "Log in with your Discord account, find the bot you want to support, and click the Vote button on its detail page. You can vote for the same bot again after 12 hours."
		},
		{
			q: "Can I list my own bot on the leaderboard?",
			a: "Yes! Log in with Discord, head to your Dashboard, and submit your bot. Once approved it will appear in the listings and be eligible for community votes."
		}
	];

	$: faqSchema = {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: (faqs ?? []).map((f) => ({
			"@type": "Question",
			name: f.q,
			acceptedAnswer: { "@type": "Answer", text: f.a }
		}))
	};

	$: listSchema = {
		"@context": "https://schema.org",
		"@type": "ItemList",
		name: `Top Discord Bots ${currentYear}`,
		description: `The most voted Discord bots on Rovel Discord List as of ${currentYear}.`,
		itemListElement: (bots ?? []).slice(0, 10).map((bot) => ({
			"@type": "ListItem",
			position: bot.rank,
			name: bot.username,
			description: bot.short,
			url: `https://discord.rovelstars.com/bots/${bot.slug}`
		}))
	};
</script>

<SEO
	title="Top 100 Discord Bots {currentYear} — Leaderboard"
	description="The definitive ranking of the best Discord bots in {currentYear}, voted by real users. See which music, moderation, utility and fun bots top the charts this month."
	imageSmall="/assets/img/bot/logo-512.png"
/>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>`}
	{@html `<script type="application/ld+json">${JSON.stringify(listSchema)}</script>`}
</svelte:head>

<!-- ── Hero ──────────────────────────────────────────────────────────────── -->
<section class="text-center py-12 px-4">
	<img
		src="/assets/img/bot/logo-512.png"
		class="w-20 h-20 mx-auto mb-6"
		alt="Rovel Discord List"
		loading="eager"
	/>
	<h1 class="font-heading text-4xl md:text-6xl font-bold mb-4">
		Top {bots.length} Discord Bots {currentYear}
	</h1>
	<p class="text-gray-600 dark:text-gray-300 text-xl font-semibold max-w-2xl mx-auto mb-4">
		The definitive leaderboard of the most-voted Discord bots, ranked by real community votes.
		Updated continuously — cast your vote every 12 hours!
	</p>
	<p class="text-muted-foreground text-base max-w-xl mx-auto">
		Whether you need a music bot, a powerful moderation suite, or something fun to keep your
		community engaged — the rankings below show exactly what the Discord community trusts most.
	</p>
</section>

<!-- ── Rank table ────────────────────────────────────────────────────────── -->
{#if bots.length > 0}
	<section class="max-w-5xl mx-auto px-4 pb-16">
		<div class="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
			<!-- ── Desktop header (hidden on mobile) ── -->
			<div
				class="hidden sm:grid sm:grid-cols-[3rem_1fr_6rem_6rem_5rem] gap-2 px-4 py-3
				       bg-muted/60 text-xs font-semibold uppercase tracking-wide
				       text-muted-foreground border-b border-border"
			>
				<span class="text-center">#</span>
				<span>Bot</span>
				<span class="text-right">Votes</span>
				<span class="text-right">Servers</span>
				<span class="text-center">Action</span>
			</div>

			<!-- ── Rows ── -->
			{#each bots as bot (bot.id)}
				<!--
					Desktop: 5-column grid  (sm+)
					Mobile:  2-column grid — rank+avatar+name left, stats+action right
				-->
				<div
					class="group border-b border-border last:border-0
					       hover:bg-muted/30 transition-colors
					       px-3 py-3 sm:px-4
					       grid grid-cols-[2.25rem_1fr_auto] sm:grid-cols-[3rem_1fr_6rem_6rem_5rem]
					       gap-x-2 gap-y-1 sm:gap-2 items-center"
				>
					<!-- Rank -->
					<span
						class="text-center font-bold row-span-2 sm:row-span-1
						       {bot.rank <= 3 ? 'text-2xl' : 'text-base text-muted-foreground'}"
					>
						{rankMedal(bot.rank)}
					</span>

					<!-- Avatar + name + short — spans col 2 on both layouts -->
					<a href="/bots/{bot.slug}" class="flex items-center gap-2.5 min-w-0">
						<img
							src={getAvatarURL(bot.id, bot.avatar ?? "0", 48)}
							alt="{bot.username} avatar"
							class="w-9 h-9 sm:w-10 sm:h-10 rounded-full shrink-0 bg-muted"
							loading="lazy"
						/>
						<div class="min-w-0">
							<p
								class="font-semibold text-sm text-foreground truncate
								       group-hover:text-primary transition-colors"
							>
								{bot.username}
								{#if bot.discriminator && bot.discriminator !== "0"}
									<span class="text-muted-foreground font-normal text-xs">
										#{bot.discriminator}
									</span>
								{/if}
							</p>
							<p class="text-xs text-muted-foreground truncate leading-snug">{bot.short}</p>
							{#if bot.lib}
								<span
									class="inline-block mt-0.5 text-[10px] font-medium
									       bg-primary/10 text-primary px-1.5 py-0.5 rounded"
								>
									{bot.lib}
								</span>
							{/if}
						</div>
					</a>

					<!--
						Mobile action button — top-right cell (col 3, row 1)
						Hidden on sm+ (desktop has its own cell below)
					-->
					<div class="flex justify-end items-center sm:hidden">
						<a
							href="/bots/{bot.slug}/vote"
							class="text-xs font-semibold px-3 py-1.5 rounded-md
							       bg-primary/10 text-primary hover:bg-primary hover:text-white
							       transition-colors whitespace-nowrap"
						>
							Vote
						</a>
					</div>

					<!--
						Mobile stats row — col 2–3, row 2
						Shows votes + servers inline, hidden on sm+
					-->
					<div class="flex items-center gap-3 sm:hidden col-start-2 col-span-2 pb-0.5">
						<span
							class="flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400"
						>
							<!-- ChevronUp / vote icon -->
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-3 h-3"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d="m18 15-6-6-6 6" />
							</svg>
							{approx(bot.votes)}
						</span>
						<span class="flex items-center gap-1 text-xs text-muted-foreground font-medium">
							<!-- Compass icon -->
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-3 h-3"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<circle cx="12" cy="12" r="10" />
								<polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
							</svg>
							{approx(bot.servers)} servers
						</span>
					</div>

					<!-- Desktop: Votes cell (hidden on mobile) -->
					<span
						class="hidden sm:block text-right font-semibold text-sm
						       text-green-600 dark:text-green-400"
					>
						{approx(bot.votes)}
					</span>

					<!-- Desktop: Servers cell (hidden on mobile) -->
					<span class="hidden sm:block text-right text-sm text-muted-foreground font-medium">
						{approx(bot.servers)}
					</span>

					<!-- Desktop: Vote CTA cell (hidden on mobile) -->
					<div class="hidden sm:flex justify-center">
						<a
							href="/bots/{bot.slug}/vote"
							class="text-xs font-semibold px-3 py-1.5 rounded-md
							       bg-primary/10 text-primary hover:bg-primary hover:text-white
							       transition-colors whitespace-nowrap"
						>
							Vote
						</a>
					</div>
				</div>
			{/each}
		</div>

		<p class="text-center text-xs text-muted-foreground mt-4">
			Rankings update in real time · You can vote for each bot every 12 hours
		</p>
	</section>
{:else}
	<p class="text-center text-muted-foreground py-20 text-lg">No bots found — check back soon!</p>
{/if}

<!-- ── Top 3 cards ───────────────────────────────────────────────────────── -->
{#if bots.length >= 3}
	<section class="max-w-5xl mx-auto px-4 pb-16">
		<h2 class="font-heading text-3xl font-bold mb-2 md:mx-0 text-center md:text-left">
			<img
				alt=""
				src="/assets/img/mostvote.svg"
				class="w-7 h-7 inline-block -mt-1 mr-2"
				aria-hidden="true"
			/>
			This Month's Champions
		</h2>
		<p class="text-muted-foreground text-base mb-6 text-center md:text-left font-semibold">
			The top three bots dominating the Discord community right now.
		</p>
		<div class="flex flex-wrap justify-center gap-4">
			{#each bots.slice(0, 3) as bot (bot.id)}
				<BotCard {bot} edit={false} />
			{/each}
		</div>
	</section>
{/if}

<!-- ── SEO editorial copy ─────────────────────────────────────────────────── -->
<section class="max-w-3xl mx-auto px-4 pb-16 prose prose-base dark:prose-invert">
	<h2>Best Discord Bots {currentYear} — Full Ranking Guide</h2>
	<p>
		Finding the right bot for your Discord server can make the difference between a quiet, inactive
		community and one that's thriving and engaged. This leaderboard ranks the <strong
			>top {bots.length} Discord bots</strong
		> by votes cast directly by Discord users — making it the most democratic and community-driven bot
		ranking on the internet.
	</p>

	<h3>Why Trust Community Votes?</h3>
	<p>
		Unlike editorial lists curated by a single team, every position in this leaderboard is earned
		through genuine user votes. Each Discord user can vote once every 12 hours, which means bots
		that consistently deliver value keep climbing while ones that disappoint fade over time. It's a
		living, breathing reflection of what the Discord community actually uses and loves.
	</p>

	<h3>Categories Represented</h3>
	<p>The leaderboard spans every major bot category:</p>
	<ul>
		<li><strong>Music bots</strong> — stream from YouTube, Spotify, SoundCloud and more</li>
		<li><strong>Moderation bots</strong> — auto-mod, logging, role management, anti-raid</li>
		<li><strong>Economy bots</strong> — virtual currency, shops, leaderboards</li>
		<li><strong>Fun &amp; games</strong> — mini-games, trivia, memes, image commands</li>
		<li><strong>Utility bots</strong> — server stats, polls, reminders, translations</li>
		<li><strong>Leveling bots</strong> — XP systems, rank cards, activity rewards</li>
	</ul>

	<h3>How to Climb the Rankings</h3>
	<p>
		Bot developers can improve their ranking by building high-quality, reliable bots and encouraging
		their user base to vote. Votes reset over time, so consistently delivering value is what keeps a
		bot at the top. The best way to get more votes is to simply be the best bot in your category.
	</p>
</section>

<!-- ── FAQ ───────────────────────────────────────────────────────────────── -->
<section class="max-w-3xl mx-auto px-4 pb-20">
	<h2 class="font-heading text-2xl font-bold mb-6">Frequently Asked Questions</h2>
	<div class="flex flex-col gap-4">
		{#each faqs as faq}
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
