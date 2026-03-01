<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	/**
	 * Checkbox.svelte
	 *
	 * A lightweight, accessible port of the old project's Checkbox control.
	 * - Supports bind:checked
	 * - For styling, it preserves Tailwind utility class names used in the original project
	 *   (e.g. `peer`, `peer-checked:*`, `border-primary`, etc.) so the theme tokens in
	 *   `global.css` apply.
	 *
	 * Props:
	 * - checked (bindable) : boolean
	 * - id, name, value     : forwarded to <input>
	 * - disabled            : boolean
	 * - className           : extra classes for the wrapper
	 * - label               : optional string fallback for the slot content
	 *
	 * Usage:
	 *  <Checkbox bind:checked id="agree">Agree to terms</Checkbox>
	 */

	export let checked: boolean = false;
	export let id: string | undefined;
	export let name: string | undefined;
	export let value: string | undefined;
	export let disabled: boolean = false;
	export let className: string = '';
	export let label: string | null = null;
	export let ariaLabel: string | undefined = undefined;

	const dispatch = createEventDispatcher();

	function handleChange(e: Event) {
		const el = e.currentTarget as HTMLInputElement;
		checked = el.checked;
		// Emit events similar to native input
		dispatch('change', { checked });
		dispatch('input', { checked });
	}
</script>

<!--
  Structure:
  <label>
    <input class="peer" />
    <span class="indicator ... peer-checked:...">[check svg]</span>
    <slot/> (or label prop)
  </label>

  The order keeps the indicator as the immediate sibling of the input so `peer` utilities work.
-->
<label
	class={`inline-flex items-center gap-2 ${className}`}
	data-state={checked ? 'checked' : 'unchecked'}
>
	<input
		{id}
		{name}
		{value}
		type="checkbox"
		class="peer sr-only"
		bind:checked
		{disabled}
		aria-checked={checked}
		aria-label={ariaLabel}
		on:change={handleChange}
	/>

	<!-- Visual indicator: driven directly by Svelte's checked state -->
	<span
		class="h-4 w-4 shrink-0 rounded-sm border flex items-center justify-center transition-colors"
		class:border-primary={!checked}
		class:bg-primary={checked}
		class:border-transparent={checked}
		class:text-primary-foreground={checked}
		aria-hidden="true"
	>
		{#if checked}
			<!-- simple check icon -->
			<svg
				class="w-3 h-3"
				viewBox="0 0 24 24"
				fill="none"
				aria-hidden="true"
				focusable="false"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M20 6L9 17l-5-5"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		{/if}
	</span>

	<!-- Label content: prefer slot content, fallback to `label` prop -->
	<slot>{label}</slot>
</label>

<style>
	/* Minimal style adjustments to match original appearance intentions.
     Most styling is expected to come from Tailwind utility classes in global.css. */

	/* Ensure the indicator doesn't capture pointer events (input handles clicks) */
	span[aria-hidden='true'] {
		pointer-events: none;
	}

	/* Slight vertical alignment tweak for the label text when present */
	:global(label) > :not(input):not(span) {
		line-height: 1;
		font-size: 0.9375rem; /* near text-sm */
	}
</style>
