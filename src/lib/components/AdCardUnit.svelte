<!--
  Card-sized ad unit — matches BotCard/ServerCard dimensions so it sits inline
  in flex-wrap grids without breaking layout. Uses Adaptive size with a fixed
  250px iframe height to produce a medium-rectangle format.
-->
<div
	class="w-96 md:max-w-80 mb-4 bg-card border border-border rounded-lg overflow-hidden flex flex-col"
	aria-label="Advertisement"
>
	<p
		class="text-xs text-muted-foreground/50 text-center py-1 uppercase tracking-widest font-medium select-none pointer-events-none border-b border-border/40"
	>
		Advertisement
	</p>
	<iframe
		data-aa="2439223"
		src="//acceptable.a-ads.com/2439223/?size=Adaptive&background_color=transparent"
		style="border:0;padding:0;width:100%;height:250px;overflow:hidden;display:block;flex:1;"
		title="Advertisement"
		loading="lazy"
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
