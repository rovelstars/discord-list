<script lang="ts">
	// Simple Svelte port of the old LogoNavbar component.
	// Shows a static SVG by default and swaps to an animated GIF on hover/focus.
	let logo = '/assets/img/bot/logo.svg';
	let pet = '/assets/img/bot/pet.gif';
	let src = logo;

	function handleMouseEnter() {
		src = pet;
	}
	function handleMouseLeave() {
		src = logo;
	}

	// For keyboard accessibility, also toggle on focus/blur.
	function handleFocus() {
		src = pet;
	}
	function handleBlur() {
		src = logo;
	}
</script>

<img
	{src}
	alt="Rovel Discord List logo"
	loading="lazy"
	class="w-12 h-12"
	width="48"
	height="48"
	on:mouseenter={handleMouseEnter}
	on:mouseleave={handleMouseLeave}
	on:focus={handleFocus}
	on:blur={handleBlur}
/>
