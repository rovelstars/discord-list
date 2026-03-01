<script lang="ts">
	import { onMount } from "svelte";
	import getAvatarURL from "$lib/get-avatar-url";
	import approx from "$lib/approx-num";
	import Tag from "$lib/components/ui/Tag.svelte";
	import TwemojiText from "$lib/components/TwemojiText.svelte";
	import { buttonVariants } from "$lib/components/ui/button.js";

	export let bot: any;
	export let edit: boolean = false;

	let hovered = false;
	let imageRef: HTMLImageElement | null = null;
	let bgColor: number[] | null = null;

	// Overrides bot.bg after a successful refresh — keeps the card in sync
	// without requiring a full page reload or parent re-render.
	let bgOverride: string | null = null;

	// Normalize background URL (mirrors old repo logic)
	$: bgUrl = (() => {
		const raw = bgOverride ?? bot?.bg;
		if (!raw) return null;
		if (typeof raw === "string" && !raw.startsWith("http")) {
			return `https://cdn.discordapp.com/banners/${bot.id}/${raw}.webp?size=512`;
		}
		return raw as string;
	})();

	$: bgStyle = bgUrl
		? `background-image: url('${bgUrl}'); background-size: cover; background-position: center;`
		: bgColor
			? `background-color: rgb(${bgColor[0]},${bgColor[1]},${bgColor[2]}); background-size: cover; background-position: center;`
			: "";

	$: isAnimated = bot?.avatar?.startsWith("a_") ?? false;

	$: avatarSrc = (() => {
		if (!bot) return "/assets/img/bot/logo-144.png";
		if (bot.avatar === "0") return getAvatarURL(bot.id, bot.avatar);
		const base = getAvatarURL(bot.id, bot.avatar ?? "0", 96).replace(".png", ".webp");
		if (isAnimated) {
			// Always get the webp URL, then swap extension based on hover state
			const webp = base.replace(".gif", ".webp");
			return hovered ? webp.replace(".webp", ".gif") : webp;
		}
		return base;
	})();

	$: statusClass = (() => {
		if (bot?.status === "online") return "bg-green-500";
		if (bot?.status === "offline") return "bg-gray-500";
		if (bot?.status === "idle") return "bg-yellow-400";
		if (bot?.status === "dnd") return "bg-red-500";
		return "bg-green-500"; // default/unknown → show online
	})();

	onMount(async () => {
		try {
			const { default: ColorThief } = await import("colorthief");
			const CT = ColorThief as unknown as new () => {
				getColor: (img: HTMLImageElement) => number[];
			};
			const colorThief = new CT();

			function trySetColor() {
				try {
					if (imageRef) {
						const c = colorThief.getColor(imageRef);
						if (Array.isArray(c)) bgColor = c;
					}
				} catch {
					bgColor = null;
				}
			}

			if (imageRef) {
				if (imageRef.complete) trySetColor();
				else imageRef.onload = () => trySetColor();
			}
		} catch {
			// noop — ColorThief unavailable or image not ready
		}
	});

	// Guard: only dispatch one refresh per card instance to avoid flooding the
	// endpoint when both the avatar and bg images fail at the same time.
	let refreshDispatched = false;

	async function handleImageError(event: Event) {
		if (refreshDispatched) return;

		const src = (event.target as HTMLImageElement)?.src ?? "";

		// Only trigger for Discord CDN images — unrelated external image 404s
		// should not cause a bot refresh.
		const isDiscordImage =
			src.startsWith("https://cdn.discordapp.com/") ||
			src.startsWith("https://media.discordapp.net/");

		if (!isDiscordImage) return;

		const id = bot?.id;
		if (!id) return;

		refreshDispatched = true;

		try {
			// POST to the public proxy — DISCORD_TOKEN stays server-side only.
			const res = await fetch(`/api/bots/${encodeURIComponent(id)}/refresh`, {
				method: "POST",
				headers: { "Content-Type": "application/json" }
			});
			if (res.ok) {
				const data = await res.json().catch(() => null);
				// If the server resolved a fresh bg URL, apply it immediately so
				// the card re-renders with the valid image rather than staying broken.
				if (data?.newBg) {
					bgOverride = data.newBg;
				}
			}
		} catch {
			// Network errors are non-fatal; best-effort only.
		}
	}
</script>

<div
	class="block bg-popover rounded-lg w-96 md:max-w-80 shadow-black/90 group hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 mb-4 border"
	style={bgStyle}
	role="presentation"
	on:mouseenter={() => (hovered = true)}
	on:mouseleave={() => (hovered = false)}
