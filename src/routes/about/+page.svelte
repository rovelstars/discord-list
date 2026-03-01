<script lang="ts">
	import SEO from "$lib/components/SEO.svelte";

	const stats = [
		{ label: "Bots Listed", value: "500+" },
		{ label: "Discord Servers", value: "10+" },
		{ label: "Discord Users", value: "5k+" },
		{ label: "Years Running", value: "4+" }
	];

	const values = [
		{
			icon: "shield",
			title: "Trustworthy",
			description:
				"Every bot on our list is reviewed before being approved. We take quality seriously so your community stays safe."
		},
		{
			icon: "zap",
			title: "Fast & Open",
			description:
				"No paywalls, no locked listings. Finding the right bot for your server should be effortless and free."
		},
		{
			icon: "users",
			title: "Community First",
			description:
				"Built by Discord enthusiasts, for Discord enthusiasts. Your feedback shapes what we build next."
		},
		{
			icon: "code",
			title: "Developer Friendly",
			description:
				"Webhook vote notifications, a clean REST API, and a simple bot submission flow — we make it easy to grow."
		}
	];

	const team = [
		{
			name: "Ren Hiyama",
			role: "Founder & Lead Developer",
			avatar: "https://github.com/renhiyama.png",
			github: "https://github.com/renhiyama"
		}
	];
</script>

<SEO
	title="About Us"
	description="Learn about Rovel Discord List — who we are, what we stand for, and why we built the best place to discover Discord bots."
	imageSmall="/assets/img/bot/logo-512.png"
/>

<!-- ── Hero ──────────────────────────────────────────────────────────────── -->
<section class="relative overflow-hidden border-b border-border bg-card pt-32 -mt-28">
	<div
		class="pointer-events-none absolute -top-32 -left-32 w-lg h-128 rounded-full bg-primary/10 blur-3xl"
	></div>
	<div
		class="pointer-events-none absolute -bottom-20 right-0 w-96 h-96 rounded-full bg-primary/5 blur-2xl"
	></div>

	<div class="relative max-w-4xl mx-auto px-4 py-20 text-center">
		<div
			class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20 mb-6"
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
			>
				<path
					d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
				/>
			</svg>
			About Rovel Discord List
		</div>
		<h1 class="text-4xl md:text-5xl font-extrabold font-heading leading-tight mb-5">
			The best place to discover<br />
			<span class="text-primary">Discord bots</span>
		</h1>
		<p class="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
			Rovel Discord List started as a passion project in 2020 and has grown into one of the most
			trusted bot directories on the internet. We connect bot developers with millions of Discord
			users every month.
		</p>
	</div>
</section>

