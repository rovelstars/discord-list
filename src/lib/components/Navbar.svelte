<script lang="ts">
	import LoginButton from '$lib/components/LoginButton.svelte';
	import approx from '$lib/approx-num';
	import getAvatarURL from '$lib/get-avatar-url';
	import { goto, invalidateAll } from '$app/navigation';
	import LogoNavbar from '$lib/components/LogoNavbar.svelte';
	import { Bot, Home, LayoutDashboard, Trophy, Sparkles, LayoutGrid } from '@lucide/svelte';
	export let user: {
		id: string;
		username: string;
		tag: string;
		discriminator: string;
		avatar: string | null;
		bal: number;
	} | null = null;

	let mobileOpen = false;

	// ── Theme ──────────────────────────────────────────────────────────
	// Initialise from localStorage / system on the client; SSR gets 'light'
	// as a safe default (the <script is:inline> equivalent in app.html should
	// apply the class before paint to avoid flash).
	let theme: 'light' | 'dark' = 'light';

	function initTheme() {
		try {
			const stored = localStorage.getItem('theme');
			if (stored === 'dark' || stored === 'light') {
				theme = stored;
			} else {
				theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
			}
			applyTheme(theme);
		} catch {
			// SSR or restricted environment — no-op
		}
	}

	function applyTheme(t: 'light' | 'dark') {
		try {
			if (t === 'dark') document.documentElement.classList.add('dark');
			else document.documentElement.classList.remove('dark');
			localStorage.setItem('theme', t);
		} catch {
			// no-op in SSR
		}
		// Also persist to cookie so the server can apply the correct class on SSR
		try {
			const maxAge = 60 * 60 * 24 * 365; // 1 year
			document.cookie = `theme=${t};path=/;max-age=${maxAge};SameSite=Lax`;
		} catch {
			// no-op
		}
	}

	function toggleTheme() {
		theme = theme === 'dark' ? 'light' : 'dark';
		applyTheme(theme);
	}

	async function logout() {
		await fetch('/logout', { method: 'POST' });
		await invalidateAll();
		await goto('/');
	}

	$: avatarSrc = user?.avatar
		? getAvatarURL(user.id, user.avatar, 64)
		: '/assets/img/bot/logo-144.png';

	import { onMount } from 'svelte';
	onMount(initTheme);
</script>

<nav
	class="fixed top-0 left-0 right-0 z-50 min-h-16 bg-popover drop-shadow-xl flex items-center overflow-x-auto"