>
	<!-- Banner / header area -->
	<div class="h-32 w-full rounded-t-lg" style={bgStyle}></div>

	<!-- Avatar row -->
	<div class="relative">
		{#if bot?.IS_SKELETON}
			<div
				class="w-16 h-16 rounded-full absolute -top-8 left-4 border-4 border-card bg-muted animate-pulse shadow-black shadow-2xl"
			></div>
		{:else}
			<img
				bind:this={imageRef}
				src={avatarSrc}
				alt="avatar"
				crossorigin="anonymous"
				width="64"
				height="64"
				loading="lazy"
				on:error={handleImageError}
				class="z-10 w-16 h-16 rounded-full absolute -top-8 left-4 border-4 border-card bg-popover shadow-black shadow-2xl"
			/>
			<!-- Status indicator -->
			<span
				class="z-10 absolute left-16 -bottom-8 w-6 h-6 border-4 border-card rounded-full {statusClass}"
			></span>
		{/if}
	</div>

	<!-- Card body -->
	<div
		class="pb-2 bg-popover group-hover:bg-popover/90 backdrop-blur-md rounded-b-md transition-colors duration-300"
	>
		<div class="mx-4 pt-12">
			<!-- Bot name / discriminator -->
			{#if bot?.IS_SKELETON}
				<div class="w-32 my-1 h-6 bg-muted animate-pulse rounded"></div>
				<div class="flex items-center gap-1 mt-2">
					<div class="w-24 my-1 h-4 bg-muted animate-pulse rounded"></div>
					<div class="w-8 my-1 h-4 bg-primary/40 animate-pulse rounded"></div>
				</div>
			{:else}
				<div class="h-20 overflow-y-auto text-left">
					<h2 class="font-heading text-2xl font-semibold">{bot?.username ?? ""}</h2>
					<span class="relative bottom-1 text-xs text-gray-400">
						{bot?.username ?? ""}#{bot?.discriminator ?? "0000"}
					</span>
					<span
						class="relative bottom-1 ml-1 bg-primary text-white rounded-md px-1 text-xs font-heading"
					>
						APP
					</span>
				</div>
			{/if}

			<!-- Stats tags -->
			<div class="my-4 flex items-center">
				{#if bot?.IS_SKELETON}
					<div class="flex gap-2">
						<div class="flex">
							<div class="w-10 h-5 rounded-l-sm bg-muted animate-pulse"></div>
							<div class="w-8 h-5 rounded-r-sm bg-primary/40 animate-pulse"></div>
						</div>
						<div class="flex">
							<div class="w-12 h-5 rounded-l-sm bg-muted animate-pulse"></div>
							<div class="w-6 h-5 rounded-r-sm bg-green-600/40 animate-pulse"></div>
						</div>
					</div>
				{:else}
					<!-- Servers tag -->
					<Tag
						firstClass="bg-muted dark:bg-card text-white font-sans"
						secondClass="bg-primary text-white"
					>
						<span slot="first" class="flex items-center">
							<!-- Compass icon (lucide) -->
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-3 h-3 mr-1"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<circle cx="12" cy="12" r="10" />
								<polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
							</svg>
							In
						</span>
						<span slot="second">{approx(bot?.servers)}</span>
					</Tag>
					<!-- Votes tag -->
					<Tag firstClass="bg-muted dark:bg-card text-white" secondClass="bg-green-600 text-white">
						<span slot="first" class="flex items-center">
							<!-- Vote / ChevronUp icon (lucide) -->
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-4 h-4 mr-1"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path d="m18 15-6-6-6 6" />
							</svg>
							Votes
						</span>
						<span slot="second">{approx(bot?.votes)}</span>
					</Tag>
				{/if}
			</div>
		</div>

		<!-- Description + buttons inner card -->
		<div class="mx-2 bg-card pb-2 rounded-md">
			<!-- Short description -->
			<div class="mx-2 pt-4 text-sm h-20 leading-5 overflow-y-auto rounded-md font-light text-left">
				{#if bot?.IS_SKELETON}
					<div class="flex flex-col gap-1">
						<div class="flex gap-1">
							<div class="w-32 h-4 bg-muted animate-pulse rounded"></div>
							<div class="w-12 h-4 bg-muted animate-pulse rounded"></div>
						</div>
						<div class="flex gap-1">
							<div class="w-8 h-4 bg-muted animate-pulse rounded"></div>
							<div class="w-16 h-4 bg-muted animate-pulse rounded"></div>
							<div class="w-28 h-4 bg-muted animate-pulse rounded"></div>
						</div>
						<div class="flex gap-1">
							<div class="w-36 h-4 bg-muted animate-pulse rounded"></div>
							<div class="w-16 h-4 bg-muted animate-pulse rounded"></div>
						</div>
					</div>
				{:else}
					<TwemojiText>{bot?.short ?? ""}</TwemojiText>
				{/if}
			</div>

			<!-- Action buttons -->
			<div class="mt-8 mx-2 flex flex-col gap-2">
				{#if bot?.IS_SKELETON}
					<div class="w-full h-9 bg-muted animate-pulse rounded-md"></div>
					<div class="w-full h-9 bg-muted animate-pulse rounded-md"></div>
				{:else}
					<a href="/bots/{bot?.slug ?? bot?.id}" class={buttonVariants({ variant: "default" })}>
						<!-- Eye icon (lucide) -->
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-4 h-4 mr-2"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
							<circle cx="12" cy="12" r="3" />
						</svg>
						View
					</a>
					<a
						href={bot?.invite ?? "#"}
						target="_blank"
						rel="noopener noreferrer"
						class={buttonVariants({ variant: "outline" })}
					>
						<!-- UserRoundPlus icon (lucide) -->
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-4 h-4 mr-2"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M2 21a8 8 0 0 1 13.292-6" />
							<circle cx="10" cy="8" r="5" />
							<path d="M19 16v6" />
							<path d="M22 19h-6" />
						</svg>
						Invite
					</a>
					{#if edit}
						<a
							href="/dashboard/bots/edit/{bot?.id}"
							class={buttonVariants({ variant: "secondary" })}
						>
							Edit
						</a>
					{/if}
				{/if}
			</div>
		</div>
	</div>
</div>
