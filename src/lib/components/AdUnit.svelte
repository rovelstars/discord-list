<script lang="ts">
	/** Show the small "Advertisement" label above the unit. Default true. */
	export let label = true;
	/** Extra CSS classes for the outer wrapper. */
	let className = "";
	export { className as class };
</script>

<!--
  A-Ads unit 2439223 — acceptable.a-ads.com (privacy-friendly, no cookies, no tracking).
  Container uses site theme tokens so it blends naturally in light + dark + all accent themes.
  background_color=transparent lets bg-card show through the iframe background.
-->
<div class="w-full {className}">
	{#if label}
		<p
			class="text-xs text-muted-foreground/50 text-center mb-1.5 uppercase tracking-widest font-medium select-none pointer-events-none"
		>
			Advertisement
		</p>
	{/if}
	<div class="bg-card border border-border rounded-xl overflow-hidden">
		<iframe
			data-aa="2439223"
			src="//acceptable.a-ads.com/2439223/?size=Adaptive&background_color=transparent"
			style="border:0;padding:0;width:100%;height:auto;overflow:hidden;display:block;min-height:50px;"
			title="Advertisement"
			loading="eager"
			sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
		></iframe>
		<a
			href="https://aads.com/campaigns/new/?source_id=2439223&source_type=ad_unit&partner=2439223"
			target="_blank"
			rel="noopener noreferrer"
			class="flex items-center justify-center w-full px-3 py-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-accent border-t border-border transition-colors"
		>
			Advertise here
		</a>
	</div>
</div>
