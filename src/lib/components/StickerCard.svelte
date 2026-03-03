<script lang="ts">
	import { getStickerUrl, getStickerFormatLabel, isStickerAnimated } from "$lib/sticker-utils";

	type ResolvedTag =
		| { type: "text"; value: string }
		| {
				type: "custom_emoji";
				id: string;
				emoji: { id: string; code: string; name: string; a: boolean } | null;
		  };

	export let sticker: {
		id: string;
		name: string;
		tags: string | null;
		format: number;
		dc: number;
		added_at: string | null;
		guild: string | null;
	};

	/**
	 * Pre-resolved tag tokens from the server load.
	 * When provided, custom emoji IDs are rendered with their image and link.
	 * When absent, tags fall back to the raw string display.
	 */
	export let resolvedTags: ResolvedTag[] = [];

	/** If true, clicking the card navigates to the sticker page. Default: true. */
	export let linkable: boolean = true;
	/** If true, show a compact inline download button on the card. Default: true. */
	export let showDownload: boolean = true;

	$: stickerUrl = getStickerUrl(sticker.id, sticker.format, 160);
	$: formatLabel = getStickerFormatLabel(sticker.format);
	$: animated = isStickerAnimated(sticker.format);
	$: isLottie = sticker.format === 3;

	// Decide what to show in the tags row.
	// If resolvedTags was passed in, use them. Otherwise fall back to raw string.
	$: hasResolvedTags = resolvedTags.length > 0;

	let downloading = false;
	let downloadError = false;

	async function handleDownload(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (downloading) return;

		downloading = true;
		downloadError = false;

		try {
			const res = await fetch(`/api/stickers/${sticker.id}/download`, { method: "POST" });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);

			const blob = await res.blob();
			const objectUrl = URL.createObjectURL(blob);

			const disposition = res.headers.get("content-disposition") ?? "";
			const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
			const filename = filenameMatch?.[1] ?? `${sticker.name}.png`;

			const a = document.createElement("a");
			a.href = objectUrl;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(objectUrl);
		} catch {
			downloadError = true;
			setTimeout(() => (downloadError = false), 3000);
		} finally {
			downloading = false;
		}
	}

	function preventContextMenu(e: MouseEvent) {
		e.preventDefault();
	}
</script>

<div
	class="group relative bg-popover border border-border rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
	role="presentation"