<!-- ── Stats strip ───────────────────────────────────────────────────────── -->
<section class="border-b border-border bg-background">
	<div class="max-w-4xl mx-auto px-4 py-10">
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
			{#each stats as stat}
				<div
					class="bg-card border border-border rounded-2xl px-6 py-5 text-center hover:border-primary/30 transition-colors"
				>
					<p class="text-3xl font-extrabold text-primary">{stat.value}</p>
					<p class="text-sm text-muted-foreground mt-1 font-medium">{stat.label}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ── Mission ───────────────────────────────────────────────────────────── -->
<section class="max-w-4xl mx-auto px-4 py-16">
	<div class="grid md:grid-cols-2 gap-10 items-center">
		<div>
			<p class="text-xs font-bold uppercase tracking-widest text-primary mb-3">Our Mission</p>
			<h2 class="text-3xl font-extrabold font-heading leading-tight mb-4">
				Making Discord better,<br />one bot at a time
			</h2>
			<p class="text-muted-foreground leading-relaxed mb-4">
				Discord has transformed how communities connect online. Bots are the backbone of those
				communities — automating moderation, adding games, playing music, and so much more. But
				finding the <em>right</em> bot has always been harder than it should be.
			</p>
			<p class="text-muted-foreground leading-relaxed">
				That's why we built Rovel Discord List. A clean, fast, and genuinely useful directory where
				server owners can discover vetted bots and bot developers can reach a real audience.
			</p>
		</div>

		<!-- Decorative card -->
		<div class="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
			<div class="flex items-center gap-3">
				<img src="/assets/img/bot/logo-512.png" alt="RDL logo" class="w-12 h-12 rounded-xl" />
				<div>
					<p class="font-bold text-base">Rovel Discord List</p>
					<p class="text-xs text-muted-foreground">Trusted since 2020</p>
				</div>
			</div>
			<div class="space-y-2 text-sm">
				{#each ["Bot discovery, simplified", "Vetted & reviewed listings", "Free for developers & users", "Vote rewards for your community"] as item}
					<div class="flex items-center gap-2 text-muted-foreground">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-4 h-4 text-primary shrink-0"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<polyline points="20 6 9 17 4 12" />
						</svg>
						{item}
					</div>
				{/each}
			</div>
		</div>
	</div>
</section>

<!-- ── Values ────────────────────────────────────────────────────────────── -->
<section class="border-t border-border bg-card">
	<div class="max-w-4xl mx-auto px-4 py-16">
		<div class="text-center mb-10">
			<p class="text-xs font-bold uppercase tracking-widest text-primary mb-3">What we stand for</p>
			<h2 class="text-3xl font-extrabold font-heading">Our values</h2>
		</div>
		<div class="grid sm:grid-cols-2 gap-5">
			{#each values as v}
				<div
					class="bg-background border border-border rounded-2xl p-6 hover:border-primary/30 transition-colors group"
				>
					<div
						class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors"
					>
						{#if v.icon === "shield"}
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
								<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
							</svg>
						{:else if v.icon === "zap"}
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
								<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
							</svg>
						{:else if v.icon === "users"}
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
								<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle
									cx="9"
									cy="7"
									r="4"
								/><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
							</svg>
						{:else if v.icon === "code"}
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
								<polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
							</svg>
						{/if}
					</div>
					<h3 class="font-bold text-base mb-1.5">{v.title}</h3>
					<p class="text-sm text-muted-foreground leading-relaxed">{v.description}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ── Team ──────────────────────────────────────────────────────────────── -->
<section class="max-w-4xl mx-auto px-4 py-16">
	<div class="text-center mb-10">
		<p class="text-xs font-bold uppercase tracking-widest text-primary mb-3">
			The people behind it
		</p>
		<h2 class="text-3xl font-extrabold font-heading">Meet the team</h2>
	</div>
	<div class="flex flex-wrap justify-center gap-5">
		{#each team as member}
			<a
				href={member.github}
				target="_blank"
				rel="noopener noreferrer"
				class="bg-card border border-border rounded-2xl p-6 flex flex-col items-center gap-3 w-52 hover:border-primary/40 hover:-translate-y-1 transition-all shadow-sm group"
			>
				<img
					src={member.avatar}
					alt="{member.name}'s avatar"
					class="w-16 h-16 rounded-full border-2 border-border object-cover shadow group-hover:border-primary/40 transition-colors"
				/>
				<div class="text-center">
					<p class="font-bold text-sm">{member.name}</p>
					<p class="text-xs text-muted-foreground mt-0.5">{member.role}</p>
				</div>
				<div class="flex items-center gap-1 text-xs text-primary font-medium">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-3.5 h-3.5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path
							d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"
						/>
					</svg>
					GitHub
				</div>
			</a>
		{/each}
	</div>
</section>

<!-- ── CTA ───────────────────────────────────────────────────────────────── -->
<section class="border-t border-border bg-card">
	<div class="max-w-3xl mx-auto px-4 py-16 text-center">
		<h2 class="text-3xl font-extrabold font-heading mb-4">Ready to list your bot?</h2>
		<p class="text-muted-foreground mb-8 leading-relaxed">
			Join hundreds of developers who've already listed their bots on Rovel Discord List and reach
			thousands of Discord server owners every day.
		</p>
		<div class="flex flex-wrap items-center justify-center gap-3">
			<a
				href="/login"
				class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 active:scale-95 transition-all shadow-sm shadow-primary/20"
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
					<path d="M12 5v14M5 12h14" />
				</svg>
				List Your Bot
			</a>
			<a
				href="/bots"
				class="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-input bg-background font-semibold hover:bg-accent transition-colors"
			>
				Browse Bots
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
