<!--
  Minimal helpers exported from module scope.
  These helpers return HTML strings suitable for quick use via {@html ...}
  in templates. They are intentionally small and not interactive Svelte components.
  If you need interactive behavior (binding, events), extract them into their
  own `.svelte` components.
-->
<script context="module" lang="ts">
	/**
	 * Returns a simple checkbox HTML snippet.
	 * Usage:
	 *  {@html CheckboxHtml({ id: 'agree', checked: true, className: 'my-class' })}
	 *
	 * Note: This is a static snippet — to capture events or use bind:checked,
	 * create a proper `Checkbox.svelte` component instead.
	 */
	export function CheckboxHtml({
		id = "",
		checked = false,
		className = "",
		label = "",
		name = "",
		disabled = false
	}: {
		id?: string;
		checked?: boolean;
		className?: string;
		label?: string;
		name?: string;
		disabled?: boolean;
	}) {
		const dis = disabled ? "disabled" : "";
		const ch = checked ? "checked" : "";
		const html = `<label class="inline-flex items-center gap-2 ${className}" ${dis}>
      <input type="checkbox" ${ch} id="${escapeAttr(id)}" name="${escapeAttr(name)}"
        class="peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" ${dis} />
      <span class="text-sm">${escapeHtml(label)}</span>
    </label>`;
		return html;
	}

	/**
	 * Simple label HTML helper.
	 * Usage:
	 *  {@html LabelHtml({ forId: 'email', text: 'Email' })}
	 */
	export function LabelHtml({
		forId = "",
		text = "",
		className = ""
	}: {
		forId?: string;
		text?: string;
		className?: string;
	}) {
		return `<label for="${escapeAttr(forId)}" class="${className} text-sm font-medium leading-none">${escapeHtml(text)}</label>`;
	}

	/**
	 * Skeleton HTML helper (visual placeholder).
	 * Usage:
	 *  {@html SkeletonHtml({ width: 'w-32', height: 'h-4', className: '' })}
	 */
	export function SkeletonHtml({
		width = "w-full",
		height = "h-4",
		className = ""
	}: {
		width?: string;
		height?: string;
		className?: string;
	}) {
		// Using tailwind utility-like classes consistent with the project's style tokens
		return `<div class="${width} ${height} bg-muted animate-pulse rounded ${className}"></div>`;
	}

	// Small escaping helpers to avoid emitting raw user input into HTML helpers
	function escapeHtml(str: any) {
		if (str == null) return "";
		return String(str)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	}

	function escapeAttr(str: any) {
		if (str == null) return "";
		return String(str).replace(/"/g, "&quot;");
	}
</script>

<script lang="ts">
	import { createEventDispatcher } from "svelte";

	/**
	 * Input.svelte
	 *
	 * A simple Svelte port of the old project's Input control.
	 *
	 * Props:
	 *  - value (bindable)
	 *  - type (default 'text')
	 *  - class (string) additional classes
	 *  - placeholder, name, id, disabled, etc. (forwarded)
	 *
	 * Usage:
	 *  <Input bind:value placeholder="Search..." />
	 *
	 * Note: This file also ships simple HTML-producing helpers for Checkbox, Label,
	 * and Skeleton for quick portability. They return small HTML snippets as strings
	 * (use {@html ...}) and are intentionally minimal. For a full-featured Svelte
	 * component it's recommended to extract them into their own `.svelte` files.
	 */

	export let value: string | number | undefined = undefined;
	export let type: string = "text";
	export let classId: string = "";
	export let placeholder: string = "";
	export let id: string | undefined = undefined;
	export let name: string | undefined = undefined;
	export let disabled: boolean = false;
	export let readonly: boolean = false;
	export let inputmode: string | undefined = undefined;
	export let autocomplete: string | undefined = undefined;
	export let ariaLabel: string | undefined = undefined;

	// collect other attributes passed by the consumer via $$restProps
	// Svelte exposes $$restProps automatically in templates; we can forward them to the input
	const dispatch = createEventDispatcher();

	// Emit input/change events while keeping two-way binding
	function onInput(e: Event) {
		const target = e.target as HTMLInputElement;
		value = target.value;
		dispatch("input", { value });
	}

	function onChange(e: Event) {
		const target = e.target as HTMLInputElement;
		value = target.value;
		dispatch("change", { value });
	}
</script>

<input
	{id}
	{name}
	class={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm ${classId}`}
	bind:value
	{type}
	{placeholder}
	{disabled}
	{readonly}
	{inputmode}
	{autocomplete}
	aria-label={ariaLabel}
	on:input={onInput}
	on:change={onChange}
	{...$$restProps}
/>

<style>
	/* Minimal local styles where helpful; primary styling is from Tailwind tokens in global.css */
	input {
		outline: none;
	}
</style>