>
	<!-- Format badge -->
	<div class="absolute top-2 left-2 z-10">
		<span
			class="text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none
				{animated
				? isLottie
					? 'bg-blue-500/90 text-white'
					: 'bg-purple-500/90 text-white'
				: 'bg-muted/80 text-muted-foreground backdrop-blur-sm'}"
		>
			{formatLabel}
		</span>
	</div>

	<!-- Sticker image area -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="relative flex items-center justify-center bg-linear-to-br from-muted/40 to-muted/20 h-28"
		on:contextmenu={preventContextMenu}
	>
		{#if linkable}
			<a
				href="/stickers/{sticker.id}"
				class="flex items-center justify-center w-full h-full"
				tabindex="-1"
				aria-label="View {sticker.name}"
			>
				{#if isLottie}
					<div
						class="flex flex-col items-center justify-center gap-1 text-muted-foreground select-none"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-10 h-10 opacity-40"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
							<path d="M8 14s1.5 2 4 2 4-2 4-2" />
							<path d="M9 9h.01" />
							<path d="M15 9h.01" />
						</svg>
						<span class="text-[9px] font-semibold uppercase tracking-wide opacity-50">Lottie</span>
					</div>
				{:else}
					<img
						src={stickerUrl}
						alt={sticker.name}
						class="w-20 h-20 object-contain select-none pointer-events-none"
						draggable="false"
						loading="lazy"
						on:contextmenu={preventContextMenu}
					/>
				{/if}
			</a>
		{:else if isLottie}
			<div
				class="flex flex-col items-center justify-center gap-1 text-muted-foreground select-none"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="w-10 h-10 opacity-40"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
					<path d="M8 14s1.5 2 4 2 4-2 4-2" />
					<path d="M9 9h.01" />
					<path d="M15 9h.01" />
				</svg>
				<span class="text-[9px] font-semibold uppercase tracking-wide opacity-50">Lottie</span>
			</div>
		{:else}
			<img
				src={stickerUrl}
				alt={sticker.name}
				class="w-20 h-20 object-contain select-none pointer-events-none"
				draggable="false"
				loading="lazy"
				on:contextmenu={preventContextMenu}
			/>
		{/if}

		<!-- Quick download overlay on hover -->
		{#if showDownload}
			<button
				on:click={handleDownload}
				class="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150
					bg-primary text-primary-foreground rounded-md p-1.5 shadow-md hover:bg-primary/90 cursor-pointer"
				title="Download {sticker.name}"
				aria-label="Download {sticker.name}"
				disabled={downloading}
			>
				{#if downloading}
					<svg class="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
						<circle
							class="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							stroke-width="4"
						/>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
					</svg>
				{:else if downloadError}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-3.5 h-3.5 text-destructive-foreground"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<circle cx="12" cy="12" r="10" />
						<line x1="12" y1="8" x2="12" y2="12" />
						<line x1="12" y1="16" x2="12.01" y2="16" />
					</svg>
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-3.5 h-3.5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
						<polyline points="7 10 12 15 17 10" />
						<line x1="12" y1="15" x2="12" y2="3" />
					</svg>
				{/if}
			</button>
		{/if}
	</div>

	<!-- Card body -->
	<div class="px-3 py-2.5">
		<!-- Name -->
		{#if linkable}
			<a
				href="/stickers/{sticker.id}"
				class="block font-semibold text-sm text-foreground hover:text-primary transition-colors truncate leading-tight"
				title={sticker.name}
			>
				{sticker.name}
			</a>
		{:else}
			<p class="font-semibold text-sm text-foreground truncate leading-tight" title={sticker.name}>
				{sticker.name}
			</p>
		{/if}

		<!-- Tags row -->
		{#if hasResolvedTags}
			<!--
				Resolved tags: render each token according to its type.
				The row is a single flex line that truncates gracefully — we show as
				many chips as fit and let overflow clip silently since the full list
				is visible on the detail page.
			-->
			<div class="flex items-center gap-1 mt-0.5 min-w-0 overflow-hidden">
				{#each resolvedTags as tag, i}
					{#if i > 0}
						<span class="text-muted-foreground/30 text-[10px] shrink-0">·</span>
					{/if}

					{#if tag.type === "text"}
						<!-- Plain text / unicode emoji -->
						<span
							class="text-xs text-muted-foreground font-mono truncate shrink-0 max-w-18"
							title={tag.value}
						>
							{tag.value}
						</span>
					{:else if tag.emoji}
						<!-- Custom emoji in our listing — image + :code: label, links to emoji page -->
						<!-- svelte-ignore a11y-no-static-element-interactions -->
						<a
							href="/emojis/{tag.emoji.id}"
							class="inline-flex items-center gap-0.5 shrink-0 hover:opacity-80 transition-opacity"
							title=":{tag.emoji.code}: — view emoji"
							on:click|stopPropagation
						>
							<img
								src="https://cdn.discordapp.com/emojis/{tag.emoji.id}.{tag.emoji.a
									? 'gif'
									: 'webp'}?size=32"
								alt=":{tag.emoji.code}:"
								class="w-3.5 h-3.5 object-contain"
								loading="lazy"
							/>
							<span class="text-[10px] text-muted-foreground font-mono truncate max-w-13">
								:{tag.emoji.code}:
							</span>
						</a>
					{:else}
						<!-- Custom emoji ID not in our listing — faded placeholder -->
						<span
							class="inline-flex items-center gap-0.5 shrink-0"
							title="Custom emoji (not in listing)"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-3 h-3 text-muted-foreground/30"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<circle cx="12" cy="12" r="10" />
								<path d="M8 14s1.5 2 4 2 4-2 4-2" />
								<line x1="9" y1="9" x2="9.01" y2="9" />
								<line x1="15" y1="9" x2="15.01" y2="9" />
							</svg>
							<span class="text-[10px] text-muted-foreground/30 font-mono"
								>{tag.id.slice(0, 4)}…</span
							>
						</span>
					{/if}
				{/each}
			</div>
		{:else if sticker.tags}
			<!-- Fallback: no resolved tags passed in — show raw string -->
			<p class="text-xs text-muted-foreground font-mono truncate mt-0.5" title={sticker.tags}>
				{sticker.tags}
			</p>
		{:else}
			<p class="text-xs text-muted-foreground/40 italic truncate mt-0.5">no tags</p>
		{/if}

		<!-- Footer: downloads + server link -->
		<div class="flex items-center justify-between mt-2 pt-2 border-t border-border/60">
			<div class="flex items-center gap-1 text-xs text-muted-foreground">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="w-3 h-3"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
					<polyline points="7 10 12 15 17 10" />
					<line x1="12" y1="15" x2="12" y2="3" />
				</svg>
				<span>{sticker.dc.toLocaleString()}</span>
			</div>

			{#if sticker.guild}
				<a
					href="/servers/{sticker.guild}"
					class="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5"
					title="View server"
					on:click|stopPropagation
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-3 h-3"
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
					Server
				</a>
			{/if}
		</div>
	</div>
</div>
