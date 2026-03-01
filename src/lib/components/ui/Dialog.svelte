<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher, tick } from 'svelte';
	import { browser } from '$app/environment';

	const FOCUSABLE_SELECTORS =
		'a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"]), [contenteditable]';

	export let open: boolean = false;
	export let closeOnEsc: boolean = true;
	export let closeOnOutsideClick: boolean = true;
	export let ariaLabel: string | undefined = undefined;
	export let maxWidthClass: string = 'max-w-lg';

	const dispatch = createEventDispatcher();

	let dialogEl: HTMLElement | null = null;
	let previouslyFocused: Element | null = null;

	// Portal action — moves the node to document.body on mount and restores on destroy
	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return {
			destroy() {
				if (node.parentNode) {
					node.parentNode.removeChild(node);
				}
			}
		};
	}

	function openDialog() {
		previouslyFocused = document.activeElement;
		open = true;
		dispatch('open');
		tick().then(() => {
			if (dialogEl) {
				const first = dialogEl.querySelector(FOCUSABLE_SELECTORS) as HTMLElement;
				(first || dialogEl).focus();
			}
		});
	}

	function closeDialog() {
		open = false;
		dispatch('close');
		if (previouslyFocused instanceof HTMLElement) {
			previouslyFocused.focus();
		}
	}

	function toggleDialog() {
		open ? closeDialog() : openDialog();
	}

	function onOverlayPointerDown(e: MouseEvent) {
		if (!closeOnOutsideClick) return;
		const target = e.target as HTMLElement;
		if (target?.dataset?.dialogOverlay !== undefined) {
			closeDialog();
		}
	}

	function onKeyDown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape' && closeOnEsc) {
			e.stopPropagation();
			closeDialog();
			return;
		}
		if (e.key === 'Tab') {
			if (!dialogEl) return;
			const focusable = Array.from(dialogEl.querySelectorAll(FOCUSABLE_SELECTORS)) as HTMLElement[];
			if (focusable.length === 0) {
				e.preventDefault();
				return;
			}
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			const active = document.activeElement as HTMLElement | null;
			if (e.shiftKey) {
				if (active === first || active === dialogEl) {
					e.preventDefault();
					last.focus();
				}
			} else {
				if (active === last) {
					e.preventDefault();
					first.focus();
				}
			}
		}
	}

	function handleWindowKey(e: KeyboardEvent) {
		onKeyDown(e);
	}

	onMount(() => {
		if (open) {
			previouslyFocused = document.activeElement;
		}
		window.addEventListener('keydown', handleWindowKey, true);
	});

	onDestroy(() => {
		if (browser) {
			window.removeEventListener('keydown', handleWindowKey, true);
		}
	});
</script>

<!-- Trigger wrapper -->
<div
	on:click|stopPropagation={toggleDialog}
	on:keydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			toggleDialog();
		}
	}}
	class="inline-block"
	role="presentation"
>
	<slot name="trigger" />
</div>

{#if open}
	<!-- Overlay — portalled to body so fixed positioning is never clipped -->
	<div use:portal>
		<div
			data-dialog-overlay
			class="fixed inset-0 z-9998 bg-black/80"
			on:mousedown={onOverlayPointerDown}
			aria-hidden="true"
		></div>

		<!-- Dialog panel -->
		<div
			class="fixed left-1/2 top-1/2 z-9999 grid w-full {maxWidthClass} -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg sm:rounded-lg"
			role="dialog"
			aria-modal="true"
			aria-label={ariaLabel}
			bind:this={dialogEl}
			tabindex="-1"
			on:click|stopPropagation
			on:keydown|stopPropagation
		>
			<slot name="close">
				<button
					aria-label="Close"
					class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
					on:click={closeDialog}
				>
					<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<path
							d="M6 6l12 12M6 18L18 6"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
					<span class="sr-only">Close</span>
				</button>
			</slot>

			<slot name="content" />
		</div>
	</div>
{/if}

<style>
	.sr-only {
		position: absolute !important;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
