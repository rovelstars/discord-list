<script lang="ts">
	import getAvatarURL from "$lib/get-avatar-url";
	import { buttonVariants } from "$lib/components/ui/button.js";
	import SEO from "$lib/components/SEO.svelte";

	export let data: {
		bot: {
			id: string;
			slug: string;
			username: string;
			discriminator: string;
			avatar: string | null;
			opted_coins: boolean;
		};
		user: {
			id: string;
			username: string;
			avatar: string | null;
			bal: number;
		} | null;
	};

	const { bot } = data;
	// Coerce bal to a number — libSQL can return INTEGER columns as strings
	// depending on the driver version, so we normalise it here once.
	const user = data.user ? { ...data.user, bal: Number(data.user.bal) || 0 } : null;

	$: avatarSrc = bot.avatar
		? getAvatarURL(bot.id, bot.avatar, 128)
		: "/assets/img/bot/logo-144.png";

	// Coin input (only relevant when bot.opted_coins)
	let coins: number = 0;

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
			const qs = coins ? `?coins=${encodeURIComponent(coins)}` : "";
			const res = await fetch(`/api/bots/${bot.id}/vote${qs}`, { method: "POST" });
			const data = await res.json();

			if (!res.ok || !data.success) {
				if (data.try_after) {
					errorMsg = `You already voted! You can vote again in ${data.try_after}.`;
				} else {
					// Humanise snake_case error keys
					errorMsg = (data.err ?? data.error ?? "Something went wrong.").replace(/_/g, " ");
				}
				return;
			}

			successMsg = "Voted successfully!";
			// Redirect back to bot page after a short delay, same as old site
			setTimeout(() => {
				window.location.href = `/bots/${bot.slug}`;
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
	title="Vote for {bot.username}#{bot.discriminator}"
	description="Support {bot.username} by voting on Rovel Discord List! Votes help bots grow and may earn you rewards."
	imageSmall={avatarSrc}
/>

<div class="w-full block md:px-4 py-8 max-w-2xl mx-auto">
	<!-- Bot identity -->
	<div class="w-full px-4 pb-8 border-b-2 border-border flex flex-col items-center text-center">
		<img
			src={avatarSrc}
			crossorigin="anonymous"
			class="w-36 h-36 rounded-full bg-card border-card border-8 shadow-xl"
			alt="{bot.username}'s Avatar"
			loading="lazy"
		/>

		<h1 class="text-3xl md:text-5xl font-heading text-center my-4 font-black">
			{bot.username}
			<span class="text-muted-foreground text-xl font-bold">#{bot.discriminator}</span>
		</h1>

		<p class="text-center text-base md:text-lg font-semibold text-muted-foreground max-w-md">
			Tip: Votes are updated on main site every few minutes. Your vote may not be updated
			immediately on bot page. Fear not, your vote is counted!
		</p>
	</div>

	<!-- Vote area -->
	<div class="mt-8 flex flex-col items-center gap-4">
		{#if user}
			<!-- Coin input — only when the bot opted in to coin-based votes -->
			{#if bot.opted_coins}
				<div class="w-full max-w-xs flex flex-col gap-1">
					<label for="coins" class="text-sm font-medium text-muted-foreground">
						Coins to spend <span class="text-foreground font-semibold">(10 coins = 1 vote)</span>
					</label>
					<div class="relative">
						<span class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
							<img src="/assets/img/bot/moneh.svg" alt="" class="w-4 h-4" />
						</span>
						<input
							id="coins"
							type="number"
							min="10"
							step="10"
							placeholder="You have R$ {Number(user.bal) || 0}"
							bind:value={coins}
							class="w-full pl-9 pr-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
						/>
					</div>
					<p class="text-xs text-muted-foreground">Must be a multiple of 10.</p>
				</div>
			{/if}

			<!-- Vote button -->
			<div class="w-full max-w-xs flex flex-col gap-3">
				<button
					on:click={vote}
					disabled={loading || Boolean(successMsg)}
					class="{buttonVariants({ variant: 'default' })} w-full"
				>
					{#if loading}
						<!-- Spinner -->
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
						<!-- Checkmark -->
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
						<!-- ChevronUpCircle -->
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
						Vote
					{/if}
				</button>

				<!-- Back link -->
				<a
					href="/bots/{bot.slug}"
					class="{buttonVariants({ variant: 'outline' })} w-full text-center"
				>
					Back to {bot.username}
				</a>
			</div>

			<!-- Feedback messages -->
			{#if errorMsg}
				<div
					class="w-full max-w-xs rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium"
					role="alert"
				>
					<!-- AlertCircle icon -->
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
					You need to log in to vote for this bot.
				</p>

				<div class="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
					<a
						href="/login?redirect={encodeURIComponent(`/bots/${bot.slug}/vote`)}"
						class="{buttonVariants({ variant: 'secondary' })} w-full text-center"
					>
						<!-- Discord icon -->
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
						href="/bots/{bot.slug}"
						class="{buttonVariants({ variant: 'outline' })} w-full text-center"
					>
						Back to {bot.username}
					</a>
				</div>
			</div>
		{/if}
	</div>
</div>
