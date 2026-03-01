<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';

	/**
	 * Textarea.svelte
	 *
	 * A lightweight, accessible textarea component ported to Svelte.
	 * - Supports bind:value
	 * - Optional `autoGrow` to autosize height to content
	 * - Preserves Tailwind utility class names used elsewhere in the project
	 *
	 * Props:
	 *  - value: string (bindable)
	 *  - placeholder: string
	 *  - rows: number
	 *  - id, name, disabled, readonly, maxlength, minlength
	 *  - autoGrow: boolean (default: false)
	 *  - class: additional classes (merged with defaults)
	 *
	 * Usage:
	 *  <Textarea bind:value rows={6} placeholder="Write..." autoGrow />
	 */

	export let value: string = '';
	export let placeholder: string = '';
	export let rows: number = 4;
	export let id: string | undefined = undefined;
	export let name: string | undefined = undefined;
	export let disabled: boolean = false;
	export let readonly: boolean = false;
	export let maxlength: number | undefined = undefined;
	export let minlength: number | undefined = undefined;
	export let autoGrow: boolean = false;
	export let classId: string = '';

	const dispatch = createEventDispatcher();

	let textareaEl: HTMLTextAreaElement | null = null;

	function onInput(e: Event) {
		const t = e.currentTarget as HTMLTextAreaElement;
		value = t.value;
		if (autoGrow) adjustHeight();
		dispatch('input', { value });
	}

	function onChange(e: Event) {
		const t = e.currentTarget as HTMLTextAreaElement;
		dispatch('change', { value: t.value });
	}

	function adjustHeight() {
		if (!textareaEl) return;
		// reset height to measure scrollHeight correctly
		textareaEl.style.height = 'auto';
		const scroll = textareaEl.scrollHeight;
		// optional small padding to avoid scrollbar appearing
		textareaEl.style.height = Math.max(scroll, 40) + 'px';
	}

	onMount(() => {
		if (autoGrow && textareaEl) {
			// Grow to content on mount
			adjustHeight();
		}
	});
</script>

<textarea
	bind:this={textareaEl}
	bind:value
	{id}
	{name}
	{placeholder}
	{rows}
	{disabled}
	{readonly}
	{maxlength}
	{minlength}
	class={`w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-vertical ${classId}`}
	on:input={onInput}
	on:change={onChange}
	{...$$restProps}
></textarea>

<style>
	/* Minimal fallbacks so textarea looks OK even if Tailwind hasn't been processed yet.
     The project relies on CSS variables defined in global.css for colors. */
	textarea {
		font-family: inherit;
		color: hsl(var(--foreground));
		background-color: hsl(var(--background));
		border-radius: 0.375rem;
		line-height: 1.4;
		min-height: 2.5rem;
		/* allow vertical resizing by default; autoGrow will still update height programmatically */
		resize: vertical;
		padding: 0.5rem 0.75rem;
		box-sizing: border-box;
	}

	textarea:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
