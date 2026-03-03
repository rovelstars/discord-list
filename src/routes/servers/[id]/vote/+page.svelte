<script lang="ts">
	import { buttonVariants } from "$lib/components/ui/button.js";
	import SEO from "$lib/components/SEO.svelte";

	export let data: {
		server: {
			id: string;
			slug: string;
			name: string;
			icon: string | null;
			votes: number;
		};
		user: {
			id: string;
			username: string;
			avatar: string | null;
		} | null;
	};

	const { server, user } = data;

	$: iconUrl = (() => {
		if (!server.icon || server.icon === "") return null;
		if (server.icon.startsWith("http")) return server.icon;
		return `https://cdn.discordapp.com/icons/${server.id}/${server.icon}.webp?size=256`;
	})();

	$: iconInitial = server.name?.charAt(0)?.toUpperCase() ?? "#";

	// UI state
	let loading = false;
	let errorMsg: string | null = null;
	let successMsg: string | null = null;

	async function vote() {
		if (loading) return;
		loading = true;
		errorMsg = null;
		successMsg = null;

		try {
			const res = await fetch(`/api/servers/${server.id}/vote`, { method: "POST" });
			const body = await res.json();

			if (!res.ok || !body.success) {
				if (body.try_after) {
					errorMsg = `You already voted! You can vote again in ${body.try_after}.`;
				} else {
					errorMsg = (body.err ?? body.error ?? "Something went wrong.").replace(/_/g, " ");
				}
				return;
			}

			successMsg = "Voted successfully!";
			setTimeout(() => {
				window.location.href = `/servers/${server.slug}`;
			}, 1200);
		} catch (e) {
			errorMsg = "A network error occurred. Please try again.";
			console.error("Vote error:", e);
		} finally {
			loading = false;
		}
	}
</script>

<SEO
	title="Vote for {server.name}"
	description="Support {server.name} by voting on Rovel Discord List! Votes help servers grow and get discovered."
	imageSmall={iconUrl ?? undefined}
/>

<div class="w-full block md:px-4 py-8 max-w-2xl mx-auto">
	<!-- Server identity -->
	<div class="w-full px-4 pb-8 border-b-2 border-border flex flex-col items-center text-center">
		{#if iconUrl}
			<img
				src={iconUrl}
				class="w-36 h-36 rounded-2xl bg-card border-card border-8 shadow-xl object-cover"
				alt="{server.name}'s icon"
				loading="lazy"
			/>
		{:else}
			<div
				class="w-36 h-36 rounded-2xl bg-primary/10 border-card border-8 shadow-xl flex items-center justify-center"
			>
				<span class="text-5xl font-black text-primary select-none">{iconInitial}</span>
			</div>
		{/if}

		<h1 class="text-3xl md:text-5xl font-heading text-center my-4 font-black">
			{server.name}
		</h1>

		<div class="flex items-center gap-1.5 text-muted-foreground font-semibold text-base mb-3">
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
				<circle cx="12" cy="12" r="10" />
				<path d="m8 14 4-4 4 4" />
			</svg>
			{server.votes.toLocaleString()} votes
		</div>

		<p class="text-center text-base md:text-lg font-semibold text-muted-foreground max-w-md">
			Tip: Votes are updated on the main site every few minutes. Your vote may not reflect
			immediately — but it is counted!
		</p>
	</div>

	<!-- Vote area -->
	<div class="mt-8 flex flex-col items-center gap-4">
		{#if user}
			<div class="w-full max-w-xs flex flex-col gap-3">
				<!-- Vote button -->
				<button
					on:click={vote}
					disabled={loading || Boolean(successMsg)}
					class="{buttonVariants({ variant: 'default' })} w-full"
				>
					{#if loading}
						<svg
							class="w-4 h-4 mr-2 animate-spin"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
						</svg>
						Voting…
					{:else if successMsg}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-4 h-4 mr-2"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M20 6 9 17l-5-5" />
						</svg>
						Voted!
					{:else}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-4 h-4 mr-2"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<circle cx="12" cy="12" r="10" />
							<path d="m8 14 4-4 4 4" />
						</svg>
						Vote for {server.name}
					{/if}
				</button>

				<!-- Back link -->
				<a
					href="/servers/{server.slug}"
					class="{buttonVariants({ variant: 'outline' })} w-full text-center"
				>
					Back to {server.name}
				</a>
			</div>

			<!-- Feedback messages -->
			{#if errorMsg}
				<div
					class="w-full max-w-xs rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium"
					role="alert"
				>
					<span class="inline-flex items-center gap-1.5">
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
							<circle cx="12" cy="12" r="10" />
							<line x1="12" y1="8" x2="12" y2="12" />
							<line x1="12" y1="16" x2="12.01" y2="16" />
						</svg>
						{errorMsg}
					</span>
				</div>
			{/if}

			{#if successMsg}
				<div
					class="w-full max-w-xs rounded-md border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400 font-medium"
					role="status"
				>
					<span class="inline-flex items-center gap-1.5">
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
							<path d="M20 6 9 17l-5-5" />
						</svg>
						{successMsg} Redirecting…
					</span>
				</div>
			{/if}
		{:else}
			<!-- Not logged in -->
			<div class="flex flex-col items-center gap-4 mt-2">
				<p class="text-muted-foreground text-base font-semibold text-center">
					You need to log in to vote for this server.
				</p>

				<div class="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
					<a
						href="/login?redirect={encodeURIComponent(`/servers/${server.slug}/vote`)}"
						class="{buttonVariants({ variant: 'secondary' })} w-full text-center"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-4 h-4 mr-2"
							viewBox="0 0 24 24"
							fill="currentColor"
						>
							<path
								d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.003.02.014.04.03.05a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
							/>
						</svg>
						Login to Vote
					</a>

					<a
						href="/servers/{server.slug}"
						class="{buttonVariants({ variant: 'outline' })} w-full text-center"
					>
						Back to {server.name}
					</a>
				</div>
			</div>
		{/if}
	</div>
</div>
