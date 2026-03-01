<script lang="ts">
	import { goto } from '$app/navigation';
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
		};
		botId: string | null;
		botInfo: {
			id: string;
			username: string;
			discriminator: string;
			avatar: string | null;
		} | null;
	};

	// ── Form state ─────────────────────────────────────────────────────────────
	let botId = data.botId ?? '';
	let lib = '';
	let owners = data.user.id;
	let prefix = '';
	let short = '';
	let desc = '';
	let support = '';
	let source_repo = '';
	let website = '';
	let webhook = '';
	let bg = '';
	let donate = '';
	let invite = '';
	let slug = '';
	let opted_coins = false;

	// ── UI state ───────────────────────────────────────────────────────────────
	let activeTab: 'edit' | 'preview' = 'edit';
	let submitting = false;
	let successMsg = '';
	let errorMsg = '';

	// ── Bot ID lookup state ────────────────────────────────────────────────────
	let resolvedBot: {
		id: string;
		username: string;
		discriminator: string;
		avatar: string | null;
	} | null = data.botInfo ?? null;
	let botIdLookupError = '';
	let botIdLooking = false;

	// Debounce timer handle
	let lookupTimer: ReturnType<typeof setTimeout> | null = null;

	// Reactive: whenever botId changes (and wasn't pre-filled from the URL),
	// debounce a lookup call to /api/discord/user/[id]
	$: if (!data.botId) {
		if (lookupTimer) clearTimeout(lookupTimer);
		const trimmed = botId.trim();
		if (!trimmed || !/^\d{17,20}$/.test(trimmed)) {
			resolvedBot = null;
			botIdLookupError = trimmed && trimmed.length > 0 ? 'Enter a valid Discord snowflake ID.' : '';
			botIdLooking = false;
		} else {
			botIdLooking = true;
			botIdLookupError = '';
			lookupTimer = setTimeout(async () => {
				try {
					const res = await fetch(`/api/discord/user/${encodeURIComponent(trimmed)}`);
					const json = await res.json();
					if (json.err) {
						const lookupErrMap: Record<string, string> = {
							not_found: 'No bot found with that ID.',
							not_a_bot: 'That ID belongs to a user account, not a bot.',
							discord_error: 'Discord returned an error. Check the ID and try again.',
							missing_token: 'Server is not configured. Contact the admin.',
							server_error: 'An unexpected server error occurred.'
						};
						botIdLookupError = lookupErrMap[json.err] ?? json.err;
						resolvedBot = null;
						// Pre-fill invite when we have a valid bot
						invite = '';
					} else {
						resolvedBot = json;
						botIdLookupError = '';
						// Auto-populate invite URL using the resolved bot id
						if (!invite) {
							invite = `https://discord.com/oauth2/authorize?client_id=${json.id}&scope=bot&permissions=0`;
						}
					}
				} catch {
					botIdLookupError = 'Network error while looking up bot.';
					resolvedBot = null;
				} finally {
					botIdLooking = false;
				}
			}, 600);
		}
	}

	// ── Field-level errors ─────────────────────────────────────────────────────
	type FieldErrors = Partial<Record<string, string>>;
	let fieldErrors: FieldErrors = {};

	function clearErrors() {
		errorMsg = '';
		successMsg = '';
		fieldErrors = {};
	}

	// ── Validation (mirrors bot-form-schema.ts) ────────────────────────────────
	function validate(): boolean {
		const errs: FieldErrors = {};

		if (!botId.trim()) errs.botId = 'Bot ID is required.';

		if (lib && lib.length > 20) errs.lib = 'Library must be at most 20 characters.';

		const ownerList = owners
			.split(',')
			.map((o) => o.trim())
			.filter(Boolean);
		if (ownerList.length === 0) errs.owners = 'At least one owner is required.';
		if (ownerList.length > 10) errs.owners = 'At most 10 owners are allowed.';
		if (ownerList[0] !== data.user.id) errs.owners = 'You must be the first (main) owner.';

		if (prefix && prefix.length > 20) errs.prefix = 'Prefix must be at most 20 characters.';

		if (!short || short.length < 11)
			errs.short = 'Short description must be at least 11 characters.';
		if (short.length > 150) errs.short = 'Short description must be at most 150 characters.';

		if (!desc || desc.length < 100) errs.desc = 'Description must be at least 100 characters.';
		if (desc.length > 10000) errs.desc = 'Description must be at most 10,000 characters.';

		if (!invite.trim()) errs.invite = 'Invite URL is required.';

		fieldErrors = errs;
		return Object.keys(errs).length === 0;
	}

	// ── Submit ─────────────────────────────────────────────────────────────────
	async function handleSubmit() {
		clearErrors();
		if (!validate()) return;

		submitting = true;

		const ownerList = owners
			.split(',')
			.map((o) => o.trim())
			.filter(Boolean);

		const body = {
			lib: lib || undefined,
			owners: ownerList,
			prefix: prefix || undefined,
			short,
			desc,
			support: support || undefined,
			source_repo: source_repo || undefined,
			website: website || undefined,
			webhook: webhook || undefined,
			bg: bg || undefined,
			donate: donate || undefined,
			invite,
			slug: slug || undefined,
			opted_coins
		};

		try {
			const res = await fetch(`/api/bots/${encodeURIComponent(botId.trim())}/new`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			const data = await res.json();

			if (data.err) {
				const errMap: Record<string, string> = {
					slug_taken: 'Vanity URL name is already taken. Please choose another one.',
					main_owner_cant_be_changed: 'You must be the first (main) owner.',
					owners_not_array: 'Owners must be a list of IDs.',
					invalid_webhook: 'Webhook URL is invalid.',
					invalid_source_repo: 'Source repository URL is invalid.',
					invalid_website: 'Website URL is invalid.',
					invalid_donate: 'Donate URL is invalid.',
					invalid_bg: 'Background image URL is invalid.',
					invalid_invite: 'Invite URL is invalid.',
					invalid_support: 'Support server invite is invalid.',
					expired_support: 'Support server invite has expired.',
					invalid_bot: 'That Discord application is not a valid bot.',
					bot_is_user: 'That ID belongs to a user, not a bot.',
					not_logged_in: 'You must be logged in.',
					invalid_key: 'Your session is invalid. Please log in again.'
				};
				errorMsg = errMap[data.err] ?? data.err;
			} else {
				successMsg = 'Bot submitted successfully!';
				setTimeout(() => goto(`/bots/${botId.trim()}`), 1200);
			}
		} catch (e) {
			errorMsg = 'Network error — please try again.';
		} finally {
			submitting = false;
		}
	}

	// ── Avatar helper ──────────────────────────────────────────────────────────
	// Use resolvedBot (which is kept in sync reactively) as the canonical source
	$: headerBot = resolvedBot;
	$: avatarSrc = headerBot
		? getAvatarURL(headerBot.id, headerBot.avatar ?? '0', 256)
		: '/assets/img/bot/logo-144.png';
</script>

<SEO
	title="Add a New Bot"
	description="Submit your Discord bot to Rovel Discord List and get it discovered by thousands of server owners."
	imageSmall="/assets/img/bot/logo-512.png"
/>
<svelte:head>
	<!-- Private page — don't index in search engines -->
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<section class="max-w-3xl mx-auto px-4 py-10">
	<!-- ── Tabs ──────────────────────────────────────────────────────────────── -->
	<div class="bg-card rounded-2xl mb-6 overflow-hidden">
		<div class="relative flex">
			<!-- Sliding active-tab indicator -->
			<div
				class="tab-indicator"
				style="transform: translateX({activeTab === 'edit' ? '0%' : '100%'})"
			></div>
			<button
				class="tab-btn flex-1 py-5 text-2xl font-bold font-heading relative z-10
					{activeTab === 'edit' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}"
				on:click={() => (activeTab = 'edit')}
			>
				{#if botIdLooking}
					<span class="inline-flex items-center gap-2">
						<svg class="w-5 h-5 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
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
						Looking up…
					</span>
				{:else if headerBot}
					Adding {headerBot.username}#{headerBot.discriminator}
				{:else}
					Add a New Bot
				{/if}
			</button>
			<button
				class="tab-btn flex-1 py-5 text-2xl font-bold font-heading relative z-10
					{activeTab === 'preview' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}"
				on:click={() => (activeTab = 'preview')}
			>
				Preview
			</button>
		</div>
	</div>

	<!-- ── Edit tab ──────────────────────────────────────────────────────────── -->
	{#if activeTab === 'edit'}
		<div class="bg-card p-6 rounded-xl space-y-8">
			<!-- Avatar -->
			<div class="flex flex-col items-center gap-2">
				<img
					src={avatarSrc}
					alt="Bot avatar"
					class="w-36 h-36 rounded-full border-8 border-card object-cover bg-muted"
					loading="lazy"
				/>
				{#if headerBot}
					<p class="text-center font-bold text-muted-foreground text-xl">
						You are adding {headerBot.username}#{headerBot.discriminator}
					</p>
				{/if}
			</div>

			<form on:submit|preventDefault={handleSubmit} class="space-y-8">
				<!-- Bot ID (only shown when not pre-filled from ?id) -->
				{#if !data.botId}
					<div class="space-y-1.5">
						<Label forId="botId">Bot ID <span class="text-destructive">*</span></Label>
						<Input id="botId" bind:value={botId} placeholder="123456789012345678" />
						{#if botIdLooking}
							<p class="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
								<svg class="w-3.5 h-3.5 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
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
								Looking up bot…
							</p>
						{:else if botIdLookupError}
							<p class="text-sm text-destructive mt-1">{botIdLookupError}</p>
						{:else if resolvedBot}
							<p class="text-sm text-green-600 dark:text-green-400 mt-1">
								✓ Found: {resolvedBot.username}#{resolvedBot.discriminator}
							</p>
						{:else if fieldErrors.botId}
							<p class="text-sm text-destructive mt-1">{fieldErrors.botId}</p>
						{/if}
					</div>
				{/if}

				<!-- ── General Information ───────────────────────────────────────── -->
				<div>
					<h2 class="font-heading text-2xl font-semibold mb-4">General Information</h2>
					<div class="space-y-5">
						<div class="space-y-1.5">
							<Label forId="lib">Library</Label>
							<Input id="lib" bind:value={lib} placeholder="discord.js, D++, etc." />
							<p class="text-sm text-muted-foreground">The library that the bot uses.</p>
							{#if fieldErrors.lib}<p class="text-sm text-destructive">{fieldErrors.lib}</p>{/if}
						</div>

						<div class="space-y-1.5">
							<Label forId="owners">Owners <span class="text-destructive">*</span></Label>
							<Input
								id="owners"
								bind:value={owners}
								placeholder="123456789012345678, 123456789012345678"
							/>
							<p class="text-sm text-muted-foreground">
								Comma-separated Discord user IDs. You must be first.
							</p>
							{#if fieldErrors.owners}<p class="text-sm text-destructive">
									{fieldErrors.owners}
								</p>{/if}
						</div>

						<div class="space-y-1.5">
							<Label forId="prefix">Prefix</Label>
							<Input id="prefix" bind:value={prefix} placeholder="/" />
							<p class="text-sm text-muted-foreground">Leave empty for slash-command-only bots.</p>
							{#if fieldErrors.prefix}<p class="text-sm text-destructive">
									{fieldErrors.prefix}
								</p>{/if}
						</div>
					</div>
				</div>

				<!-- ── Description ───────────────────────────────────────────────── -->
				<div>
					<h2 class="font-heading text-2xl font-semibold mb-4">Description</h2>
					<div class="space-y-5">
						<div class="space-y-1.5">
							<Label forId="short">Short Description <span class="text-destructive">*</span></Label>
							<Input id="short" bind:value={short} placeholder="A short description of the bot." />
							<p class="text-sm text-muted-foreground">11–150 characters.</p>
							{#if fieldErrors.short}<p class="text-sm text-destructive">
									{fieldErrors.short}
								</p>{/if}
						</div>

						<div class="space-y-1.5">
							<Label forId="desc">Description <span class="text-destructive">*</span></Label>
							<Textarea
								id="desc"
								bind:value={desc}
								rows={8}
								placeholder="A detailed description of the bot. Supports markdown and HTML."
								autoGrow
							/>
							<p class="text-sm text-muted-foreground">
								100–10,000 characters. Markdown, HTML, CSS and iframes are supported.
							</p>
							{#if fieldErrors.desc}<p class="text-sm text-destructive">{fieldErrors.desc}</p>{/if}
						</div>
					</div>
				</div>

				<!-- ── Meta Information ──────────────────────────────────────────── -->
				<div>
					<h2 class="font-heading text-2xl font-semibold mb-4">Meta Information</h2>
					<div class="space-y-5">
						<div class="space-y-1.5">
							<Label forId="invite">Invite URL <span class="text-destructive">*</span></Label>
							<Input
								id="invite"
								bind:value={invite}
								placeholder="https://discord.com/oauth2/authorize?client_id=...&scope=bot"
							/>
							{#if fieldErrors.invite}<p class="text-sm text-destructive">
									{fieldErrors.invite}
								</p>{/if}
						</div>

						<div class="space-y-1.5">
							<Label forId="support">Support Server</Label>
							<Input id="support" bind:value={support} placeholder="https://discord.gg/invite" />
							<p class="text-sm text-muted-foreground">Discord invite link or code.</p>
						</div>

						<div class="space-y-1.5">
							<Label forId="website">Website</Label>
							<Input id="website" bind:value={website} placeholder="https://example.com" />
						</div>

						<div class="space-y-1.5">
							<Label forId="source_repo">Source Repository</Label>
							<Input
								id="source_repo"
								bind:value={source_repo}
								placeholder="https://github.com/user/repo"
							/>
						</div>

						<div class="space-y-1.5">
							<Label forId="webhook">Webhook URL</Label>
							<Input id="webhook" bind:value={webhook} placeholder="https://example.com/webhook" />
							<p class="text-sm text-muted-foreground">Receives a POST when someone votes.</p>
						</div>

						<div class="space-y-1.5">
							<Label forId="bg">Background Image URL</Label>
							<Input id="bg" bind:value={bg} placeholder="https://media.server/image.png" />
						</div>

						<div class="space-y-1.5">
							<Label forId="donate">Donate URL</Label>
							<Input id="donate" bind:value={donate} placeholder="https://donate.url/donate" />
						</div>
					</div>
				</div>

				<!-- ── Voting Mode ────────────────────────────────────────────────── -->
				<div>
					<h2 class="font-heading text-2xl font-semibold mb-2">Choose How People Vote</h2>
					<p class="text-sm text-muted-foreground mb-4">
						R$ can be earned for free by users. This lets them vote multiple times (R$10 = 1 vote)
						instead of once daily.
					</p>
					<div class="flex flex-col gap-3">
						<label class="inline-flex items-center gap-3 cursor-pointer">
							<input
								type="radio"
								name="opted_coins"
								class="radio"
								value={true}
								checked={opted_coins === true}
								on:change={() => (opted_coins = true)}
							/>
							<span class="font-medium">R$ Coins</span>
						</label>
						<label class="inline-flex items-center gap-3 cursor-pointer">
							<input
								type="radio"
								name="opted_coins"
								class="radio"
								value={false}
								checked={opted_coins === false}
								on:change={() => (opted_coins = false)}
							/>
							<span class="font-medium">Once Daily</span>
						</label>
					</div>
				</div>

				<!-- ── Slug ───────────────────────────────────────────────────────── -->
				<div class="space-y-1.5">
					<Label forId="slug">Vanity URL Slug</Label>
					<Input id="slug" bind:value={slug} placeholder="my-cool-bot" />
					<p class="text-sm text-muted-foreground">
						Optional. Your bot will be accessible at /bots/your-slug.
					</p>
				</div>

				<!-- ── Feedback ───────────────────────────────────────────────────── -->
				{#if errorMsg}
					<div
						class="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive"
					>
						{errorMsg}
					</div>
				{/if}
				{#if successMsg}
					<div
						class="rounded-md bg-green-500/10 border border-green-500/30 px-4 py-3 text-sm text-green-600 dark:text-green-400"
					>
						{successMsg}
					</div>
				{/if}

				<!-- ── Submit ─────────────────────────────────────────────────────── -->
				<div class="flex justify-center pt-2">
					<button
						type="submit"
						disabled={submitting}
						class="inline-flex items-center gap-2 px-8 py-3 rounded-md bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
					>
						{#if submitting}
							<svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
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
							Submitting…
						{:else}
							Submit
						{/if}
					</button>
				</div>
			</form>
		</div>

		<!-- ── Preview tab ───────────────────────────────────────────────────────── -->
	{:else}
		<div class="bg-card p-6 rounded-xl">
			<h2 class="text-xl font-bold mb-4 text-muted-foreground">Live Preview</h2>
			<div class="space-y-3 text-sm">
				<div class="flex gap-2">
					<img
						src={avatarSrc}
						alt="preview avatar"
						class="w-16 h-16 rounded-full object-cover border-4 border-border"
					/>
					<div>
						<p class="font-bold text-lg">{headerBot?.username ?? botId ?? '—'}</p>
						<p class="text-muted-foreground">#{headerBot?.discriminator ?? '0000'}</p>
					</div>
				</div>
				{#if short}
					<p class="text-base">{short}</p>
				{/if}
				{#if desc}
					<div
						class="prose prose-sm dark:prose-invert max-w-none mt-4 border rounded-md p-4 bg-background"
					>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html desc}
					</div>
				{/if}
				{#if !short && !desc}
					<p class="text-muted-foreground italic">Fill in the form fields to see a preview here.</p>
				{/if}
			</div>
		</div>
	{/if}
</section>

<style>
	/* ── Animated tab indicator ──────────────────────────────────────────────── */
	.tab-indicator {
		position: absolute;
		inset: 0;
		width: 50%;
		background-color: hsl(var(--popover));
		border-radius: inherit;
		transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
		pointer-events: none;
	}

	.tab-btn {
		transition: color 0.2s ease;
	}

	input[type='radio'].radio {
		appearance: none;
		width: 1rem;
		height: 1rem;
		border-radius: 9999px;
		border: 2px solid hsl(var(--input));
		background: transparent;
		cursor: pointer;
		transition:
			border-color 0.15s,
			background-color 0.15s;
		flex-shrink: 0;
	}

	input[type='radio'].radio:checked {
		border-color: hsl(var(--primary));
		background-color: hsl(var(--primary));
		box-shadow: inset 0 0 0 3px hsl(var(--background));
	}

	input[type='radio'].radio:focus-visible {
		outline: 2px solid hsl(var(--ring));
		outline-offset: 2px;
	}

	:global(.prose) {
		color: hsl(var(--foreground));
	}
</style>
