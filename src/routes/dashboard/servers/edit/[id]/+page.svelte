<script lang="ts">
	import { goto } from "$app/navigation";
	import { Marked } from "marked";
	import { markedHighlight } from "marked-highlight";
	import hljs from "highlight.js";
	import Input from "$lib/components/ui/Input.svelte";
	import Label from "$lib/components/ui/Label.svelte";
	import Textarea from "$lib/components/ui/textarea/Textarea.svelte";
	import SEO from "$lib/components/SEO.svelte";

	// ── Markdown renderer ──────────────────────────────────────────────────────
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

	function renderMarkdown(raw: string): string {
		if (!raw) return "";
		try {
			const result = marked.parse(raw.replace(/&gt;+/g, ">"));
			if (typeof result !== "string") return "";
			return result;
		} catch {
			return "";
		}
	}

	// ── Props ──────────────────────────────────────────────────────────────────
	export let data: {
		user: {
			id: string;
			username: string;
			discriminator: string;
			avatar: string | null;
		};
		server: {
			id: string;
			name: string;
			icon: string | null;
			owner: string;
			slug: string;
			short: string;
			desc: string;
			member_count: number | null;
			votes: number;
			added_at: string | null;
		};
	};

	const { user, server } = data;

	// ── Form state ─────────────────────────────────────────────────────────────
	let short = server.short;
	let desc = server.desc;
	// Only show slug in the field if it differs from the raw numeric ID
	let slug = server.slug && server.slug !== server.id ? server.slug : "";

	// ── UI state ───────────────────────────────────────────────────────────────
	let activeTab: "edit" | "preview" = "edit";
	let submitting = false;
	let successMsg = "";
	let errorMsg = "";

	// ── Field-level errors ─────────────────────────────────────────────────────
	type FieldErrors = Partial<Record<string, string>>;
	let fieldErrors: FieldErrors = {};

	function clearErrors() {
		errorMsg = "";
		successMsg = "";
		fieldErrors = {};
	}

	// ── Validation ─────────────────────────────────────────────────────────────
	function validate(): boolean {
		const errs: FieldErrors = {};

		if (!short || short.trim().length < 11)
			errs.short = "Short description must be at least 11 characters.";
		if (short.trim().length > 150)
			errs.short = "Short description must be at most 150 characters.";

		if (!desc || desc.trim().length < 100)
			errs.desc = "Full description must be at least 100 characters.";
		if (desc.trim().length > 10000)
			errs.desc = "Full description must be at most 10,000 characters.";

		if (slug.trim()) {
			if (!/^[a-z0-9-]{2,32}$/.test(slug.trim().toLowerCase())) {
				errs.slug =
					"Vanity URL must be 2–32 characters and contain only lowercase letters, numbers, and hyphens.";
			}
		}

		fieldErrors = errs;
		return Object.keys(errs).length === 0;
	}

	// ── Submit ─────────────────────────────────────────────────────────────────
	async function handleSubmit() {
		clearErrors();
		if (!validate()) return;

		submitting = true;

		const body = {
			short: short.trim(),
			desc: desc.trim(),
			slug: slug.trim().toLowerCase() || undefined
		};

		try {
			const res = await fetch(`/api/servers/${encodeURIComponent(server.id)}/edit`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body)
			});

			const responseData = await res.json();

			if (responseData.err) {
				const errMap: Record<string, string> = {
					not_logged_in: "You must be logged in.",
					invalid_key: "Your session is invalid. Please log in again.",
					not_owner: "You are not the owner of this server.",
					no_server_found: "Server not found.",
					short_too_short: "Short description must be at least 11 characters.",
					short_too_long: "Short description must be at most 150 characters.",
					desc_too_short: "Full description must be at least 100 characters.",
					desc_too_long: "Full description must be at most 10,000 characters.",
					slug_invalid:
						"Vanity URL must be 2–32 characters: lowercase letters, numbers, and hyphens only.",
					slug_taken: "That vanity URL is already taken. Please choose another.",
					db_update_failed: "Database error — please try again."
				};
				errorMsg = errMap[responseData.err] ?? responseData.err;
			} else {
				successMsg = "Server updated successfully!";
				const dest = responseData.slug
					? `/servers/${responseData.slug}`
					: `/servers/${server.id}`;
				setTimeout(() => goto(dest), 1200);
			}
		} catch {
			errorMsg = "Network error — please try again.";
		} finally {
			submitting = false;
		}
	}

	// ── Icon URL ───────────────────────────────────────────────────────────────
	$: iconUrl = (() => {
		if (!server.icon || server.icon === "") return null;
		if (server.icon.startsWith("http")) return server.icon;
		return `https://cdn.discordapp.com/icons/${server.id}/${server.icon}.webp?size=256`;
	})();

	// ── Live preview ───────────────────────────────────────────────────────────
	$: descHtml = renderMarkdown(desc);

	// ── Character counters ─────────────────────────────────────────────────────
	$: shortLen = short.length;
	$: descLen = desc.length;
	$: shortOver = shortLen > 150;
	$: descOver = descLen > 10000;
</script>

