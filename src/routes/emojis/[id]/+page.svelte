<script lang="ts">
	import SEO from "$lib/components/SEO.svelte";
	import EmojiCard from "$lib/components/EmojiCard.svelte";

	export let data: {
		emoji: {
			id: string;
			code: string;
			name: string;
			alt_names: string[];
			description: string | null;
			a: boolean;
			dc: number;
			added_at: string | null;
			guild: string | null;
			submitter: string | null;
		};
		related: Array<{
			id: string;
			code: string;
			name: string;
			alt_names: string[];
			a: boolean;
			dc: number;
			added_at: string | null;
			guild: string | null;
			submitter: string | null;
		}>;
		user: any | null;
		guildInfo: {
			id: string;
			name: string;
			short: string;
			icon: string | null;
			slug: string;
		} | null;
	};

	$: ({ emoji, related, user, guildInfo } = data);

	$: guildIconUrl = (() => {
		if (!guildInfo?.icon || guildInfo.icon === "") return null;
		if (guildInfo.icon.startsWith("http")) return guildInfo.icon;
		return `https://cdn.discordapp.com/icons/${guildInfo.id}/${guildInfo.icon}.webp?size=64`;
	})();

	$: guildInitial = guildInfo?.name?.charAt(0)?.toUpperCase() ?? "#";

	$: emojiUrl = (() => {
		const ext = emoji.a ? "gif" : "webp";
		const size = emoji.a ? "" : "?size=256";
		return `https://cdn.discordapp.com/emojis/${emoji.id}.${ext}${size}`;
	})();

	$: previewUrl = emojiUrl;

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

	// ── Download logic ────────────────────────────────────────────────────────
	let downloading = false;
	let downloadError: string | null = null;
	let downloadSuccess = false;

	async function handleDownload() {
		if (downloading) return;

		downloading = true;
		downloadError = null;
		downloadSuccess = false;

		try {
			const res = await fetch(`/api/emojis/${emoji.id}/download`, { method: "POST" });
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body?.error ?? `HTTP ${res.status}`);
			}

			const { url, filename } = await res.json();

			// Fetch the binary so the browser shows a real Save-As dialog
			const fileRes = await fetch(url);
			if (!fileRes.ok) throw new Error("CDN fetch failed");

			const blob = await fileRes.blob();
			const objectUrl = URL.createObjectURL(blob);

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

	/** Prevent right-click context menu on the preview image */
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

	// Reset dominant color when emoji changes
	$: if (emoji) dominantColor = null;

	$: seoTitle = `${emoji.name} - Discord Emoji · Rovel Discord List`;
	$: seoDescription = emoji.description
		? `${emoji.description} Download this ${emoji.a ? "animated" : "static"} Discord emoji: ${emoji.code}.`
		: `Download the "${emoji.name}" (${emoji.code}) ${emoji.a ? "animated GIF" : "PNG"} Discord custom emoji. Downloaded ${emoji.dc.toLocaleString()} times.`;
</script>

<SEO title={seoTitle} description={seoDescription} image={previewUrl} imageSmall={previewUrl} />

