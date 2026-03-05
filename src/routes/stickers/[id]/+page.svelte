<script lang="ts">
	import SEO from "$lib/components/SEO.svelte";
	import StickerCard from "$lib/components/StickerCard.svelte";

	import {
		getStickerUrl,
		getStickerExtension,
		getStickerFormatLabel,
		isStickerAnimated,
		STICKER_FORMAT
	} from "$lib/sticker-utils";

	type ResolvedTag =
		| { type: "text"; value: string }
		| {
				type: "custom_emoji";
				id: string;
				emoji: { id: string; code: string; name: string; a: boolean } | null;
		  };

	export let data: {
		sticker: {
			id: string;
			name: string;
			description: string | null;
			tags: string | null;
			format: number;
			dc: number;
			added_at: string | null;
			guild: string | null;
		};
		related: Array<{
			id: string;
			name: string;
			tags: string | null;
			format: number;
			dc: number;
			added_at: string | null;
			guild: string | null;
			resolvedTags: ResolvedTag[];
		}>;
		guildInfo: {
			id: string;
			name: string;
			short: string;
			icon: string | null;
			slug: string;
		} | null;
		resolvedTags: ResolvedTag[];
	};

	$: ({ sticker, related, guildInfo, resolvedTags } = data);

	$: guildIconUrl = (() => {
		if (!guildInfo?.icon || guildInfo.icon === "") return null;
		if (guildInfo.icon.startsWith("http")) return guildInfo.icon;
		return `https://cdn.discordapp.com/icons/${guildInfo.id}/${guildInfo.icon}.webp?size=64`;
	})();

	$: guildInitial = guildInfo?.name?.charAt(0)?.toUpperCase() ?? "#";

	$: isLottie = sticker.format === STICKER_FORMAT.LOTTIE;
	$: animated = isStickerAnimated(sticker.format);
	$: formatLabel = getStickerFormatLabel(sticker.format);
	$: stickerPreviewUrl = isLottie ? null : getStickerUrl(sticker.id, sticker.format, 320);
	$: previewUrl =
		stickerPreviewUrl ?? `https://cdn.discordapp.com/stickers/${sticker.id}.png?size=320`;

	function formatDate(iso: string | null): string {
		if (!iso) return "Unknown";
		try {
			return new Date(iso).toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric"
			});
		} catch {
			return iso;
		}
	}

	// ── Download logic ─────────────────────────────────────────────────────────
	let downloading = false;
	let downloadError: string | null = null;
	let downloadSuccess = false;

	async function handleDownload() {
		if (downloading) return;

		downloading = true;
		downloadError = null;
		downloadSuccess = false;

		try {
			const res = await fetch(`/api/stickers/${sticker.id}/download`, { method: "POST" });
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body?.error ?? `HTTP ${res.status}`);
			}

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

			downloadSuccess = true;
			setTimeout(() => (downloadSuccess = false), 3000);
		} catch (err) {
			downloadError = err instanceof Error ? err.message : "Download failed. Please try again.";
			setTimeout(() => (downloadError = null), 5000);
		} finally {
			downloading = false;
		}
	}

	function preventContextMenu(e: MouseEvent) {
		e.preventDefault();
	}

	// ── ColorThief dominant-color gradient ───────────────────────────────────
	let dominantColor: [number, number, number] | null = null;
	let colorThief: { getColor: (img: HTMLImageElement) => [number, number, number] } | null = null;

	async function ensureColorThief() {
		if (colorThief) return colorThief;
		try {
			const { default: CT } = await import("colorthief");
			colorThief = new (CT as any)();
		} catch {
			// unavailable - silently skip
		}
		return colorThief;
	}

	function extractColor(img: HTMLImageElement) {
		if (!colorThief) return;
		try {
			if (!img.naturalWidth) return;
			const c = colorThief.getColor(img);
			if (Array.isArray(c) && c.length === 3) dominantColor = c as [number, number, number];
		} catch {
			// cross-origin / decode error - skip
		}
	}

	function colorThiefAction(node: HTMLImageElement) {
		ensureColorThief().then(() => {
			if (node.complete && node.naturalWidth) {
				extractColor(node);
			} else {
				node.addEventListener("load", () => extractColor(node), { once: true });
			}
		});
		return {};
	}

	$: dominantColorStyle = dominantColor
		? `background: linear-gradient(135deg, rgba(${dominantColor[0]},${dominantColor[1]},${dominantColor[2]},0.4) 0%, rgba(${dominantColor[0]},${dominantColor[1]},${dominantColor[2]},0.1) 100%);`
		: "";

	// Reset dominant color when sticker changes
	$: if (sticker) dominantColor = null;

	// Proxy URL used only for ColorThief - the visible <img> stays on the CDN
	// directly (no crossorigin attr) so it never triggers a CORS error.
	// The sticker CDN doesn't send CORS headers, so we route through our own
	// server-side proxy which adds Access-Control-Allow-Origin: *.
	$: colorThiefSrc = isLottie ? null : `/api/stickers/${sticker.id}/preview`;

	// First text tag for the "how to use" hint - prefer plain text over a snowflake ID.
	$: hintTag = (() => {
		const first = resolvedTags.find((t) => t.type === "text") as
			| { type: "text"; value: string }
			| undefined;
		if (first) return first.value;
		const firstCustom = resolvedTags.find((t) => t.type === "custom_emoji") as
			| { type: "custom_emoji"; id: string; emoji: { name: string } | null }
			| undefined;
		return firstCustom?.emoji?.name ?? sticker.name;
	})();

	$: textTags = resolvedTags
		.filter((t): t is { type: "text"; value: string } => t.type === "text")
		.map((t) => t.value);

	$: seoTitle = `${sticker.name} - Discord Sticker · Rovel Discord List`;
	$: seoDescription = sticker.description
		? `${sticker.description} Download this ${animated ? "animated" : "static"} Discord sticker: ${sticker.name}.`
		: `Download the "${sticker.name}" ${formatLabel} Discord custom sticker. Downloaded ${sticker.dc.toLocaleString()} times.`;
