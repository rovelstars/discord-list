<script lang="ts" context="module">
	import type { Writable } from 'svelte/store';
	export type RadioGroupContext = {
		store: Writable<string>;
		name: string;
	};
</script>

<script lang="ts">
	import { setContext } from 'svelte';
	import { writable } from 'svelte/store';

	export let value: string = '';
	export let name: string = `radio-group-${Math.random().toString(36).slice(2, 7)}`;
	export let className: string = '';

	const store = writable(value);

	// Keep store in sync if parent changes value externally
	$: store.set(value);

	// Keep exported value in sync when store changes (for bind:value)
	store.subscribe((v) => (value = v));

	setContext<RadioGroupContext>('radio-group', { store, name });
</script>

<div class="grid gap-2 {className}" role="radiogroup">
	<slot />
</div>
