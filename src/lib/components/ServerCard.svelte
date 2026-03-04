<script lang="ts">
	import { Eye, ChevronUp, Server } from "@lucide/svelte";
	import { onMount } from "svelte";
	import approx from "$lib/approx-num";
	import Tag from "$lib/components/ui/Tag.svelte";
	import TwemojiText from "$lib/components/TwemojiText.svelte";
	import { buttonVariants } from "$lib/components/ui/button.js";

	export let server: any;
	export let edit: boolean = false;

	let hovered = false;
	let imageRef: HTMLImageElement | null = null;
	let bgColor: number[] | null = null;

	$: iconUrl = (() => {
		if (!server?.icon || server.icon === "") return null;
		if (server.icon.startsWith("http")) return server.icon;
		return `https://cdn.discordapp.com/icons/${server.id}/${server.icon}.webp?size=256`;
	})();

	$: bgStyle = bgColor
		? `background-color: rgb(${bgColor[0]},${bgColor[1]},${bgColor[2]}); background-size: cover; background-position: center;`
		: "";

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
			// noop
		}
	});
</script>

<div
	class="block bg-popover rounded-lg w-96 md:max-w-80 shadow-black/90 group hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 mb-4 border"
	role="presentation"
	on:mouseenter={() => (hovered = true)}
	on:mouseleave={() => (hovered = false)}
>
	<!-- Banner / header area -->
	<div class="h-32 w-full rounded-t-lg" style={bgStyle}></div>

	<!-- Icon row -->
	<div class="relative">
		{#if server?.IS_SKELETON}
			<div
				class="w-16 h-16 rounded-full absolute -top-8 left-4 border-4 border-card bg-muted animate-pulse shadow-black shadow-2xl"
			></div>
		{:else if iconUrl}
			<img
				bind:this={imageRef}
				src={iconUrl}
				alt="server icon"
				crossorigin="anonymous"
				width="64"
				height="64"
				loading="lazy"
				class="z-10 w-16 h-16 rounded-full absolute -top-8 left-4 border-4 border-card bg-popover shadow-black shadow-2xl"
			/>
		{:else}
			<!-- Fallback icon: building/server silhouette -->
			<div
				class="z-10 w-16 h-16 rounded-full absolute -top-8 left-4 border-4 border-card bg-primary/20 shadow-black shadow-2xl flex items-center justify-center"
			>
				<Server class="w-7 h-7 text-primary" aria-hidden="true" />
			</div>
		{/if}
	</div>

	<!-- Card body -->
	<div
		class="pb-2 bg-popover group-hover:bg-popover/90 backdrop-blur-md rounded-b-md transition-colors duration-300"
	>
		<div class="mx-4 pt-12">
			<!-- Server name -->
			{#if server?.IS_SKELETON}
				<div class="w-32 my-1 h-6 bg-muted animate-pulse rounded"></div>
				<div class="flex items-center gap-1 mt-2">
					<div class="w-24 my-1 h-4 bg-muted animate-pulse rounded"></div>
					<div class="w-8 my-1 h-4 bg-primary/40 animate-pulse rounded"></div>
				</div>
			{:else}
				<div class="h-20 overflow-y-auto text-left">
					<h2 class="font-heading text-2xl font-semibold">{server?.name ?? ""}</h2>
					<span
						class="relative bottom-1 ml-1 bg-green-600 text-white rounded-md px-1 text-xs font-heading"
					>
						SERVER
					</span>
				</div>
			{/if}

			<!-- Stats tags -->
			<div class="my-4 flex items-center">
				{#if server?.IS_SKELETON}
					<div class="flex gap-2">
						<div class="flex">
							<div class="w-12 h-5 rounded-l-sm bg-muted animate-pulse"></div>
							<div class="w-8 h-5 rounded-r-sm bg-green-600/40 animate-pulse"></div>
						</div>
					</div>
				{:else}
					<!-- Votes tag -->
					<Tag firstClass="bg-muted dark:bg-card text-white" secondClass="bg-green-600 text-white">
						<span slot="first" class="flex items-center">
							<ChevronUp class="w-4 h-4 mr-1" aria-hidden="true" />
							Votes
						</span>
						<span slot="second">{approx(server?.votes ?? 0)}</span>
					</Tag>
				{/if}
			</div>
		</div>

		<!-- Description + buttons inner card -->
		<div class="mx-2 bg-card pb-2 rounded-md">
			<!-- Short description -->
			<div class="mx-2 pt-4 text-sm h-20 leading-5 overflow-y-auto rounded-md font-light text-left">
				{#if server?.IS_SKELETON}
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
					<TwemojiText>{server?.short ?? ""}</TwemojiText>
				{/if}
			</div>

			<!-- Action buttons -->
			<div class="mt-8 mx-2 flex flex-col gap-2">
				{#if server?.IS_SKELETON}
					<div class="w-full h-9 bg-muted animate-pulse rounded-md"></div>
					<div class="w-full h-9 bg-muted animate-pulse rounded-md"></div>
				{:else}
					<a href="/servers/{server?.slug}" class={buttonVariants({ variant: "default" })}>
						<Eye class="w-4 h-4 mr-2" aria-hidden="true" />
						View
					</a>
					{#if edit}
						<a
							href="/dashboard/servers/edit/{server?.id}"
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
