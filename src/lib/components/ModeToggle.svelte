<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	// Theme can be 'light' | 'dark' | 'system'
	let theme: 'light' | 'dark' | 'system' = 'system';
	let open = false;

	// Media query for system preference
	let mql: MediaQueryList | null = null;

	function prefersDark() {
		try {
			return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
		} catch {
			return false;
		}
	}

	// Apply the theme to document.documentElement
	function applyTheme(t: typeof theme) {
		const isDark = t === 'dark' || (t === 'system' && prefersDark());
		if (isDark) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}

	// Persist selection
	function persistTheme(t: typeof theme) {
		try {
			localStorage.setItem('theme', t);
		} catch {}
		// Also write to a cookie so the server can read it on SSR
		try {
			const maxAge = 60 * 60 * 24 * 365; // 1 year
			document.cookie = `theme=${t};path=/;max-age=${maxAge};SameSite=Lax`;
		} catch {}
	}

	// Called when user selects an item
	function setTheme(t: typeof theme) {
		theme = t;
		applyTheme(theme);
		persistTheme(theme);
		// close the menu after selection
		open = false;
	}

	// Initialize theme from localStorage or system
	onMount(() => {
		try {
			const stored = localStorage.getItem('theme');
			if (stored === 'light' || stored === 'dark' || stored === 'system') {
				theme = stored;
			} else {
				// default to system to be non-intrusive
				theme = 'system';
			}
		} catch {
			theme = 'system';
		}

		applyTheme(theme);

		// Listen to system changes when using 'system' theme
		try {
			mql = window.matchMedia('(prefers-color-scheme: dark)');
			const handler = () => {
				if (theme === 'system') applyTheme('system');
			};
			mql.addEventListener ? mql.addEventListener('change', handler) : mql.addListener(handler);

			// Close menu on outside click
			const onDocClick = (e: MouseEvent) => {
				const el = e.target as HTMLElement;
				// If the click isn't inside our component area (we'll mark the root by id),
				// then close the menu. We rely on bubbling to document.
				const toggle = document.getElementById('mode-toggle-root');
				if (!toggle) return;
				if (!toggle.contains(el)) {
					open = false;
				}
			};
			document.addEventListener('click', onDocClick);

			onDestroy(() => {
				if (mql) {
					mql.removeEventListener
						? mql.removeEventListener('change', handler)
						: mql.removeListener(handler);
				}
				document.removeEventListener('click', onDocClick);
			});
		} catch {
			// ignore
		}
	});

	// helpers for aria / labels
	const labelMap = {
		light: 'Light',
		dark: 'Dark',
		system: 'System'
	} as const;
</script>

<!-- Root wrapper with an id used by the outside-click handler -->
<div id="mode-toggle-root" class="relative inline-block text-left">
	<!-- Trigger button -->
	<button
		type="button"
		class="inline-flex items-center justify-center gap-0 h-10 w-10 rounded-md border border-input bg-background px-2 py-2 relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
		aria-haspopup="true"
		aria-expanded={open}
		on:click={() => (open = !open)}
		aria-label="Toggle theme"
	>
		<!-- Sun icon -->
		<svg
			class="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
			focusable="false"
		>
			<path
				d="M12 3v2M12 19v2M5.22 5.22l1.42 1.42M17.36 17.36l1.42 1.42M3 12h2M19 12h2M5.22 18.78l1.42-1.42M17.36 6.64l1.42-1.42"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
			<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5" />
		</svg>

		<!-- Moon icon overlapping -->
		<svg
			class="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
			focusable="false"
		>
			<path
				d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				fill="currentColor"
			/>
		</svg>

		<span class="sr-only">Toggle theme</span>
	</button>

	<!-- Dropdown menu -->
	{#if open}
		<div
			class="absolute right-0 mt-2 w-36 origin-top-right rounded-md bg-popover border shadow-lg ring-1 ring-black/5 focus:outline-none z-50"
			role="menu"
			aria-orientation="vertical"
			aria-label="Theme options"
		>
			<div class="py-1">
				<button
					class="block w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
					role="menuitem"
					on:click={() => setTheme('light')}
				>
					Light
				</button>
				<button
					class="block w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
					role="menuitem"
					on:click={() => setTheme('dark')}
				>
					Dark
				</button>
				<button
					class="block w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
					role="menuitem"
					on:click={() => setTheme('system')}
				>
					System
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	/* Minimal CSS: most styling comes from Tailwind utility classes in global.css */
	.sr-only {
		position: absolute !important;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
