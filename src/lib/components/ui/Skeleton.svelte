<script context="module" lang="ts">
	/**
	 * LabelHtml - returns a small HTML string for a label.
	 * Usage:
	 *   {@html LabelHtml({ forId: 'email', text: 'Email', className: 'text-sm' })}
	 *
	 * Note: This helper is intentionally small and returns a string. For interactive
	 * usage or to support more complex props, create a `Label.svelte` component.
	 */
	export function LabelHtml({
		forId = "",
		text = "",
		className = ""
	}: {
		forId?: string;
		text?: string;
		className?: string;
	} = {}) {
		const f = escapeAttr(forId);
		const t = escapeHtml(text);
		const cls = className ? " " + className : "";
		return `<label for="${f}" class="text-sm font-medium leading-none${cls}">${t}</label>`;
	}

	/**
	 * CheckboxHtml - returns a small HTML snippet for a checkbox with optional label.
	 * Usage:
	 *   {@html CheckboxHtml({ id: 'agree', checked: true, label: 'Agree' })}
	 *
	 * This is a static snippet. To capture events or use bindings, create a proper
	 * `Checkbox.svelte` component and use bind:checked.
	 */
	export function CheckboxHtml({
		id = "",
		checked = false,
		label = "",
		className = "",
		name = "",
		disabled = false
	}: {
		id?: string;
		checked?: boolean;
		label?: string;
		className?: string;
		name?: string;
		disabled?: boolean;
	} = {}) {
		const dis = disabled ? "disabled" : "";
		const ch = checked ? "checked" : "";
		const nameAttr = name ? `name="${escapeAttr(name)}"` : "";
		const html = `<label class="inline-flex items-center gap-2 ${escapeAttr(className)}" ${dis}>
      <input type="checkbox" id="${escapeAttr(id)}" ${nameAttr} ${ch} class="peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" ${dis} />
      <span class="text-sm">${escapeHtml(label)}</span>
    </label>`;
		return html;
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
	 * Skeleton.svelte
	 *
	 * Primary usage:
	 * <Skeleton class="w-32 h-4" />
	 *
	 * Exports helper functions to render simple Label and Checkbox HTML snippets
	 * via {@html LabelHtml(...)} and {@html CheckboxHtml(...)} when a plain HTML
	 * snippet is sufficient. These helpers are tiny convenience fallbacks so you
	 * can quickly port markup without creating many separate files at once.
	 *
	 * If you prefer true interactive Svelte components for Label/Checkbox, I can
	 * add `Label.svelte` and `Checkbox.svelte` as separate files in the same folder.
	 */

	export let className: string = ""; // additional classes
	export let as: string = "div"; // root element tag, default div
	export let role: string | null = null;
	export let ariaLabel: string | null = null;

	// forward any other attributes
	const dispatch = createEventDispatcher();

	// Simple, visually-neutral default dimensions if none provided
	$: computedClass = className && className.length > 0 ? className : "w-full h-4";

	// Module-level helpers exported for convenience (see below)
</script>

<svelte:element
	this={as}
	class={`animate-pulse rounded-md bg-muted ${computedClass}`}
	{role}
	aria-label={ariaLabel}
	on:click={(e) => dispatch("click", e)}
	{...$$restProps}
/>

<style>
	/* Minimal local styles; the project's Tailwind tokens provide colors (bg-muted). */
	:global(.bg-muted) {
		/* leave it to Tailwind variable classes; this is only a fallback in case it's missing */
	}
</style>
