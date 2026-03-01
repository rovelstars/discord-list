<script lang="ts">
	import { onMount } from 'svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';

	export let redirect: string | null = null;
	export let label: string = 'Login';
	export let className: string = '';

	let open = false;
	let email = true;
	let servers = true;
	let currentPath = '/';

	onMount(() => {
		try {
			currentPath = window.location.pathname + window.location.search + window.location.hash;
			if (!redirect) redirect = currentPath;
		} catch (e) {
			// ignore on server
		}
	});

	function submitLogin() {
		// Persist redirect (server expects it via cookie) and navigate to login endpoint with scope flags.
		try {
			const redirectPath = redirect || currentPath || '/';
			document.cookie = `redirect=${encodeURIComponent(redirectPath)}; path=/;`;
			const url = new URL('/login', window.location.href);
			url.searchParams.append('servers', String(Boolean(servers)));
			url.searchParams.append('email', String(Boolean(email)));
			// navigate to server-side login entrypoint
			window.location.href = url.toString();
		} catch (err) {
			// fallback: just navigate
			window.location.href = `/login?servers=${servers}&email=${email}`;
		}
	}
</script>

<!--
  LoginButton.svelte
  Port of the old React login button. Uses the Dialog component to show choices for scopes.
-->

<Dialog bind:open>
	<!-- Trigger -->
	<div slot="trigger" aria-hidden="true">
		<Button as="button" {className}>
			<span>{label}</span>
		</Button>
	</div>

	<!-- Content -->
	<div slot="content" class="sm:max-w-[425px]">
		<header class="mb-4">
			<h2 class="text-xl md:text-2xl font-semibold">Choose Scopes</h2>
			<p class="text-sm text-muted-foreground mt-1">
				Select what permissions the OAuth flow should request.
			</p>
		</header>

		<form
			on:submit|preventDefault={() => {
				submitLogin();
			}}
		>
			<div class="flex items-start gap-3 mb-4">
				<Checkbox bind:checked={servers} id="scope-servers">
					<div class="grid gap-1.5 leading-none">
						<label for="scope-servers" class="text-lg font-medium leading-none">Join Servers</label>
						<p class="text-sm text-muted-foreground">
							This is used to add you to servers you want to join.
						</p>
					</div>
				</Checkbox>
			</div>

			<div class="flex items-start gap-3 mb-4">
				<Checkbox bind:checked={email} id="scope-email">
					<div class="grid gap-1.5 leading-none">
						<label for="scope-email" class="text-lg font-medium leading-none">Email</label>
						<p class="text-sm text-muted-foreground">This is used to get your email.</p>
					</div>
				</Checkbox>
			</div>

			<div class="flex justify-end gap-2 mt-4">
				<Button as="button" variant="default" type="submit">Login</Button>
			</div>
		</form>
	</div>
</Dialog>

<style>
	/* Small layout niceties to match original visuals; most styling is provided by Tailwind tokens. */
	.text-muted-foreground {
		color: hsl(var(--muted-foreground));
	}

	/* Ensure dialog buttons and inputs look reasonable if tailwind isn't fully active yet */
	:global(button[variant='outline']) {
		border: 1px solid hsl(var(--input));
		background: hsl(var(--background));
	}
</style>
