<script lang="ts">
	import { page } from "$app/stores";
	import SEO from "$lib/components/SEO.svelte";
	import { Bot, Home } from "@lucide/svelte";
	$: status = $page.status;
	$: is404 = status === 404;

	$: title = is404 ? "Page Not Found" : `Error ${status}`;
	$: description = is404
		? "The page you're looking for doesn't exist or has been moved."
		: "Something went wrong on our end. Please try again later.";
	$: icon = is404 ? "/assets/img/bot/404.svg" : "/assets/img/bot/err.svg";
	$: iconAlt = is404 ? "404 Not Found" : "Error";
</script>

<SEO {title} {description} imageSmall="/assets/img/bot/logo-512.png" />
<svelte:head>
	<!-- Error pages should never be indexed -->
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<section class="flex flex-col items-center justify-center text-center py-24 px-4 min-h-[60vh]">
	<img src={icon} class="w-24 h-24 mx-auto my-12" alt={iconAlt} loading="eager" />

	<h1 class="font-heading text-4xl md:text-6xl font-bold my-6">
		{title}
	</h1>

	<p class="text-gray-600 dark:text-gray-300 text-xl font-semibold max-w-md mx-auto mb-10">
		{description}
	</p>

	<div class="flex flex-wrap gap-4 justify-center">
		<a
			href="/"
			class="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-md font-semibold hover:bg-primary/90 transition-colors"
		>
			<Home size={24} class="mt-0.5" />
			Go Home
		</a>
		<a
			href="/bots"
			class="inline-flex items-center gap-2 px-6 py-3 border border-input bg-background rounded-md font-semibold hover:bg-accent hover:text-accent-foreground transition-colors"
		>
			<Bot size={24} class="mt-0.5" />
			Browse Bots
		</a>
	</div>
</section>
