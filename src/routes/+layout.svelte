<script lang="ts">
	import "../styles/global.css";
	import Navbar from "$lib/components/Navbar.svelte";
	import Footer from "$lib/components/Footer.svelte";
	import { afterNavigate, invalidateAll, replaceState } from "$app/navigation";
	import { navigating } from "$app/stores";
	import { onMount } from "svelte";
	import { page } from "$app/stores";
	import { browser } from "$app/environment";

	// Stamp data-loaded on every <img> once it finishes loading so the global
	// CSS fade-in in global.css can trigger. A single delegated listener on
	// document covers every image across the entire app with zero per-component
	// changes. Already-complete images are stamped synchronously on mount so
	// cached images appear instantly with no visible animation delay.
	function stampLoaded(img: HTMLImageElement) {
		img.setAttribute("data-loaded", "");
	}

	function initImageFadeIn() {
		// Stamp any images already in the DOM that have finished loading.
		document.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
			if (img.complete) stampLoaded(img);
		});

		// Delegated listener — catches every future image load in one place.
		function onLoad(e: Event) {
			const target = e.target as HTMLElement;
			if (target.tagName === "IMG") stampLoaded(target as HTMLImageElement);
		}

		document.addEventListener("load", onLoad, { capture: true });
		return () => document.removeEventListener("load", onLoad, { capture: true });
	}

	// Progress bar — starts instantly on mousedown/touchstart so the user gets
	// immediate feedback, then completes once $navigating clears.
	let progress = 0;
	let visible = false;
	let fillTimer: ReturnType<typeof setInterval> | null = null;
	let completeTimer: ReturnType<typeof setTimeout> | null = null;

	function clearTimers() {
		if (fillTimer) {
			clearInterval(fillTimer);
			fillTimer = null;
		}
		if (completeTimer) {
			clearTimeout(completeTimer);
			completeTimer = null;
		}
	}

	function startBar() {
		clearTimers();
		visible = true;
		progress = 0;
		// Asymptotic fill toward 85% — fast at first, then slows naturally.
		fillTimer = setInterval(() => {
			progress += (85 - progress) * 0.06;
		}, 30);
	}

	function finishBar() {
		clearTimers();
		progress = 100;
		completeTimer = setTimeout(() => {
			visible = false;
			progress = 0;
		}, 300);
	}

	// Fired by $navigating only as a fallback for programmatic navigations
	// (goto(), form submissions, etc.) that aren't triggered by a click.
	let pointerStarted = false;

	$: if (browser) {
		if ($navigating) {
			if (!pointerStarted) startBar();
			pointerStarted = false;
		} else if (visible) {
			finishBar();
		}
	}

	// Resolve the closest <a> ancestor (or the element itself).
	function closestAnchor(el: EventTarget | null): HTMLAnchorElement | null {
		let node = el as HTMLElement | null;
		while (node) {
			if (node.tagName === "A") return node as HTMLAnchorElement;
			node = node.parentElement;
		}
		return null;
	}

	// Returns true if the href is an internal same-origin link that SvelteKit
	// will handle with client-side routing (not a download, hash-only, etc.).
	function isInternalLink(anchor: HTMLAnchorElement): boolean {
		if (!anchor.href) return false;
		if (anchor.target === "_blank" || anchor.target === "_top") return false;
		if (anchor.hasAttribute("download")) return false;
		try {
			const url = new URL(anchor.href);
			if (url.origin !== location.origin) return false;
			// Hash-only navigation on the same page — no load, skip.
			if (url.pathname === location.pathname && url.search === location.search) return false;
			return true;
		} catch {
			return false;
		}
	}

	onMount(() => {
		function onPointerDown(e: MouseEvent | TouchEvent) {
			const target = e instanceof MouseEvent ? e.target : e.touches[0]?.target;
			const anchor = closestAnchor(target ?? null);
			if (anchor && isInternalLink(anchor)) {
				pointerStarted = true;
				startBar();
			}
		}

		document.addEventListener("mousedown", onPointerDown);
		document.addEventListener("touchstart", onPointerDown, { passive: true });

		return () => {
			document.removeEventListener("mousedown", onPointerDown);
			document.removeEventListener("touchstart", onPointerDown);
		};
	});

	$: isHomepage = $page.url.pathname === "/";

	export let data: {
		user: {
			id: string;
			username: string;
			tag: string;
			discriminator: string;
			avatar: string | null;
			bal: number;
		} | null;
	};

	// Re-run layout server load after coming back from logout so the
	// navbar updates immediately without requiring a manual refresh.
	afterNavigate(({ from }) => {
		const prev = from?.url?.pathname ?? "";
		if (prev.startsWith("/logout") || prev.startsWith("/login")) {
			invalidateAll();
		}
	});

	// After a successful login Discord redirects back with ?auth=1.
	// Detect it on mount, re-run all load functions, then strip the param
	// so it doesn't linger in the address bar.
	onMount(() => {
		const cleanupFadeIn = initImageFadeIn();

		if ($page.url.searchParams.get("auth") === "1") {
			invalidateAll().then(() => {
				const clean = new URL($page.url);
				clean.searchParams.delete("auth");
				replaceState(clean.pathname + (clean.search || ""), {});
			});
		}

		return cleanupFadeIn;
	});
</script>

<svelte:head>
	<!-- Favicons -->
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
	<link rel="alternate icon" href="/favicon.png" type="image/png" sizes="48x48" />
	<link rel="apple-touch-icon" href="/assets/img/bot/logo-144.png" sizes="144x144" />
</svelte:head>
<!-- Navigation progress bar -->
{#if visible}
	<div class="fixed top-0 left-0 right-0 z-9999 h-0.75 pointer-events-none" aria-hidden="true">
		<div
			class="h-full bg-primary transition-all duration-100 ease-out"
			style="width: {progress}%; opacity: {progress === 100
				? 0
				: 1}; transition: width 100ms ease-out, opacity 250ms ease-in {progress === 100
				? '50ms'
				: '0ms'};"
		></div>
	</div>
{/if}

<Navbar user={data.user} />
<main class={isHomepage ? "" : "mt-24"}><slot></slot></main>
<Footer />
