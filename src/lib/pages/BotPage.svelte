<script lang="ts">
	import { onMount, afterUpdate } from "svelte";
	import getAvatarURL from "$lib/get-avatar-url";
	import TwemojiText from "$lib/components/TwemojiText.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import Label from "$lib/components/ui/Label.svelte";
	import Link from "$lib/components/Link.svelte";

	// ColorThief is only used on the client; load inside onMount to avoid SSR issues.
	let ColorThief: any = null;

	export let bot: any = {
		id: "",
		username: "",
		discriminator: "0000",
		avatar: "0",
		bg: null,
		short: "",
		desc: "",
		servers: 0,
		votes: 0,
		invite: "",
		website: null,
		source_repo: null,
		support: null,
		owners: [],
		donate: null
	};

	// Local state
	let botBg: string | null = null;
	let gradientColor: number[] = [0, 0, 0];
	let bgColor: number[] = [0, 0, 0];

	let gradientImgEl: HTMLImageElement | null = null;
	let avatarImgEl: HTMLImageElement | null = null;

	// approximate-number replacement
	function approx(n: number | undefined) {
		if (n == null) return "";
		if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + "M";
		if (n >= 1_000) return (n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1) + "k";
		return String(n);
	}

	// normalize bg (old repo used cdn path for non-http values)
	$: botBg = (() => {
		if (!bot) return null;
		if (!bot.bg) return null;
		if (typeof bot.bg === "string" && !bot.bg.startsWith("http") && !bot.bg.startsWith("#")) {
			return `https://cdn.discordapp.com/banners/${bot.id}/${bot.bg}.webp?size=2048`;
		}
		return bot.bg;
	})();

	// background style string for header area
	$: headerStyle = (() => {
		if (!botBg) {
			// if we have a dominant color fallback, use rgb()
			if (bgColor && bgColor.length === 3) {
				return `background-color: rgb(${bgColor.join(",")});`;
			}
			return "";
		}
		if (typeof botBg === "string" && botBg.startsWith("#")) {
			return `background-color: ${botBg};`;
		}
		return `background-image: url('${botBg}'); background-size: cover; background-position: center;`;
	})();

	function setGradientCSS(colorArr: number[]) {
		try {
			if (!colorArr || colorArr.length < 3) return;
			// store as CSS var list "r, g, b"
			document.documentElement.style.setProperty("--gradient-color", `${colorArr.join(",")}`);
			// Use same for border if needed; keep separate var like old code
			document.documentElement.style.setProperty(
				"--gradient-border-color",
				`${colorArr.join(",")}`
			);
		} catch (e) {
			// ignore
		}
	}

	onMount(async () => {
		// dynamic import to avoid SSR issues; colorthief works in browser
		try {
			const mod = await import("colorthief");
			ColorThief = (mod as any).default || mod;
		} catch (e) {
			ColorThief = null;
		}

		// set up avatar color extraction
		if (avatarImgEl && ColorThief) {
			try {
				if ((avatarImgEl as any).complete) {
					const c = ColorThief.getColor(avatarImgEl);
					if (c && Array.isArray(c)) {
						bgColor = c;
					}
				} else {
					avatarImgEl.onload = () => {
						try {
							const c = ColorThief.getColor(avatarImgEl);
							if (c && Array.isArray(c)) bgColor = c;
						} catch (err) {
							// ignore
						}
					};
				}
			} catch (err) {
				// ignore
			}
		}

		// gradient image extraction (prefer banner if available)
		if (gradientImgEl && ColorThief) {
			try {
				if ((gradientImgEl as any).complete) {
					const c = ColorThief.getColor(gradientImgEl);
					if (c && Array.isArray(c)) {
						gradientColor = c;
						setGradientCSS(c);
					}
				} else {
					gradientImgEl.onload = () => {
						try {
							const c = ColorThief.getColor(gradientImgEl);
							if (c && Array.isArray(c)) {
								gradientColor = c;
								setGradientCSS(c);
							}
						} catch (err) {
							// ignore
						}
					};
				}
			} catch (err) {
				// ignore
			}
		} else {
			// fallback: if no banner, but avatar color exists, use that
			if (bgColor && bgColor.length === 3) {
				gradientColor = bgColor;
				setGradientCSS(bgColor);
			}
		}
	});

	// when botBg or avatar changes, try to re-run color extraction (afterUpdate ensures DOM updated)
	afterUpdate(() => {
		if (gradientImgEl && (gradientImgEl as any).complete && ColorThief) {
			try {
				const c = ColorThief.getColor(gradientImgEl);
				if (c && Array.isArray(c)) {
					gradientColor = c;
					setGradientCSS(c);
				}
			} catch (e) {}
		}
		if (avatarImgEl && (avatarImgEl as any).complete && ColorThief) {
			try {
				const c = ColorThief.getColor(avatarImgEl);
				if (c && Array.isArray(c)) {
					bgColor = c;
				}
			} catch (e) {}
		}
	});

	// helper to render owner entry (owner may be id string or object)
	function ownerEntries(owners: any[]) {
		if (!owners) return [];
		return owners.map((o) => {
			if (typeof o === "string") {
				return { id: o, username: "Unknown", discriminator: "0000", avatar: "1" };
			}
			return o;
		});
	}