<SEO
	title="Edit Server — {server.name}"
	description="Edit your server listing on Rovel Stars."
	imageSmall="/assets/img/bot/logo-512.png"
/>
<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<section class="max-w-3xl mx-auto px-4 py-10">

	<!-- ── Tab switcher ───────────────────────────────────────────────────── -->
	<div class="bg-card rounded-2xl mb-6 overflow-hidden border border-border shadow-sm">
		<div class="relative flex">
			<!-- sliding indicator -->
			<div
				class="tab-indicator absolute bottom-0 h-0.5 bg-primary transition-all duration-200"
				style="width: 50%; left: {activeTab === 'edit' ? '0%' : '50%'}"
			></div>
			<button
				class="tab-btn flex-1 py-3.5 text-sm font-semibold transition-colors
					{activeTab === 'edit' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}"
				on:click={() => (activeTab = "edit")}
			>
				Edit
			</button>
			<button
				class="tab-btn flex-1 py-3.5 text-sm font-semibold transition-colors
					{activeTab === 'preview' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}"
				on:click={() => (activeTab = "preview")}
			>
				Preview
			</button>
		</div>
	</div>

	{#if activeTab === "edit"}
		<!-- ── Edit form ──────────────────────────────────────────────────── -->
		<div class="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-8">

			<!-- Server identity header -->
			<div class="flex flex-col items-center gap-3">
				{#if iconUrl}
					<img
						src={iconUrl}
						alt={server.name}
						class="w-20 h-20 rounded-2xl object-cover shadow-md"
					/>
				{:else}
					<div
						class="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center shadow-md"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-9 h-9 text-muted-foreground"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
							<polyline points="9 22 9 12 15 12 15 22" />
						</svg>
					</div>
				{/if}
				<div class="text-center">
					<p class="font-bold text-xl text-foreground">{server.name}</p>
					{#if server.member_count}
						<p class="text-sm text-muted-foreground mt-0.5">
							{server.member_count.toLocaleString()} members · {server.votes} votes
						</p>
					{:else}
						<p class="text-sm text-muted-foreground mt-0.5">{server.votes} votes</p>
					{/if}
				</div>
				<a
					href="/servers/{server.slug || server.id}"
					class="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
					target="_blank"
					rel="noopener noreferrer"
				>
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
						<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
						<polyline points="15 3 21 3 21 9" />
						<line x1="10" y1="14" x2="21" y2="3" />
					</svg>
					View public listing
				</a>
			</div>

			<form on:submit|preventDefault={handleSubmit} class="space-y-8">

				<!-- ── Description section ────────────────────────────────────── -->
				<div>
					<h2 class="font-heading text-xl font-semibold mb-4">Description</h2>
					<div class="space-y-5">

						<!-- Short description -->
						<div class="space-y-1.5">
							<Label forId="short">
								Short description <span class="text-destructive">*</span>
							</Label>
							<Input
								id="short"
								bind:value={short}
								placeholder="A brief tagline shown on server cards."
							/>
							<div class="flex justify-between text-xs text-muted-foreground mt-1">
								<span>Shown on listing cards. 11–150 characters.</span>
								<span
									class="font-mono font-semibold"
									class:text-destructive={shortOver}
								>{shortLen}/150</span>
							</div>
							{#if fieldErrors.short}
								<p class="text-sm text-destructive">{fieldErrors.short}</p>
							{/if}
						</div>

						<!-- Full description -->
						<div class="space-y-1.5">
							<Label forId="desc">
								Full description <span class="text-destructive">*</span>
							</Label>
							<Textarea
								id="desc"
								bind:value={desc}
								placeholder="Tell people about your server. Markdown is supported."
								rows={12}
								class="font-mono text-sm"
							/>
							<div class="flex justify-between text-xs text-muted-foreground mt-1">
								<span>Supports Markdown. 100–10,000 characters.</span>
								<span
									class="font-mono font-semibold"
									class:text-destructive={descOver}
								>{descLen.toLocaleString()}/10,000</span>
							</div>
							{#if fieldErrors.desc}
								<p class="text-sm text-destructive">{fieldErrors.desc}</p>
							{/if}
						</div>
					</div>
				</div>

				<!-- ── Vanity URL section ─────────────────────────────────────── -->
				<div>
					<h2 class="font-heading text-xl font-semibold mb-2">Vanity URL</h2>
					<p class="text-sm text-muted-foreground mb-4">
						Set a custom URL slug for your server page. Must be unique across all listings.
					</p>
					<div class="space-y-1.5">
						<Label forId="slug">Vanity URL slug</Label>
						<div class="flex items-center gap-0">
							<span
								class="inline-flex items-center h-10 px-3 rounded-l-xl border border-r-0 border-border bg-muted text-muted-foreground text-sm font-mono select-none"
							>
								/servers/
							</span>
							<Input
								id="slug"
								bind:value={slug}
								placeholder="my-awesome-server"
								class="rounded-l-none"
							/>
						</div>
						<p class="text-xs text-muted-foreground">
							Leave blank to keep using the server ID. Only lowercase letters, numbers and
							hyphens. <strong>2–32 characters.</strong>
						</p>
						{#if fieldErrors.slug}
							<p class="text-sm text-destructive">{fieldErrors.slug}</p>
						{/if}
					</div>
				</div>

				<!-- ── Error / success banners ────────────────────────────────── -->
				{#if errorMsg}
					<div
						class="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-4 h-4 shrink-0 mt-0.5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<circle cx="12" cy="12" r="10" />
							<line x1="12" y1="8" x2="12" y2="12" />
							<line x1="12" y1="16" x2="12.01" y2="16" />
						</svg>
						<span>{errorMsg}</span>
					</div>
				{/if}

				{#if successMsg}
					<div
						class="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-4 h-4 shrink-0"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
							<polyline points="22 4 12 14.01 9 11.01" />
						</svg>
						<span>{successMsg}</span>
					</div>
				{/if}

				<!-- ── Action buttons ─────────────────────────────────────────── -->
				<div class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
					<button
						type="submit"
						disabled={submitting}
						class="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold
							bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95
							disabled:opacity-60 disabled:pointer-events-none transition-all w-full sm:w-auto"
					>
						{#if submitting}
							<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								/>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8v8H4z"
								/>
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
								<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
								<polyline points="17 21 17 13 7 13 7 21" />
								<polyline points="7 3 7 8 15 8" />
							</svg>
							Save changes
						{/if}
					</button>

					<a
						href="/servers/{server.slug || server.id}"
						class="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold
							border border-border bg-card hover:bg-muted active:scale-95 transition-all
							text-muted-foreground hover:text-foreground w-full sm:w-auto"
					>
						Cancel
					</a>
				</div>
			</form>
		</div>

	{:else}
		<!-- ── Preview panel ──────────────────────────────────────────────── -->
		<div class="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-5">
			<h2 class="text-xl font-bold text-muted-foreground">Preview</h2>

			<!-- Identity row -->
			<div class="flex items-center gap-4">
				{#if iconUrl}
					<img
						src={iconUrl}
						alt={server.name}
						class="w-14 h-14 rounded-xl object-cover shrink-0"
					/>
				{:else}
					<div
						class="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-7 h-7 text-muted-foreground"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
							<polyline points="9 22 9 12 15 12 15 22" />
						</svg>
					</div>
				{/if}
				<div>
					<p class="font-bold text-2xl leading-tight">{server.name}</p>
					{#if short.trim()}
						<p class="text-muted-foreground mt-1 text-sm">{short}</p>
					{:else}
						<p class="text-muted-foreground italic mt-1 text-sm">No short description set.</p>
					{/if}
				</div>
			</div>

			<!-- Full description rendered -->
			{#if descHtml}
				<div
					class="prose prose-sm dark:prose-invert max-w-none rounded-xl border border-border bg-background/60 p-5"
				>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html descHtml}
				</div>
			{:else if desc.trim()}
				<p class="text-muted-foreground italic text-sm">
					(Markdown preview unavailable — raw text shown above.)
				</p>
			{:else}
				<p class="text-muted-foreground italic text-sm">No description written yet.</p>
			{/if}

			<!-- Stats row -->
			<div class="grid grid-cols-2 gap-2 text-sm pt-2">
				{#if server.member_count}
					<div class="flex flex-col gap-0.5">
						<span class="text-muted-foreground font-medium text-xs uppercase tracking-wide">Members</span>
						<span class="font-semibold">{server.member_count.toLocaleString()}</span>
					</div>
				{/if}
				<div class="flex flex-col gap-0.5">
					<span class="text-muted-foreground font-medium text-xs uppercase tracking-wide">Votes</span>
					<span class="font-semibold">{server.votes}</span>
				</div>
				{#if slug.trim()}
					<div class="flex flex-col gap-0.5">
						<span class="text-muted-foreground font-medium text-xs uppercase tracking-wide">Vanity URL</span>
						<code class="bg-muted px-1.5 py-0.5 rounded text-xs">/servers/{slug.trim().toLowerCase()}</code>
					</div>
				{/if}
			</div>

			<p class="text-xs text-muted-foreground border-t border-border pt-3">
				This is a preview of how your server listing will appear. Switch to <strong>Edit</strong> to
				make changes.
			</p>
		</div>
	{/if}
</section>

<style>
	.tab-indicator {
		transition: left 0.2s ease, width 0.2s ease;
	}

	.tab-btn {
		position: relative;
		z-index: 1;
	}

	:global(.prose pre) {
		background: hsl(var(--muted));
		border-radius: 0.5rem;
		padding: 1rem;
		overflow-x: auto;
	}

	:global(.prose code:not(pre code)) {
		background: hsl(var(--muted));
		padding: 0.15em 0.4em;
		border-radius: 0.3em;
		font-size: 0.875em;
	}

	:global(.prose a) {
		color: hsl(var(--primary));
		text-decoration: underline;
	}

	:global(.prose blockquote) {
		border-left: 3px solid hsl(var(--border));
		padding-left: 1rem;
		color: hsl(var(--muted-foreground));
	}
</style>
