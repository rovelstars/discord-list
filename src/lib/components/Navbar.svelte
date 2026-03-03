<script lang="ts">
	import LoginButton from "$lib/components/LoginButton.svelte";
	import ThemeSelector from "$lib/components/ThemeSelector.svelte";
	import approx from "$lib/approx-num";
	import getAvatarURL from "$lib/get-avatar-url";
	import { goto, invalidateAll } from "$app/navigation";
	import LogoNavbar from "$lib/components/LogoNavbar.svelte";

	export let user: {
		id: string;
		username: string;
		tag: string;
		discriminator: string;
		avatar: string | null;
		bal: number;
	} | null = null;

	let mobileOpen = false;
	let moreOpen = false;

	const MAX_USERNAME = 16;

	$: displayName = user
		? user.username.length > MAX_USERNAME
			? user.username.slice(0, MAX_USERNAME) + "…"
			: user.username
		: "";

	async function logout() {
		await fetch("/logout", { method: "POST" });
		await invalidateAll();
		await goto("/");
	}

	$: avatarSrc = user?.avatar
		? getAvatarURL(user.id, user.avatar, 64)
		: "/assets/img/bot/logo-144.png";

	// Primary nav links — always visible on desktop
	const primaryLinks = [
		{
			href: "/bots",
			label: "Bots",
			icon: `<rect width="18" height="11" x="3" y="8" rx="2"/><path d="M8 8V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3"/><circle cx="12" cy="13" r="1" fill="currentColor"/>`
		},
		{
			href: "/servers",
			label: "Servers",
			icon: `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`
		},
		{
			href: "/top",
			label: "Top",
			icon: `<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>`
		}
	];

	// Secondary links — shown in "More" dropdown on desktop, inline on mobile
	const secondaryLinks = [
		{
			href: "/emojis",
			label: "Emojis",
			icon: `<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>`
		},
		{
			href: "/stickers",
			label: "Stickers",
			icon: `<path d="M15.5 2H8.6c-.4 0-.8.2-1.1.5-.3.3-.5.7-.5 1.1v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8c.4 0 .8-.2 1.1-.5.3-.3.5-.7.5-1.1V6.5L15.5 2z"/><path d="M3 7.6v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5H15"/><path d="M15 2v5h5"/>`
		},
		{
			href: "/categories",
			label: "Categories",
			icon: `<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>`
		}
	];

	function closeMore() {
		moreOpen = false;
	}

	function onMoreKeyDown(e: KeyboardEvent) {
		if (e.key === "Escape") closeMore();
	}
</script>

<svelte:window on:click={closeMore} on:keydown={onMoreKeyDown} />

<nav
	class="fixed top-0 left-0 right-0 z-50 h-14 border-b border-border/60 bg-background/80 backdrop-blur-md backdrop-saturate-150 flex items-center"