</script>

<SEO title={seoTitle} description={seoDescription} image={previewUrl} imageSmall={previewUrl} />

<div class="max-w-5xl mx-auto px-4 py-8">
	<!-- Breadcrumb -->
	<nav class="flex items-center gap-2 text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
		<a href="/stickers" class="hover:text-foreground transition-colors">Stickers</a>
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
			<path d="m9 18 6-6-6-6" />
		</svg>
		<span class="text-foreground font-medium truncate max-w-48">{sticker.name}</span>
	</nav>

	<div class="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
		<!-- Left: preview + actions -->
		<div class="md:col-span-2 flex flex-col gap-4 md:sticky md:top-4">
			<!-- Preview card -->
			<div class="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
				<!-- Image area -->
				<!-- svelte-ignore a11y-no-static-element-interactions -->
				<div
					class="relative flex items-center justify-center h-56"
					style="background: linear-gradient(135deg, hsl(var(--primary)/0.12) 0%, hsl(var(--muted)/0.25) 100%);"
					on:contextmenu={preventContextMenu}
				>
					<!-- Dominant-color overlay - fades in once ColorThief resolves -->
					<div
						class="absolute inset-0 transition-opacity duration-700 ease-in-out pointer-events-none"
						style="{dominantColorStyle} opacity: {dominantColor ? 1 : 0};"
					></div>
					<!-- Format badge -->
					<div class="absolute top-3 right-3">
						<span
							class="text-xs font-bold px-2 py-1 rounded-lg leading-none
								{animated
								? isLottie
									? 'bg-blue-500/90 text-white'
									: 'bg-purple-500/90 text-white'
								: 'bg-muted/80 text-muted-foreground backdrop-blur-sm'}"
						>
							{formatLabel}
						</span>
					</div>

					{#if isLottie}
						<!-- Lottie placeholder -->
						<div
							class="flex flex-col items-center justify-center gap-3 text-muted-foreground select-none"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-20 h-20 opacity-25"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
								<path d="M8 14s1.5 2 4 2 4-2 4-2" />
								<path d="M9 9h.01" />
								<path d="M15 9h.01" />
							</svg>
							<p class="text-sm font-medium opacity-50">Lottie animation</p>
							<p class="text-xs opacity-40 text-center max-w-36 leading-snug">
								Download the JSON file to preview this sticker
							</p>
						</div>
					{:else}
						<img
							src={stickerPreviewUrl}
							alt={sticker.name}
							class="w-40 h-40 object-contain select-none pointer-events-none"
							draggable="false"
							on:contextmenu={preventContextMenu}
						/>
						<!-- Hidden proxy image used solely for ColorThief.
						     The visible img above has no crossorigin attr so it
						     loads from the CDN without triggering a CORS error.
						     This hidden one goes through our proxy which adds
						     Access-Control-Allow-Origin: * server-side. -->
						{#if colorThiefSrc}
							<img
								src={colorThiefSrc}
								alt=""
								class="sr-only absolute w-0 h-0 pointer-events-none"
								aria-hidden="true"
								crossorigin="anonymous"
								use:colorThiefAction
							/>
						{/if}
					{/if}
				</div>

				<!-- Download button area -->
				<div class="border-t border-border p-5 space-y-3">
					<button
						on:click={handleDownload}
						disabled={downloading}
						class="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl
							bg-primary text-primary-foreground font-bold text-sm
							hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed
							transition-colors cursor-pointer shadow-sm"
					>
						{#if downloading}
							<svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
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
							Downloading…
						{:else if downloadSuccess}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-5 h-5"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
								<polyline points="22 4 12 14.01 9 11.01" />
							</svg>
							Downloaded!
						{:else}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-5 h-5"
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
							Download {formatLabel}
						{/if}
					</button>

					{#if downloadError}
						<div
							class="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-4 h-4 shrink-0"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<circle cx="12" cy="12" r="10" />
								<line x1="12" y1="8" x2="12" y2="12" />
								<line x1="12" y1="16" x2="12.01" y2="16" />
							</svg>
							<span class="text-xs font-medium">{downloadError}</span>
						</div>
					{/if}

					<p class="text-xs text-muted-foreground text-center">
						For personal use only · Respect copyright
					</p>
				</div>
			</div>

			<!-- Stats card -->
			<div class="bg-card border border-border rounded-2xl p-4 shadow-sm">
				<h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
					Details
				</h3>
				<div class="space-y-3">
					<!-- Downloads -->
					<div class="flex items-center justify-between">
						<span class="text-sm text-muted-foreground flex items-center gap-2">
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
								<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
								<polyline points="7 10 12 15 17 10" />
								<line x1="12" y1="15" x2="12" y2="3" />
							</svg>
							Downloads
						</span>
						<span class="text-sm font-bold text-foreground">{sticker.dc.toLocaleString()}</span>
					</div>

					<!-- Added at -->
					<div class="flex items-center justify-between">
						<span class="text-sm text-muted-foreground flex items-center gap-2">
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
								<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
								<line x1="16" y1="2" x2="16" y2="6" />
								<line x1="8" y1="2" x2="8" y2="6" />
								<line x1="3" y1="10" x2="21" y2="10" />
							</svg>
							Added
						</span>
						<span class="text-sm font-medium text-foreground">{formatDate(sticker.added_at)}</span>
					</div>

					<!-- Format -->
					<div class="flex items-center justify-between">
						<span class="text-sm text-muted-foreground flex items-center gap-2">
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
								<path
									d="M15.5 2H8.6c-.4 0-.8.2-1.1.5-.3.3-.5.7-.5 1.1v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8c.4 0 .8-.2 1.1-.5.3-.3.5-.7.5-1.1V6.5L15.5 2z"
								/>
								<path d="M3 7.6v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5H15" />
								<path d="M15 2v5h5" />
							</svg>
							Format
						</span>
						<span
							class="text-xs font-bold px-2 py-0.5 rounded-md
								{animated
								? isLottie
									? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
									: 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
								: 'bg-muted text-muted-foreground'}"
						>
							{formatLabel}
						</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Right: info + guild + how-to -->
		<div class="md:col-span-3 flex flex-col gap-4">
			<!-- Name + tags + description -->
			<div class="bg-card border border-border rounded-2xl p-6 shadow-sm">
				<h1 class="text-2xl font-extrabold font-heading text-foreground leading-tight break-all">
					{sticker.name}
				</h1>

				{#if sticker.description}
					<p class="mt-3 text-base text-muted-foreground leading-relaxed">
						{sticker.description}
					</p>
				{/if}

				{#if resolvedTags.length > 0}
					<div class="mt-4">
						<p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
							Tags
						</p>
						<div class="flex flex-wrap gap-1.5">
							{#each resolvedTags as tag}
								{#if tag.type === "text"}
									<a
										href="/stickers?q={encodeURIComponent(tag.value)}"
										class="px-2.5 py-1 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary text-xs font-medium text-muted-foreground transition-colors"
									>
										{tag.value}
									</a>
								{:else if tag.emoji}
									<a
										href="/emojis/{tag.emoji.id}"
										class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary text-xs font-medium text-muted-foreground transition-colors group"
										title=":{tag.emoji.code}: - view emoji"
									>
										<img
											src="https://cdn.discordapp.com/emojis/{tag.emoji.id}.{tag.emoji.a
												? 'gif'
												: 'webp'}?size=32"
											alt=":{tag.emoji.code}:"
											class="w-4 h-4 object-contain"
											loading="lazy"
										/>
										<span class="group-hover:text-primary transition-colors"
											>:{tag.emoji.code}:</span
										>
									</a>
								{:else}
									<span
										class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-xs font-medium text-muted-foreground/50"
										title="Custom emoji (not in listing)"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="w-3.5 h-3.5 opacity-50"
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
										<span class="font-mono">{tag.id.slice(0, 6)}…</span>
									</span>
								{/if}
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Guild section -->
			{#if sticker.guild}
				<div class="bg-card border border-border rounded-2xl p-5 shadow-sm">
					<h3
						class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2"
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
							<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
							<polyline points="9 22 9 12 15 12 15 22" />
						</svg>
						From Server
					</h3>

					<a
						href="/servers/{guildInfo?.slug ?? sticker.guild}"
						class="flex items-center gap-3 group"
					>
						<div
							class="w-12 h-12 rounded-xl overflow-hidden bg-muted flex items-center justify-center shrink-0 border border-border"
						>
							{#if guildIconUrl}
								<img
									src={guildIconUrl}
									alt="{guildInfo?.name} icon"
									class="w-full h-full object-cover"
									loading="lazy"
								/>
							{:else}
								<span class="text-base font-bold text-primary select-none">
									{guildInitial}
								</span>
							{/if}
						</div>

						<div class="min-w-0">
							<p
								class="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate"
							>
								{guildInfo?.name ?? sticker.guild}
							</p>
							<p class="text-xs text-muted-foreground truncate">
								{#if guildInfo?.short && guildInfo.short !== "Short description is not Updated."}
									{guildInfo.short}
								{:else}
									View server →
								{/if}
							</p>
						</div>

						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors ml-auto shrink-0"
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

					<div class="mt-3 pt-3 border-t border-border/60">
						<a
							href="/stickers?guild={sticker.guild}"
							class="text-xs text-primary font-semibold hover:underline"
						>
							Browse all stickers from this server →
						</a>
					</div>
				</div>
			{/if}

			<!-- How to use -->
			<div class="bg-card border border-border rounded-2xl p-5 shadow-sm">
				<h3 class="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-4 h-4 text-primary"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<circle cx="12" cy="12" r="10" />
						<path d="M12 16v-4" />
						<path d="M12 8h.01" />
					</svg>
					How to use this sticker
				</h3>
				<ol class="space-y-2 text-sm text-muted-foreground">
					<li class="flex gap-2.5">
						<span
							class="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5"
						>
							1
						</span>
						<span>
							<strong class="text-foreground">Download</strong> the sticker using the button above.
						</span>
					</li>
					<li class="flex gap-2.5">
						<span
							class="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5"
						>
							2
						</span>
						<span>
							<strong class="text-foreground">Upload</strong> it to your Discord server via Server Settings
							→ Stickers.
						</span>
					</li>
					<li class="flex gap-2.5">
						<span
							class="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5"
						>
							3
						</span>
						<span>
							Use it in any channel by clicking the sticker icon in the message bar and searching
							for <code class="bg-muted px-1 rounded text-xs font-mono">{hintTag}</code>.
						</span>
					</li>
				</ol>
			</div>
		</div>
	</div>

	<!-- About + FAQ - single full-width card, no height-mismatch possible -->
	<div class="mt-6 bg-card border border-border rounded-2xl p-6 shadow-sm">
		<h2 class="text-lg font-extrabold font-heading text-foreground mb-1">
			About the {sticker.name} sticker
		</h2>
		<p class="text-sm text-muted-foreground leading-relaxed mb-5">
			<strong class="text-foreground">{sticker.name}</strong> is a
			{animated ? "animated" : "static"}
			{formatLabel} Discord custom sticker{#if guildInfo}
				from the <strong class="text-foreground">{guildInfo.name}</strong> Discord server{/if},
			available to download for free on Rovel Discord List.{#if sticker.dc > 0}
				Downloaded <strong class="text-foreground">{sticker.dc.toLocaleString()}</strong> times.{/if}{#if sticker.description}
				{sticker.description}{/if}{#if textTags.length > 0}
				Tagged: {textTags.join(", ")}.{/if}
			{#if animated}
				Animated stickers require Boost <strong class="text-foreground">Level 2+</strong> to upload to
				a server.
			{:else}
				Works at all boost levels - no Nitro required to upload.
			{/if}
		</p>

		<h3 class="text-base font-bold text-foreground mb-3">Frequently asked questions</h3>
		<dl class="grid grid-cols-1 sm:grid-cols-2 gap-3">
			<div class="rounded-xl bg-muted/30 border border-border px-4 py-3">
				<dt class="font-semibold text-sm text-foreground mb-1">How do I download this sticker?</dt>
				<dd class="text-sm text-muted-foreground leading-relaxed">
					Click the <strong class="text-foreground">Download</strong> button above. It saves in
					<strong class="text-foreground">{formatLabel} format</strong>. Right-click saving is
					disabled - use the button instead.
				</dd>
			</div>

			<div class="rounded-xl bg-muted/30 border border-border px-4 py-3">
				<dt class="font-semibold text-sm text-foreground mb-1">
					How do I add it to my Discord server?
				</dt>
				<dd class="text-sm text-muted-foreground leading-relaxed">
					Go to <strong class="text-foreground">Server Settings → Stickers</strong> and click
					<strong class="text-foreground">Upload Sticker</strong>. Give it a name and a related
					emoji, then save.
				</dd>
			</div>

			<div class="rounded-xl bg-muted/30 border border-border px-4 py-3">
				<dt class="font-semibold text-sm text-foreground mb-1">What format is this sticker?</dt>
				<dd class="text-sm text-muted-foreground leading-relaxed">
					{#if sticker.format === 1}
						<strong class="text-foreground">PNG</strong> - static, works at all boost levels.
					{:else if sticker.format === 2}
						<strong class="text-foreground">Lottie</strong> - used only in Discord's official packs; cannot
						be uploaded to custom slots.
					{:else if sticker.format === 3}
						<strong class="text-foreground">Animated APNG</strong> - requires Boost
						<strong class="text-foreground">Level 2+</strong> to upload.
					{:else if sticker.format === 4}
						<strong class="text-foreground">Animated GIF</strong> - requires Boost
						<strong class="text-foreground">Level 2+</strong> to upload.
					{:else}
						<strong class="text-foreground">{formatLabel}</strong>.
					{/if}
				</dd>
			</div>

			<div class="rounded-xl bg-muted/30 border border-border px-4 py-3">
				<dt class="font-semibold text-sm text-foreground mb-1">
					How many sticker slots does a server have?
				</dt>
				<dd class="text-sm text-muted-foreground leading-relaxed">
					Free to download. To <em>use</em> custom stickers your server needs Boost
					<strong class="text-foreground">Level 1</strong> (5 slots),
					<strong class="text-foreground">Level 2</strong> (15), or
					<strong class="text-foreground">Level 3</strong> (30).
				</dd>
			</div>

			<div class="rounded-xl bg-muted/30 border border-border px-4 py-3">
				<dt class="font-semibold text-sm text-foreground mb-1">
					Can I use stickers without Nitro?
				</dt>
				<dd class="text-sm text-muted-foreground leading-relaxed">
					Discord's built-in packs are free for everyone. To send <em>custom</em> stickers outside
					their home server you need <strong class="text-foreground">Discord Nitro</strong>. Any
					member can send them within the server they belong to.
				</dd>
			</div>

			<div class="rounded-xl bg-muted/30 border border-border px-4 py-3">
				<dt class="font-semibold text-sm text-foreground mb-1">
					What's the difference between stickers and emojis?
				</dt>
				<dd class="text-sm text-muted-foreground leading-relaxed">
					<strong class="text-foreground">Stickers</strong> are large standalone images (320 px)
					sent as their own message.
					<strong class="text-foreground">Emojis</strong> are small inline images (~32 px) inserted
					with a <code class="bg-muted px-1 rounded text-xs font-mono">:shortcode:</code>.
				</dd>
			</div>

			{#if sticker.guild}
				<div class="rounded-xl bg-muted/30 border border-border px-4 py-3 sm:col-span-2">
					<dt class="font-semibold text-sm text-foreground mb-1">
						Where does this sticker come from?
					</dt>
					<dd class="text-sm text-muted-foreground leading-relaxed">
						From the
						<strong class="text-foreground">{guildInfo?.name ?? "a Discord server"}</strong> -
						<a
							href="/servers/{guildInfo?.slug ?? sticker.guild}"
							class="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
							>view server</a
						>
						or
						<a
							href="/stickers?guild={sticker.guild}"
							class="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
							>browse all its stickers</a
						>.
					</dd>
				</div>
			{/if}
		</dl>
	</div>

	<!-- Related stickers -->
	{#if related.length > 0}
		<div class="mt-12">
			<div class="flex items-center gap-3 mb-5">
				<div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-4 h-4 text-primary"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path
							d="M15.5 2H8.6c-.4 0-.8.2-1.1.5-.3.3-.5.7-.5 1.1v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8c.4 0 .8-.2 1.1-.5.3-.3.5-.7.5-1.1V6.5L15.5 2z"
						/>
						<path d="M3 7.6v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5H15" />
						<path d="M15 2v5h5" />
					</svg>
				</div>
				<div>
					<h2 class="text-xl font-extrabold font-heading text-foreground leading-tight">
						More Stickers
					</h2>
					<p class="text-xs text-muted-foreground mt-0.5">Discover more from the collection</p>
				</div>
				<a
					href="/stickers"
					class="ml-auto text-xs font-semibold text-primary hover:underline whitespace-nowrap"
				>
					Browse all →
				</a>
			</div>

			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
				{#each related as s (s.id)}
					<StickerCard sticker={s} resolvedTags={s.resolvedTags} />
				{/each}
			</div>
		</div>
	{/if}
</div>
