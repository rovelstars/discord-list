<script lang="ts">
	import SEO from "$lib/components/SEO.svelte";
	import { page } from "$app/stores";
	import { onMount, tick } from "svelte";
	import type { DocSection } from "virtual:docs";

	export let data: { docs: DocSection[] };

	$: sections = data.docs;

	// Active section — driven by URL hash, defaults to first section
	let activeSlug: string = "";
	let mobileNavOpen = false;

	$: if (sections.length && !activeSlug) {
		activeSlug = sections[0].slug;
	}

	function setActive(slug: string) {
		activeSlug = slug;
		mobileNavOpen = false;
		if (typeof window !== "undefined") {
			history.replaceState(null, "", `/docs#${slug}`);
		}
	}

	onMount(() => {
		const hash = window.location.hash.slice(1);
		if (hash && sections.find((s) => s.slug === hash)) {
			activeSlug = hash;
		} else if (sections.length) {
			activeSlug = sections[0].slug;
		}
	});

	$: activeSection = sections.find((s) => s.slug === activeSlug) ?? sections[0];
</script>

<SEO
	title="API Documentation"
	description="Complete reference for the Rovel Discord List public REST API — bots, votes, users, and webhooks."
/>

<svelte:head>
	<meta name="robots" content="index, follow" />
</svelte:head>

<!-- Mobile header bar -->
<div
	class="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur-sm px-4 py-3 md:hidden"
