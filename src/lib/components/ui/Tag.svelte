<script lang="ts">
	/**
	 * Tag.svelte
	 *
	 * A small, reusable "tag" UI component that mirrors the look-and-feel
	 * of the original React-based Tag used in the bot cards.
	 *
	 * API:
	 *  - <Tag firstClass="..." secondClass="...">
	 *      <span slot="first">Icon + Label</span>
	 *      <span slot="second">Value</span>
	 *    </Tag>
	 *
	 *  - Alternatively provide simple text via props:
	 *    <Tag firstText="In" secondText="10k" />
	 *
	 * The component emits no events and is purely presentational.
	 */

	export let firstClass: string = "";
	export let secondClass: string = "";
	export let className: string = "";

	// Convenience string props if consumer prefers to pass plain text instead of slots
	export let firstText: string | number | null = null;
	export let secondText: string | number | null = null;
</script>

<span class={`flex rounded-sm text-sm font-medium text-gray-700 mr-2 ${className}`}>
	<span class={`px-2 rounded-l-sm flex items-center ${firstClass}`}>
		<!-- first slot takes precedence; fall back to firstText -->
		<slot name="first">{firstText}</slot>
	</span>

	<span class={`px-2 rounded-r-sm text-center ${secondClass}`}>
		<!-- second slot takes precedence; fall back to secondText -->
		<slot name="second">{secondText}</slot>
	</span>
</span>

<style>
	/* Minimal local styles to ensure consistent spacing regardless of Tailwind state.
     Visual styling (colors, radii) is driven by Tailwind tokens / global CSS. */
	:global(.text-gray-700) {
		color: hsl(var(--muted));
	}

	/* Make sure text within tag aligns nicely */
	.px-2 {
		padding-left: 0.5rem;
		padding-right: 0.5rem;
	}

	.rounded-l-sm {
		border-top-left-radius: calc(var(--radius, 0.5rem) - 0.25rem);
		border-bottom-left-radius: calc(var(--radius, 0.5rem) - 0.25rem);
	}

	.rounded-r-sm {
		border-top-right-radius: calc(var(--radius, 0.5rem) - 0.25rem);
		border-bottom-right-radius: calc(var(--radius, 0.5rem) - 0.25rem);
	}
</style>
