<script lang="ts">
	import { onMount } from "svelte";
	import { themeStore, themeActions, initThemeStore } from "$lib/theme-store";
	import { Sun, Moon, Monitor } from "@lucide/svelte";

	onMount(() => {
		initThemeStore();
	});

	$: isDark = $themeStore.resolvedPolarity === "dark";
	$: mode = $themeStore.mode;

	function setMode(m: "light" | "dark" | "system") {
		themeActions.setMode(m);
	}

	let open = false;
	let rootEl: HTMLDivElement;

	function handleDocClick(e: MouseEvent) {
		if (rootEl && !rootEl.contains(e.target as Node)) {
			open = false;
		}
	}

	onMount(() => {
		document.addEventListener("click", handleDocClick);
		return () => document.removeEventListener("click", handleDocClick);
	});
</script>

<div bind:this={rootEl} id="mode-toggle-root" class="relative inline-block text-left">
	<!-- Trigger button -->
	<button
		type="button"
		class="inline-flex items-center justify-center gap-0 h-10 w-10 rounded-md border border-border bg-background text-foreground px-2 py-2 relative overflow-hidden hover:bg-accent hover:text-accent-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
		aria-haspopup="true"
		aria-expanded={open}
		on:click|stopPropagation={() => (open = !open)}
		aria-label="Toggle theme"
	>
		<!-- Sun icon (shown in light mode) -->
		<Sun
			class="h-5 w-5 transition-all duration-200 {isDark
				? 'rotate-90 scale-0 absolute'
				: 'rotate-0 scale-100'}"
			aria-hidden="true"
		/>

		<!-- Moon icon (shown in dark mode) -->
		<Moon
			class="h-5 w-5 transition-all duration-200 {isDark
				? 'rotate-0 scale-100'
				: '-rotate-90 scale-0 absolute'}"
			aria-hidden="true"
		/>

		<span class="sr-only">Toggle theme</span>
	</button>

	<!-- Dropdown menu -->
	{#if open}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			on:click|stopPropagation
			class="absolute right-0 mt-2 w-36 origin-top-right rounded-md bg-popover border border-border shadow-lg ring-1 ring-black/5 dark:ring-white/5 focus:outline-none z-50"
			role="menu"
			aria-orientation="vertical"
			aria-label="Theme mode options"
			tabindex="-1"
		>
			<div class="py-1">
				{#each [{ id: "light", label: "Light" }, { id: "dark", label: "Dark" }, { id: "system", label: "System" }] as item}
					<button
						class="flex items-center gap-2 w-full text-left px-3 py-2 text-sm transition-colors
							{mode === item.id
							? 'bg-primary text-primary-foreground font-semibold'
							: 'text-popover-foreground hover:bg-accent hover:text-accent-foreground'}"
						role="menuitem"
						on:click={() => {
							setMode(item.id as "light" | "dark" | "system");
							open = false;
						}}
					>
						{#if item.id === "light"}
							<Sun class="h-4 w-4 shrink-0" aria-hidden="true" />
						{:else if item.id === "dark"}
							<Moon class="h-4 w-4 shrink-0" aria-hidden="true" />
						{:else}
							<Monitor class="h-4 w-4 shrink-0" aria-hidden="true" />
						{/if}
						{item.label}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}
</style>
