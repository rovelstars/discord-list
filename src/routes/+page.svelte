<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import BotCard from "$lib/components/BotCard.svelte";
	import ServerCard from "$lib/components/ServerCard.svelte";
	import EmojiCard from "$lib/components/EmojiCard.svelte";
	import StickerCard from "$lib/components/StickerCard.svelte";
	import SEO from "$lib/components/SEO.svelte";
	import { websiteSchema } from "$lib/jsonld";

	export let data: any;

	const {
		topbotsdata,
		allBotsForBg,
		topServersData,
		topEmojis = [],
		newestEmojis = [],
		topStickers = [],
		newestStickers = []
	} = data;

	// Tag each item with its type so the background renderer knows which card to use
	type BgItem =
		| { _type: "bot"; [k: string]: any }
		| { _type: "server"; [k: string]: any }
		| { _type: "sticker"; [k: string]: any }
		| { _type: "emoji"; [k: string]: any };

	// ── Animated word cycling ─────────────────────────────────────────────────
	const words = ["bots", "servers", "stickers", "emojis", "friends"];
	let currentWordIndex = 0;
	let currentWord = words[0];
	let letters: { char: string; state: "idle" | "falling-out" | "falling-in"; delay: number }[] = [];
	let animating = false;
	let intervalId: ReturnType<typeof setInterval>;

	function buildLetters(word: string, state: "idle" | "falling-in") {
		return word.split("").map((char, i) => ({
			char,
			state,
			delay: i * 45
		}));
	}

	function cycleWord() {
		if (animating) return;
		animating = true;

		// Phase 1: fall out current letters
		letters = buildLetters(currentWord, "idle").map((l) => ({
			...l,
			state: "falling-out" as const
		}));

		const outDuration = currentWord.length * 45 + 320;

		setTimeout(() => {
			currentWordIndex = (currentWordIndex + 1) % words.length;
			currentWord = words[currentWordIndex];

			// Phase 2: fall in next letters
			letters = buildLetters(currentWord, "falling-in");

			const inDuration = currentWord.length * 45 + 320;
			setTimeout(() => {
				letters = buildLetters(currentWord, "idle");
				animating = false;
			}, inDuration);
		}, outDuration);
	}

	// ── Background rows ───────────────────────────────────────────────────────
	// 6 rows of 10 cards each, cycling bots → servers → stickers → emojis.
	// Each row is tripled in the DOM so the -33.333% scroll loop is seamless.
	const NUM_ROWS = 6;
	const CARDS_PER_ROW = 10;

	$: backgroundRows = (() => {
		const botSrc = (allBotsForBg && allBotsForBg.length > 0 ? allBotsForBg : topbotsdata) as any[];
		const bots: BgItem[] =
			botSrc.length > 0
				? botSrc.map((b: any) => ({ ...b, _type: "bot" as const }))
				: Array.from({ length: CARDS_PER_ROW }, () => ({
						_type: "bot" as const,
						IS_SKELETON: true
					}));

		const servers: BgItem[] = (topServersData as any[]).map((s) => ({
			...s,
			_type: "server" as const
		}));
		const stickers: BgItem[] = [...topStickers, ...newestStickers].map((s: any) => ({
			...s,
			_type: "sticker" as const
		}));
		const emojis: BgItem[] = [...topEmojis, ...newestEmojis].map((e: any) => ({
			...e,
			_type: "emoji" as const
		}));

		// Pool per row type - cycle: bot, server, sticker, emoji, bot, server
		const pools: BgItem[][] = [bots, servers, stickers, emojis, bots, servers];

		const rows: BgItem[][] = [];
		for (let r = 0; r < NUM_ROWS; r++) {
			const pool = pools[r];
			// Fall back to bots if pool is empty
			const src = pool.length > 0 ? pool : bots;
			const row: BgItem[] = [];
			for (let c = 0; c < CARDS_PER_ROW; c++) {
				row.push(src[c % src.length]);
			}
			rows.push(row);
		}
		return rows;
	})();

	onMount(() => {
		letters = buildLetters(currentWord, "idle");
		intervalId = setInterval(cycleWord, 2800);
	});

	onDestroy(() => {
		if (intervalId) clearInterval(intervalId);
	});
