<!--
	HeroBgCard — ultra-light static stand-in for BotCard/ServerCard/EmojiCard/StickerCard
	inside the homepage hero marquee (.bg-stage, aria-hidden).

	Deliberately has NO <script> lifecycle: no onMount, no ColorThief, no Twemoji,
	no fetch, no hover state. All values are plain reactive expressions over `item`,
	so each instance is a handful of static DOM nodes + at most one <img>.
-->
<script lang="ts">
	export let item: any;

	$: type = item?._type ?? "bot";
	$: skeleton = Boolean(item?.IS_SKELETON);

	// Static (non-animated) image URL per type — avoids GIF/Lottie decode cost.
	$: imgSrc = (() => {
		if (!item || skeleton) return null;
		try {
			if (type === "bot") {
				const avatar = item.avatar ?? "0";
				if (["0", "1", "2", "3", "4"].includes(String(avatar))) {
					return `https://cdn.discordapp.com/embed/avatars/${avatar}.webp`;
				}
				// Strip animation prefix: background art only needs the first frame.
				const hash = String(avatar).replace(/^a_/, "");
				return `https://cdn.discordapp.com/avatars/${item.id}/${hash}.webp?size=96`;
			}
			if (type === "server") {
				if (!item.icon) return null;
				return `https://cdn.discordapp.com/icons/${item.id}/${item.icon}.webp?size=128`;
			}
			if (type === "emoji") {
				// .webp returns a static frame even for animated emojis.
				return `https://cdn.discordapp.com/emojis/${item.id}.webp?size=96`;
			}
			if (type === "sticker") {
				// PNG/APNG only — GIF/Lottie formats render as a gradient placeholder.
				if (item.format === 1) return `https://cdn.discordapp.com/stickers/${item.id}.png?size=160`;
				if (item.format === 2)
					return `https://cdn.discordapp.com/stickers/${item.id}.png?size=160&passthrough=true`;
				return null;
			}
		} catch {
			return null;
		}
		return null;
	})();

	$: label = (() => {
		if (skeleton) return "";
		if (type === "bot") return (item.username ?? item.name ?? "").toString();
		if (type === "server") return (item.name ?? "").toString();
		return (item.name ?? item.code ?? "").toString();
	})();

	$: roundImg = type === "bot" || type === "server";
</script>

<div class="hero-bg-card" role="presentation">
	<!-- Banner strip: pure CSS gradient, no image fetch -->
	<div class="hero-bg-banner hero-bg-banner-{type}"></div>

	<!-- Icon row -->
	<div class="hero-bg-iconrow">
		{#if imgSrc}
			<img
				src={imgSrc}
				alt=""
				width="48"
				height="48"
				loading="lazy"
				decoding="async"
				draggable="false"
				class={roundImg ? "hero-bg-icon hero-bg-icon-round" : "hero-bg-icon"}
			/>
		{:else}
			<div class="hero-bg-icon hero-bg-icon-ph {roundImg ? 'hero-bg-icon-round' : ''}"></div>
		{/if}
		<div class="hero-bg-namebar"></div>
	</div>

	<!-- Body skeleton -->
	<div class="hero-bg-body">
		<div class="hero-bg-titlebar"></div>
		<div class="hero-bg-subbar"></div>
		<div class="hero-bg-tags">
			<span class="hero-bg-tag"></span>
			<span class="hero-bg-tag hero-bg-tag-2"></span>
		</div>
		<div class="hero-bg-lines">
			<span style="width: 92%"></span>
			<span style="width: 70%"></span>
			<span style="width: 80%"></span>
		</div>
		<div class="hero-bg-btn"></div>
		<div class="hero-bg-btn hero-bg-btn-2"></div>
		{#if label}
			<span class="sr-only">{label}</span>
		{/if}
	</div>
</div>

<style>
	.hero-bg-card {
		width: 20rem; /* w-80 — matches BotCard md:max-w-80 footprint */
		flex-shrink: 0;
		border-radius: 0.5rem;
		border: 1px solid hsl(var(--border));
		background: hsl(var(--popover));
		overflow: hidden;
		content-visibility: auto;
		contain-intrinsic-size: 320px 430px;
	}

	.hero-bg-banner {
		height: 7rem;
		width: 100%;
	}
	.hero-bg-banner-bot {
		background: linear-gradient(135deg, hsl(var(--primary) / 0.5), hsl(var(--primary) / 0.08));
	}
	.hero-bg-banner-server {
		background: linear-gradient(135deg, rgb(34 197 94 / 0.45), rgb(34 197 94 / 0.07));
	}
	.hero-bg-banner-emoji {
		background: linear-gradient(135deg, rgb(168 85 247 / 0.45), rgb(168 85 247 / 0.07));
	}
	.hero-bg-banner-sticker {
		background: linear-gradient(135deg, rgb(245 158 11 / 0.45), rgb(245 158 11 / 0.07));
	}

	.hero-bg-iconrow {
		position: relative;
		display: flex;
		align-items: flex-end;
		gap: 0.625rem;
		padding: 0 1rem;
		height: 0;
	}

	.hero-bg-icon {
		width: 48px;
		height: 48px;
		object-fit: cover;
		background: hsl(var(--muted));
		border: 3px solid hsl(var(--card));
		transform: translateY(-24px);
		flex-shrink: 0;
	}
	.hero-bg-icon-round {
		border-radius: 9999px;
	}
	.hero-bg-icon:not(.hero-bg-icon-round) {
		border-radius: 0.5rem;
	}
	.hero-bg-icon-ph {
		background: linear-gradient(135deg, hsl(var(--muted)), hsl(var(--muted) / 0.5));
	}

	.hero-bg-namebar {
		height: 0.875rem;
		width: 45%;
		border-radius: 0.25rem;
		background: hsl(var(--muted));
		transform: translateY(-30px);
	}

	.hero-bg-body {
		padding: 2.25rem 1rem 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.hero-bg-titlebar {
		height: 1.25rem;
		width: 66%;
		border-radius: 0.25rem;
		background: hsl(var(--muted));
	}
	.hero-bg-subbar {
		height: 0.75rem;
		width: 45%;
		border-radius: 0.25rem;
		background: hsl(var(--muted) / 0.6);
	}
	.hero-bg-tags {
		display: flex;
		gap: 0.5rem;
		margin: 0.25rem 0;
	}
	.hero-bg-tag {
		height: 1.25rem;
		width: 4.5rem;
		border-radius: 0.25rem;
		background: hsl(var(--primary) / 0.35);
	}
	.hero-bg-tag-2 {
		width: 3.75rem;
		background: rgb(34 197 94 / 0.3);
	}
	.hero-bg-lines {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		border-radius: 0.375rem;
		background: hsl(var(--card));
		padding: 0.75rem 0.5rem;
	}
	.hero-bg-lines span {
		display: block;
		height: 0.75rem;
		border-radius: 0.25rem;
		background: hsl(var(--muted) / 0.7);
	}
	.hero-bg-btn {
		height: 2.25rem;
		border-radius: 0.375rem;
		background: hsl(var(--muted));
	}
	.hero-bg-btn-2 {
		background: hsl(var(--muted) / 0.55);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
	}
</style>