>
	<button
		on:click={() => (mobileNavOpen = !mobileNavOpen)}
		aria-label="Toggle navigation"
		class="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-accent"
	>
		{#if mobileNavOpen}
			<!-- X icon -->
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-5 w-5"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
			</svg>
		{:else}
			<!-- Menu icon -->
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-5 w-5"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line
					x1="3"
					y1="18"
					x2="21"
					y2="18"
				/>
			</svg>
		{/if}
	</button>

	<span class="text-sm font-semibold text-foreground">
		{activeSection?.title ?? "Docs"}
	</span>
</div>

<!-- Mobile nav drawer -->
{#if mobileNavOpen}
	<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
	<div
		class="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
		on:click={() => (mobileNavOpen = false)}
	></div>
	<aside
		class="fixed top-0 left-0 z-40 h-full w-72 bg-card border-r border-border shadow-2xl flex flex-col md:hidden"
	>
		<div class="flex items-center gap-2 px-5 py-4 border-b border-border">
			<div class="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-4 w-4 text-primary-foreground"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
					<polyline points="14 2 14 8 20 8" />
					<line x1="16" y1="13" x2="8" y2="13" />
					<line x1="16" y1="17" x2="8" y2="17" />
					<polyline points="10 9 9 9 8 9" />
				</svg>
			</div>
			<span class="font-heading font-bold text-base">API Docs</span>
		</div>
		<nav class="flex-1 overflow-y-auto px-3 py-4 space-y-1">
			{#each sections as section}
				<button
					on:click={() => setActive(section.slug)}
					class="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors
						{activeSlug === section.slug
						? 'bg-primary text-primary-foreground'
						: 'text-muted hover:text-foreground hover:bg-accent'}"
				>
					{section.title}
				</button>
			{/each}
		</nav>
		<div class="px-4 py-4 border-t border-border">
			<p class="text-xs text-muted-foreground">Rovel Discord List API</p>
		</div>
	</aside>
{/if}

<!-- Main layout -->
<div class="flex min-h-screen bg-background">
	<!-- Desktop sidebar -->
	<aside
		class="hidden md:flex w-64 lg:w-72 shrink-0 flex-col sticky top-0 h-screen border-r border-border bg-card"
	>
		<div class="flex items-center gap-2.5 px-5 py-5 border-b border-border">
			<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-4 w-4 text-primary-foreground"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
					<polyline points="14 2 14 8 20 8" />
					<line x1="16" y1="13" x2="8" y2="13" />
					<line x1="16" y1="17" x2="8" y2="17" />
					<polyline points="10 9 9 9 8 9" />
				</svg>
			</div>
			<div>
				<p class="font-heading font-bold text-sm leading-none">API Docs</p>
				<p class="text-xs text-muted-foreground mt-0.5">Rovel Discord List</p>
			</div>
		</div>

		<nav class="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
			<p class="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
				Reference
			</p>
			{#each sections as section}
				<button
					on:click={() => setActive(section.slug)}
					class="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center gap-2.5
						{activeSlug === section.slug
						? 'bg-primary/10 text-primary font-semibold border-l-2 border-primary pl-2.5'
						: 'text-muted-foreground hover:text-foreground hover:bg-accent'}"
				>
					<!-- small dot indicator -->
					{#if activeSlug === section.slug}
						<span class="h-1.5 w-1.5 rounded-full bg-primary shrink-0"></span>
					{:else}
						<span class="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 shrink-0"></span>
					{/if}
					{section.title}
				</button>
			{/each}
		</nav>

		<div class="px-4 py-4 border-t border-border space-y-2">
			<a
				href="/"
				class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-3.5 w-3.5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="m15 18-6-6 6-6" />
				</svg>
				Back to site
			</a>
		</div>
	</aside>

	<!-- Content area -->
	<main class="flex-1 min-w-0">
		<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 py-8 md:py-12">
			<!-- Section tabs (desktop quick-jump strip) -->
			<div class="hidden md:flex items-center gap-1 mb-8 overflow-x-auto pb-1 scrollbar-none">
				{#each sections as section}
					<button
						on:click={() => setActive(section.slug)}
						class="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border
							{activeSlug === section.slug
							? 'bg-primary text-primary-foreground border-primary'
							: 'border-border text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-accent'}"
					>
						{section.title}
					</button>
				{/each}
			</div>

			<!-- Rendered doc content -->
			{#if activeSection}
				<article
					class="prose prose-sm sm:prose md:prose-base lg:prose-lg dark:prose-invert max-w-none
						prose-headings:font-heading prose-headings:scroll-mt-20
						prose-h1:text-3xl prose-h1:font-black prose-h1:mb-2 prose-h1:pb-4 prose-h1:border-b prose-h1:border-border
						prose-h2:text-xl prose-h2:font-bold prose-h2:mt-10 prose-h2:mb-4 prose-h2:pt-4
						prose-h3:text-base prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-3
						prose-code:before:content-[''] prose-code:after:content-['']
						prose-code:bg-muted prose-code:text-foreground prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:font-mono
						prose-pre:bg-card prose-pre:border prose-pre:border-border prose-pre:rounded-xl prose-pre:shadow-sm
						prose-pre:code:bg-transparent prose-pre:code:p-0
						prose-table:border-collapse prose-table:w-full prose-table:text-sm
						prose-th:bg-muted/50 prose-th:px-4 prose-th:py-2.5 prose-th:text-left prose-th:font-semibold prose-th:text-foreground
						prose-td:px-4 prose-td:py-2.5 prose-td:border-b prose-td:border-border
						prose-tr:hover:bg-accent/30
						prose-a:text-primary prose-a:no-underline hover:prose-a:underline
						prose-blockquote:border-l-primary/50 prose-blockquote:bg-primary/5 prose-blockquote:rounded-r-lg prose-blockquote:py-1
						prose-hr:border-border"
				>
					{@html activeSection.html}
				</article>

				<!-- Prev / Next navigation -->
				{@const currentIdx = sections.findIndex((s) => s.slug === activeSlug)}
				<div class="mt-12 pt-6 border-t border-border flex items-center justify-between gap-4">
					{#if currentIdx > 0}
						{@const prev = sections[currentIdx - 1]}
						<button
							on:click={() => setActive(prev.slug)}
							class="group flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-accent transition-all text-left min-w-0"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path d="m15 18-6-6 6-6" />
							</svg>
							<div class="min-w-0">
								<p class="text-xs text-muted-foreground">Previous</p>
								<p class="text-sm font-semibold text-foreground truncate">{prev.title}</p>
							</div>
						</button>
					{:else}
						<div></div>
					{/if}

					{#if currentIdx < sections.length - 1}
						{@const next = sections[currentIdx + 1]}
						<button
							on:click={() => setActive(next.slug)}
							class="group flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-accent transition-all text-right min-w-0 ml-auto"
						>
							<div class="min-w-0">
								<p class="text-xs text-muted-foreground">Next</p>
								<p class="text-sm font-semibold text-foreground truncate">{next.title}</p>
							</div>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path d="m9 18 6-6-6-6" />
							</svg>
						</button>
					{/if}
				</div>
			{/if}
		</div>
	</main>
</div>

<style>
	/* Hide scrollbar on the tab strip */
	.scrollbar-none {
		scrollbar-width: none;
	}
	.scrollbar-none::-webkit-scrollbar {
		display: none;
	}

	/* Ensure hljs code blocks inherit our prose sizing */
	:global(.prose pre code.hljs) {
		padding: 0;
		background: transparent;
		font-size: inherit;
	}

	:global(.prose table) {
		display: block;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}
</style>