>
	<div class="flex items-center w-full max-w-screen-2xl mx-auto px-3 gap-2">
		<!-- Logo -->
		<a href="/" class="shrink-0 flex items-center -my-1 mr-1">
			<LogoNavbar />
		</a>

		<!-- Divider -->
		<div class="hidden md:block h-5 w-px bg-border mx-1 shrink-0"></div>

		<!-- Primary nav links -->
		<div class="hidden md:flex items-center gap-0.5">
			{#each primaryLinks as link}
				<a
					href={link.href}
					class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-3.5 h-3.5 shrink-0"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true">{@html link.icon}</svg
					>
					{link.label}
				</a>
			{/each}

			<!-- More dropdown -->
			<div class="relative">
				<button
					type="button"
					aria-haspopup="menu"
					aria-expanded={moreOpen}
					on:click|stopPropagation={() => (moreOpen = !moreOpen)}
					class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
				>
					More
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-3 h-3 transition-transform duration-150 {moreOpen ? 'rotate-180' : ''}"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg
					>
				</button>

				{#if moreOpen}
					<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
					<div
						role="menu"
						tabindex="-1"
						on:click|stopPropagation={() => {}}
						on:keydown|stopPropagation={() => {}}
						class="absolute top-full left-0 mt-1.5 w-44 rounded-xl border border-border bg-popover shadow-lg ring-1 ring-black/5 dark:ring-white/5 overflow-hidden z-50"
					>
						{#each secondaryLinks as link}
							<a
								href={link.href}
								role="menuitem"
								on:click={closeMore}
								class="flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-4 h-4 shrink-0"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true">{@html link.icon}</svg
								>
								{link.label}
							</a>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Spacer -->
		<div class="flex-1"></div>

		<!-- Right side -->
		<div class="flex items-center gap-1.5 shrink-0">
			<ThemeSelector />

			{#if user}
				<!-- Coin balance pill -->
				<span
					class="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent text-xs font-semibold text-foreground border border-border"
					title="R$ balance"
				>
					<img src="/assets/img/bot/moneh.svg" alt="" class="w-3.5 h-3.5" aria-hidden="true" />
					R$ {approx(user.bal)}
				</span>

				<!-- User pill -->
				<a
					href="/dashboard"
					title="Dashboard — {user.username}"
					class="hidden md:inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-border bg-card hover:bg-accent transition-colors"
				>
					<img src={avatarSrc} alt="" class="w-6 h-6 rounded-full object-cover" loading="lazy" />
					<span class="text-xs font-semibold text-foreground leading-none">{displayName}</span>
				</a>

				<!-- Mobile avatar only -->
				<a href="/dashboard" class="md:hidden shrink-0" title="Dashboard">
					<img
						src={avatarSrc}
						alt="{user.username}'s avatar"
						class="w-7 h-7 rounded-full border border-border object-cover"
						loading="lazy"
					/>
				</a>

				<!-- Logout (desktop) -->
				<button
					on:click={logout}
					class="hidden md:inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border border-destructive/20 transition-colors cursor-pointer"
				>
					Logout
				</button>
			{:else}
				<LoginButton />
			{/if}

			<!-- Mobile hamburger -->
			<button
				type="button"
				class="md:hidden p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
				aria-label="Toggle menu"
				aria-expanded={mobileOpen}
				on:click|stopPropagation={() => (mobileOpen = !mobileOpen)}
			>
				{#if mobileOpen}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-5 h-5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg
					>
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-5 h-5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg
					>
				{/if}
			</button>
		</div>
	</div>
</nav>

<!-- Mobile drawer -->
{#if mobileOpen}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
		aria-hidden="true"
		on:click={() => (mobileOpen = false)}
	></div>

	<!-- Drawer panel -->
	<div
		class="fixed top-14 left-0 right-0 z-40 md:hidden border-b border-border bg-background/95 backdrop-blur-md max-h-[calc(100dvh-3.5rem)] overflow-y-auto"
	>
		<div class="px-3 py-4 flex flex-col gap-0.5">
			<!-- User info strip (when logged in) -->
			{#if user}
				<div class="flex items-center gap-3 px-3 py-3 mb-2 rounded-xl bg-card border border-border">
					<img
						src={avatarSrc}
						alt=""
						class="w-9 h-9 rounded-full border border-border object-cover shrink-0"
					/>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-semibold text-foreground truncate">{displayName}</p>
						<p class="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
							<img src="/assets/img/bot/moneh.svg" alt="" class="w-3 h-3" aria-hidden="true" />
							R$ {approx(user.bal)}
						</p>
					</div>
					<a
						href="/dashboard"
						on:click={() => (mobileOpen = false)}
						class="shrink-0 text-xs font-medium text-primary hover:underline"
					>
						Dashboard
					</a>
				</div>
			{/if}

			<!-- All nav links -->
			{#each [...primaryLinks, ...secondaryLinks] as link}
				<a
					href={link.href}
					on:click={() => (mobileOpen = false)}
					class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-4 h-4 shrink-0"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true">{@html link.icon}</svg
					>
					{link.label}
				</a>
			{/each}

			<div class="h-px bg-border my-2"></div>

			<!-- Logout / Login -->
			{#if user}
				<button
					on:click={() => {
						mobileOpen = false;
						logout();
					}}
					class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer w-full text-left"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-4 h-4 shrink-0"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
						><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline
							points="16 17 21 12 16 7"
						/><line x1="21" y1="12" x2="9" y2="12" /></svg
					>
					Logout
				</button>
			{:else}
				<div class="px-3 py-2">
					<LoginButton />
				</div>
			{/if}

			<!-- Theme -->
			<div class="px-3 pt-3 pb-1">
				<p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
					Appearance
				</p>
				<ThemeSelector />
			</div>
		</div>
	</div>
{/if}
