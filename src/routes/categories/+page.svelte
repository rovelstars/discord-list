<script lang="ts">
	import SEO from '$lib/components/SEO.svelte';

	const currentYear = new Date().getFullYear();

	const categories = [
		{
			slug: 'music',
			name: 'Music Bots',
			icon: '/assets/img/bot/wink.svg',
			emoji: '🎵',
			description:
				'Stream music from YouTube, Spotify, SoundCloud and more. Queue management, equalizer, lyrics — everything your listening party needs.',
			keywords: ['music', 'audio', 'playlist', 'stream', 'radio']
		},
		{
			slug: 'moderation',
			name: 'Moderation Bots',
			icon: '/assets/img/mod.svg',
			emoji: '🛡️',
			description:
				'Keep your community safe and healthy. Auto-mod, anti-spam, logging, mute/ban commands and raid protection all in one place.',
			keywords: ['mod', 'automod', 'logging', 'anti-raid', 'ban']
		},
		{
			slug: 'gaming',
			name: 'Gaming & Esports',
			icon: '/assets/img/game-controller.svg',
			emoji: '🎮',
			description:
				'Organise tournaments, track stats, run in-chat mini-games and keep your competitive community engaged between matches.',
			keywords: ['game', 'esports', 'gaming', 'tournament', 'stats']
		},
		{
			slug: 'economy',
			name: 'Economy Bots',
			icon: '/assets/img/bot/moneh.svg',
			emoji: '💰',
			description:
				'Virtual currency, shops, gambling, heist events and rich leaderboards. Give your members something to grind for.',
			keywords: ['economy', 'currency', 'coins', 'shop', 'bank']
		},
		{
			slug: 'utility',
			name: 'Utility Bots',
			icon: '/assets/img/chip.svg',
			emoji: '🔧',
			description:
				'Server stats, polls, reminders, calculators, weather, translation and the hundreds of other handy tools that make running a server easier.',
			keywords: ['utility', 'tools', 'poll', 'reminder', 'translate']
		},
		{
			slug: 'fun',
			name: 'Fun & Entertainment',
			icon: '/assets/img/bot/love.svg',
			emoji: '🎉',
			description:
				'Memes, trivia, image manipulation, action commands and social games that keep conversations lively and members coming back.',
			keywords: ['fun', 'meme', 'trivia', 'games', 'entertainment']
		},
		{
			slug: 'anime',
			name: 'Anime & Roleplay',
			icon: '/assets/img/anime.svg',
			emoji: '⛩️',
			description:
				'Anime search, manga updates, waifu cards, roleplay actions and all the weeb content your server could ever want.',
			keywords: ['anime', 'manga', 'roleplay', 'waifu', 'otaku']
		},
		{
			slug: 'leveling',
			name: 'Leveling & XP',
			icon: '/assets/img/medal.svg',
			emoji: '⭐',
			description:
				'Reward activity with XP, rank cards and role unlocks. A great leveling system turns lurkers into regulars.',
			keywords: ['level', 'xp', 'rank', 'leaderboard', 'reward']
		},
		{
			slug: 'logging',
			name: 'Logging & Audit',
			icon: '/assets/img/log-format.svg',
			emoji: '📋',
			description:
				'Full audit trails, message logs, join/leave events, voice channel tracking and mod action history for complete server visibility.',
			keywords: ['log', 'audit', 'tracking', 'history', 'monitor']
		},
		{
			slug: 'roleplay',
			name: 'Roleplay & Social',
			icon: '/assets/img/heart.svg',
			emoji: '💬',
			description:
				'Hug, kiss, pat, slap and hundreds of other social interaction commands that bring warmth and personality to your community.',
			keywords: ['roleplay', 'social', 'hug', 'kiss', 'actions']
		},
		{
			slug: 'announce',
			name: 'Announcements & Feeds',
			icon: '/assets/img/announce.svg',
			emoji: '📣',
			description:
				'Auto-post YouTube uploads, Twitch live alerts, Reddit feeds and custom announcements so your community never misses a thing.',
			keywords: ['announce', 'feed', 'twitch', 'youtube', 'alert']
		},
		{
			slug: 'translate',
			name: 'Translation & Language',
			icon: '/assets/img/translate.svg',
			emoji: '🌐',
			description:
				'Break language barriers with real-time message translation, language detection and multilingual server support.',
			keywords: ['translate', 'language', 'multilingual', 'i18n']
		}
	];