>
	<!-- Logo -->
	<div class="flex items-center pl-3 pr-4 shrink-0">
		<a href="/" class="flex items-center">
			<LogoNavbar />
		</a>
	</div>

	<!-- Nav links -->
	<div class="flex items-center gap-5 px-4 flex-1">
		<!-- Home -->
		<a
			href="/"
			class="flex items-center text-lg font-bold text-primary hover:opacity-80 transition-opacity"
		>
			<Home size={24} class="mt-0.5" />
			<span class="ml-1 hidden md:inline">Home</span>
		</a>

		<!-- Bots -->
		<a
			href="/bots"
			class="flex items-center text-lg font-bold text-primary hover:opacity-80 transition-opacity"
		>
			<Bot size={24} class="mt-0.5" />
			<span class="ml-1 hidden md:inline">Bots</span>
		</a>

		<!-- Top -->
		<a
			href="/top"
			class="flex items-center text-lg font-bold text-primary hover:opacity-80 transition-opacity"
		>
			<Trophy size={24} class="mt-0.5" />
			<span class="ml-1 hidden md:inline">Top</span>
		</a>

		<!-- New -->
		<a
			href="/new"
			class="flex items-center text-lg font-bold text-primary hover:opacity-80 transition-opacity"
		>
			<Sparkles size={24} class="mt-0.5" />
			<span class="ml-1 hidden md:inline">New</span>
		</a>

		<!-- Categories -->
		<a
			href="/categories"
			class="flex items-center text-lg font-bold text-primary hover:opacity-80 transition-opacity"
		>
			<LayoutGrid size={24} class="mt-0.5" />
			<span class="ml-1 hidden md:inline">Categories</span>
		</a>

		<!-- Dashboard — only when logged in -->
		{#if user}
			<a
				href="/dashboard"
				class="flex items-center text-lg font-bold text-primary hover:opacity-80 transition-opacity"
			>
				<LayoutDashboard size={24} class="mt-0.5" />
				<span class="ml-1 hidden md:inline">Dashboard</span>
			</a>
		{/if}
	</div>

	<!-- Right side: theme toggle + user / login -->
	<div class="flex items-center gap-2 pr-3 shrink-0">
		<!-- Theme toggle -->
		<button
			aria-label="Toggle theme"
			title="Toggle theme"
			class="p-2 rounded-md hover:bg-accent transition-colors"
			on:click={toggleTheme}
		>
			{#if theme === 'dark'}
				<!-- Sun -->
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="w-5 h-5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle cx="12" cy="12" r="4" />
					<path
						d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
					/>
				</svg>
			{:else}
				<!-- Moon -->
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="w-5 h-5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
				</svg>
			{/if}
		</button>

		{#if user}
			<!-- Avatar + username + coins + logout -->
			<div class="flex items-center gap-2">
				<!-- Coins badge (hidden on xs) -->
				<span class="hidden sm:flex items-center gap-1 text-sm font-semibold text-foreground">
					<img src="/assets/img/bot/moneh.svg" alt="coins" class="w-5 h-5" />
					R$ {approx(user.bal)}
				</span>

				<!-- Avatar -->
				<a href="/dashboard" title="Dashboard" class="shrink-0">
					<img
						src={avatarSrc}
						alt="{user.username}'s avatar"
						class="w-8 h-8 rounded-full border-2 border-primary object-cover"
						loading="lazy"
					/>
				</a>

				<!-- Username (hidden on small) -->
				<a
					href="/dashboard"
					class="hidden md:inline text-sm font-semibold text-foreground hover:underline whitespace-nowrap"
				>
					{user.username}
				</a>

				<!-- Logout -->
				<button
					on:click={logout}
					class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
				>
					Logout
				</button>
			</div>
		{:else}
			<!-- Login button — uses the scope-picker dialog -->
			<LoginButton />
		{/if}

		<!-- Mobile menu toggle -->
		<button
			class="md:hidden p-2 rounded-md hover:bg-accent transition-colors"
			aria-label="Toggle menu"
			aria-expanded={mobileOpen}
			on:click={() => (mobileOpen = !mobileOpen)}
		>
			{#if mobileOpen}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="w-6 h-6"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg
				>
			{:else}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="w-6 h-6"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg
				>
			{/if}
		</button>
	</div>
</nav>

<!-- Mobile menu -->
{#if mobileOpen}
	<div
		class="fixed top-16 left-0 right-0 z-40 border-t border-border bg-popover/95 backdrop-blur-sm md:hidden"
	>
		<div class="px-4 pt-3 pb-5 flex flex-col gap-3">
			<a
				href="/"
				class="flex items-center gap-2 py-2 text-lg font-bold text-primary"
				on:click={() => (mobileOpen = false)}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="w-5 h-5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline
						points="9 22 9 12 15 12 15 22"
					/>
				</svg>
				Home
			</a>

			<a
				href="/bots"
				class="flex items-center gap-2 py-2 text-lg font-bold text-primary"
				on:click={() => (mobileOpen = false)}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="w-5 h-5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<rect width="18" height="11" x="3" y="8" rx="2" /><path
						d="M8 8V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3"
					/><circle cx="12" cy="13" r="1" fill="currentColor" />
				</svg>
				Bots
			</a>

			<a
				href="/top"
				class="flex items-center gap-2 py-2 text-lg font-bold text-primary"
				on:click={() => (mobileOpen = false)}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="w-5 h-5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
					<path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
					<path d="M4 22h16" />
					<path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
					<path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
					<path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
				</svg>
				Top
			</a>

			<a
				href="/new"
				class="flex items-center gap-2 py-2 text-lg font-bold text-primary"
				on:click={() => (mobileOpen = false)}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="w-5 h-5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path
						d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"
					/>
					<path d="M5 3v4" />
					<path d="M19 17v4" />
					<path d="M3 5h4" />
					<path d="M17 19h4" />
				</svg>
				New
			</a>

			<a
				href="/categories"
				class="flex items-center gap-2 py-2 text-lg font-bold text-primary"
				on:click={() => (mobileOpen = false)}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="w-5 h-5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<rect width="7" height="7" x="3" y="3" rx="1" />
					<rect width="7" height="7" x="14" y="3" rx="1" />
					<rect width="7" height="7" x="14" y="14" rx="1" />
					<rect width="7" height="7" x="3" y="14" rx="1" />
				</svg>
				Categories
			</a>

			{#if user}
				<a
					href="/dashboard"
					class="flex items-center gap-2 py-2 text-lg font-bold text-primary"
					on:click={() => (mobileOpen = false)}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-5 h-5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<rect width="7" height="9" x="3" y="3" rx="1" /><rect
							width="7"
							height="5"
							x="14"
							y="3"
							rx="1"
						/><rect width="7" height="9" x="14" y="12" rx="1" /><rect
							width="7"
							height="5"
							x="3"
							y="16"
							rx="1"
						/>
					</svg>
					Dashboard
				</a>

				<div class="flex items-center gap-3 py-2">
					<img
						src={avatarSrc}
						alt="avatar"
						class="w-9 h-9 rounded-full border-2 border-primary object-cover"
					/>
					<div class="flex flex-col">
						<span class="font-semibold text-sm">{user.username}</span>
						<span class="text-xs text-muted-foreground flex items-center gap-1">
							<img src="/assets/img/bot/moneh.svg" alt="" class="w-3.5 h-3.5" />
							R$ {approx(user.bal)}
						</span>
					</div>
				</div>

				<button
					on:click={logout}
					class="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
				>
					Logout
				</button>
			{:else}
				<div class="py-2">
					<LoginButton />
				</div>
			{/if}
		</div>
	</div>
{/if}