<div class="max-w-5xl mx-auto px-4 py-8">
	<!-- Breadcrumb -->
	<nav class="flex items-center gap-2 text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
		<a href="/emojis" class="hover:text-foreground transition-colors">Emojis</a>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="w-3.5 h-3.5 shrink-0"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="m9 18 6-6-6-6" />
		</svg>
		<span class="text-foreground font-medium truncate max-w-48">{emoji.name}</span>
	</nav>

	<div class="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
		<!-- Left: emoji preview + download -->
		<div class="md:col-span-2 flex flex-col gap-4 md:sticky md:top-4">
			<!-- Preview card -->
			<div class="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
				<!-- Checkerboard preview area (shows transparency) -->
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
					<!-- Animated / Static badge -->
					<div class="absolute top-3 right-3">
						<span
							class="text-xs font-bold px-2 py-1 rounded-lg leading-none
								{emoji.a ? 'bg-purple-500 text-white' : 'bg-muted text-muted-foreground border border-border'}"
						>
							{emoji.a ? "Animated GIF" : "Static PNG"}
						</span>
					</div>

					<img
						src={emojiUrl}
						alt={emoji.name}
						class="w-36 h-36 object-contain select-none pointer-events-none"
						draggable="false"
						loading="eager"
						crossorigin="anonymous"
						use:colorThiefAction
						on:contextmenu={preventContextMenu}
					/>
				</div>

				<!-- Download section -->
				<div class="border-t border-border p-5 space-y-3">
					<button
						on:click={handleDownload}
						disabled={downloading}
						class="w-full flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl font-bold text-base
							bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed
							transition-all duration-150 shadow-sm hover:shadow-md active:scale-[0.98] cursor-pointer"
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
							Download {emoji.a ? "GIF" : "PNG"}
						{/if}
					</button>

					{#if downloadError}
						<div
							class="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-3.5 h-3.5 mt-0.5 shrink-0"
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
							<span>{downloadError}</span>
						</div>
					{/if}

					<p class="text-xs text-muted-foreground text-center">
						Right-click downloading is disabled. Use the button above.
					</p>
				</div>
			</div>

			<!-- Stats card -->
			<div class="bg-card border border-border rounded-2xl p-4 shadow-sm">
				<h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
					Stats
				</h3>
				<div class="space-y-3">
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
						<span class="text-sm font-bold text-foreground">{emoji.dc.toLocaleString()}</span>
					</div>

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
						<span class="text-sm font-medium text-foreground">{formatDate(emoji.added_at)}</span>
					</div>

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
								<circle cx="12" cy="12" r="10" />
								<path d="M8 14s1.5 2 4 2 4-2 4-2" />
								<line x1="9" y1="9" x2="9.01" y2="9" />
								<line x1="15" y1="9" x2="15.01" y2="9" />
							</svg>
							Type
						</span>
						<span
							class="text-xs font-bold px-2 py-0.5 rounded-md
								{emoji.a
								? 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
								: 'bg-muted text-muted-foreground'}"
						>
							{emoji.a ? "Animated" : "Static"}
						</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Right: emoji info + guild + how-to -->
		<div class="md:col-span-3 flex flex-col gap-4">
			<!-- Name & code -->
			<div class="bg-card border border-border rounded-2xl p-6 shadow-sm">
				<h1
					class="text-3xl font-extrabold font-heading text-foreground leading-tight wrap-break-word"
				>
					{emoji.name}
				</h1>

				<div class="mt-3 flex flex-wrap items-center gap-2">
					<code
						class="bg-muted px-2.5 py-1 rounded-lg text-sm font-mono text-muted-foreground border border-border"
					>
						:{emoji.code}:
					</code>
					<code
						class="bg-muted px-2.5 py-1 rounded-lg text-sm font-mono text-muted-foreground border border-border"
					>
						{emoji.id}
					</code>
				</div>

				{#if emoji.description}
					<p class="mt-4 text-base text-muted-foreground leading-relaxed">
						{emoji.description}
					</p>
				{/if}

				{#if emoji.alt_names.length > 0}
					<div class="mt-4">
						<p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
							Also known as
						</p>
						<div class="flex flex-wrap gap-1.5">
							{#each emoji.alt_names as alt}
								<a
									href="/emojis?q={encodeURIComponent(alt)}"
									class="bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground border border-border/60 rounded-md px-2.5 py-0.5 text-xs font-mono transition-colors"
								>
									{alt}
								</a>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Source server -->
			{#if emoji.guild}
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
						Source Server
					</h3>
					<a href="/servers/{guildInfo?.slug ?? emoji.guild}" class="flex items-center gap-3 group">
						<div
							class="w-10 h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-primary/10 group-hover:bg-primary/20 transition-colors"
						>
							{#if guildIconUrl}
								<img
									src={guildIconUrl}
									alt={guildInfo?.name ?? "Server icon"}
									class="w-10 h-10 object-cover"
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
								{guildInfo?.name ?? "View Server"}
							</p>
							<p class="text-xs text-muted-foreground truncate">
								{#if guildInfo?.short && guildInfo.short !== "Short description is not Updated."}
									{guildInfo.short}
								{:else}
									{emoji.guild}
								{/if}
							</p>
						</div>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-4 h-4 text-muted-foreground group-hover:text-primary ml-auto shrink-0 transition-colors"
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
							href="/emojis?guild={emoji.guild}"
							class="text-xs text-primary hover:text-primary/80 font-semibold transition-colors"
						>
							Browse all emojis from this server →
						</a>
					</div>
				</div>
			{/if}

			<!-- How to use -->
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
						<circle cx="12" cy="12" r="10" />
						<path d="M12 16v-4" />
						<path d="M12 8h.01" />
					</svg>
					How to use
				</h3>
				<ol class="space-y-2 text-sm text-muted-foreground">
					<li class="flex gap-2.5">
						<span
							class="shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center"
							>1</span
						>
						<span
							>Click <strong class="text-foreground">Download {emoji.a ? "GIF" : "PNG"}</strong> to save
							the emoji file.</span
						>
					</li>
					<li class="flex gap-2.5">
						<span
							class="shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center"
							>2</span
						>
						<span
							>In Discord, open <strong class="text-foreground">Server Settings → Emoji</strong> and upload
							the file.</span
						>
					</li>
					<li class="flex gap-2.5">
						<span
							class="shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center"
							>3</span
						>
						<span
							>Use it with <code
								class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground border border-border"
								>:{emoji.code}:</code
							> in your server.</span
						>
					</li>
				</ol>
			</div>
		</div>
	</div>

	<!-- About + FAQ - single full-width card, no height-mismatch possible -->
	<div class="mt-6 bg-card border border-border rounded-2xl p-6 shadow-sm">
		<h2 class="text-lg font-extrabold font-heading text-foreground mb-1">
			About the {emoji.name} emoji
		</h2>
		<p class="text-sm text-muted-foreground leading-relaxed mb-5">
			<strong class="text-foreground">{emoji.name}</strong> is a
			{emoji.a ? "animated" : "static"}
			{emoji.a ? "GIF" : "PNG"} Discord custom emoji
			{#if guildInfo}
				from the <strong class="text-foreground">{guildInfo.name}</strong> Discord server
			{/if}
			available to download for free on Rovel Discord List. It uses the shortcode
			<strong class="text-foreground">:{emoji.code}:</strong>{#if emoji.dc > 0}
				and has been downloaded
				<strong class="text-foreground">{emoji.dc.toLocaleString()}</strong> times{/if}.{#if emoji.description}
				{emoji.description}{/if}{#if emoji.alt_names.length > 0}
				Also known as: {emoji.alt_names.join(", ")}.{/if}
			{#if emoji.a}
				Animated emojis require <strong class="text-foreground">Discord Nitro</strong> to use outside
				their home server.
			{:else}
				Static PNG - no Nitro needed to use within the server it's uploaded to.
			{/if}
		</p>

		<h3 class="text-base font-bold text-foreground mb-3">Frequently asked questions</h3>
		<dl class="grid grid-cols-1 sm:grid-cols-2 gap-3">
			<div class="rounded-xl bg-muted/30 border border-border px-4 py-3">
				<dt class="font-semibold text-sm text-foreground mb-1">
					How do I download the {emoji.name} emoji?
				</dt>
				<dd class="text-sm text-muted-foreground leading-relaxed">
					Click <strong class="text-foreground">Download {emoji.a ? "GIF" : "PNG"}</strong> above. Right-click
					saving is disabled - the button gives you the full-quality file.
				</dd>
			</div>

			<div class="rounded-xl bg-muted/30 border border-border px-4 py-3">
				<dt class="font-semibold text-sm text-foreground mb-1">
					How do I add it to my Discord server?
				</dt>
				<dd class="text-sm text-muted-foreground leading-relaxed">
					Download it, then go to <strong class="text-foreground">Server Settings → Emoji</strong>
					and click <strong class="text-foreground">Upload Emoji</strong>. Members can then use
					<code
						class="bg-muted px-1 py-0.5 rounded text-xs font-mono text-foreground border border-border"
						>:{emoji.code}:</code
					> in any channel.
				</dd>
			</div>

			<div class="rounded-xl bg-muted/30 border border-border px-4 py-3">
				<dt class="font-semibold text-sm text-foreground mb-1">
					Can I use it without Discord Nitro?
				</dt>
				<dd class="text-sm text-muted-foreground leading-relaxed">
					{#if !emoji.a}
						Yes, <em>within</em> the server it lives in - no Nitro needed. To use it
						<em>across other servers</em> you need
						<strong class="text-foreground">Discord Nitro</strong>.
					{:else}
						No, animated emojis require <strong class="text-foreground">Discord Nitro</strong> to use even within their home server.
            They can be used across servers with Nitro as well.
					{/if}
				</dd>
			</div>

			<div class="rounded-xl bg-muted/30 border border-border px-4 py-3">
				<dt class="font-semibold text-sm text-foreground mb-1">
					How many emoji slots does a server have?
				</dt>
				<dd class="text-sm text-muted-foreground leading-relaxed">
					Default: <strong class="text-foreground">50 static + 50 animated</strong>. Boosting raises
					those to <strong class="text-foreground">100 at Level 1</strong>,
					<strong class="text-foreground">150 at Level 2</strong>, and
					<strong class="text-foreground">250 at Level 3</strong>.
				</dd>
			</div>

			<div class="rounded-xl bg-muted/30 border border-border px-4 py-3">
				<dt class="font-semibold text-sm text-foreground mb-1">
					Is the {emoji.name} emoji animated?
				</dt>
				<dd class="text-sm text-muted-foreground leading-relaxed">
					{#if emoji.a}
						Yes - it's an <strong class="text-foreground">animated GIF</strong> that loops in chat.
						Both Cross-server and Home-server use requires <strong class="text-foreground">Nitro</strong>.
					{:else}
						No - it's a <strong class="text-foreground">static PNG</strong>, usable in any server
						it's uploaded to without Nitro.
					{/if}
				</dd>
			</div>

			<div class="rounded-xl bg-muted/30 border border-border px-4 py-3">
				<dt class="font-semibold text-sm text-foreground mb-1">
					What's the difference between emojis and stickers?
				</dt>
				<dd class="text-sm text-muted-foreground leading-relaxed">
					<strong class="text-foreground">Emojis</strong> are small inline images (~32 px) inserted
					with
					<code
						class="bg-muted px-1 py-0.5 rounded text-xs font-mono text-foreground border border-border"
						>:{emoji.code}:</code
					>. <strong class="text-foreground">Stickers</strong> are large standalone images (320 px) sent
					as their own message.
				</dd>
			</div>

			{#if emoji.guild}
				<div class="rounded-xl bg-muted/30 border border-border px-4 py-3 sm:col-span-2">
					<dt class="font-semibold text-sm text-foreground mb-1">
						Where does this emoji come from?
					</dt>
					<dd class="text-sm text-muted-foreground leading-relaxed">
						From the
						<strong class="text-foreground">{guildInfo?.name ?? "a Discord server"}</strong> -
						<a
							href="/servers/{guildInfo?.slug ?? emoji.guild}"
							class="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
							>view server</a
						>
						or
						<a
							href="/emojis?guild={emoji.guild}"
							class="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
							>browse all its emojis</a
						>.
					</dd>
				</div>
			{/if}
		</dl>
	</div>

	<!-- Related emojis -->
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
						<circle cx="12" cy="12" r="10" />
						<path d="M8 14s1.5 2 4 2 4-2 4-2" />
						<line x1="9" y1="9" x2="9.01" y2="9" />
						<line x1="15" y1="9" x2="15.01" y2="9" />
					</svg>
				</div>
				<div>
					<h2 class="text-xl font-extrabold font-heading text-foreground leading-tight">
						More Emojis
					</h2>
					<p class="text-xs text-muted-foreground mt-0.5">Discover more custom emojis</p>
				</div>
				<a
					href="/emojis"
					class="ml-auto text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
				>
					View all →
				</a>
			</div>

			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
				{#each related as e (e.id)}
					<EmojiCard emoji={e} />
				{/each}
			</div>
		</div>
	{/if}
</div>
