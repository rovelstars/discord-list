<script lang="ts">
	import { buttonVariants } from "$lib/components/ui/button.js";

	export let emoji: {
		id: string;
		code: string;
		name: string;
		alt_names: string[];
		a: boolean;
		dc: number;
		added_at: string | null;
		guild: string | null;
		submitter: string | null;
	};

	/** If true, clicking the card navigates to the emoji page. Default: true. */
	export let linkable: boolean = true;
	/** If true, show a compact inline download button on the card. Default: true. */
	export let showDownload: boolean = true;

	$: emojiUrl = (() => {
		const ext = emoji.a ? "gif" : "webp";
		const size = emoji.a ? "" : "?size=128";
		return `https://cdn.discordapp.com/emojis/${emoji.id}.${ext}${size}`;
	})();

	$: badge = emoji.a ? "GIF" : "PNG";

	let downloading = false;
	let downloadError = false;

	async function handleDownload(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (downloading) return;

		downloading = true;
		downloadError = false;

		try {
			const res = await fetch(`/api/emojis/${emoji.id}/download`, { method: "POST" });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);

			const { url, filename } = await res.json();

			// Fetch the actual binary so we can trigger a real Save-As dialog
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
		} catch {
			downloadError = true;
			setTimeout(() => (downloadError = false), 3000);
		} finally {
			downloading = false;
		}
	}

	/** Prevent right-click context menu on the emoji image */
	function preventContextMenu(e: MouseEvent) {
		e.preventDefault();
	}
</script>

<div
	class="group relative bg-popover border border-border rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
	role="presentation"
>
	<!-- Animated badge -->
	<div class="absolute top-2 left-2 z-10">
		<span
			class="text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none
				{emoji.a ? 'bg-purple-500/90 text-white' : 'bg-muted/80 text-muted-foreground backdrop-blur-sm'}"
		>
			{badge}
		</span>
	</div>

	<!-- Emoji image area -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="relative flex items-center justify-center bg-linear-to-br from-muted/40 to-muted/20 h-28"
		on:contextmenu={preventContextMenu}
	>
		{#if linkable}
			<a
				href="/emojis/{emoji.id}"
				class="flex items-center justify-center w-full h-full"
				tabindex="-1"
				aria-label="View {emoji.name}"
			>
				<img
					src={emojiUrl}
					alt={emoji.name}
					class="w-16 h-16 object-contain select-none pointer-events-none"
					draggable="false"
					loading="lazy"
					on:contextmenu={preventContextMenu}
				/>
			</a>
		{:else}
			<img
				src={emojiUrl}
				alt={emoji.name}
				class="w-16 h-16 object-contain select-none pointer-events-none"
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
				title="Download {emoji.name}"
				aria-label="Download {emoji.name}"
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
				href="/emojis/{emoji.id}"
				class="block font-semibold text-sm text-foreground hover:text-primary transition-colors truncate leading-tight"
				title={emoji.name}
			>
				{emoji.name}
			</a>
		{:else}
			<p class="font-semibold text-sm text-foreground truncate leading-tight" title={emoji.name}>
				{emoji.name}
			</p>
		{/if}

		<!-- Code (original Discord name) -->
		<p class="text-xs text-muted-foreground font-mono truncate mt-0.5" title=":{emoji.code}:">
			:{emoji.code}:
		</p>

		<!-- Footer: downloads -->
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
				<span>{emoji.dc.toLocaleString()}</span>
			</div>

			{#if emoji.guild}
				<a
					href="/servers/{emoji.guild}"
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
