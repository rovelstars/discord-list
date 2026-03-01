<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { fade, scale } from 'svelte/transition';

	// Action to ensure content element is attached to document body coordinates correctly.
	function contentAttrs(node: HTMLElement) {
		return {
			destroy() {
				// noop
			}
		};
	}

	export let open: boolean = false;
	export let side: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
	export let align: 'start' | 'center' | 'end' = 'center';
	export let offset: number = 8; // px space between trigger and content
	export let closeOnEsc: boolean = true;
	export let closeOnOutsideClick: boolean = true;
	export let ariaLabel: string | undefined = undefined;

	const dispatch = createEventDispatcher();

	let triggerEl: HTMLElement | null = null;
	let contentEl: HTMLElement | null = null;

	let contentStyle = '';
	let resizeObserver: ResizeObserver | null = null;

	function toggle() {
		open = !open;
		dispatch(open ? 'open' : 'close');
	}

	function close() {
		if (open) {
			open = false;
			dispatch('close');
		}
	}

	function onTriggerKeydown(e: KeyboardEvent) {
		// open popover on Enter/Space for accessibility
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			toggle();
		}
		if (e.key === 'Escape' && closeOnEsc) {
			close();
		}
	}

	function onDocumentClick(e: MouseEvent) {
		if (!closeOnOutsideClick || !open) return;
		const target = e.target as Node;
		if (!triggerEl || !contentEl) return;
		if (!triggerEl.contains(target) && !contentEl.contains(target)) {
			close();
		}
	}

	function onDocumentKeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape' && closeOnEsc) {
			close();
		}
	}

	function clamp(value: number, min: number, max: number) {
		return Math.max(min, Math.min(max, value));
	}

	function updatePosition() {
		if (!triggerEl || !contentEl) return;

		const trig = triggerEl.getBoundingClientRect();
		const content = contentEl.getBoundingClientRect();
		const vw = document.documentElement.clientWidth;
		const vh = document.documentElement.clientHeight;

		let top = 0;
		let left = 0;

		if (side === 'bottom') {
			top = trig.bottom + offset;
			if (align === 'start') left = trig.left;
			else if (align === 'center') left = trig.left + trig.width / 2 - content.width / 2;
			else left = trig.right - content.width;
		} else if (side === 'top') {
			top = trig.top - content.height - offset;
			if (align === 'start') left = trig.left;
			else if (align === 'center') left = trig.left + trig.width / 2 - content.width / 2;
			else left = trig.right - content.width;
		} else if (side === 'left') {
			left = trig.left - content.width - offset;
			if (align === 'start') top = trig.top;
			else if (align === 'center') top = trig.top + trig.height / 2 - content.height / 2;
			else top = trig.bottom - content.height;
		} else {
			// right
			left = trig.right + offset;
			if (align === 'start') top = trig.top;
			else if (align === 'center') top = trig.top + trig.height / 2 - content.height / 2;
			else top = trig.bottom - content.height;
		}

		// Convert from viewport coords to document coords (to support page scroll)
		const scrollX = window.scrollX || window.pageXOffset;
		const scrollY = window.scrollY || window.pageYOffset;

		// Clamp within viewport (small margin)
		const margin = 8;
		left = clamp(left + scrollX, margin, scrollX + vw - content.width - margin);
		top = clamp(top + scrollY, margin, scrollY + vh - content.height - margin);

		contentStyle = `position: absolute; left: ${Math.round(left)}px; top: ${Math.round(top)}px; z-index: 60;`;
	}

	onMount(() => {
		window.addEventListener('click', onDocumentClick, true);
		window.addEventListener('keydown', onDocumentKeydown, true);
		window.addEventListener('resize', updatePosition);
		window.addEventListener('scroll', updatePosition, true);

		// Observe size changes to re-position when content size changes
		try {
			resizeObserver = new ResizeObserver(() => updatePosition());
			if (triggerEl) resizeObserver.observe(triggerEl);
			if (contentEl) resizeObserver.observe(contentEl);
		} catch (e) {
			// ResizeObserver may not be available in some environments; ignore
		}

		// reactive-positioning when open initially
		if (open) updatePosition();
	});

	onDestroy(() => {
		window.removeEventListener('click', onDocumentClick, true);
		window.removeEventListener('keydown', onDocumentKeydown, true);
		window.removeEventListener('resize', updatePosition);
		window.removeEventListener('scroll', updatePosition, true);
		if (resizeObserver) resizeObserver.disconnect();
	});

	$: if (open) {
		// allow content to render then measure
		// Use a microtask to let DOM update first
		Promise.resolve().then(updatePosition);
		// optional: focus the content for keyboard users
		Promise.resolve().then(() => {
			if (contentEl) contentEl.focus({ preventScroll: true } as any);
		});
	}
</script>

<!--
  Usage:
  <Popover>
    <button slot="trigger">Open</button>
    <div slot="content">Popover content</div>
  </Popover>
-->
<div class="relative inline-block" aria-haspopup="true" aria-expanded={open}>
	<!-- Trigger wrapper -->
	<div
		bind:this={triggerEl}
		on:click={() => toggle()}
		on:keydown={onTriggerKeydown}
		role="button"
		tabindex="0"
		aria-label="Popover trigger"
	>
		<slot name="trigger" />
	</div>

	{#if open}
		<!-- Popover content is positioned absolutely in the document using computed style -->
		<div
			bind:this={contentEl}
			class="bg-popover border rounded-md shadow-lg p-2 focus:outline-none"
			use:contentAttrs
			style={contentStyle}
			role="dialog"
			aria-label={ariaLabel}
			tabindex="-1"
			in:scale={{ duration: 120, start: 0.98 }}
			out:scale={{ duration: 90, start: 1 }}
		>
			<slot name="content" />
		</div>
	{/if}
</div>

<style>
	/* Minimal styling that relies on Tailwind / design tokens available in global.css.
     The classes used above (bg-popover, border, rounded-md, shadow-lg, etc.) assume Tailwind tokens. */

	/* Ensure the popover content can receive focus for accessibility */
	[role='dialog'] {
		outline: none;
	}
</style>
