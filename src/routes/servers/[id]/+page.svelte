<script lang="ts">
	import SEO from "$lib/components/SEO.svelte";
	import ServerCard from "$lib/components/ServerCard.svelte";
	import TwemojiText from "$lib/components/TwemojiText.svelte";

	export let data: {
		server: any;
		descHtml: string | null;
		randomServers: any[];
		user: any | null;
	};

	$: ({ server, descHtml, randomServers, user } = data);

	$: iconUrl = (() => {
		if (!server?.icon || server.icon === "") return null;
		if (server.icon.startsWith("http")) return server.icon;
		return `https://cdn.discordapp.com/icons/${server.id}/${server.icon}.webp?size=256`;
	})();

	function formatDate(iso: string | null): string {
		if (!iso) return "Unknown";
		try {
			const d = new Date(iso);
			return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
		} catch {
			return iso;
		}
	}
</script>

<SEO
	title="{server.name} — Discord Server"
	description={server.short ?? `Join ${server.name} on Discord.`}
/>

<div class="flex flex-col xl:flex-row xl:items-start gap-6 p-4">
	<!-- Main content -->
	<div class="min-w-0 flex-1">
		<div class="bg-card rounded-lg overflow-hidden">
			<!-- Banner area -->
			<div
				class="h-40 w-full bg-linear-to-br from-green-600/30 via-primary/20 to-background flex items-end px-6 pb-4 relative"
			>
				<div class="absolute inset-0 bg-linear-to-t from-card/60 to-transparent"></div>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-4 gap-6 p-4">
				<!-- Left column: icon + info -->
				<div
					class="md:col-span-1 flex flex-col items-center md:items-start gap-4 -mt-16 relative z-10"
				>
					<!-- Server icon -->
					{#if iconUrl}
						<img
							src={iconUrl}
							alt="{server.name} icon"
							width="96"
							height="96"
							class="w-24 h-24 rounded-2xl border-4 border-card shadow-xl bg-muted object-cover"
						/>
					{:else}
						<div
							class="w-24 h-24 rounded-2xl border-4 border-card shadow-xl bg-green-500/20 flex items-center justify-center"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-12 h-12 text-green-500"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.75"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
								<polyline points="9 22 9 12 15 12 15 22" />
							</svg>
						</div>
					{/if}

					<!-- Name + badge -->
					<div class="text-center md:text-left">
						<h1 class="text-2xl md:text-4xl font-heading font-black leading-tight">
							{server.name}
						</h1>
						<span
							class="inline-block mt-1 bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded"
						>
							SERVER
						</span>
					</div>

					<!-- Short description -->
					{#if server.short && server.short !== "Short description is not Updated."}
						<div
							class="text-muted-foreground text-base border-b-2 pb-4 w-full text-center md:text-left"
						>
							<TwemojiText>{server.short}</TwemojiText>
						</div>
					{/if}

					<!-- Long description -->
					{#if descHtml}
						<div class="prose prose-sm dark:prose-invert max-w-none text-foreground w-full">
							{@html descHtml}
						</div>
					{/if}

					<!-- Details -->
					<div class="mt-4 border-t border-border/50 pt-6 w-full">
						<h2 class="text-lg font-bold font-heading mb-4 text-foreground">Server Info</h2>

						<!-- Stats grid -->
						<div class="grid grid-cols-2 gap-3 mb-6">
							<div
								class="flex flex-col items-center justify-center rounded-xl bg-muted/30 border border-border px-3 py-3 text-center"
							>
								<span class="text-2xl font-black text-foreground leading-none">
									{server.votes ?? 0}
								</span>
								<span class="text-xs text-muted-foreground font-medium mt-1">Votes</span>
							</div>
							<div
								class="flex flex-col items-center justify-center rounded-xl bg-muted/30 border border-border px-3 py-3 text-center"
							>
								<span class="text-sm font-black text-foreground leading-none break-all">
									{formatDate(server.added_at)}
								</span>
								<span class="text-xs text-muted-foreground font-medium mt-1">Listed</span>
							</div>
						</div>

						<!-- Detail list -->
						<dl class="space-y-3">
							<div class="rounded-xl bg-muted/30 border border-border px-4 py-3">
								<dt class="font-semibold text-sm text-foreground mb-1">Server ID</dt>
								<dd class="text-sm text-muted-foreground font-mono leading-relaxed break-all">
									{server.id}
								</dd>
							</div>

							{#if server.slug}
								<div class="rounded-xl bg-muted/30 border border-border px-4 py-3">
									<dt class="font-semibold text-sm text-foreground mb-1">Slug</dt>
									<dd class="text-sm text-muted-foreground leading-relaxed">
										/servers/<strong class="text-foreground">{server.slug}</strong>
									</dd>
								</div>
							{/if}
						</dl>
					</div>
				</div>

				<!-- Right column: actions + sidebar info -->
				<div class="flex flex-col gap-4 mt-4 md:mt-0 md:col-span-3">
					<!-- Vote + action buttons -->
					<div class="grid grid-cols-2 gap-2">
						<div
							class="flex flex-col items-center justify-center rounded-xl bg-muted/20 border border-border px-4 py-4"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-5 h-5 text-green-500 mb-1"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d="m18 15-6-6-6 6" />
							</svg>
							<span class="text-xl font-black text-foreground leading-none">
								{server.votes ?? 0}
							</span>
							<span class="text-xs text-muted-foreground font-medium mt-0.5">Votes</span>
						</div>

						<div
							class="flex flex-col items-center justify-center rounded-xl bg-muted/20 border border-border px-4 py-4"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-5 h-5 text-primary mb-1"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
								<line x1="16" y1="2" x2="16" y2="6" />
								<line x1="8" y1="2" x2="8" y2="6" />
								<line x1="3" y1="10" x2="21" y2="10" />
							</svg>
							<span class="text-sm font-black text-foreground leading-none">
								{formatDate(server.added_at)}
							</span>
							<span class="text-xs text-muted-foreground font-medium mt-0.5">Listed</span>
						</div>
					</div>

					<!-- How to join info card -->
					<div class="rounded-2xl border border-green-500/20 bg-green-500/5 p-5">
						<h3 class="font-heading text-base font-bold mb-2 flex items-center gap-2">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-4 h-4 text-green-500"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<circle cx="12" cy="12" r="10" />
								<path d="M12 8v8" />
								<path d="M8 12h8" />
							</svg>
							About This Server
						</h3>
						<p class="text-sm text-muted-foreground leading-relaxed">
							<strong class="text-foreground">{server.name}</strong> is a Discord community listed on
							Rovel Discord List. Search for it on Discord to join!
						</p>
					</div>

					<!-- How to register callout — only for server owners who might want to update -->
					{#if user}
						<div
							class="rounded-xl border border-border bg-muted/20 px-4 py-3 flex items-start gap-3"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-4 h-4 text-muted-foreground shrink-0 mt-0.5"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<circle cx="12" cy="12" r="10" />
								<path d="M12 16v-4" />
								<path d="M12 8h.01" />
							</svg>
							<p class="text-xs text-muted-foreground leading-relaxed">
								Is this your server? Update it from your
								<a href="/dashboard" class="text-primary font-semibold hover:underline">dashboard</a
								>
								or re-run
								<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">/register</code>
								in your server to refresh the listing.
							</p>
						</div>
					{:else}
						<div
							class="rounded-xl border border-border bg-muted/20 px-4 py-3 flex items-start gap-3"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-4 h-4 text-muted-foreground shrink-0 mt-0.5"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<circle cx="12" cy="12" r="10" />
								<path d="M12 16v-4" />
								<path d="M12 8h.01" />
							</svg>
							<p class="text-xs text-muted-foreground leading-relaxed">
								Own this server?
								<a href="/login" class="text-primary font-semibold hover:underline">Log in</a>
								and run
								<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">/register</code>
								in your server to manage this listing.
							</p>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Random servers — shown below on smaller screens -->
		{#if randomServers && randomServers.length > 0}
			<div class="mt-10 xl:hidden">
				<h3 class="font-heading text-2xl font-bold mb-2 flex items-center gap-2">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-6 h-6 text-green-500"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
						<polyline points="9 22 9 12 15 12 15 22" />
					</svg>
					More Servers
				</h3>
				<p class="text-muted-foreground text-sm mb-5 font-semibold">
					Discover other communities you might enjoy.
				</p>
				<div class="flex flex-wrap justify-center gap-4">
					{#each randomServers as s}
						<ServerCard server={s} edit={false} />
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- Sidebar: random servers — xl screens only -->
	{#if randomServers && randomServers.length > 0}
		<aside
			class="hidden xl:flex xl:flex-col gap-4 w-80 shrink-0 sticky top-28 self-start"
			aria-label="Other servers"
		>
			<div class="flex items-center gap-2 px-1">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="w-6 h-6 text-green-500 shrink-0"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
					<polyline points="9 22 9 12 15 12 15 22" />
				</svg>
				<h3 class="font-heading text-lg font-bold leading-tight">More Servers</h3>
			</div>
			<p class="text-muted-foreground text-sm px-1 -mt-2 font-medium">
				Other communities you might enjoy.
			</p>
			{#each randomServers as s}
				<ServerCard server={s} edit={false} />
			{/each}
		</aside>
	{/if}
</div>
