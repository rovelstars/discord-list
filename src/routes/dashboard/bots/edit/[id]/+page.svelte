<script lang="ts">
	import { goto } from "$app/navigation";
	import { Marked } from "marked";
	import { markedHighlight } from "marked-highlight";
	import hljs from "highlight.js";
	import Input from "$lib/components/ui/Input.svelte";
	import Label from "$lib/components/ui/Label.svelte";
	import Textarea from "$lib/components/ui/textarea/Textarea.svelte";
	import getAvatarURL from "$lib/get-avatar-url";
	import SEO from "$lib/components/SEO.svelte";

	// ── Markdown renderer (mirrors +page.server.ts on the real bot page) ───────
	// Instantiated once; shared across all reactive calls.
	const marked = new Marked(
		markedHighlight({
			emptyLangClass: "hljs",
			langPrefix: "hljs language-",
			highlight(code, lang) {
				const language = hljs.getLanguage(lang) ? lang : "plaintext";
				return hljs.highlight(code, { language }).value;
			}
		})
	);

	/**
	 * Render markdown to HTML exactly as the real bot page does server-side:
	 *   1. Unescape &gt; sequences first (mirrors old Astro behaviour).
	 *   2. Run through marked with the highlight.js extension.
	 * Returns an empty string on error so the preview degrades gracefully.
	 */
	function renderMarkdown(raw: string): string {
		if (!raw) return "";
		try {
			// marked.parse() returns string | Promise<string> depending on the
			// version; in marked v5+ with no async extensions it is always sync.
			const result = marked.parse(raw.replace(/&gt;+/g, ">"));
			// Guard: if somehow a Promise slips through, return empty string.
			if (typeof result !== "string") return "";
			return result;
		} catch {
			return "";
		}
	}

	export let data: {
		user: {
			id: string;
			username: string;
			discriminator: string;
			avatar: string | null;
		};
		bot: {
			id: string;
			slug: string;
			username: string;
			discriminator: string;
			avatar: string | null;
			short: string;
			desc: string;
			prefix: string;
			lib: string;
			invite: string;
			bg: string;
			support: string;
			source_repo: string;
			website: string;
			webhook: string;
			donate: string;
			owners: string[];
			code: string;
			opted_coins: boolean;
		};
	};

	const { user, bot } = data;

	// ── Form state (pre-filled from server data) ───────────────────────────────
	let lib = bot.lib;
	let owners = bot.owners.join(", ");
	let prefix = bot.prefix;
	let short = bot.short;
	let desc = bot.desc;
	let support = bot.support;
	let source_repo = bot.source_repo;
	let website = bot.website;
	let webhook = bot.webhook;
	let bg = bot.bg;
	let donate = bot.donate;
	let invite = bot.invite;
	let slug = bot.slug !== bot.id ? bot.slug : "";
	let opted_coins = bot.opted_coins;

	// ── UI state ───────────────────────────────────────────────────────────────
	let activeTab: "edit" | "preview" = "edit";
	let submitting = false;
	let successMsg = "";
	let errorMsg = "";

	// ── Bot code reveal / copy state ──────────────────────────────────────────
	let codeRevealed = false;
	let codeCopied = false;

	// The live code value - starts as what the server loaded, replaced in-place
	// after a successful regeneration so the user sees the new token immediately.
	let currentCode = bot.code;

	function toggleCodeReveal() {
		codeRevealed = !codeRevealed;
	}

	async function copyCode() {
		try {
			await navigator.clipboard.writeText(currentCode);
			codeCopied = true;
			setTimeout(() => (codeCopied = false), 2000);
		} catch {
			// fallback: select the text
			const el = document.getElementById("bot-code-text") as HTMLElement | null;
			if (el) {
				const range = document.createRange();
				range.selectNodeContents(el);
				window.getSelection()?.removeAllRanges();
				window.getSelection()?.addRange(range);
			}
		}
	}

	// ── Regenerate code state ──────────────────────────────────────────────────
	// 'idle'      - default, button shows normally
	// 'confirm'   - inline confirmation prompt is visible
	// 'loading'   - API call in flight
	// 'done'      - regeneration succeeded, new code is shown unblurred with a warning
	type RegenState = "idle" | "confirm" | "loading" | "done";
	let regenState: RegenState = "idle";
	let regenError = "";

	function requestRegenConfirm() {
		regenState = "confirm";
		regenError = "";
	}

	function cancelRegen() {
		regenState = "idle";
		regenError = "";
	}

	async function confirmRegen() {
		regenState = "loading";
		regenError = "";

		try {
			const res = await fetch(`/api/bots/${encodeURIComponent(bot.id)}/regenerate-code`, {
				method: "POST",
				headers: { "Content-Type": "application/json" }
			});

			const data = await res.json();

			if (!res.ok || data.err) {
				const errMap: Record<string, string> = {
					not_logged_in: "You must be logged in.",
					invalid_key: "Your session is invalid. Please log in again.",
					not_owner: "You are not an owner of this bot.",
					no_bot_found: "Bot not found.",
					db_update_failed: "Database error - please try again.",
					server_error: "An unexpected server error occurred."
				};
				regenError = errMap[data.err] ?? data.err ?? "Unknown error.";
				regenState = "idle";
				return;
			}

			// Success - replace the displayed code and force it revealed so the
			// user can immediately see and copy it.
			currentCode = data.code;
			codeRevealed = true;
			regenState = "done";
		} catch {
			regenError = "Network error - please try again.";
			regenState = "idle";
		}
	}

	// ── Field-level errors ─────────────────────────────────────────────────────
	type FieldErrors = Partial<Record<string, string>>;
	let fieldErrors: FieldErrors = {};

	function clearErrors() {
		errorMsg = "";
		successMsg = "";
		fieldErrors = {};
	}

	// ── Client-side validation (mirrors bot-form-schema.ts + edit rules) ──────
	function validate(): boolean {
		const errs: FieldErrors = {};

		if (lib && lib.length > 20) errs.lib = "Library must be at most 20 characters.";

		const ownerList = owners
			.split(",")
			.map((o) => o.trim())
			.filter(Boolean);
		if (ownerList.length === 0) errs.owners = "At least one owner is required.";
		if (ownerList.length > 10) errs.owners = "At most 10 owners are allowed.";

		// Only the main owner (index 0) can change the owners list.
		// If owners changed and current user is not bot.owners[0], show a warning
		// (the server will enforce this too, but give early feedback).
		const ownersChanged = ownerList.join(",") !== bot.owners.join(",");
		if (ownersChanged && bot.owners[0] !== user.id) {
			errs.owners = "Only the main owner can modify the owners list.";
		}
		if (ownersChanged && ownerList[0] !== user.id) {
			errs.owners = "You must remain the first (main) owner.";
		}

		if (prefix && prefix.length > 20) errs.prefix = "Prefix must be at most 20 characters.";

		if (!short || short.length < 11)
			errs.short = "Short description must be at least 11 characters.";
		if (short.length > 150) errs.short = "Short description must be at most 150 characters.";

		if (!desc || desc.length < 100) errs.desc = "Description must be at least 100 characters.";
		if (desc.length > 10000) errs.desc = "Description must be at most 10,000 characters.";

		if (!invite.trim()) errs.invite = "Invite URL is required.";

		fieldErrors = errs;
		return Object.keys(errs).length === 0;
	}

	// ── Submit ─────────────────────────────────────────────────────────────────
	async function handleSubmit() {
		clearErrors();
		if (!validate()) return;

		submitting = true;

		const ownerList = owners
			.split(",")
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
			const res = await fetch(`/api/bots/${encodeURIComponent(bot.id)}/edit`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body)
			});

			const responseData = await res.json();

			if (responseData.err) {
				const errMap: Record<string, string> = {
					slug_taken: "Vanity URL name is already taken. Please choose another one.",
					main_owner_cant_be_changed: "You cannot change who the main owner is.",
					not_main_owner: "Only the main owner can modify the owners list.",
					owners_not_array: "Owners must be a list of IDs.",
					invalid_webhook: "Webhook URL is invalid.",
					invalid_source_repo: "Source repository URL is invalid.",
					invalid_website: "Website URL is invalid.",
					invalid_donate: "Donate URL is invalid.",
					invalid_bg: "Background image URL is invalid.",
					invalid_invite: "Invite URL is invalid.",
					invalid_support: "Support server invite is invalid.",
					expired_support: "Support server invite has expired or is unknown.",
					lib_too_long: "Library name must be 20 characters or fewer.",
					not_logged_in: "You must be logged in.",
					invalid_key: "Your session is invalid. Please log in again.",
					not_owner: "You are not an owner of this bot.",
					no_bot_found: "Bot not found.",
					db_update_failed: "Database error - please try again."
				};
				errorMsg = errMap[responseData.err] ?? responseData.err;
			} else {
				successMsg = "Bot updated successfully!";
				// Redirect to bot page after a short delay so the user sees the success message.
				setTimeout(() => goto(`/bots/${slug || bot.id}`), 1200);
			}
		} catch {
			errorMsg = "Network error - please try again.";
		} finally {
			submitting = false;
		}
	}

	// ── Avatar ─────────────────────────────────────────────────────────────────
	$: avatarSrc = bot.avatar
		? getAvatarURL(bot.id, bot.avatar, 256).replace(".png", ".webp")
		: getAvatarURL(bot.id, "0");

	// ── Live preview: re-render markdown whenever desc changes ─────────────────
	$: descHtml = renderMarkdown(desc);
