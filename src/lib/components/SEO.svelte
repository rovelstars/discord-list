<!--
	SEO.svelte
	Centralised <svelte:head> meta tags for every page.

	Props:
	  title        – page title (appended with site name unless noSuffix is set)
	  description  – meta description + og:description + twitter:description
	  image        – large OG image URL (banner/bg) → triggers summary_large_image card
	  imageSmall   – small square image (avatar / logo) used when no large image
	  canonical    – canonical URL (pass $page.url.href from each page)
	  noSuffix     – when true, title is used verbatim (home page already has full title)
-->
<script lang="ts">
	const SITE_NAME = 'Rovel Discord List';
	const SITE_URL = 'https://discord.rovelstars.com';
	const DEFAULT_IMAGE = '/assets/img/bot/logo-512.png';
	const TWITTER_HANDLE = '@rovelstars';
	const THEME_COLOR = '#5865F2';

	export let title: string = SITE_NAME;
	export let description: string =
		'Imagine a place — where you find everything about Discord! Bots, Servers, Emojis, Templates and more. We got you covered!';
	export let image: string | null = null;
	export let imageSmall: string | null = null;
	export let canonical: string | null = null;
	export let noSuffix: boolean = false;

	$: fullTitle = noSuffix ? title : title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;

	// Discord / Twitter: use banner/large image when available, else fall back to
	// the small square image, then the default logo.
	$: ogImage = image || imageSmall || DEFAULT_IMAGE;
	$: isLargeImage = !!image;
	$: imageType = ogImage.endsWith('.gif')
		? 'image/gif'
		: ogImage.endsWith('.png')
			? 'image/png'
			: ogImage.endsWith('.svg')
				? 'image/svg+xml'
				: 'image/jpeg';
</script>

<svelte:head>
	<!-- Primary -->
	<title>{fullTitle}</title>
	<meta name="description" content={description} />
	{#if canonical}
		<link rel="canonical" href={canonical} />
		<meta property="og:url" content={canonical} />
	{/if}

	<!-- PWA / mobile -->
	<meta name="theme-color" content={THEME_COLOR} />
	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-title" content={fullTitle} />
	<meta name="application-name" content="RDL" />
	<meta name="msapplication-navbutton-color" content={THEME_COLOR} />
	<meta name="msapplication-starturl" content="/" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
	<link rel="manifest" href="/manifest.json" />

	<!-- Open Graph (Discord reads these for embeds) -->
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={ogImage} />
	<meta property="og:image:type" content={imageType} />
	{#if isLargeImage}
		<!-- Wide banner image — Discord renders this as a large preview embed -->
		<meta property="og:image:width" content="1920" />
		<meta property="og:image:height" content="1080" />
	{:else}
		<!-- Square logo / avatar -->
		<meta property="og:image:width" content="512" />
		<meta property="og:image:height" content="512" />
	{/if}

	<!-- Twitter Card (also used by some Discord clients) -->
	<meta name="twitter:card" content={isLargeImage ? 'summary_large_image' : 'summary'} />
	<meta name="twitter:site" content={TWITTER_HANDLE} />
	<meta name="twitter:creator" content={TWITTER_HANDLE} />
	<meta name="twitter:title" content={fullTitle} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={ogImage} />
</svelte:head>