</script>

<SEO
	title="Rovel Discord List - Find Bots, Servers, Emojis & More"
	description="Discover the next Discord bot, server, sticker, emoji, or friend right here. The best Discord discovery platform."
	imageSmall="/assets/img/bot/logo-512.png"
	noSuffix={true}
	jsonLd={websiteSchema()}
/>

<!-- ── Root: fills viewport, clips overflow ──────────────────────────────── -->
<div class="relative min-h-screen overflow-hidden bg-background">
	<!-- ── 3-D scrolling background ──────────────────────────────────────── -->
	<!--
		The stage is positioned to cover the full viewport (plus bleed on all sides
		so the tilt never reveals bare background). Cards render at natural size
		inside a CSS-scaled stage - one transform on the whole stage, nothing nested.
	-->
	<div class="bg-stage blur-xs" aria-hidden="true">
		<div class="bg-tilt">
			{#each backgroundRows as row, rowIndex}
				<div
					class="bg-row {rowIndex % 2 === 0 ? 'row-scroll-left' : 'row-scroll-right'}"
					style="animation-duration: {50 + rowIndex * 10}s;"
				>
					{#each [...row, ...row, ...row] as item}
						<div class="bg-transparent">
							{#if item._type === "server"}
								<ServerCard server={item} edit={false} />
							{:else if item._type === "sticker"}
								<StickerCard sticker={item as any} resolvedTags={item.resolvedTags ?? []} />
							{:else if item._type === "emoji"}
								<EmojiCard emoji={item as any} />
							{:else}
								<BotCard bot={item} edit={false} />
							{/if}
						</div>
					{/each}
				</div>
			{/each}
		</div>
	</div>

	<!-- ── Gradient overlay: fades edges to background colour ────────────── -->
	<div
		class="absolute inset-0 z-10 pointer-events-none"
		style="background:
			linear-gradient(to bottom, hsl(var(--background)/0.55) 0%, hsl(var(--background)/0) 20%, hsl(var(--background)/0) 55%, hsl(var(--background)/0.9) 88%, hsl(var(--background)) 100%),
			linear-gradient(to right, hsl(var(--background)/0.75) 0%, hsl(var(--background)/0) 18%, hsl(var(--background)/0) 82%, hsl(var(--background)/0.75) 100%);"
	></div>

	<!-- ── Hero content ───────────────────────────────────────────────────── -->
	<div class="relative z-20 flex flex-col items-center justify-center min-h-screen hero-content">
		<!-- Frosted glass panel around all hero text + CTAs -->
		<div
			class="px-5 py-8 sm:px-12 sm:py-10 md:px-24 md:py-12 rounded-2xl sm:rounded-3xl bg-card/50 border border-border backdrop-blur-2xl mx-3 sm:mx-0"
		>
			<!-- Logo -->
			<img
				src="/assets/img/bot/logo-512.png"
				class="mx-auto w-14 h-14 sm:w-20 sm:h-20 mb-5 sm:mb-8 drop-shadow-2xl"
				alt="Rovel Discord List"
				loading="eager"
			/>
			<!-- Headline -->
			<h1
				class="font-heading text-3xl sm:text-5xl md:text-7xl font-extrabold text-center leading-tight mb-2"
			>
				Find the next
			</h1>

			<!-- Animated cycling word -->
			<div
				class="relative flex items-end justify-center font-heading text-3xl sm:text-5xl md:text-7xl font-extrabold text-primary mb-4"
				style="min-height: 1.25em; min-width: 6ch;"
				aria-live="polite"
				aria-label={currentWord}
			>
				{#each letters as letter, i (i)}
					<span
						class="letter-char inline-block"
						class:falling-out={letter.state === "falling-out"}
						class:falling-in={letter.state === "falling-in"}
						style="--delay: {letter.delay}ms;"
					>
						{letter.char === " " ? "\u00A0" : letter.char}
					</span>
				{/each}
			</div>

			<!-- Subtitle -->
			<p
				class="font-heading text-2xl sm:text-4xl md:text-6xl font-extrabold text-center leading-tight mb-6 sm:mb-8"
			>
				here.
			</p>

			<p
				class="text-foreground/70 text-base sm:text-lg md:text-xl font-semibold text-center max-w-xl mb-8 sm:mb-12"
			>
				The ultimate Discord discovery platform - bots, servers, stickers, emojis, and communities,
				all in one place.
			</p>

			<!-- CTA buttons -->
			<div class="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center">
				<a
					href="/bots"
					class="inline-flex items-center justify-center gap-2 px-5 sm:px-7 py-3 sm:py-3.5 rounded-xl bg-primary text-white font-bold text-base sm:text-lg shadow-lg shadow-primary/30 hover:bg-primary/90 hover:shadow-primary/50 hover:-translate-y-0.5 transition-all duration-200"
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
					>
						<rect width="18" height="11" x="3" y="8" rx="2" />
						<path d="M8 8V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3" />
						<circle cx="12" cy="13" r="1" fill="currentColor" />
					</svg>
					Explore Bots
				</a>
				<a
					href="/bots?trending"
					class="inline-flex items-center justify-center gap-2 px-5 sm:px-7 py-3 sm:py-3.5 rounded-xl border-2 border-primary text-primary font-bold text-base sm:text-lg hover:bg-primary/10 hover:-translate-y-0.5 transition-all duration-200"
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
					>
						<path
							d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
						/>
					</svg>
					Trending
				</a>
				<a
					href="/bots?new"
					class="inline-flex items-center justify-center gap-2 px-5 sm:px-7 py-3 sm:py-3.5 rounded-xl border border-border bg-background/80 backdrop-blur font-bold text-base sm:text-lg hover:bg-accent hover:-translate-y-0.5 transition-all duration-200"
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
					>
						<path
							d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"
						/>
					</svg>
					New Arrivals
				</a>
			</div>
		</div>
		<!-- end hero-glass -->

		<!-- Scroll hint -->
		<div
			class="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-50 animate-bounce"
		>
			<span class="text-xs font-semibold tracking-widest uppercase">Scroll</span>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="w-5 h-5"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="m6 9 6 6 6-6" />
			</svg>
		</div>
	</div>

	<!-- ── Below-fold: featured sections ──────────────────────────────────── -->
	<div class="relative z-20 pb-24 bg-background">
		<!-- Section: Featured Bots -->
		{#if topbotsdata && topbotsdata.length > 0}
			<section class="pt-16 px-4">
				<div class="max-w-7xl mx-auto">
					<h2 class="font-heading text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
						<span class="text-primary">⭐</span> Featured Bots
					</h2>
					<p class="text-muted-foreground text-lg mb-8 font-medium">
						The top-rated bots the Discord community loves right now.
					</p>
					<div class="flex flex-wrap justify-center gap-4">
						{#each topbotsdata.slice(0, 6) as bot}
							<BotCard {bot} edit={false} />
						{/each}
					</div>
					<div class="text-center mt-10">
						<a
							href="/bots"
							class="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-white font-bold text-base hover:bg-primary/90 transition-colors"
						>
							View All Bots
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
								<path d="m9 18 6-6-6-6" />
							</svg>
						</a>
					</div>
				</div>
			</section>
		{/if}

		<!-- Section: Featured Servers -->
		{#if topServersData && topServersData.length > 0}
			<section class="pt-16 px-4">
				<div class="max-w-7xl mx-auto">
					<h2 class="font-heading text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
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
							<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
							<polyline points="9 22 9 12 15 12 15 22" />
						</svg>
						Featured Servers
					</h2>
					<p class="text-muted-foreground text-lg mb-8 font-medium">
						Thriving Discord communities - find your next home.
					</p>
					<div class="flex flex-wrap justify-center gap-4">
						{#each topServersData.slice(0, 6) as server}
							<ServerCard {server} edit={false} />
						{/each}
					</div>
					<div class="text-center mt-10">
						<a
							href="/servers"
							class="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-green-600 text-white font-bold text-base hover:bg-green-700 transition-colors"
						>
							Browse All Servers
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
								<path d="m9 18 6-6-6-6" />
							</svg>
						</a>
					</div>
				</div>
			</section>
		{/if}

		<!-- Section: Featured Emojis (Top Downloaded) -->
		{#if topEmojis && topEmojis.length > 0}
			<section class="pt-16 px-4">
				<div class="max-w-7xl mx-auto">
					<div class="flex items-center justify-between mb-2">
						<h2 class="font-heading text-3xl md:text-4xl font-bold flex items-center gap-3">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-8 h-8 text-purple-500"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<circle cx="12" cy="12" r="10" />
								<path d="M8 14s1.5 2 4 2 4-2 4-2" />
								<line x1="9" y1="9" x2="9.01" y2="9" />
								<line x1="15" y1="9" x2="15.01" y2="9" />
							</svg>
							Popular Emojis
						</h2>
					</div>
					<p class="text-muted-foreground text-lg mb-8 font-medium">
						The most-downloaded custom Discord emojis on the listing.
					</p>
					<div
						class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3"
					>
						{#each topEmojis as emoji (emoji.id)}
							<EmojiCard {emoji} />
						{/each}
					</div>
					<div class="text-center mt-10">
						<a
							href="/emojis?sort=popular"
							class="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-purple-600 text-white font-bold text-base hover:bg-purple-700 transition-colors"
						>
							Browse All Emojis
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
								<path d="m9 18 6-6-6-6" />
							</svg>
						</a>
					</div>
				</div>
			</section>
		{/if}

		<!-- Section: Newest Emojis -->
		{#if newestEmojis && newestEmojis.length > 0}
			<section class="pt-16 px-4">
				<div class="max-w-7xl mx-auto">
					<h2 class="font-heading text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-8 h-8 text-purple-400"
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
							<path d="M5 3v4" />
							<path d="M19 17v4" />
							<path d="M3 5h4" />
							<path d="M17 19h4" />
						</svg>
						New Emojis
					</h2>
					<p class="text-muted-foreground text-lg mb-8 font-medium">
						Freshly synced custom emojis - be the first to download them.
					</p>
					<div
						class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3"
					>
						{#each newestEmojis as emoji (emoji.id)}
							<EmojiCard {emoji} />
						{/each}
					</div>
					<div class="text-center mt-10">
						<a
							href="/emojis?sort=newest"
							class="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-base hover:bg-purple-500/20 transition-colors"
						>
							See All New Emojis
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
								<path d="m9 18 6-6-6-6" />
							</svg>
						</a>
					</div>
				</div>
			</section>
		{/if}

		<!-- Section: Top Stickers -->
		{#if topStickers && topStickers.length > 0}
			<section class="pt-16 px-4">
				<div class="max-w-7xl mx-auto">
					<div class="flex items-center justify-between mb-2">
						<h2 class="font-heading text-3xl md:text-4xl font-bold flex items-center gap-3">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-8 h-8 text-amber-400"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path
									d="M15.5 2H8.6c-.4 0-.8.2-1.1.5-.3.3-.5.7-.5 1.1v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8c.4 0 .8-.2 1.1-.5.3-.3.5-.7.5-1.1V6.5L15.5 2z"
								/>
								<path d="M3 7.6v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5H15" />
								<path d="M15 2v5h5" />
							</svg>
							Top Stickers
						</h2>
					</div>
					<p class="text-muted-foreground text-lg mb-8 font-medium">
						The most downloaded custom Discord stickers from the community.
					</p>
					<div
						class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3"
					>
						{#each topStickers as sticker (sticker.id)}
							<StickerCard {sticker} />
						{/each}
					</div>
					<div class="text-center mt-10">
						<a
							href="/stickers?sort=popular"
							class="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-base hover:bg-amber-500/20 transition-colors"
						>
							See All Top Stickers
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
								<path d="m9 18 6-6-6-6" />
							</svg>
						</a>
					</div>
				</div>
			</section>
		{/if}

		<!-- Section: Newest Stickers -->
		{#if newestStickers && newestStickers.length > 0}
			<section class="pt-16 px-4">
				<div class="max-w-7xl mx-auto">
					<h2 class="font-heading text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-8 h-8 text-teal-400"
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
							<path d="M5 3v4" />
							<path d="M19 17v4" />
							<path d="M3 5h4" />
							<path d="M17 19h4" />
						</svg>
						New Stickers
					</h2>
					<p class="text-muted-foreground text-lg mb-8 font-medium">
						Freshly synced custom stickers - be the first to download them.
					</p>
					<div
						class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3"
					>
						{#each newestStickers as sticker (sticker.id)}
							<StickerCard {sticker} />
						{/each}
					</div>
					<div class="text-center mt-10">
						<a
							href="/stickers?sort=newest"
							class="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-teal-500/30 bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold text-base hover:bg-teal-500/20 transition-colors"
						>
							See All New Stickers
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
								<path d="m9 18 6-6-6-6" />
							</svg>
						</a>
					</div>
				</div>
			</section>
		{/if}

		<!-- Section: Quick links grid -->
		<section class="pt-20 px-4">
			<div class="max-w-5xl mx-auto">
				<h2 class="font-heading text-3xl md:text-4xl font-bold mb-2 text-center">
					Everything Discord, in one place
				</h2>
				<p class="text-muted-foreground text-lg mb-12 font-medium text-center">
					Browse by what you're looking for.
				</p>
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
					<!-- Bots -->
					<a
						href="/bots"
						class="group flex flex-col gap-3 p-6 rounded-2xl border border-border bg-card hover:border-primary/60 hover:-translate-y-1 transition-all duration-200 shadow-sm hover:shadow-md"
					>
						<div
							class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-6 h-6"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<rect width="18" height="11" x="3" y="8" rx="2" />
								<path d="M8 8V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3" />
								<circle cx="12" cy="13" r="1" fill="currentColor" />
							</svg>
						</div>
						<h3 class="font-heading text-xl font-bold">Bots</h3>
						<p class="text-muted-foreground text-sm leading-relaxed">
							Find powerful bots to moderate, entertain, and supercharge your server.
						</p>
						<span class="text-primary text-sm font-semibold group-hover:underline"
							>Browse bots →</span
						>
					</a>

					<!-- Top Bots -->
					<a
						href="/top"
						class="group flex flex-col gap-3 p-6 rounded-2xl border border-border bg-card hover:border-primary/60 hover:-translate-y-1 transition-all duration-200 shadow-sm hover:shadow-md"
					>
						<div
							class="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500/20 transition-colors"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-6 h-6"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path
									d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"
								/><path d="M4 22h16" /><path
									d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"
								/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path
									d="M18 2H6v7a6 6 0 0 0 12 0V2Z"
								/>
							</svg>
						</div>
						<h3 class="font-heading text-xl font-bold">Top Bots</h3>
						<p class="text-muted-foreground text-sm leading-relaxed">
							The most popular bots ranked by community votes - only the best make it here.
						</p>
						<span class="text-amber-500 text-sm font-semibold group-hover:underline"
							>See rankings →</span
						>
					</a>

					<!-- Categories -->
					<a
						href="/categories"
						class="group flex flex-col gap-3 p-6 rounded-2xl border border-border bg-card hover:border-primary/60 hover:-translate-y-1 transition-all duration-200 shadow-sm hover:shadow-md"
					>
						<div
							class="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500/20 transition-colors"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-6 h-6"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<rect width="7" height="7" x="3" y="3" rx="1" /><rect
									width="7"
									height="7"
									x="14"
									y="3"
									rx="1"
								/><rect width="7" height="7" x="14" y="14" rx="1" /><rect
									width="7"
									height="7"
									x="3"
									y="14"
									rx="1"
								/>
							</svg>
						</div>
						<h3 class="font-heading text-xl font-bold">Categories</h3>
						<p class="text-muted-foreground text-sm leading-relaxed">
							Browse bots by category - music, moderation, games, utility, and more.
						</p>
						<span class="text-blue-500 text-sm font-semibold group-hover:underline"
							>Explore categories →</span
						>
					</a>

					<!-- New Bots -->
					<a
						href="/bots?new"
						class="group flex flex-col gap-3 p-6 rounded-2xl border border-border bg-card hover:border-primary/60 hover:-translate-y-1 transition-all duration-200 shadow-sm hover:shadow-md"
					>
						<div
							class="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 group-hover:bg-green-500/20 transition-colors"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-6 h-6"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path
									d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"
								/>
							</svg>
						</div>
						<h3 class="font-heading text-xl font-bold">New Arrivals</h3>
						<p class="text-muted-foreground text-sm leading-relaxed">
							Fresh bots just added - be among the first to discover them.
						</p>
						<span class="text-green-500 text-sm font-semibold group-hover:underline"
							>See what's new →</span
						>
					</a>

					<!-- Trending -->
					<a
						href="/bots?trending"
						class="group flex flex-col gap-3 p-6 rounded-2xl border border-border bg-card hover:border-primary/60 hover:-translate-y-1 transition-all duration-200 shadow-sm hover:shadow-md"
					>
						<div
							class="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 group-hover:bg-red-500/20 transition-colors"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-6 h-6"
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
						</div>
						<h3 class="font-heading text-xl font-bold">Trending</h3>
						<p class="text-muted-foreground text-sm leading-relaxed">
							The hottest bots right now. See what everyone's adding to their servers.
						</p>
						<span class="text-red-500 text-sm font-semibold group-hover:underline"
							>See trending →</span
						>
					</a>

					<!-- Servers -->
					<a
						href="/servers"
						class="group flex flex-col gap-3 p-6 rounded-2xl border border-border bg-card hover:border-green-500/60 hover:-translate-y-1 transition-all duration-200 shadow-sm hover:shadow-md"
					>
						<div
							class="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 group-hover:bg-green-500/20 transition-colors"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-6 h-6"
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
						</div>
						<h3 class="font-heading text-xl font-bold">Servers</h3>
						<p class="text-muted-foreground text-sm leading-relaxed">
							Discover vibrant communities to join - gaming, art, coding, music and more.
						</p>
						<span class="text-green-500 text-sm font-semibold group-hover:underline"
							>Find communities →</span
						>
					</a>

					<!-- Add your bot -->
					<a
						href="/dashboard"
						class="group flex flex-col gap-3 p-6 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10 hover:-translate-y-1 transition-all duration-200"
					>
						<div
							class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-6 h-6"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<circle cx="12" cy="12" r="10" />
								<path d="M12 8v8" />
								<path d="M8 12h8" />
							</svg>
						</div>
						<h3 class="font-heading text-xl font-bold">Add Your Bot</h3>
						<p class="text-muted-foreground text-sm leading-relaxed">
							Built something amazing? List your bot and reach thousands of Discord communities.
						</p>
						<span class="text-primary text-sm font-semibold group-hover:underline"
							>Get listed →</span
						>
					</a>

					<!-- List your server -->
					<a
						href="/servers"
						class="group flex flex-col gap-3 p-6 rounded-2xl border-2 border-dashed border-green-500/40 bg-green-500/5 hover:border-green-500 hover:bg-green-500/10 hover:-translate-y-1 transition-all duration-200"
					>
						<div
							class="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 group-hover:bg-green-500/20 transition-colors"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-6 h-6"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<circle cx="12" cy="12" r="10" />
								<path d="M12 8v8" />
								<path d="M8 12h8" />
							</svg>
						</div>
						<h3 class="font-heading text-xl font-bold">List Your Server</h3>
						<p class="text-muted-foreground text-sm leading-relaxed">
							Add our bot, run <code class="bg-muted px-1 rounded text-xs font-mono">/register</code
							> and your server goes live instantly.
						</p>
						<span class="text-green-500 text-sm font-semibold group-hover:underline"
							>Get listed →</span
						>
					</a>
				</div>
			</div>
		</section>
	</div>
</div>

<style>
	/* ── Background stage ──────────────────────────────────────────────────── */

	/*
		.bg-stage  - covers the full viewport plus generous bleed on all sides so
		             the tilt never exposes bare background. Pointer events off.
		.bg-tilt   - applies the 3-D perspective tilt to every row at once.
		             scale(1.15) compensates for the rotation shrinking the visible area.
		.bg-row    - one horizontally-scrolling strip of cards.
	*/

	.bg-stage {
		position: absolute;
		inset: 0;
		pointer-events: none;
		user-select: none;
		z-index: 0;
		overflow: hidden;
		/* Perspective on the stage promotes the tilt to a true 3-D compositing layer,
		   which forces the browser to antialias the skew at subpixel precision */
		perspective: 1px;
		-webkit-perspective: 1px;
	}

	.bg-tilt {
		/* GPU layer for the whole tilted stage - smooths skew antialiasing */
		transform-style: preserve-3d;
		-webkit-transform-style: preserve-3d;
		image-rendering: auto;
		/* Subpixel hint */
		-webkit-font-smoothing: subpixel-antialiased;
		/*
		 * Isometric-style tilt using skew - no perspective depth tricks,
		 * so rows stay exactly where they are vertically.
		 *
		 * We place the box so it fills the viewport with generous bleed,
		 * then apply skewX + skewY to create the diagonal 3-D deck look.
		 * scaleY(0.6) squashes the rows to give the "receding into distance"
		 * feel. scaleX(1.6) widens to compensate for horizontal squeeze.
		 */
		position: absolute;
		/* Bleed past all edges */
		top: -100%;
		left: -40%;
		right: -40%;
		bottom: -20%;
		transform: skewX(34deg) skewY(-12deg) scaleY(0.9) scaleX(1.2) translateZ(0);
		transform-origin: 50% 50%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 28px;
	}

	.bg-row {
		display: flex;
		flex-shrink: 0;
		gap: 20px;
		/* Each row on its own compositing layer for smooth scroll animation */
		transform: translateZ(0);
		-webkit-transform: translateZ(0);
		will-change: transform;
	}

	/* ── Row scroll animations ─────────────────────────────────────────────── */
	/*
	 * Each row contains 3× the card set. We animate from 0 → -33.333% so that
	 * when we've scrolled exactly one full set width the transform resets to 0
	 * and the loop is invisible.
	 */
	@keyframes scroll-left {
		0% {
			transform: translateX(0);
		}
		100% {
			transform: translateX(-33.333%);
		}
	}

	@keyframes scroll-right {
		0% {
			transform: translateX(-33.333%);
		}
		100% {
			transform: translateX(0);
		}
	}

	.row-scroll-left {
		animation: scroll-left linear infinite;
		will-change: transform;
	}

	.row-scroll-right {
		animation: scroll-right linear infinite;
		will-change: transform;
	}

	/* ── Letter fall animations ────────────────────────────────────────────── */
	@keyframes fall-out {
		0% {
			transform: translateY(0);
			opacity: 1;
		}
		100% {
			transform: translateY(1.4em);
			opacity: 0;
		}
	}

	@keyframes fall-in {
		0% {
			transform: translateY(-1.4em);
			opacity: 0;
		}
		100% {
			transform: translateY(0);
			opacity: 1;
		}
	}

	.letter-char {
		transition: none;
		display: inline-block;
		will-change: transform, opacity;
	}

	.letter-char.falling-out {
		animation: fall-out 300ms cubic-bezier(0.4, 0, 1, 1) both;
		animation-delay: var(--delay);
	}

	.letter-char.falling-in {
		animation: fall-in 300ms cubic-bezier(0, 0, 0.2, 1) both;
		animation-delay: var(--delay);
	}
</style>