</script>

<SEO
	title="Edit {bot.username} - Dashboard"
	description="Edit your bot's details on Rovel Discord List."
	imageSmall="/assets/img/bot/logo-512.png"
/>
<svelte:head>
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
				on:click={() => (activeTab = "edit")}
			>
				Editing {bot.username}#{bot.discriminator}
			</button>
			<button
				class="tab-btn flex-1 py-5 text-2xl font-bold font-heading relative z-10
					{activeTab === 'preview' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}"
				on:click={() => (activeTab = "preview")}
			>
				Preview
			</button>
		</div>
	</div>

	<!-- ── Edit tab ──────────────────────────────────────────────────────────── -->
	{#if activeTab === "edit"}
		<div class="bg-card p-6 rounded-xl space-y-8">
			<!-- Bot identity header -->
			<div class="flex flex-col items-center gap-2">
				<img
					src={avatarSrc}
					alt="{bot.username}'s avatar"
					class="w-36 h-36 rounded-full border-8 border-card object-cover bg-muted"
					loading="lazy"
				/>
				<p class="text-center font-bold text-muted-foreground text-xl">
					You are editing <span class="text-foreground">{bot.username}#{bot.discriminator}</span>
				</p>
				<a
					href="/bots/{bot.slug ?? bot.id}"
					class="text-sm text-primary hover:underline"
					target="_blank"
					rel="noopener noreferrer"
				>
					View public page →
				</a>
			</div>

			<form on:submit|preventDefault={handleSubmit} class="space-y-8">
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
								Comma-separated Discord user IDs. You must remain first. Only the main owner can
								change this list.
							</p>
							{#if fieldErrors.owners}
								<p class="text-sm text-destructive">{fieldErrors.owners}</p>
							{/if}
						</div>

						<div class="space-y-1.5">
							<Label forId="prefix">Prefix</Label>
							<Input id="prefix" bind:value={prefix} placeholder="/" />
							<p class="text-sm text-muted-foreground">Leave empty for slash-command-only bots.</p>
							{#if fieldErrors.prefix}
								<p class="text-sm text-destructive">{fieldErrors.prefix}</p>
							{/if}
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
							<p class="text-sm text-muted-foreground">
								{short.length}/150 characters (min 11).
							</p>
							{#if fieldErrors.short}
								<p class="text-sm text-destructive">{fieldErrors.short}</p>
							{/if}
						</div>

						<div class="space-y-1.5">
							<Label forId="desc">Description <span class="text-destructive">*</span></Label>
							<Textarea
								id="desc"
								bind:value={desc}
								rows={10}
								placeholder="A detailed description of the bot. Supports markdown and HTML."
								autoGrow
							/>
							<p class="text-sm text-muted-foreground">
								{desc.length}/10,000 characters (min 100). Markdown, HTML, CSS and iframes are
								supported.
							</p>
							{#if fieldErrors.desc}
								<p class="text-sm text-destructive">{fieldErrors.desc}</p>
							{/if}
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
							{#if fieldErrors.invite}
								<p class="text-sm text-destructive">{fieldErrors.invite}</p>
							{/if}
						</div>

						<div class="space-y-1.5">
							<Label forId="support">Support Server</Label>
							<Input id="support" bind:value={support} placeholder="https://discord.gg/invite" />
							<p class="text-sm text-muted-foreground">Discord invite link or invite code.</p>
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
							<p class="text-sm text-muted-foreground">
								Receives a POST request when someone votes.
							</p>
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

				<!-- ── Vanity Slug ────────────────────────────────────────────────── -->
				<div class="space-y-1.5">
					<Label forId="slug">Vanity URL Slug</Label>
					<Input id="slug" bind:value={slug} placeholder="my-cool-bot" />
					<p class="text-sm text-muted-foreground">
						Your bot will be accessible at /bots/<strong>{slug || bot.id}</strong>.
					</p>
				</div>

				<!-- ── Sensitive Zone ─────────────────────────────────────────────── -->
				<div class="rounded-xl border border-destructive/40 bg-destructive/5 p-5 space-y-4">
					<h2 class="font-heading text-xl font-semibold text-destructive">Sensitive Zone</h2>

					<div class="space-y-1.5">
						<Label forId="bot-code-text">Bot Code</Label>

						<!-- Blurred text + reveal/copy controls -->
						<div class="flex items-center gap-2">
							<div class="relative flex-1 min-w-0">
								<p
									id="bot-code-text"
									class="font-mono text-sm px-3 py-2 rounded-md border border-input bg-background break-all transition-all duration-200 select-none
										{codeRevealed ? '' : 'blur-sm'}"
								>
									{currentCode || "(not set)"}
								</p>
								<!-- Reveal toggle -->
								<button
									type="button"
									on:click={toggleCodeReveal}
									aria-label={codeRevealed ? "Hide bot code" : "Show bot code"}
									class="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
								>
									{#if codeRevealed}
										<!-- EyeOff icon -->
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
												d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"
											/>
											<path
												d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"
											/>
											<line x1="1" y1="1" x2="23" y2="23" />
										</svg>
									{:else}
										<!-- Eye icon -->
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
											<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
											<circle cx="12" cy="12" r="3" />
										</svg>
									{/if}
								</button>
							</div>

							<!-- Copy button -->
							<button
								type="button"
								on:click={copyCode}
								aria-label="Copy bot code"
								class="shrink-0 p-2 rounded-md border border-input bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
							>
								{#if codeCopied}
									<!-- Check icon -->
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
										<polyline points="20 6 9 17 4 12" />
									</svg>
								{:else}
									<!-- Copy icon -->
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
										<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
										<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
									</svg>
								{/if}
							</button>
						</div>

						<p class="text-sm text-muted-foreground">
							The bot code is a sensitive token used to authenticate your bot with the RDL API. Do
							not share it with anyone.
						</p>
					</div>

					<!-- Regenerate section -->
					{#if regenState === "done"}
						<div
							class="rounded-md bg-yellow-500/10 border border-yellow-500/40 px-4 py-3 space-y-1"
						>
							<p class="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
								⚠ New token generated - copy it now
							</p>
							<p class="text-sm text-muted-foreground">
								This is the only time the new token is shown unblurred. Any integrations using the
								old token (webhooks, server count updates) must be updated immediately.
							</p>
						</div>
					{/if}

					{#if regenError}
						<p class="text-sm text-destructive">{regenError}</p>
					{/if}

					{#if regenState === "confirm"}
						<!-- Inline confirmation prompt -->
						<div
							class="rounded-md border border-destructive/50 bg-destructive/5 px-4 py-3 space-y-3"
						>
							<p class="text-sm font-semibold text-destructive">Are you sure?</p>
							<p class="text-sm text-muted-foreground">
								Regenerating the bot code will <strong>immediately invalidate</strong> the current token.
								Any services using it will stop working until updated.
							</p>
							<div class="flex gap-2">
								<button
									type="button"
									on:click={confirmRegen}
									class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors"
								>
									Yes, regenerate
								</button>
								<button
									type="button"
									on:click={cancelRegen}
									class="inline-flex items-center px-3 py-1.5 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
								>
									Cancel
								</button>
							</div>
						</div>
					{:else}
						<button
							type="button"
							on:click={requestRegenConfirm}
							disabled={regenState === "loading"}
							class="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-destructive/60 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
						>
							{#if regenState === "loading"}
								<svg class="w-4 h-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
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
								Regenerating…
							{:else}
								<!-- Refresh icon -->
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
									<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
									<path d="M21 3v5h-5" />
									<path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
									<path d="M8 16H3v5" />
								</svg>
								Regenerate Bot Code
							{/if}
						</button>
					{/if}
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

				<!-- ── Actions ────────────────────────────────────────────────────── -->
				<div class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
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
							Saving…
						{:else}
							Save Changes
						{/if}
					</button>

					<a
						href="/bots/{bot.slug ?? bot.id}"
						class="inline-flex items-center gap-2 px-6 py-3 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
					>
						Cancel
					</a>
				</div>
			</form>
		</div>

		<!-- ── Preview tab ───────────────────────────────────────────────────────── -->
	{:else}
		<div class="bg-card p-6 rounded-xl space-y-4">
			<h2 class="text-xl font-bold text-muted-foreground">Live Preview</h2>

			<!-- Bot header -->
			<div class="flex items-center gap-4">
				<img
					src={avatarSrc}
					alt="{bot.username}'s avatar"
					class="w-20 h-20 rounded-full object-cover border-4 border-border shrink-0"
				/>
				<div>
					<p class="font-bold text-2xl">
						{bot.username}<span class="text-muted-foreground text-base ml-1"
							>#{bot.discriminator}</span
						>
					</p>
					{#if short}
						<p class="text-muted-foreground mt-1">{short}</p>
					{:else}
						<p class="text-muted-foreground italic mt-1">No short description yet.</p>
					{/if}
				</div>
			</div>

			<!-- bg preview -->
			{#if bg}
				<div class="rounded-md overflow-hidden h-32 w-full">
					<img
						src={bg}
						alt="Background preview"
						class="w-full h-full object-cover"
						on:error={(e) => {
							(e.target as HTMLImageElement).style.display = "none";
						}}
					/>
				</div>
			{/if}

			<!-- Long description - rendered through the same marked+hljs pipeline
			     the real bot page uses server-side, so the preview is faithful. -->
			{#if descHtml}
				<div
					class="prose prose-sm dark:prose-invert max-w-none mt-4 border rounded-md p-4 bg-background"
				>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html descHtml}
				</div>
			{:else if desc}
				<!-- desc is non-empty but rendering produced nothing (e.g. parse error) -->
				<p class="text-muted-foreground italic text-sm">Preview unavailable.</p>
			{:else}
				<p class="text-muted-foreground italic text-sm">
					Fill in the Description field to see a preview here.
				</p>
			{/if}

			<!-- Quick meta summary -->
			<div class="grid grid-cols-2 gap-2 text-sm pt-2">
				{#if lib}
					<div class="flex flex-col gap-0.5">
						<span class="text-muted-foreground font-medium">Library</span>
						<span>{lib}</span>
					</div>
				{/if}
				{#if prefix}
					<div class="flex flex-col gap-0.5">
						<span class="text-muted-foreground font-medium">Prefix</span>
						<code class="bg-muted px-1.5 py-0.5 rounded text-xs">{prefix}</code>
					</div>
				{/if}
				{#if website}
					<div class="flex flex-col gap-0.5">
						<span class="text-muted-foreground font-medium">Website</span>
						<a
							href={website}
							class="text-primary hover:underline truncate"
							target="_blank"
							rel="noopener noreferrer">{website}</a
						>
					</div>
				{/if}
				{#if support}
					<div class="flex flex-col gap-0.5">
						<span class="text-muted-foreground font-medium">Support</span>
						<span>{support}</span>
					</div>
				{/if}
			</div>

			<p class="text-xs text-muted-foreground pt-2">
				This is a simplified preview. The full bot page will look different.
			</p>
		</div>
	{/if}
</section>

<style>
	.tab-indicator {
		position: absolute;
		inset: 0;
		width: 50%;
		background-color: hsl(var(--popover));
		border-radius: 1rem;
		transition: transform 250ms cubic-bezier(0.4, 0, 0.2, 1);
		pointer-events: none;
	}

	.tab-btn {
		background: transparent;
		border: none;
		cursor: pointer;
		transition: color 150ms ease;
	}

	input[type="radio"].radio {
		appearance: none;
		-webkit-appearance: none;
		width: 1.1rem;
		height: 1.1rem;
		border: 2px solid hsl(var(--muted-foreground));
		border-radius: 50%;
		display: inline-block;
		position: relative;
		cursor: pointer;
		flex-shrink: 0;
		transition:
			border-color 150ms ease,
			background-color 150ms ease;
	}

	input[type="radio"].radio:checked {
		border-color: hsl(var(--primary));
		background-color: hsl(var(--primary));
		box-shadow: inset 0 0 0 3px hsl(var(--card));
	}

	input[type="radio"].radio:focus-visible {
		outline: 2px solid hsl(var(--ring));
		outline-offset: 2px;
	}
</style>
