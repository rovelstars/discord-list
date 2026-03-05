<script lang="ts">
	import LoginButton from "$lib/components/LoginButton.svelte";
	import ThemeSelector from "$lib/components/ThemeSelector.svelte";
	import approx from "$lib/approx-num";
	import getAvatarURL from "$lib/get-avatar-url";
	import { goto } from "$app/navigation";
	import { clearAuth } from "$lib/auth";
	import LogoNavbar from "$lib/components/LogoNavbar.svelte";
	import {
		Bot,
		House,
		Trophy,
		Smile,
		Sticker,
		LayoutGrid,
		Menu,
		X,
		ChevronDown,
		LogOut
	} from "@lucide/svelte";

	export let user: {
		id: string;
		username: string;
		tag: string;
		discriminator: string;
		avatar: string | null;
		bal: number;
	} | null = null;

	/** Whether the client-side auth check is still in-flight. */
	export let loading: boolean = false;

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
		clearAuth();
		await goto("/");
	}

	$: avatarSrc = user?.avatar
		? getAvatarURL(user.id, user.avatar, 64)
		: "/assets/img/bot/logo-144.png";

	// Primary nav links - always visible on desktop
	const primaryLinks = [
		{ href: "/bots", label: "Bots", icon: Bot },
		{ href: "/servers", label: "Servers", icon: House },
		{ href: "/top", label: "Top", icon: Trophy }
	];

	// Secondary links - shown in "More" dropdown on desktop, inline on mobile
	const secondaryLinks = [
		{ href: "/emojis", label: "Emojis", icon: Smile },
		{ href: "/stickers", label: "Stickers", icon: Sticker },
		{ href: "/categories", label: "Categories", icon: LayoutGrid }
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
					<svelte:component this={link.icon} class="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
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
					<ChevronDown
						class="w-3 h-3 transition-transform duration-150 {moreOpen ? 'rotate-180' : ''}"
						aria-hidden="true"
					/>
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
								<svelte:component this={link.icon} class="w-4 h-4 shrink-0" aria-hidden="true" />
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

			{#if loading}
				<!-- Skeleton placeholders while auth resolves -->
				<div
					class="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/50 animate-pulse w-16 h-7"
				></div>
				<div
					class="hidden md:inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-muted/50 animate-pulse w-28 h-8"
				></div>
				<div class="md:hidden shrink-0 w-7 h-7 rounded-full bg-muted/50 animate-pulse"></div>
			{:else if user}
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
					title="Dashboard - {user.username}"
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
					<X class="w-5 h-5" aria-hidden="true" />
				{:else}
					<Menu class="w-5 h-5" aria-hidden="true" />
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
			{#if loading}
				<div
					class="flex items-center gap-3 px-3 py-3 mb-2 rounded-xl bg-card border border-border animate-pulse"
				>
					<div class="w-9 h-9 rounded-full bg-muted/50 shrink-0"></div>
					<div class="flex-1 min-w-0">
						<div class="h-4 w-24 bg-muted/50 rounded mb-1.5"></div>
						<div class="h-3 w-16 bg-muted/50 rounded"></div>
					</div>
				</div>
			{:else if user}
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
					<svelte:component this={link.icon} class="w-4 h-4 shrink-0" aria-hidden="true" />
					{link.label}
				</a>
			{/each}

			<div class="h-px bg-border my-2"></div>

			<!-- Logout / Login -->
			{#if loading}
				<div class="px-3 py-2.5">
					<div class="h-5 w-20 bg-muted/50 rounded animate-pulse"></div>
				</div>
			{:else if user}
				<button
					on:click={() => {
						mobileOpen = false;
						logout();
					}}
					class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer w-full text-left"
				>
					<LogOut class="w-4 h-4 shrink-0" aria-hidden="true" />
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
