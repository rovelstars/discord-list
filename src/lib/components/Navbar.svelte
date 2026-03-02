<script lang="ts">
	import LoginButton from "$lib/components/LoginButton.svelte";
	import ThemeSelector from "$lib/components/ThemeSelector.svelte";
	import approx from "$lib/approx-num";
	import getAvatarURL from "$lib/get-avatar-url";
	import { goto, invalidateAll } from "$app/navigation";
	import LogoNavbar from "$lib/components/LogoNavbar.svelte";
	import { Bot, Home, LayoutDashboard, Trophy, Sparkles, LayoutGrid } from "@lucide/svelte";

	export let user: {
		id: string;
		username: string;
		tag: string;
		discriminator: string;
		avatar: string | null;
		bal: number;
	} | null = null;

	let mobileOpen = false;

	async function logout() {
		await fetch("/logout", { method: "POST" });
		await invalidateAll();
		await goto("/");
	}

	$: avatarSrc = user?.avatar
		? getAvatarURL(user.id, user.avatar, 64)
		: "/assets/img/bot/logo-144.png";
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

	<!-- Spacer — always visible to push right-side items to the edge -->
	<div class="flex-1">
		<!-- Nav links — hidden on mobile (hamburger menu handles navigation there) -->
		<div class="hidden md:flex items-center gap-5 px-4">
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
				href="/bots?new"
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
	</div>

	<!-- Right side: theme selector + user / login -->
	<div class="flex items-center gap-2 pr-3 shrink-0">
		<!-- Theme selector (mode + accent) -->
		<ThemeSelector />

		{#if user}
			<!-- Avatar + username + coins + logout (hidden on small screens) -->
			<div class="hidden md:flex items-center gap-2 mx-4">
				<!-- Coins badge -->
				<span class="flex items-center gap-1 text-sm font-semibold text-foreground">
					<img src="/assets/img/bot/moneh.svg" alt="coins" class="w-5 h-5" />
					R$ {approx(user.bal)}
				</span>

				<!-- Avatar -->
				<a href="/dashboard" title="Dashboard" class="shrink-0">
					<img
						src={avatarSrc}
						alt="{user.username}'s avatar"
						class="inline w-8 h-8 rounded-full border-2 border-primary object-cover"
						loading="lazy"
					/>
				</a>

				<!-- Username -->
				<a
					href="/dashboard"
					class="inline text-sm font-semibold text-foreground hover:underline whitespace-nowrap mr-4"
				>
					{user.username}
				</a>

				<!-- Logout -->
				<button
					on:click={logout}
					class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors cursor-pointer"
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
				href="/bots?new"
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
					class="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors cursor-pointer"
				>
					Logout
				</button>
			{:else}
				<div class="py-2">
					<LoginButton />
				</div>
			{/if}

			<!-- Theme selector in mobile menu too -->
			<div class="py-1 border-t border-border pt-3">
				<p class="text-xs text-muted-foreground font-semibold mb-2">Appearance</p>
				<ThemeSelector />
			</div>
		</div>
	</div>
{/if}
