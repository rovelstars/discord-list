<script lang="ts">
	import { onMount } from "svelte";
	import { authResolved, initAuth } from "$lib/auth";

	export let data: {
		dashboardUser: {
			id: string;
			username: string;
			tag: string;
			discriminator: string;
			avatar: string | null;
			bal: number;
		};
	};

	// The dashboard layout has already validated the user server-side.
	// If the client-side auth store hasn't resolved yet (e.g. the user
	// navigated directly to /dashboard as their first page load), we
	// kick off the client-side auth resolution so that the Navbar and
	// other auth-dependent components render correctly. The dashboard
	// content itself already has everything it needs from
	// `data.dashboardUser` — this just ensures the global auth store
	// is populated too.
	onMount(() => {
		if (!$authResolved) {
			initAuth(true);
		}
	});
</script>

<slot />