</script>

<SEO
	title="Discord Bot Categories {currentYear} — Browse by Type"
	description="Browse every type of Discord bot in one place. Music, moderation, gaming, economy, utility, fun and more — find the perfect bot for your server by category."
	imageSmall="/assets/img/bot/logo-512.png"
/>

<!-- ── Hero ──────────────────────────────────────────────────────────────── -->
<section class="text-center py-12 px-4">
	<img src="/assets/img/chip.svg" class="w-20 h-20 mx-auto mb-6" alt="Categories" loading="eager" />
	<h1 class="font-heading text-4xl md:text-6xl font-bold mb-4">Discord Bot Categories</h1>
	<p class="text-gray-600 dark:text-gray-300 text-xl font-semibold max-w-2xl mx-auto mb-3">
		Not sure where to start? Browse bots by what they do. Every category has a curated selection of
		the most popular bots in that space.
	</p>
	<p class="text-muted-foreground text-base max-w-xl mx-auto">
		From music and moderation to anime and economy — there's a perfect bot for every kind of Discord
		server.
	</p>
</section>

<!-- ── Category grid ──────────────────────────────────────────────────────── -->
<section class="pb-20 px-4">
	<div class="max-w-6xl mx-auto">
		<h2 class="font-heading text-3xl font-bold mb-2 mt-12 text-center md:text-left">
			<img
				alt=""
				src="/assets/img/popularity.svg"
				class="w-8 h-8 inline-block -mt-2 mr-2"
				aria-hidden="true"
			/>
			All Categories
		</h2>
		<p
			class="text-gray-600 dark:text-gray-300 text-lg mb-10 text-center md:text-left font-semibold"
		>
			{categories.length} categories — click any to see the bots inside.
		</p>

		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
			{#each categories as cat}
				<a
					href="/categories/{cat.slug}"
					class="group flex flex-col gap-3 bg-card border border-border rounded-xl p-5 hover:border-primary/60 hover:shadow-md hover:-translate-y-1 transition-all duration-200"
				>
					<!-- Icon + emoji row -->
					<div class="flex items-center gap-3">
						<span class="text-3xl select-none" aria-hidden="true">{cat.emoji}</span>
						<span
							class="font-heading font-bold text-lg text-foreground group-hover:text-primary transition-colors leading-tight"
						>
							{cat.name}
						</span>
					</div>

					<!-- Description -->
					<p class="text-sm text-muted-foreground leading-relaxed flex-1">
						{cat.description}
					</p>

					<!-- Keyword chips -->
					<div class="flex flex-wrap gap-1 mt-auto">
						{#each cat.keywords.slice(0, 3) as kw}
							<span
								class="text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full"
							>
								{kw}
							</span>
						{/each}
					</div>
				</a>
			{/each}
		</div>
	</div>
</section>

<!-- ── SEO copy ───────────────────────────────────────────────────────────── -->
<section class="max-w-3xl mx-auto px-4 pb-16 prose prose-base dark:prose-invert">
	<h2>Finding the Right Discord Bot</h2>
	<p>
		With thousands of Discord bots available, picking the right one for your server doesn't have to
		be overwhelming. The best approach is to start with what your community actually needs — then
		browse the relevant category to compare the top options side by side.
	</p>

	<h3>Most Popular Categories</h3>
	<p>
		<strong>Music bots</strong> are consistently the most-requested addition to any new server.
		<strong>Moderation bots</strong> become essential as communities grow past a few dozen members.
		<strong>Economy and leveling bots</strong> are proven tools for boosting long-term engagement by giving
		members goals to work towards.
	</p>

	<h3>Adding Multiple Bots</h3>
	<p>
		Most servers run three to five bots covering different roles: one for music, one for moderation,
		one for leveling, and one or two for fun or utility. Keep your bot count reasonable — too many
		bots create permission conflicts and clutter your channel list with unnecessary command
		suggestions.
	</p>

	<h3>Submit a Bot to a Category</h3>
	<p>
		Developers can <a href="/dashboard/bots/new">submit their bot</a> to Rovel Discord List and have it
		automatically matched to the relevant category based on its name, description and tags. Once approved,
		it will appear on the appropriate category page and in the main listings.
	</p>
</section>
