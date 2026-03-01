<script lang="ts">
	import { getContext } from 'svelte';
	import type { RadioGroupContext } from './RadioGroup.svelte';

	export let value: string;
	export let id: string | undefined = undefined;
	export let disabled: boolean = false;

	const ctx = getContext<RadioGroupContext>('radio-group');

	let checked = false;
	ctx.store.subscribe((v) => (checked = v === value));
</script>

<button
	type="button"
	role="radio"
	aria-checked={checked}
	{id}
	{disabled}
	class="aspect-square h-4 w-4 rounded-full border border-primary ring-offset-background
		focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
		disabled:cursor-not-allowed disabled:opacity-50
		flex items-center justify-center shrink-0"
	on:click={() => !disabled && ctx.store.set(value)}
	on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && !disabled && ctx.store.set(value)}
>
	{#if checked}
		<span class="h-2 w-2 rounded-full bg-primary block"></span>
	{/if}
</button>
