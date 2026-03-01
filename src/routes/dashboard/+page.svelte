<script lang="ts">
	import BotCard from '$lib/components/BotCard.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Label from '$lib/components/ui/Label.svelte';
	import Textarea from '$lib/components/ui/textarea/Textarea.svelte';
	import getAvatarURL from '$lib/get-avatar-url';
	import SEO from '$lib/components/SEO.svelte';

	export let data: {
		user: {
			id: string;
			username: string;
			discriminator: string;
			avatar: string | null;
			bio: string;
			banner: string;
			bal: number;
			added_at: number | null;
			nitro: boolean;
			globalname: string | null;
		};
		discordUser: {
			id: string;
			username: string;
			global_name: string | null;
			discriminator: string;
			avatar: string | null;
			email: string | null;
		};
		bots: Array<{
			id: string;
			slug: string;
			username: string;
			discriminator: string;
			avatar: string | null;
			short: string;
			votes: number;
			servers: number;
			invite: string | null;
			bg: string | null;
			status: string;
		}>;
		recentVotes: Array<{
			botId: string;
			at: number;
			botName: string;
			botSlug: string;
			botAvatar: string | null;
		}>;
		totalVotesCast: number;
	};

	const { user, discordUser, bots = [], recentVotes, totalVotesCast } = data;

	// ── Active section ────────────────────────────────────────────────────────
	type Section = 'bots' | 'profile' | 'account' | 'votes' | 'danger';
	let activeSection: Section = 'bots';

	// ── Modals ────────────────────────────────────────────────────────────────
	let showLogoutConfirm = false;

	// ── Avatar ────────────────────────────────────────────────────────────────
	$: avatarSrc = discordUser.avatar
		? getAvatarURL(discordUser.id, discordUser.avatar, 128)
		: '/assets/img/bot/logo-144.png';

	// ── Display name / handle ─────────────────────────────────────────────────
	$: displayName = discordUser.global_name ?? discordUser.username;
	$: handle =
		discordUser.discriminator && discordUser.discriminator !== '0'
			? `${discordUser.username}#${discordUser.discriminator}`
			: `@${discordUser.username}`;

	// ── Member since ──────────────────────────────────────────────────────────
	console.log(user);
	$: memberSince = user.added_at
		? new Date(user.added_at).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			})
		: 'Unknown';

	// ── Profile form ──────────────────────────────────────────────────────────
	let bio = user.bio === "The user doesn't have bio set!" ? '' : (user.bio ?? '');
	let banner = user.banner ?? '';
	let saving = false;
	let saveSuccess = false;
	let saveError = '';

	$: bioOver = bio.length > 200;
	$: bioPercent = Math.min((bio.length / 200) * 100, 100);

	async function saveProfile() {
		saveError = '';
		saveSuccess = false;
		saving = true;
		try {
			const res = await fetch('/api/users/me', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ bio: bio.trim() || null, banner: banner.trim() || null })
			});
			const resData = await res.json();
			if (!res.ok || resData.err) {
				const errMap: Record<string, string> = {
					not_logged_in: 'You must be logged in.',
					invalid_key: 'Your session has expired. Please log in again.',
					bio_too_long: 'Bio must be 200 characters or fewer.',
					invalid_banner: 'Banner must be a valid http/https URL.',
					user_not_found: 'User not found. Please log in again.',
					db_update_failed: 'Database error — please try again.'
				};
				saveError = errMap[resData.err] ?? resData.err ?? 'An error occurred.';
			} else {
				saveSuccess = true;
				setTimeout(() => (saveSuccess = false), 3500);
			}
		} catch {
			saveError = 'Network error — please try again.';
		} finally {
			saving = false;
		}
	}

	// ── Logout ────────────────────────────────────────────────────────────────
	function logout() {
		window.location.href = '/logout';
	}

	// ── Relative time ─────────────────────────────────────────────────────────
	function relativeTime(ts: number): string {
		const diff = Date.now() - ts;
		const mins = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days < 30) return `${days}d ago`;
		return new Date(ts).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	// ── Nav items ─────────────────────────────────────────────────────────────
	const navItems: Array<{ id: Section; label: string; icon: string }> = [
		{ id: 'bots', label: 'My Bots', icon: 'bot' },
		{ id: 'profile', label: 'Profile', icon: 'user' },
		{ id: 'account', label: 'Account', icon: 'shield' },
		{ id: 'votes', label: 'Vote History', icon: 'votes' },
		{ id: 'danger', label: 'Danger Zone', icon: 'danger' }
	];