</script>

<section class="col-span-3 w-full mx-auto bg-card min-h-screen rounded-lg shadow-black/90">
	<!-- Header/banner -->
	<div class="flex flex-col items-center md:rounded-t-lg h-72" style={headerStyle}>
		{#if botBg && typeof botBg === "string" && !botBg.startsWith("#")}
			<!-- Hidden img used only to allow ColorThief to read pixels (CORS required) -->
			<img
				src={botBg}
				loading="lazy"
				bind:this={gradientImgEl}
				width="1280"
				height="720"
				class="w-auto h-auto opacity-0 -z-10 no-fade"
				alt="bot background"
				crossorigin="anonymous"
			/>
		{/if}
	</div>

	<div
		class="grid grid-cols-1 md:grid-cols-4 md:gap-4 p-4 bg-linear-to-b via-transparent to-transparent"
		style="--tw-gradient-from: rgba(var(--gradient-color), 0.1); --tw-gradient-to: rgba(var(--gradient-color), 0.01); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to);"
	>
		<!-- main column -->
		<div
			class="flex flex-col col-span-3 border-popover px-4 pb-8 border-b-2 md:border-b-0 md:border-r-2 h-full"
			style="border-color: rgb(var(--gradient-border-color));"
		>
			<!-- Avatar -->
			<img
				src={getAvatarURL(bot.id, bot.avatar)}
				loading="lazy"
				bind:this={avatarImgEl}
				crossOrigin="anonymous"
				class="w-36 h-36 rounded-full bg-card border-card border-8 mt-[-5.3rem] mb-4 mx-auto md:mx-0"
				alt={`${bot.username}'s Avatar`}
			/>

			<!-- Title -->
			<h1 class="text-3xl md:text-5xl font-heading text-center md:text-start my-4 font-black">
				{bot.username}
				<span class="text-muted text-lg mx-2 font-bold">#{bot.discriminator}</span>
			</h1>

			<!-- Short description -->
			<div class="border-b-2 pb-4" style="border-color: rgb(var(--gradient-border-color));">
				<div class="text-2xl text-primary text-center md:text-left">
					<TwemojiText>
						{@html bot.short || ""}
					</TwemojiText>
				</div>
			</div>

			<!-- Long description (supports HTML/markdown-rendered content) -->
			<div
				class="mt-8 min-w-full prose md:prose-xl dark:prose-invert prose-code:before:content-[''] prose-code:after:content-[''] prose-code:bg-popover prose-code:px-2 prose-code:py-1 prose-code:rounded-md"
			>
				<TwemojiText>
					{@html bot.desc || ""}
				</TwemojiText>
			</div>
		</div>

		<!-- side column -->
		<div class="mt-6 md:mt-0 flex flex-col col-span-1 w-full">
			<div class="px-4 mx-auto md:mx-0">
				<Label
					class="flex text-muted my-1 text-md"
					style={`color: rgb(var(--gradient-border-color));`}
				>
					<span class="inline-flex items-center mr-2">
						<!-- compass icon simple -->
						<svg class="w-5 h-5 mr-1 mt-0.5 text-primary/70" viewBox="0 0 24 24" fill="none"
							><path
								d="M12 2L15 8l6 .5-4.5 3.2L18 20l-6-4-6 4 1.5-8.3L3 8.5 9 8 12 2z"
								fill="currentColor"
							/></svg
						>
					</span>
					<span>in <span class="font-semibold">{approx(bot.servers)}</span> servers</span>
				</Label>

				<Label
					class="flex text-muted my-1 text-md"
					style={`color: rgb(var(--gradient-border-color));`}
				>
					<span class="inline-flex items-center mr-2">
						<svg class="w-5 h-5 mr-1 mt-0.5 text-green-600/70" viewBox="0 0 24 24" fill="none"
							><path
								d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.402 8.168L12 18.896 4.664 23.165l1.402-8.168L0.132 9.21l8.2-1.192z"
								fill="currentColor"
							/></svg
						>
					</span>
					<span>with <span class="font-semibold">{approx(bot.votes)}</span> votes</span>
				</Label>

				<Label
					class="flex text-muted my-1 text-md"
					style={`color: rgb(var(--gradient-border-color));`}
				>
					<span class="inline-flex items-center mr-2">
						<svg class="w-5 h-5 mr-1 mt-0.5 text-secondary/70" viewBox="0 0 24 24" fill="none"
							><path
								d="M2 12h20"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
							/></svg
						>
					</span>
					{#if bot.prefix == "/" || !bot.prefix}
						<span>Slash Bot</span>
					{:else}
						<span
							>Prefix is <span
								class="font-semibold text-muted-foreground bg-popover py-0.5 px-2 rounded-md border border-muted-foreground/20"
								>{bot.prefix}</span
							></span
						>
					{/if}
				</Label>

				{#if bot.lib}
					<Label
						class="flex text-muted my-1 text-md"
						style={`color: rgb(var(--gradient-border-color));`}
					>
						<span class="inline-flex items-center mr-2">
							<svg class="w-5 h-5 mr-1 mt-0.5 text-destructive/70" viewBox="0 0 24 24" fill="none"
								><path
									d="M12 2l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-7z"
									fill="currentColor"
								/></svg
							>
						</span>
						<span>Made with <span class="font-semibold">{bot.lib}</span></span>
					</Label>
				{/if}
			</div>

			<!-- Invite / Vote / Links -->
			<div class="px-4 mt-4 flex flex-col gap-2 items-center">
				<div class="w-full flex flex-col md:flex-row md:items-center md:gap-2">
					<a href={bot.invite || "#"} class="w-full md:w-auto">
						<Button variant="default" className="w-full md:w-auto">
							<svg class="w-4 h-4 mr-2" viewBox="0 0 24 24"
								><path
									d="M5 12h14M12 5v14"
									stroke="currentColor"
									stroke-width="1.5"
									stroke-linecap="round"
									stroke-linejoin="round"
								/></svg
							>
							Invite
						</Button>
					</a>

					<a href={`/bots/${bot.id}/vote`} class="w-full md:w-auto mt-2 md:mt-0">
						<Button variant="outline" className="w-full md:w-auto">
							<svg class="w-4 h-4 mr-2" viewBox="0 0 24 24"
								><path
									d="M12 5v14M5 12h14"
									stroke="currentColor"
									stroke-width="1.5"
									stroke-linecap="round"
									stroke-linejoin="round"
								/></svg
							>
							Vote
						</Button>
					</a>
				</div>

				<div
					class="border-b-2 my-6 w-12"
					style={`border-color: rgb(var(--gradient-border-color));`}
				></div>

				<p
					class="inline-flex text-muted text-md font-semibold mb-2 cursor-default"
					style={`color: rgb(var(--gradient-border-color));`}
				>
					<svg class="w-5 h-5 mr-1 mt-0.5" viewBox="0 0 24 24"
						><path
							d="M10 3h4v4h-4zM3 10h4v4H3zM17 10h4v4h-4zM10 17h4v4h-4z"
							fill="currentColor"
						/></svg
					>
					Links
				</p>

				<div class="flex flex-col mx-auto md:mx-0 w-full">
					{#if bot.website}
						<Button
							variant="link"
							size="sm"
							class="w-full md:w-auto mt-1"
							as="a"
							href={bot.website}
						>
							<svg class="w-4 h-4 mr-2" viewBox="0 0 24 24"
								><path d="M12 2a10 10 0 100 20 10 10 0 000-20z" fill="currentColor" /></svg
							>
							Website
						</Button>
					{/if}

					{#if bot.source_repo}
						<Button
							variant="link"
							size="sm"
							class="w-full md:w-auto mt-1"
							as="a"
							href={bot.source_repo}
						>
							<svg class="w-4 h-4 mr-2" viewBox="0 0 24 24"
								><path d="M12 2a10 10 0 100 20 10 10 0 000-20z" fill="currentColor" /></svg
							>
							GitHub
						</Button>
					{/if}

					{#if bot.support}
						<Button
							variant="link"
							size="sm"
							class="w-full md:w-auto mt-1"
							as="a"
							href={bot.support}
						>
							<svg class="w-4 h-4 mr-2" viewBox="0 0 24 24"
								><path d="M12 2a10 10 0 100 20 10 10 0 000-20z" fill="currentColor" /></svg
							>
							Support Server
						</Button>
					{/if}

					{#if bot.donate}
						<Button variant="link" size="sm" class="w-full md:w-auto mt-1" as="a" href={bot.donate}>
							<svg class="w-4 h-4 mr-2" viewBox="0 0 24 24"
								><path
									d="M12 21s-8-6.5-8-11.5A5.5 5.5 0 0112 4a5.5 5.5 0 018 5.5C20 14.5 12 21 12 21z"
									fill="currentColor"
								/></svg
							>
							Donate
						</Button>
					{/if}

					{#if !bot.website && !bot.source_repo && !bot.support && !bot.donate}
						<p class="text-muted text-md font-semibold mb-2">No links available</p>
					{/if}
				</div>
			</div>

			<div
				class="border-b-2 my-8 w-12"
				style={`border-color: rgb(var(--gradient-border-color));`}
			></div>

			<p
				class="owners inline-flex text-muted text-md font-semibold mb-2 cursor-default"
				style={`color: rgb(var(--gradient-border-color));`}
			>
				<svg class="w-5 h-5 mr-1 mt-0.5" viewBox="0 0 24 24"
					><path
						d="M12 2a5 5 0 100 10 5 5 0 000-10zM2 20a10 10 0 0120 0"
						fill="currentColor"
					/></svg
				>
				Owners
			</p>

			<div class="flex flex-col gap-2 px-4">
				{#each ownerEntries(bot.owners) as owner (owner.id)}
					<Button
						variant="ghost"
						class="w-full md:w-auto ml-auto bg-background rounded-full px-4 py-2 text-black dark:text-white hover:bg-slate-100 dark:hover:bg-popover font-semibold"
						as="a"
						href={`/users/${owner.id}`}
					>
						<span class="inline-flex items-center">
							<img
								loading="lazy"
								src={getAvatarURL(owner.id, owner.avatar)}
								on:error={(e) => {
									(e.currentTarget as HTMLImageElement).src =
										"https://cdn.discordapp.com/embed/avatars/0.png";
								}}
								class="w-10 h-10 mr-3 rounded-full"
								alt={`${owner.username}'s Avatar`}
								crossorigin="anonymous"
							/>
							<span>{owner.username}</span>
						</span>
					</Button>
				{/each}
			</div>
		</div>
	</div>
</section>

<style>
	/* Minimal fallbacks to keep the page usable before Tailwind runs */
	.bg-card {
		background-color: hsl(var(--card));
	}
	.text-muted {
		color: hsl(var(--muted));
	}
	.text-muted-foreground {
		color: hsl(var(--muted-foreground));
	}
	.bg-popover {
		background-color: hsl(var(--popover));
	}
	.border-popover {
		border-color: hsl(var(--popover));
	}
</style>
