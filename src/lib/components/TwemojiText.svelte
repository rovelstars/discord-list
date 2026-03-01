<script lang="ts">
	import { onMount } from "svelte";

	/**
	 * TwemojiText
	 *
	 * A small Svelte wrapper that parses its children with `twemoji.parse`
	 * on the client to replace unicode emoji with Twemoji images.
	 *
	 * Notes:
	 * - We dynamically import `twemoji` inside `onMount` so SSR won't try to load it.
	 * - The default class mimics the original project's React wrapper:
	 *   "twemoji w-auto h-[1em] inline -translate-y-0.5"
	 *
	 * Usage:
	 * <TwemojiText>Some text 😊</TwemojiText>
	 *
	 * Make sure `twemoji` is installed in the project dependencies:
	 * npm i twemoji
	 */

	export let className: string = "";

	let container: HTMLElement | null = null;

	onMount(async () => {
		if (!container) return;

		try {
			// Dynamic import so SSR doesn't try to require twemoji
			const mod = await import("twemoji");
			// twemoji exports as default in ESM builds, but keep fallback
			const twemoji = (mod && (mod as any).default) || mod;

			// Build the className used on generated <img> tags
			const imgClass =
				"twemoji w-auto h-[1em] inline -translate-y-0.5" + (className ? " " + className : "");

			// Parse the container's contents and replace emoji with images
			twemoji.parse(container, {
				folder: "svg",
				ext: ".svg",
				className: imgClass
			});
		} catch (err) {
			// If twemoji is not installed or parsing fails, silently fallback to raw text.
			// Logging is helpful during development.
			// eslint-disable-next-line no-console
			console.warn("Twemoji parsing failed:", err);
		}
	});
</script>

<span bind:this={container} class="twemoji-text"><slot /></span>