</script>

<SEO
	title="Dashboard"
	description="Manage your bots and account on Rovel Discord List."
	imageSmall="/assets/img/bot/logo-512.png"
/>
<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<!-- ── Logout confirmation modal ──────────────────────────────────────────── -->
{#if showLogoutConfirm}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
		on:click|self={() => (showLogoutConfirm = false)}
	>
		<div class="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
			<div class="flex items-center gap-3">
				<div
					class="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center shrink-0"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-5 h-5 text-destructive"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline
							points="16 17 21 12 16 7"
						/><line x1="21" y1="12" x2="9" y2="12" />
					</svg>
				</div>
				<div>
					<p class="font-bold text-base">Sign out?</p>
					<p class="text-sm text-muted-foreground">You can log back in any time.</p>
				</div>
			</div>
			<div class="flex gap-2 pt-1">
				<button
					on:click={() => (showLogoutConfirm = false)}
					class="flex-1 px-4 py-2 rounded-lg border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
				>
					Cancel
				</button>
				<button
					on:click={logout}
					class="flex-1 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors"
				>
					Sign Out
				</button>
			</div>
		</div>
	</div>
{/if}

<div class="min-h-screen bg-background">
	<!-- ── Hero header ──────────────────────────────────────────────────────── -->
	<div class="relative overflow-hidden border-b border-border bg-card">
		<div
			class="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl"
		></div>
		<div
			class="pointer-events-none absolute -bottom-16 right-0 w-80 h-80 rounded-full bg-primary/5 blur-2xl"
		></div>

		<div class="relative max-w-6xl mx-auto px-4 py-8">
			<div class="flex flex-col sm:flex-row sm:items-center gap-5">
				<!-- Avatar -->
				<div class="relative shrink-0 self-start sm:self-auto">
					<img
						src={avatarSrc}
						alt="Your avatar"
						class="w-20 h-20 rounded-full border-4 border-background object-cover shadow-xl ring-2 ring-primary/30"
					/>
					<span
						class="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-background shadow"
					></span>
				</div>

				<!-- Name / meta -->
				<div class="flex-1 min-w-0">
					<div class="flex flex-wrap items-center gap-2">
						<h1 class="text-2xl font-extrabold font-heading truncate">{displayName}</h1>
						{#if user.nitro}
							<span
								class="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30"
							>
								✦ Nitro
							</span>
						{/if}
					</div>
					<p class="text-muted-foreground text-sm mt-0.5">{handle}</p>
					<p class="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-3.5 h-3.5 shrink-0"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line
								x1="16"
								y1="2"
								x2="16"
								y2="6"
							/><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
						</svg>
						Member since {memberSince}
					</p>
				</div>

				<!-- Add bot CTA -->
				<a
					href="/dashboard/bots/new"
					class="self-start sm:self-auto shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all shadow-sm shadow-primary/20"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-4 h-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M12 5v14M5 12h14" />
					</svg>
					Add Bot
				</a>
			</div>

			<!-- Quick stats strip -->
			<div class="mt-6 grid grid-cols-3 gap-3">
				<div
					class="bg-background/60 backdrop-blur border border-border rounded-xl px-4 py-3 text-center"
				>
					<p class="text-xl font-extrabold">{bots.length}</p>
					<p class="text-xs text-muted-foreground mt-0.5">My Bots</p>
				</div>
				<div
					class="bg-background/60 backdrop-blur border border-border rounded-xl px-4 py-3 text-center"
				>
					<p class="text-xl font-extrabold">{user.bal.toLocaleString()}</p>
					<p class="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
						<img src="/assets/img/bot/moneh.svg" alt="coins" class="w-3.5 h-3.5" />
						Balance
					</p>
				</div>
				<div
					class="bg-background/60 backdrop-blur border border-border rounded-xl px-4 py-3 text-center"
				>
					<p class="text-xl font-extrabold">{totalVotesCast.toLocaleString()}</p>
					<p class="text-xs text-muted-foreground mt-0.5">Votes Cast</p>
				</div>
			</div>
		</div>
	</div>

	<!-- ── Body ─────────────────────────────────────────────────────────────── -->
	<section class="max-w-6xl mx-auto px-4 py-8">
		<div class="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
			<!-- ── Sidebar ────────────────────────────────────────────────────── -->
			<nav class="md:col-span-1 md:sticky md:top-6 space-y-3">
				<!-- Nav card -->
				<div class="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
					<div class="px-3 py-2.5 border-b border-border">
						<p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
							Dashboard
						</p>
					</div>
					<ul class="p-2 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
						{#each navItems as item}
							<li class="shrink-0 w-full">
								<button
									on:click={() => (activeSection = item.id)}
									class="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
										{activeSection === item.id && item.id !== 'danger'
										? 'bg-primary/10 text-primary shadow-sm'
										: activeSection === item.id && item.id === 'danger'
											? 'bg-destructive/10 text-destructive shadow-sm'
											: item.id === 'danger'
												? 'text-muted-foreground hover:bg-destructive/5 hover:text-destructive'
												: 'text-muted-foreground hover:bg-accent hover:text-foreground'}"
								>
									<!-- Icon badge -->
									<span
										class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0
										{activeSection === item.id && item.id === 'danger'
											? 'bg-destructive/15'
											: activeSection === item.id
												? 'bg-primary/15'
												: 'bg-muted/50'}"
									>
										{#if item.icon === 'bot'}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="w-3.5 h-3.5"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<rect x="3" y="11" width="18" height="10" rx="2" /><circle
													cx="12"
													cy="5"
													r="2"
												/><path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" /><line
													x1="16"
													y1="16"
													x2="16"
													y2="16"
												/>
											</svg>
										{:else if item.icon === 'user'}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="w-3.5 h-3.5"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
											</svg>
										{:else if item.icon === 'shield'}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="w-3.5 h-3.5"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
											</svg>
										{:else if item.icon === 'votes'}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="w-3.5 h-3.5"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<polyline points="18 15 12 9 6 15" />
											</svg>
										{:else if item.icon === 'danger'}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="w-3.5 h-3.5"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<path
													d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
												/><line x1="12" y1="9" x2="12" y2="13" /><line
													x1="12"
													y1="17"
													x2="12.01"
													y2="17"
												/>
											</svg>
										{/if}
									</span>

									{item.label}

									<!-- Active dot -->
									{#if activeSection === item.id}
										<span
											class="ml-auto w-1.5 h-1.5 rounded-full {item.id === 'danger'
												? 'bg-destructive'
												: 'bg-primary'}"
										></span>
									{/if}

									<!-- Bot count badge -->
									{#if item.id === 'bots' && bots.length > 0}
										<span
											class="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary {activeSection ===
											'bots'
												? ''
												: 'opacity-70'}"
										>
											{bots.length}
										</span>
									{/if}
								</button>
							</li>
						{/each}
					</ul>
				</div>

				<!-- Discord ID card -->
				<div class="bg-card border border-border rounded-2xl p-3 shadow-sm">
					<p class="text-xs text-muted-foreground mb-1.5 font-medium">Discord ID</p>
					<code
						class="text-xs font-mono bg-background border border-border rounded-lg px-2.5 py-1.5 block select-all text-foreground/80 truncate"
					>
						{user.id}
					</code>
				</div>
			</nav>

			<!-- ── Main content ──────────────────────────────────────────────── -->
			<div class="md:col-span-3 space-y-4">
				<!-- ════════════════════════════════════════════════════════════ -->
				<!-- MY BOTS                                                      -->
				<!-- ════════════════════════════════════════════════════════════ -->
				{#if activeSection === 'bots'}
					<div class="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
						<!-- Header -->
						<div class="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
							<div class="flex items-center gap-2">
								<div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-4 h-4 text-primary"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<rect x="3" y="11" width="18" height="10" rx="2" /><circle
											cx="12"
											cy="5"
											r="2"
										/><path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" /><line
											x1="16"
											y1="16"
											x2="16"
											y2="16"
										/>
									</svg>
								</div>
								<div>
									<h2 class="text-base font-bold font-heading leading-none">My Bots</h2>
									<p class="text-xs text-muted-foreground mt-0.5">
										{bots.length === 0
											? 'No bots listed yet'
											: `${bots.length} bot${bots.length !== 1 ? 's' : ''} listed`}
									</p>
								</div>
							</div>
							<a
								href="/dashboard/bots/new"
								class="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 active:scale-95 transition-all shadow-sm shadow-primary/20"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-3.5 h-3.5"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2.5"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d="M12 5v14M5 12h14" />
								</svg>
								Add New
							</a>
						</div>

						<!-- Bot grid -->
						<div class="p-6">
							{#if bots.length === 0}
								<div class="flex flex-col items-center justify-center py-16 text-center">
									<div
										class="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-4"
									>
										<img src="/assets/img/idea.svg" class="w-12 h-12 opacity-60" alt="No bots" />
									</div>
									<p class="font-bold text-base">No bots yet</p>
									<p class="text-sm text-muted-foreground mt-1.5 max-w-xs">
										You haven't listed any bots. Add your first one and share it with the world!
									</p>
									<a
										href="/dashboard/bots/new"
										class="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="w-4 h-4"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2.5"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<path d="M12 5v14M5 12h14" />
										</svg>
										List Your First Bot
									</a>
								</div>
							{:else}
								<div class="flex flex-wrap gap-4">
									{#each bots as bot}
										<BotCard
											bot={{
												id: bot.id,
												slug: bot.slug ?? bot.id,
												username: bot.username,
												discriminator: bot.discriminator ?? '0000',
												avatar: bot.avatar ?? '0',
												short: bot.short ?? '',
												votes: bot.votes ?? 0,
												servers: bot.servers ?? 0,
												invite: bot.invite ?? '',
												bg: bot.bg ?? null,
												status: (bot.status as any) ?? 'online'
											}}
											edit={true}
										/>
									{/each}
								</div>
							{/if}
						</div>
					</div>

					<!-- ════════════════════════════════════════════════════════════ -->
					<!-- PROFILE                                                      -->
					<!-- ════════════════════════════════════════════════════════════ -->
				{:else if activeSection === 'profile'}
					<!-- Banner preview -->
					{#if banner}
						<div
							class="relative w-full h-36 rounded-2xl overflow-hidden border border-border shadow-sm"
						>
							<img
								src={banner}
								alt="Profile banner preview"
								class="w-full h-full object-cover"
								on:error={(e) => {
									(e.currentTarget as HTMLImageElement).closest('div')?.classList.add('hidden');
								}}
							/>
							<div
								class="absolute inset-0 bg-linear-to-t from-black/40 to-transparent pointer-events-none"
							></div>
							<span
								class="absolute bottom-2 left-3 text-xs text-white/80 font-medium backdrop-blur-sm bg-black/30 rounded-md px-2 py-0.5"
							>
								Banner preview
							</span>
						</div>
					{/if}

					<div class="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
						<!-- Card header -->
						<div class="px-6 py-4 border-b border-border flex items-center gap-2">
							<div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-4 h-4 text-primary"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
								</svg>
							</div>
							<div>
								<h2 class="text-base font-bold font-heading leading-none">Public Profile</h2>
								<p class="text-xs text-muted-foreground mt-0.5">
									Visible to everyone on your profile page
								</p>
							</div>
						</div>

						<div class="p-6 space-y-5">
							<!-- Avatar + bio -->
							<div class="flex gap-5 items-start">
								<div class="shrink-0 flex flex-col items-center gap-2">
									<img
										src={avatarSrc}
										alt="Your avatar"
										class="w-16 h-16 rounded-xl object-cover border-2 border-border shadow"
									/>
									<span class="text-xs text-muted-foreground text-center leading-tight"
										>Via Discord</span
									>
								</div>
								<div class="flex-1 space-y-1.5">
									<Label forId="bio">Bio</Label>
									<Textarea
										id="bio"
										bind:value={bio}
										rows={3}
										placeholder="Tell people a little about yourself…"
										autoGrow
									/>
									<div class="space-y-1">
										<div class="flex justify-between text-xs text-muted-foreground">
											<span>Shown on your public profile.</span>
											<span class:text-destructive={bioOver} class="font-mono font-semibold"
												>{bio.length}/200</span
											>
										</div>
										<div class="h-0.5 bg-border rounded-full overflow-hidden">
											<div
												class="h-full rounded-full transition-all duration-200 {bioOver
													? 'bg-destructive'
													: bioPercent > 80
														? 'bg-yellow-500'
														: 'bg-primary'}"
												style="width: {bioPercent}%"
											></div>
										</div>
									</div>
								</div>
							</div>

							<!-- Banner URL -->
							<div class="space-y-1.5">
								<Label forId="banner">Banner Image URL</Label>
								<div class="relative">
									<div class="absolute inset-y-0 left-3 flex items-center pointer-events-none">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="w-4 h-4 text-muted-foreground"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle
												cx="8.5"
												cy="8.5"
												r="1.5"
											/><polyline points="21 15 16 10 5 21" />
										</svg>
									</div>
									<Input
										id="banner"
										bind:value={banner}
										placeholder="https://example.com/banner.png"
										classId="pl-9"
									/>
								</div>
								<p class="text-xs text-muted-foreground">
									A direct image URL shown at the top of your profile. Leave blank to remove.
								</p>
							</div>

							<!-- Status messages -->
							{#if saveError}
								<div
									class="flex items-start gap-2.5 rounded-xl bg-destructive/8 border border-destructive/25 px-4 py-3 text-sm text-destructive"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-4 h-4 mt-0.5 shrink-0"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line
											x1="12"
											y1="16"
											x2="12.01"
											y2="16"
										/>
									</svg>
									{saveError}
								</div>
							{/if}
							{#if saveSuccess}
								<div
									class="flex items-center gap-2.5 rounded-xl bg-green-500/8 border border-green-500/25 px-4 py-3 text-sm text-green-600 dark:text-green-400"
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
									>
										<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline
											points="22 4 12 14.01 9 11.01"
										/>
									</svg>
									Profile saved successfully!
								</div>
							{/if}

							<!-- Save footer -->
							<div class="flex items-center justify-between pt-1">
								<p class="text-xs text-muted-foreground">
									Changes are reflected on your profile immediately.
								</p>
								<button
									on:click={saveProfile}
									disabled={saving || bioOver}
									class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 shadow-sm shadow-primary/20"
								>
									{#if saving}
										<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
											<circle
												class="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												stroke-width="4"
											/>
											<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
										</svg>
										Saving…
									{:else}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="w-4 h-4"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<path
												d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"
											/><polyline points="17 21 17 13 7 13 7 21" /><polyline
												points="7 3 7 8 15 8"
											/>
										</svg>
										Save Changes
									{/if}
								</button>
							</div>
						</div>
					</div>

					<!-- ════════════════════════════════════════════════════════════ -->
					<!-- ACCOUNT                                                      -->
					<!-- ════════════════════════════════════════════════════════════ -->
				{:else if activeSection === 'account'}
					<div class="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
						<div class="px-6 py-4 border-b border-border flex items-center gap-2">
							<div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-4 h-4 text-primary"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
								</svg>
							</div>
							<div>
								<h2 class="text-base font-bold font-heading leading-none">Discord Account</h2>
								<p class="text-xs text-muted-foreground mt-0.5">
									Details synced from Discord on each login
								</p>
							</div>
						</div>

						<!-- Identity card -->
						<div
							class="m-4 flex items-center gap-4 p-4 rounded-xl bg-background border border-border"
						>
							<img
								src={avatarSrc}
								alt="Avatar"
								class="w-14 h-14 rounded-full border-2 border-border object-cover shrink-0 shadow"
							/>
							<div class="min-w-0">
								<p class="font-extrabold text-lg leading-tight truncate">{displayName}</p>
								<p class="text-muted-foreground text-sm">{handle}</p>
								{#if discordUser.email}
									<p class="text-muted-foreground text-xs mt-0.5 flex items-center gap-1">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="w-3 h-3 shrink-0"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<path
												d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
											/><polyline points="22,6 12,13 2,6" />
										</svg>
										{discordUser.email}
									</p>
								{/if}
							</div>
							{#if user.nitro}
								<span
									class="ml-auto shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20"
								>
									✦ Nitro
								</span>
							{/if}
						</div>

						<!-- Stat tiles -->
						<div class="grid grid-cols-2 gap-3 mx-4 mb-4">
							<div
								class="bg-background border border-border rounded-xl p-4 flex items-center gap-3"
							>
								<div
									class="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0"
								>
									<img src="/assets/img/bot/moneh.svg" alt="coins" class="w-5 h-5" />
								</div>
								<div class="min-w-0">
									<p class="font-extrabold text-lg leading-none">{user.bal.toLocaleString()}</p>
									<p class="text-xs text-muted-foreground mt-0.5">R$ Balance</p>
								</div>
							</div>
							<div
								class="bg-background border border-border rounded-xl p-4 flex items-center gap-3"
							>
								<div
									class="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-5 h-5 text-green-500"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<polyline points="18 15 12 9 6 15" />
									</svg>
								</div>
								<div class="min-w-0">
									<p class="font-extrabold text-lg leading-none">
										{totalVotesCast.toLocaleString()}
									</p>
									<p class="text-xs text-muted-foreground mt-0.5">Total Votes</p>
								</div>
							</div>
						</div>

						<!-- Info rows -->
						<dl class="border-t border-border divide-y divide-border">
							<div class="flex items-center justify-between px-6 py-3 text-sm">
								<dt class="text-muted-foreground font-medium flex items-center gap-2">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-3.5 h-3.5 shrink-0"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line
											x1="16"
											y1="2"
											x2="16"
											y2="6"
										/><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
									</svg>
									Member Since
								</dt>
								<dd class="font-medium">{memberSince}</dd>
							</div>
							<div class="flex items-center justify-between px-6 py-3 text-sm">
								<dt class="text-muted-foreground font-medium flex items-center gap-2">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-3.5 h-3.5 shrink-0"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<rect x="3" y="11" width="18" height="10" rx="2" /><circle
											cx="12"
											cy="5"
											r="2"
										/><path d="M12 7v4" />
									</svg>
									Bots Listed
								</dt>
								<dd class="font-semibold">{bots.length}</dd>
							</div>
							<div class="flex items-center justify-between px-6 py-3 text-sm">
								<dt class="text-muted-foreground font-medium flex items-center gap-2">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-3.5 h-3.5 shrink-0"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path
											d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
										/>
									</svg>
									Nitro Status
								</dt>
								<dd>
									{#if user.nitro}
										<span
											class="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20"
											>✦ Active</span
										>
									{:else}
										<span
											class="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted/40 border border-border"
											>Not Active</span
										>
									{/if}
								</dd>
							</div>
						</dl>

						<p
							class="px-6 py-3 text-xs text-muted-foreground border-t border-border bg-background/40"
						>
							Account details are managed by Discord and sync automatically each time you log in.
						</p>
					</div>

					<!-- ════════════════════════════════════════════════════════════ -->
					<!-- VOTE HISTORY                                                 -->
					<!-- ════════════════════════════════════════════════════════════ -->
				{:else if activeSection === 'votes'}
					<div class="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
						<div class="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
							<div class="flex items-center gap-2">
								<div class="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-4 h-4 text-green-500"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<polyline points="18 15 12 9 6 15" />
									</svg>
								</div>
								<div>
									<h2 class="text-base font-bold font-heading leading-none">Vote History</h2>
									<p class="text-xs text-muted-foreground mt-0.5">Your 10 most recent bot votes</p>
								</div>
							</div>
							<span
								class="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20"
							>
								{totalVotesCast.toLocaleString()} total
							</span>
						</div>

						{#if recentVotes.length === 0}
							<div class="flex flex-col items-center justify-center py-16 text-center px-6">
								<div
									class="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-8 h-8 text-muted-foreground/50"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="1.5"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<polyline points="18 15 12 9 6 15" />
									</svg>
								</div>
								<p class="font-bold text-base">No votes yet</p>
								<p class="text-sm text-muted-foreground mt-1.5 max-w-xs">
									Your vote history will appear here once you start voting for bots.
								</p>
								<a
									href="/bots"
									class="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-4 h-4"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
									</svg>
									Browse Bots
								</a>
							</div>
						{:else}
							<ul class="divide-y divide-border">
								{#each recentVotes as vote, i}
									<li>
										<a
											href="/bots/{vote.botSlug}"
											class="flex items-center gap-3.5 px-5 py-3.5 hover:bg-accent/40 transition-colors group"
										>
											<span
												class="w-5 text-xs font-mono text-muted-foreground/60 shrink-0 text-right"
												>{i + 1}</span
											>
											<img
												src={vote.botAvatar
													? getAvatarURL(vote.botId, vote.botAvatar, 40)
													: getAvatarURL(vote.botId, '0')}
												alt="{vote.botName} avatar"
												class="w-9 h-9 rounded-xl object-cover border border-border shrink-0 shadow-sm"
											/>
											<div class="min-w-0 flex-1">
												<p
													class="font-semibold text-sm truncate group-hover:text-primary transition-colors"
												>
													{vote.botName}
												</p>
												<p class="text-xs text-muted-foreground">{relativeTime(vote.at)}</p>
											</div>
											<span
												class="shrink-0 inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													class="w-3 h-3"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2.5"
													stroke-linecap="round"
													stroke-linejoin="round"
												>
													<polyline points="18 15 12 9 6 15" />
												</svg>
												Voted
											</span>
										</a>
									</li>
								{/each}
							</ul>

							{#if totalVotesCast > 10}
								<div
									class="px-6 py-3 border-t border-border bg-background/40 flex items-center justify-center gap-2"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-3.5 h-3.5 text-muted-foreground"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line
											x1="12"
											y1="16"
											x2="12.01"
											y2="16"
										/>
									</svg>
									<p class="text-xs text-muted-foreground">
										Showing <span class="font-semibold text-foreground">10</span> of
										<span class="font-semibold text-foreground"
											>{totalVotesCast.toLocaleString()}</span
										> total votes
									</p>
								</div>
							{/if}
						{/if}
					</div>

					<!-- ════════════════════════════════════════════════════════════ -->
					<!-- DANGER ZONE                                                  -->
					<!-- ════════════════════════════════════════════════════════════ -->
				{:else if activeSection === 'danger'}
					<!-- Warning banner -->
					<div
						class="flex items-start gap-3 p-4 rounded-2xl bg-destructive/8 border border-destructive/25 text-sm text-destructive"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-5 h-5 shrink-0 mt-0.5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path
								d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
							/><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
						</svg>
						<div>
							<p class="font-bold">Danger Zone</p>
							<p class="mt-0.5 text-destructive/80">
								Actions here can affect your account session. Proceed carefully.
							</p>
						</div>
					</div>

					<div class="bg-card border border-destructive/20 rounded-2xl shadow-sm overflow-hidden">
						<div class="px-6 py-4 border-b border-border flex items-center gap-2">
							<div class="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-4 h-4 text-destructive"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline
										points="16 17 21 12 16 7"
									/><line x1="21" y1="12" x2="9" y2="12" />
								</svg>
							</div>
							<h2 class="text-base font-bold font-heading text-destructive leading-none">
								Session
							</h2>
						</div>

						<div class="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
							<div class="flex items-center gap-3 flex-1 min-w-0">
								<img
									src={avatarSrc}
									alt="Your avatar"
									class="w-10 h-10 rounded-xl object-cover border border-border shrink-0"
								/>
								<div class="min-w-0">
									<p class="font-semibold text-sm">Sign out of {displayName}</p>
									<p class="text-xs text-muted-foreground mt-0.5">
										Ends your current session. Your data won't be affected.
									</p>
								</div>
							</div>
							<button
								on:click={() => (showLogoutConfirm = true)}
								class="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-destructive/50 text-destructive text-sm font-semibold hover:bg-destructive/10 active:scale-95 transition-all duration-150"
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
								>
									<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline
										points="16 17 21 12 16 7"
									/><line x1="21" y1="12" x2="9" y2="12" />
								</svg>
								Sign Out
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</section>
</div>
