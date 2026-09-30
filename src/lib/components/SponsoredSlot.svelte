<script lang="ts">
	/**
	 * Sponsored slot v1 (manual) wrapper.
	 *
	 * Renders a clearly-labeled "Sponsored" pinned slot around one BotCard /
	 * ServerCard. Cap usage at 1-2 slots per page. Sponsored entries are
	 * excluded from vote-ordered rankings (see getTopBots/getTopServers) so
	 * placement is never pay-to-win on votes.
	 *
	 * SEO: inner card links are normal site links (no external juice passes).
	 * External invite/website links inside cards already carry
	 * rel="noopener noreferrer"; treat paid external links as
	 * rel="sponsored nofollow" when adding custom CTAs here.
	 */
	export let label: string = "Sponsored";
	export let href: string = "/docs#sponsored";
</script>

<section
	aria-label={label}
	data-sponsored="true"
	class="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 pt-3 pb-4"
>
	<div class="mb-2 flex items-center justify-between gap-2">
		<span
			class="inline-flex items-center rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400"
		>
			{label}
		</span>
		<a
			href={href}
			class="text-[11px] font-medium text-muted-foreground hover:text-foreground hover:underline"
		>
			Why am I seeing this?
		</a>
	</div>
	<div class="flex flex-wrap justify-center gap-4">
		<slot />
	</div>
</section>
