<script lang="ts">
	import { onMount, onDestroy, tick } from "svelte";
	import { browser } from "$app/environment";
	import { themeStore, themeActions, initThemeStore } from "$lib/theme-store";
	import { THEMES } from "$lib/theme";
	import { Sun, Moon, Monitor, Check } from "@lucide/svelte";

	let open = false;
	let triggerEl: HTMLButtonElement;
	let dropdownEl: HTMLDivElement;

	// ── Positioning ───────────────────────────────────────────────────────────
	// Reads the trigger's viewport rect and writes absolute top/left onto the
	// dropdown node (which lives on <body>, so coordinates are page-relative).

	async function position() {
		await tick();
		if (!triggerEl || !dropdownEl) return;

		const rect = triggerEl.getBoundingClientRect();
		const dropW = 256; // 16rem = w-64
		const vw = window.innerWidth;

		// Right-align to trigger, clamped within the viewport
		let left = rect.right + window.scrollX - dropW;
		if (left < 8) left = 8;
		if (left + dropW > vw - 8) left = vw - dropW - 8;

		const top = rect.bottom + window.scrollY + 8;

		dropdownEl.style.top = `${top}px`;
		dropdownEl.style.left = `${left}px`;
	}

	// ── Open / close ──────────────────────────────────────────────────────────

	async function openMenu() {
		open = true;
		await position();
	}

	function closeMenu() {
		open = false;
	}

	function toggle(e: MouseEvent) {
		e.stopPropagation();
		open ? closeMenu() : openMenu();
	}

	// ── Global handlers ───────────────────────────────────────────────────────

	function onDocClick(e: MouseEvent) {
		const t = e.target as Node;
		if (!triggerEl?.contains(t) && !dropdownEl?.contains(t)) closeMenu();
	}

	function onKeyDown(e: KeyboardEvent) {
		if (e.key === "Escape") closeMenu();
	}

	function onScrollResize() {
		if (open) position();
	}

	// ── Lifecycle ─────────────────────────────────────────────────────────────

	onMount(() => {
		initThemeStore();
		document.addEventListener("click", onDocClick, true);
		document.addEventListener("keydown", onKeyDown);
		window.addEventListener("scroll", onScrollResize, { passive: true });
		window.addEventListener("resize", onScrollResize, { passive: true });
	});

	onDestroy(() => {
		if (!browser) return;
		document.removeEventListener("click", onDocClick, true);
		document.removeEventListener("keydown", onKeyDown);
		window.removeEventListener("scroll", onScrollResize);
		window.removeEventListener("resize", onScrollResize);
	});

	// ── Svelte action: portal ─────────────────────────────────────────────────
	// Moves the node to document.body so it escapes any overflow/clip ancestor.
	// The function itself only does DOM work - it is only ever called by Svelte
	// on the client (actions never run during SSR), so no browser guard needed.

	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return {
			destroy() {
				if (node.parentNode) node.parentNode.removeChild(node);
			}
		};
	}

	// ── Theme state ───────────────────────────────────────────────────────────

	$: mode = $themeStore.mode;
	$: accent = $themeStore.accent;
	$: isDark = $themeStore.resolvedPolarity === "dark";
</script>

<!-- ── Trigger ────────────────────────────────────────────────────────────── -->
<!-- Lives in normal document flow inside the navbar. -->
<button
	bind:this={triggerEl}
	type="button"
	aria-haspopup="dialog"
	aria-expanded={open}
	aria-label="Open theme selector"
	on:click={toggle}
	class="relative inline-flex items-center justify-center h-10 w-10 rounded-md border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 overflow-hidden"
>
	<!-- Sun - shown in light mode -->
	<Sun
		class="h-5 w-5 transition-all duration-200 {isDark
			? 'scale-0 rotate-90 absolute'
			: 'scale-100 rotate-0'}"
		aria-hidden="true"
	/>
	<!-- Moon - shown in dark mode -->
	<Moon
		class="h-5 w-5 transition-all duration-200 {isDark
			? 'scale-100 rotate-0'
			: 'scale-0 -rotate-90 absolute'}"
		aria-hidden="true"
	/>
	<span class="sr-only">Theme selector</span>
</button>

<!-- ── Dropdown panel ─────────────────────────────────────────────────────── -->
<!--
	use:portal appends this node to <body>, so it is never clipped by the
	navbar's overflow-x:auto. Svelte actions are client-only - they never
	execute during SSR - so document access here is always safe.
	The {#if} is also gated on `browser` as a belt-and-braces guard.
-->
{#if open && browser}
	<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
	<div
		bind:this={dropdownEl}
		use:portal
		on:click|stopPropagation={() => {}}
		on:keydown|stopPropagation={() => {}}
		role="dialog"
		aria-label="Theme settings"
		aria-modal="false"
		tabindex="-1"
		style="position:absolute; z-index:9999; width:256px; top:0; left:0;"
		class="rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl ring-1 ring-black/10 dark:ring-white/10 focus:outline-none"
	>
		<!-- ── Mode ───────────────────────────────────────────────────────────── -->
		<div class="px-3 pt-3 pb-2">
			<p
				class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-0.5"
			>
				Mode
			</p>
			<div class="grid grid-cols-3 gap-1.5">
				{#each [{ id: "light", label: "Light", icon: "sun" }, { id: "dark", label: "Dark", icon: "moon" }, { id: "system", label: "System", icon: "monitor" }] as m (m.id)}
					<button
						type="button"
						on:click={() => themeActions.setMode(m.id as any)}
						aria-pressed={mode === m.id}
						class="flex flex-col items-center gap-1 rounded-lg py-2 px-1 text-xs font-medium transition-colors {mode ===
						m.id
							? 'bg-primary text-primary-foreground'
							: 'bg-background hover:bg-accent hover:text-accent-foreground text-foreground border border-border'}"
					>
						{#if m.icon === "sun"}
							<Sun class="h-4 w-4" aria-hidden="true" />
						{:else if m.icon === "moon"}
							<Moon class="h-4 w-4" aria-hidden="true" />
						{:else}
							<Monitor class="h-4 w-4" aria-hidden="true" />
						{/if}
						{m.label}
					</button>
				{/each}
			</div>
		</div>

		<div class="mx-3 border-t border-border"></div>

		<!-- ── Accent theme swatches ──────────────────────────────────────────── -->
		<div class="px-3 pt-2 pb-3">
			<p
				class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-0.5"
			>
				Accent Theme
			</p>
			<div class="grid grid-cols-5 gap-2">
				{#each THEMES as t (t.id)}
					<button
						type="button"
						title={t.label}
						aria-label="Select {t.label} theme"
						aria-pressed={accent === t.id}
						on:click={() => themeActions.setAccent(t.id as any)}
						class="group relative flex flex-col items-center gap-1"
					>
						<span
							class="flex items-center justify-center h-8 w-8 rounded-full border-2 transition-all duration-150 shadow-sm {accent ===
							t.id
								? 'border-foreground scale-110 shadow-md'
								: 'border-transparent hover:border-foreground/40 hover:scale-105'}"
							style="background-color: {t.swatch};"
						>
							{#if accent === t.id}
								<Check class="h-4 w-4 drop-shadow" stroke="white" aria-hidden="true" />
							{/if}
						</span>
						<span
							class="text-[9px] leading-tight text-center text-muted-foreground group-hover:text-foreground transition-colors max-w-full truncate w-full px-0.5"
						>
							{t.label}
						</span>
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}

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
