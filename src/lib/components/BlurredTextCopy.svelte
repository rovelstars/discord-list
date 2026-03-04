<script lang="ts">
	import { onMount } from "svelte";
	import { Eye, EyeOff, Check, Copy } from "@lucide/svelte";

	export let text: string = "";
	export let className: string = "";

	let isBlurred = true;
	let isCopied = false;
	let copyTimeout: ReturnType<typeof setTimeout> | null = null;

	// Toggle blur on/off
	function toggleBlur() {
		isBlurred = !isBlurred;
	}

	// Robust copy: try navigator.clipboard, fall back to textarea
	async function copyToClipboard(value: string) {
		try {
			if (navigator.clipboard && navigator.clipboard.writeText) {
				await navigator.clipboard.writeText(value);
			} else {
				// fallback
				const ta = document.createElement("textarea");
				ta.value = value;
				// Move element out of screen to make it invisible
				ta.style.position = "absolute";
				ta.style.left = "-9999px";
				document.body.appendChild(ta);
				ta.select();
				document.execCommand("copy");
				document.body.removeChild(ta);
			}
			return true;
		} catch (e) {
			return false;
		}
	}

	async function handleCopy() {
		const ok = await copyToClipboard(text);
		if (ok) {
			isCopied = true;
			if (copyTimeout) clearTimeout(copyTimeout);
			copyTimeout = setTimeout(() => {
				isCopied = false;
				copyTimeout = null;
			}, 2000);
		} else {
			// best-effort fallback UI: brief flash or console message
			// keep it silent so we don't spam the user
			console.warn("Copy failed");
		}
	}

	// Cleanup
	onMount(() => {
		return () => {
			if (copyTimeout) clearTimeout(copyTimeout);
		};
	});
</script>

<div class={`flex items-center space-x-2 ${className}`}>
	<div class="relative grow">
		<p
			class={`font-mono p-2 rounded transition-all duration-200 bg-background text-foreground ${
				isBlurred ? "blur-sm select-none" : "select-text"
			}`}
			aria-hidden={isBlurred}
			title={isBlurred ? "Hidden - click eye to reveal" : ""}
		>
			{isBlurred ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : text}
		</p>

		<!-- Toggle blur button (visually inside the text block) -->
		<button
			type="button"
			class="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-accent/30 focus:outline-none focus:ring-2 focus:ring-ring"
			on:click={toggleBlur}
			aria-pressed={!isBlurred}
			aria-label={isBlurred ? "Show text" : "Hide text"}
			title={isBlurred ? "Show text" : "Hide text"}
		>
			{#if isBlurred}
				<Eye class="w-4 h-4" aria-hidden="true" />
			{:else}
				<EyeOff class="w-4 h-4" aria-hidden="true" />
			{/if}
		</button>
	</div>

	<!-- Copy button -->
	<button
		type="button"
		class="inline-flex items-center justify-center rounded p-2 hover:bg-accent/30 focus:outline-none focus:ring-2 focus:ring-ring"
		on:click={handleCopy}
		aria-label="Copy to clipboard"
		title="Copy to clipboard"
	>
		{#if isCopied}
			<Check class="w-4 h-4 text-green-600" aria-hidden="true" />
		{:else}
			<Copy class="w-4 h-4" aria-hidden="true" />
		{/if}
	</button>

	<!-- Inline feedback -->
	{#if isCopied}
		<span class="text-sm text-green-600">Copied!</span>
	{/if}
</div>

<style>
	/* Lightweight defaults so component looks reasonable even before Tailwind runs.
     The project uses CSS variables defined in global.css for colors. */
	:global(.bg-background) {
		background-color: hsl(var(--background));
	}
	:global(.text-foreground) {
		color: hsl(var(--foreground));
	}
	:global(.bg-accent) {
		background-color: hsl(var(--accent));
	}
	:global(.text-muted-foreground) {
		color: hsl(var(--muted-foreground));
	}
</style>
