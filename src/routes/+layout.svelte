<script lang="ts">
	import "../styles/global.css";
	import Navbar from "$lib/components/Navbar.svelte";
	import Footer from "$lib/components/Footer.svelte";
	import { afterNavigate, invalidateAll, replaceState } from "$app/navigation";
	import { onMount } from "svelte";
	import { page } from "$app/stores";

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
		if ($page.url.searchParams.get("auth") === "1") {
			invalidateAll().then(() => {
				const clean = new URL($page.url);
				clean.searchParams.delete("auth");
				replaceState(clean.pathname + (clean.search || ""), {});
			});
		}
	});
</script>

<svelte:head>
	<!-- Favicons -->
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
	<link rel="alternate icon" href="/favicon.png" type="image/png" sizes="48x48" />
	<link rel="apple-touch-icon" href="/assets/img/bot/logo-144.png" sizes="144x144" />
</svelte:head>
<Navbar user={data.user} />
<main class="mt-24"><slot></slot></main>
<Footer />
