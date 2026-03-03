<script lang="ts">
	import { onMount } from "svelte";
	import SEO from "$lib/components/SEO.svelte";
	import ServerCard from "$lib/components/ServerCard.svelte";
	import BotCard from "$lib/components/BotCard.svelte";
	import TwemojiText from "$lib/components/TwemojiText.svelte";

	import EmojiCard from "$lib/components/EmojiCard.svelte";
	import StickerCard from "$lib/components/StickerCard.svelte";

	export let data: {
		server: {
			id: string;
			name: string;
			short: string | null;
			desc: string | null;
			icon: string | null;
			votes: number;
			owner: string;
			slug: string;
			promoted: boolean;
			badges: any[];
			added_at: string | null;
			member_count: number | null;
			presence_count: number | null;
			channels: Array<{ id: string; name: string; type: number; nsfw: boolean }>;
			has_nsfw: boolean;
			synced_at: string | null;
		};
		descHtml: string | null;
		randomServers: any[];
		relatedBots: Array<{
			id: string;
			slug: string;
			username: string;
			discriminator: string;
			avatar: string | null;
			short: string;
			votes: number;
			servers: number;
			invite: string | null;
			bg: string | null;
		}>;
		user: any | null;
		emojis: Array<{
			id: string;
			code: string;
			name: string;
			alt_names: string[];
			a: boolean;
			dc: number;
			added_at: string | null;
			guild: string | null;
			submitter: string | null;
		}>;
		emojiCount: number;
		stickers: Array<{
			id: string;
			name: string;
			tags: string | null;
			format: number;
			dc: number;
			added_at: string | null;
			guild: string | null;
		}>;
		stickerCount: number;
	};

	$: ({
		server,
		descHtml,
		randomServers,
		relatedBots,
		user,
		emojis,
		emojiCount,
		stickers,
		stickerCount
	} = data);

	// Emoji display limit on server page (show first N, link to full list)
	const EMOJI_PAGE_LIMIT = 32;
	$: visibleEmojis = emojis.slice(0, EMOJI_PAGE_LIMIT);

	// Sticker display limit on server page
	const STICKER_PAGE_LIMIT = 32;
	$: visibleStickers = (stickers ?? []).slice(0, STICKER_PAGE_LIMIT);

	// ── Icon URL ─────────────────────────────────────────────────────────────

	$: iconUrl = (() => {
		if (!server?.icon || server.icon === "") return null;
		if (server.icon.startsWith("http")) return server.icon;
		return `https://cdn.discordapp.com/icons/${server.id}/${server.icon}.webp?size=256`;
	})();

	// ── Formatting helpers ───────────────────────────────────────────────────

	function formatDate(iso: string | null): string {
		if (!iso) return "Unknown";
		try {
			return new Date(iso).toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric"
			});
		} catch {
			return iso;
		}
	}

	function approx(n: number | null | undefined): string {
		if (n == null || isNaN(Number(n))) return "0";
		const num = Number(n);
		if (num >= 1_000_000) return (num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1) + "M";
		if (num >= 1_000) return (num / 1_000).toFixed(num % 1_000 === 0 ? 0 : 1) + "k";
		return String(num);
	}

	/** Prose form for member count, used in SEO paragraph. */
	function membersLabel(n: number | null | undefined): string {
		if (n == null) return "an active";
		if (n >= 1_000_000) return `over ${Math.floor(n / 1_000_000)} million`;
		if (n >= 1_000) return `over ${Math.floor(n / 1_000).toLocaleString()} thousand`;
		if (n > 0) return String(n.toLocaleString());
		return "an active";
	}

	// ── Channel helpers ──────────────────────────────────────────────────────

	// Discord channel type integers we want to show
	const CHANNEL_TYPE_LABEL: Record<number, string> = {
		0: "Text",
		2: "Voice",
		4: "Category",
		5: "Announcement",
		11: "Thread",
		13: "Stage",
		15: "Forum"
	};

	function channelTypeLabel(type: number): string {
		return CHANNEL_TYPE_LABEL[type] ?? "Other";
	}

	// Only show non-category channels in the public list — categories just clutter it
	$: publicChannels = (server.channels ?? []).filter((ch) => ch.type !== 4);
	$: textChannels = publicChannels.filter((ch) => [0, 5, 11, 15].includes(ch.type));
	$: voiceChannels = publicChannels.filter((ch) => [2, 13].includes(ch.type));
	$: nsfwChannels = publicChannels.filter((ch) => ch.nsfw);

	// Cap how many channels we show before truncating
	const CHANNEL_DISPLAY_LIMIT = 20;
	$: visibleTextChannels = textChannels.slice(0, CHANNEL_DISPLAY_LIMIT);
	$: visibleVoiceChannels = voiceChannels.slice(0, CHANNEL_DISPLAY_LIMIT);

	// ── Accent color (ColorThief from icon) ──────────────────────────────────

	let iconImgRef: HTMLImageElement | null = null;
	let gradientColor: [number, number, number] | null = null;
	let colorThief: { getColor: (img: HTMLImageElement) => [number, number, number] } | null = null;

	async function ensureColorThief() {
		if (colorThief) return colorThief;
		try {
			const { default: CT } = await import("colorthief");
			colorThief = new (CT as any)();
		} catch {
			// colorthief unavailable
		}
		return colorThief;
	}

	function extractColor(img: HTMLImageElement) {
		if (!colorThief) return;
		try {
			if (!img.naturalWidth) return;
			const c = colorThief.getColor(img);
			if (Array.isArray(c) && c.length === 3) gradientColor = c as [number, number, number];
		} catch {
			// cross-origin or decode error — skip
		}
	}

	function iconColorAction(node: HTMLImageElement) {
		iconImgRef = node;
		ensureColorThief().then(() => {
			if (node.complete && node.naturalWidth) {
				extractColor(node);
			} else {
				node.addEventListener("load", () => extractColor(node), { once: true });
			}
		});
		return {
			destroy() {
				iconImgRef = null;
			}
		};
	}

	$: gc = gradientColor;
	$: borderStyle = gc ? `border-color: rgba(${gc[0]},${gc[1]},${gc[2]},0.35);` : "";
	$: gradientOverlayStyle = gc
		? `background: linear-gradient(to bottom, rgba(${gc[0]},${gc[1]},${gc[2]},0.18) 0%, rgba(${gc[0]},${gc[1]},${gc[2]},0.06) 40%, transparent 100%);`
		: "";
	$: bannerStyle = gc
		? `background: linear-gradient(135deg, rgba(${gc[0]},${gc[1]},${gc[2]},0.45) 0%, rgba(${gc[0]},${gc[1]},${gc[2]},0.15) 60%, transparent 100%);`
		: "";

	// ── SEO helpers ──────────────────────────────────────────────────────────

	function buildSeoDescription(): string {
		const name = server.name;
		const members = server.member_count;
		const online = server.presence_count;
		const hasNsfw = server.has_nsfw;
		const channelCount = publicChannels.length;

		let desc = `${name} is a Discord community server`;
		if (members) {
			desc += ` with ${membersLabel(members)} members`;
			if (online) desc += ` and ${approx(online)} online`;
		}
		desc += ".";

		if (server.short && server.short !== "Short description is not Updated.") {
			desc += ` ${server.short}`;
		}

		if (channelCount > 0) {
			desc += ` The server has ${channelCount} channel${channelCount !== 1 ? "s" : ""}`;
			if (textChannels.length > 0 && voiceChannels.length > 0) {
				desc += ` including ${textChannels.length} text and ${voiceChannels.length} voice channel${voiceChannels.length !== 1 ? "s" : ""}`;
			}
			desc += ".";
		}

		if (hasNsfw) {
			desc += " Note: this server contains NSFW (18+) channels.";
		}

		return desc;
	}

	$: seoDescription = buildSeoDescription();

	function buildSeoTitle(): string {
		const memberStr = server.member_count ? ` · ${approx(server.member_count)} members` : "";
		return `${server.name}${memberStr} — Discord Server`;
	}

	$: seoTitle = buildSeoTitle();

	// ── Stale-data client hint ────────────────────────────────────────────────
	// If the page was served with cached data but we now see it's stale,
	// we offer a soft reload via the public refresh endpoint.

	let refreshDispatched = false;

	onMount(() => {
		const synced = server.synced_at ? new Date(server.synced_at).getTime() : 0;
		const stale = !synced || Date.now() - synced > 15 * 60 * 1000;
		if (!stale || refreshDispatched) return;
		refreshDispatched = true;

		fetch(`/api/servers/${encodeURIComponent(server.id)}/refresh`, { method: "POST" })
			.then(async (res) => {
				const body = await res.json().catch(() => ({}));
				if (res.ok && body.updated) {
					// Fresh data is in the DB — reload to show it
					location.reload();
				}
			})
			.catch(() => {
				// non-fatal — best-effort only
			});
	});
</script>

<SEO title={seoTitle} description={seoDescription} image={iconUrl} imageSmall={iconUrl} />

<div class="flex flex-col xl:flex-row xl:items-start gap-6 p-4">
	<!-- ── Main content column ─────────────────────────────────────────── -->
	<div class="min-w-0 flex-1">
		<div class="bg-card rounded-lg overflow-hidden">
			<!-- Banner area -->
			<div
				class="h-40 w-full flex items-end px-6 pb-4 relative transition-all duration-500"
				style={bannerStyle ||
					"background: linear-gradient(135deg, rgba(34,197,94,0.25) 0%, rgba(16,185,129,0.1) 60%, transparent 100%);"}
			>
				<div
					class="absolute inset-0 bg-linear-to-t from-card/60 to-transparent pointer-events-none"
				></div>
			</div>

			<!-- Content grid -->
			<div class="grid grid-cols-1 md:grid-cols-4 gap-6 p-4" style={gradientOverlayStyle}>
				<!-- ── Left column: icon + details ──────────────────────────── -->
				<div
					class="md:col-span-3 flex flex-col items-center md:items-start gap-4 -mt-16 relative z-10"
				>
					<!-- Server icon -->
					{#if iconUrl}
						<img
							src={iconUrl}
							alt="{server.name} icon"
							width="96"
							height="96"
							crossorigin="anonymous"
							use:iconColorAction
							class="w-24 h-24 rounded-2xl border-4 border-card shadow-xl bg-muted object-cover"
						/>
					{:else}
						<div
							class="w-24 h-24 rounded-2xl border-4 border-card shadow-xl bg-green-500/20 flex items-center justify-center"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-12 h-12 text-green-500"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.75"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
								<polyline points="9 22 9 12 15 12 15 22" />
							</svg>
						</div>
					{/if}

					<!-- Name + badge -->
					<div class="text-center md:text-left">
						<h1 class="text-2xl md:text-4xl font-heading font-black leading-tight">
							{server.name}
						</h1>
						<div class="flex items-center gap-2 mt-1 justify-center md:justify-start flex-wrap">
							<span
								class="inline-block bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded"
							>
								SERVER
							</span>
							{#if server.promoted}
								<span
									class="inline-block bg-yellow-500 text-white text-xs font-bold px-2 py-0.5 rounded"
								>
									PROMOTED
								</span>
							{/if}
							{#if server.has_nsfw}
								<span
									class="inline-block bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded"
								>
									18+
								</span>
							{/if}
						</div>
					</div>

					<!-- Short description -->
					{#if server.short && server.short !== "Short description is not Updated."}
						<div
							class="text-muted-foreground text-base border-b-2 pb-4 w-full text-center md:text-left"
							style={borderStyle}
						>
							<TwemojiText>{server.short}</TwemojiText>
						</div>
					{/if}

					<!-- Long description -->
					{#if descHtml}
						<div
							class="prose prose-sm dark:prose-invert prose-code:before:content-[''] prose-code:after:content-[''] prose-code:bg-popover prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded max-w-none text-foreground w-full overflow-x-auto"
						>
							{@html descHtml}
						</div>
					{/if}

					<!-- ── Server details ─────────────────────────────────── -->
					<div class="mt-4 border-t border-border/50 pt-6 w-full" aria-label="Server details">
						<h2 class="text-lg font-bold font-heading mb-4 text-foreground">Server Info</h2>

						<!-- Stats grid -->
						<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
							<!-- Votes -->
							<div
								class="flex flex-col items-center justify-center rounded-xl bg-muted/30 border border-border px-3 py-3 text-center"
							>
								<span class="text-2xl font-black text-foreground leading-none">
									{approx(server.votes)}
								</span>
								<span class="text-xs text-muted-foreground font-medium mt-1">Votes</span>
							</div>

							<!-- Members -->
							<div
								class="flex flex-col items-center justify-center rounded-xl bg-muted/30 border border-border px-3 py-3 text-center"
							>
								{#if server.member_count != null}
									<span class="text-2xl font-black text-foreground leading-none">
										{approx(server.member_count)}
									</span>
								{:else}
									<span class="text-2xl font-black text-muted-foreground leading-none">—</span>
								{/if}
								<span class="text-xs text-muted-foreground font-medium mt-1">Members</span>
							</div>

							<!-- Online -->
							<div
								class="flex flex-col items-center justify-center rounded-xl bg-muted/30 border border-border px-3 py-3 text-center"
							>
								{#if server.presence_count != null}
									<span class="text-2xl font-black text-green-500 leading-none">
										{approx(server.presence_count)}
									</span>
								{:else}
									<span class="text-2xl font-black text-muted-foreground leading-none">—</span>
								{/if}
								<span class="text-xs text-muted-foreground font-medium mt-1">Online</span>
							</div>

							<!-- Channels -->
							<div
								class="flex flex-col items-center justify-center rounded-xl bg-muted/30 border border-border px-3 py-3 text-center"
							>
								{#if publicChannels.length > 0}
									<span class="text-2xl font-black text-foreground leading-none">
										{publicChannels.length}
									</span>
								{:else}
									<span class="text-2xl font-black text-muted-foreground leading-none">—</span>
								{/if}
								<span class="text-xs text-muted-foreground font-medium mt-1">Channels</span>
							</div>
						</div>

						<!-- Detail list -->
						<dl class="space-y-3">
							<!-- Server ID -->
							<div class="rounded-xl bg-muted/30 border border-border px-4 py-3">
								<dt class="font-semibold text-sm text-foreground mb-1">Server ID</dt>
								<dd class="text-sm text-muted-foreground font-mono leading-relaxed break-all">
									{server.id}
								</dd>
							</div>

							<!-- Slug -->
							{#if server.slug && server.slug !== server.id}
								<div class="rounded-xl bg-muted/30 border border-border px-4 py-3">
									<dt class="font-semibold text-sm text-foreground mb-1">Slug</dt>
									<dd class="text-sm text-muted-foreground leading-relaxed">
										/servers/<strong class="text-foreground">{server.slug}</strong>
									</dd>
								</div>
							{/if}

							<!-- Listed date -->
							<div class="rounded-xl bg-muted/30 border border-border px-4 py-3">
								<dt class="font-semibold text-sm text-foreground mb-1">Listed</dt>
								<dd class="text-sm text-muted-foreground leading-relaxed">
									{formatDate(server.added_at)}
								</dd>
							</div>

							<!-- Owner -->
							<div class="rounded-xl bg-muted/30 border border-border px-4 py-3">
								<dt class="font-semibold text-sm text-foreground mb-1">Owner ID</dt>
								<dd class="text-sm text-muted-foreground font-mono leading-relaxed break-all">
									<a
										href="/users/{server.owner}"
										class="text-primary hover:underline underline-offset-2"
									>
										{server.owner}
									</a>
								</dd>
							</div>

							<!-- NSFW notice -->
							{#if server.has_nsfw}
								<div class="rounded-xl bg-red-600/10 border border-red-600/30 px-4 py-3">
									<dt class="font-semibold text-sm text-red-500 mb-1 flex items-center gap-1.5">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="w-4 h-4"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											aria-hidden="true"
										>
											<path
												d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
											/>
											<line x1="12" y1="9" x2="12" y2="13" />
											<line x1="12" y1="17" x2="12.01" y2="17" />
										</svg>
										Age-Restricted Content
									</dt>
									<dd class="text-sm text-muted-foreground leading-relaxed">
										This server contains one or more NSFW channels. Content may be intended for
										adults (18+) only.
									</dd>
								</div>
							{/if}

							<!-- Last synced -->
							{#if server.synced_at}
								<div class="rounded-xl bg-muted/30 border border-border px-4 py-3">
									<dt class="font-semibold text-sm text-foreground mb-1">Last synced</dt>
									<dd class="text-sm text-muted-foreground leading-relaxed">
										{formatDate(server.synced_at)}
									</dd>
								</div>
							{/if}
						</dl>
					</div>

					<!-- ── SEO prose ──────────────────────────────────────── -->
					<div class="mt-8 border-t border-border/50 pt-8 w-full" aria-label="About this server">
						<h2 class="text-xl font-bold font-heading mb-5 text-foreground">
							About {server.name}
						</h2>
						<p class="text-muted-foreground text-base leading-relaxed mb-6">
							<strong class="text-foreground">{server.name}</strong> is a Discord community server
							listed on Rovel Discord List.
							{#if server.member_count != null}
								It currently has
								<strong class="text-foreground"
									>{server.member_count.toLocaleString()} members</strong
								>{#if server.presence_count != null}, with approximately
									<strong class="text-green-500"
										>{server.presence_count.toLocaleString()} members online</strong
									>{/if}.
							{/if}
							{#if server.short && server.short !== "Short description is not Updated."}
								{server.short}
							{/if}
							{#if server.added_at}
								It has been listed since
								<strong class="text-foreground">{formatDate(server.added_at)}</strong>.
							{/if}
						</p>

						{#if publicChannels.length > 0}
							<p class="text-muted-foreground text-base leading-relaxed mb-6">
								The server has <strong class="text-foreground"
									>{publicChannels.length} channel{publicChannels.length !== 1 ? "s" : ""}</strong
								>{#if textChannels.length > 0 && voiceChannels.length > 0}, including <strong
										class="text-foreground">{textChannels.length} text</strong
									>
									and
									<strong class="text-foreground"
										>{voiceChannels.length} voice channel{voiceChannels.length !== 1
											? "s"
											: ""}</strong
									>{/if}.
								{#if server.has_nsfw}
									Note: {nsfwChannels.length === 1
										? "one channel is"
										: `${nsfwChannels.length} channels are`} marked as NSFW (age-restricted).
								{/if}
							</p>
						{/if}
					</div>
				</div>
				<!-- end left column -->

				<!-- ── Right column: actions + channels ──────────────────────── -->
				<div class="flex flex-col gap-4 mt-4 md:mt-0 md:col-span-1">
					<!-- Stats hero row -->
					<div class="grid grid-cols-2 gap-2">
						<!-- Votes -->
						<div
							class="flex flex-col items-center justify-center rounded-xl bg-muted/20 border border-border px-4 py-4"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-5 h-5 text-green-500 mb-1"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d="m18 15-6-6-6 6" />
							</svg>
							<span class="text-xl font-black text-foreground leading-none">
								{approx(server.votes)}
							</span>
							<span class="text-xs text-muted-foreground font-medium mt-0.5">Votes</span>
						</div>

						<!-- Members / Online -->
						<div
							class="flex flex-col items-center justify-center rounded-xl bg-muted/20 border border-border px-4 py-4"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-5 h-5 text-primary mb-1"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
								<circle cx="9" cy="7" r="4" />
								<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
								<path d="M16 3.13a4 4 0 0 1 0 7.75" />
							</svg>
							{#if server.member_count != null}
								<span class="text-xl font-black text-foreground leading-none">
									{approx(server.member_count)}
								</span>
								<span class="text-xs text-muted-foreground font-medium mt-0.5">
									Members
									{#if server.presence_count != null}
										<span class="text-green-500">· {approx(server.presence_count)} online</span>
									{/if}
								</span>
							{:else}
								<span class="text-xl font-black text-muted-foreground leading-none">—</span>
								<span class="text-xs text-muted-foreground font-medium mt-0.5">Members</span>
							{/if}
						</div>
					</div>

					<!-- Vote button -->
					<div class="flex flex-col gap-2">
						<a
							href="/servers/{server.slug || server.id}/vote"
							class="flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-500 active:bg-green-700 transition-colors text-white font-bold px-4 py-3 text-sm"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-4 h-4"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d="m18 15-6-6-6 6" />
							</svg>
							Vote for {server.name}
						</a>
					</div>

					<!-- About card -->
					<div class="rounded-2xl border border-green-500/20 bg-green-500/5 p-5">
						<h3 class="font-heading text-base font-bold mb-2 flex items-center gap-2">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-4 h-4 text-green-500"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<circle cx="12" cy="12" r="10" />
								<path d="M12 8v8" />
								<path d="M8 12h8" />
							</svg>
							How to Join
						</h3>
						<p class="text-sm text-muted-foreground leading-relaxed">
							<strong class="text-foreground">{server.name}</strong> is a Discord community listed on
							Rovel Discord List. Search for it on Discord or ask a member for an invite link.
						</p>
					</div>

					<!-- ── Channel list ──────────────────────────────────────── -->
					{#if publicChannels.length > 0}
						<div class="rounded-2xl border border-border bg-muted/10 p-5">
							<h3
								class="font-heading text-base font-bold mb-4 flex items-center gap-2 text-foreground"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-4 h-4 text-primary"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
								>
									<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
								</svg>
								Channels
								<span
									class="ml-auto text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full"
								>
									{publicChannels.length} total
								</span>
							</h3>

							<div class="flex flex-col gap-5">
								<!-- Text channels -->
								{#if textChannels.length > 0}
									<div>
										<p
											class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2"
										>
											Text channels ({textChannels.length})
										</p>
										<ul class="grid grid-cols-1 sm:grid-cols-1 gap-1" aria-label="Text channels">
											{#each visibleTextChannels as ch (ch.id)}
												<li
													class="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-1.5 min-w-0"
												>
													{#if ch.nsfw}
														<!-- NSFW lock icon -->
														<svg
															xmlns="http://www.w3.org/2000/svg"
															class="w-3.5 h-3.5 text-red-500 shrink-0"
															viewBox="0 0 24 24"
															fill="none"
															stroke="currentColor"
															stroke-width="2"
															stroke-linecap="round"
															stroke-linejoin="round"
															aria-label="NSFW"
														>
															<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
															<path d="M7 11V7a5 5 0 0 1 10 0v4" />
														</svg>
													{:else}
														<!-- Hash icon -->
														<svg
															xmlns="http://www.w3.org/2000/svg"
															class="w-3.5 h-3.5 text-muted-foreground/60 shrink-0"
															viewBox="0 0 24 24"
															fill="none"
															stroke="currentColor"
															stroke-width="2"
															stroke-linecap="round"
															stroke-linejoin="round"
															aria-hidden="true"
														>
															<line x1="4" y1="9" x2="20" y2="9" />
															<line x1="4" y1="15" x2="20" y2="15" />
															<line x1="10" y1="3" x2="8" y2="21" />
															<line x1="16" y1="3" x2="14" y2="21" />
														</svg>
													{/if}
													<span class="truncate">{ch.name}</span>
													{#if ch.type !== 0}
														<span
															class="ml-auto shrink-0 text-xs text-muted-foreground/50 font-medium"
															>{channelTypeLabel(ch.type)}</span
														>
													{/if}
												</li>
											{/each}
										</ul>
										{#if textChannels.length > CHANNEL_DISPLAY_LIMIT}
											<p class="text-xs text-muted-foreground mt-2 pl-1">
												+ {textChannels.length - CHANNEL_DISPLAY_LIMIT} more text channels
											</p>
										{/if}
									</div>
								{/if}

								<!-- Voice channels -->
								{#if voiceChannels.length > 0}
									<div>
										<p
											class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2"
										>
											Voice channels ({voiceChannels.length})
										</p>
										<ul class="grid grid-cols-1 sm:grid-cols-2 gap-1" aria-label="Voice channels">
											{#each visibleVoiceChannels as ch (ch.id)}
												<li
													class="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-1.5 min-w-0"
												>
													<!-- Speaker icon -->
													<svg
														xmlns="http://www.w3.org/2000/svg"
														class="w-3.5 h-3.5 text-muted-foreground/60 shrink-0"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="2"
														stroke-linecap="round"
														stroke-linejoin="round"
														aria-hidden="true"
													>
														<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
														<path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
														<path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
													</svg>
													<span class="truncate">{ch.name}</span>
													{#if ch.type === 13}
														<span
															class="ml-auto shrink-0 text-xs text-muted-foreground/50 font-medium"
															>Stage</span
														>
													{/if}
												</li>
											{/each}
										</ul>
										{#if voiceChannels.length > CHANNEL_DISPLAY_LIMIT}
											<p class="text-xs text-muted-foreground mt-2 pl-1">
												+ {voiceChannels.length - CHANNEL_DISPLAY_LIMIT} more voice channels
											</p>
										{/if}
									</div>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Owner / dashboard hint -->
					{#if user}
						<div
							class="rounded-xl border border-border bg-muted/20 px-4 py-3 flex items-start gap-3"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-4 h-4 text-muted-foreground shrink-0 mt-0.5"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<circle cx="12" cy="12" r="10" />
								<path d="M12 16v-4" />
								<path d="M12 8h.01" />
							</svg>
							<p class="text-xs text-muted-foreground leading-relaxed">
								Is this your server? Update it from your
								<a href="/dashboard" class="text-primary font-semibold hover:underline">dashboard</a
								>
								or re-run
								<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">/register</code>
								in your server to refresh the listing.
							</p>
						</div>
					{:else}
						<div
							class="rounded-xl border border-border bg-muted/20 px-4 py-3 flex items-start gap-3"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-4 h-4 text-muted-foreground shrink-0 mt-0.5"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<circle cx="12" cy="12" r="10" />
								<path d="M12 16v-4" />
								<path d="M12 8h.01" />
							</svg>
							<p class="text-xs text-muted-foreground leading-relaxed">
								Own this server?
								<a href="/login" class="text-primary font-semibold hover:underline">Log in</a>
								and run
								<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">/register</code>
								in your server to manage this listing.
							</p>
						</div>
					{/if}
				</div>
				<!-- end right column -->
			</div>
		</div>

		<!-- ── Server Emojis Section ─────────────────────────────────────────── -->
		{#if emojis && emojis.length > 0}
			<div class="mt-8 bg-card rounded-lg overflow-hidden border border-border">
				<div class="px-5 py-4 border-b border-border flex items-center justify-between gap-4">
					<div class="flex items-center gap-2.5">
						<div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-4 h-4 text-primary"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<circle cx="12" cy="12" r="10" />
								<path d="M8 14s1.5 2 4 2 4-2 4-2" />
								<line x1="9" y1="9" x2="9.01" y2="9" />
								<line x1="15" y1="9" x2="15.01" y2="9" />
							</svg>
						</div>
						<div>
							<h2 class="text-base font-bold font-heading leading-none">Server Emojis</h2>
							<p class="text-xs text-muted-foreground mt-0.5">
								{emojiCount.toLocaleString()} custom emoji{emojiCount !== 1 ? "s" : ""} from this server
							</p>
						</div>
					</div>

					{#if emojiCount > EMOJI_PAGE_LIMIT}
						<a
							href="/emojis?guild={server.id}"
							class="text-xs font-semibold text-primary hover:text-primary/80 transition-colors shrink-0"
						>
							View all {emojiCount.toLocaleString()} →
						</a>
					{/if}
				</div>

				<div class="p-4">
					<!-- Animated / Static split tabs — computed in script -->
					{#if visibleEmojis.filter((e) => e.a).length > 0 && visibleEmojis.filter((e) => !e.a).length > 0}
						<!-- Mixed: show both sections -->
						<p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
							Static ({visibleEmojis.filter((e) => !e.a).length}{emojiCount > EMOJI_PAGE_LIMIT
								? "+"
								: ""})
						</p>
						<div
							class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-8 gap-2 mb-5"
						>
							{#each visibleEmojis.filter((e) => !e.a) as emoji (emoji.id)}
								<EmojiCard {emoji} />
							{/each}
						</div>

						<p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
							Animated ({visibleEmojis.filter((e) => e.a).length}{emojiCount > EMOJI_PAGE_LIMIT
								? "+"
								: ""})
						</p>
						<div
							class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-8 gap-2"
						>
							{#each visibleEmojis.filter((e) => e.a) as emoji (emoji.id)}
								<EmojiCard {emoji} />
							{/each}
						</div>
					{:else}
						<!-- All same type -->
						<div
							class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-8 gap-2"
						>
							{#each visibleEmojis as emoji (emoji.id)}
								<EmojiCard {emoji} />
							{/each}
						</div>
					{/if}

					{#if emojiCount > EMOJI_PAGE_LIMIT}
						<div class="mt-4 text-center">
							<a
								href="/emojis?guild={server.id}"
								class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/70 text-sm font-semibold text-foreground transition-colors"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-4 h-4"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<circle cx="12" cy="12" r="10" />
									<path d="M8 14s1.5 2 4 2 4-2 4-2" />
									<line x1="9" y1="9" x2="9.01" y2="9" />
									<line x1="15" y1="9" x2="15.01" y2="9" />
								</svg>
								View all {emojiCount.toLocaleString()} emojis from this server
							</a>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- ── Bots in this server ───────────────────────────────────────────────── -->
		{#if relatedBots && relatedBots.length > 0}
			<div class="mt-8 bg-card rounded-lg overflow-hidden border border-border">
				<div class="px-5 py-4 border-b border-border flex items-center gap-3">
					<div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-4 h-4 text-primary"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<rect width="18" height="18" x="3" y="3" rx="2" />
							<path d="M8 12h8" />
							<path d="M12 8v8" />
						</svg>
					</div>
					<div>
						<h2 class="text-base font-bold font-heading leading-none">
							Bots in {server.name}
						</h2>
						<p class="text-xs text-muted-foreground mt-0.5">
							Discord bots added by this server's owner, sorted by server count
						</p>
					</div>
				</div>
				<div class="p-4 flex flex-wrap justify-center gap-4">
					{#each relatedBots as bot (bot.id)}
						<BotCard {bot} edit={false} />
					{/each}
				</div>
			</div>
		{/if}

		{#if stickers && stickers.length > 0}
			<div class="mt-8 bg-card rounded-lg overflow-hidden border border-border">
				<div class="px-5 py-4 border-b border-border flex items-center justify-between gap-4">
					<div class="flex items-center gap-2.5">
						<div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-4 h-4 text-primary"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path
									d="M15.5 2H8.6c-.4 0-.8.2-1.1.5-.3.3-.5.7-.5 1.1v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8c.4 0 .8-.2 1.1-.5.3-.3.5-.7.5-1.1V6.5L15.5 2z"
								/>
								<path d="M3 7.6v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5H15" />
								<path d="M15 2v5h5" />
							</svg>
						</div>
						<div>
							<h2 class="text-base font-bold font-heading leading-none">Server Stickers</h2>
							<p class="text-xs text-muted-foreground mt-0.5">
								{stickerCount.toLocaleString()} custom sticker{stickerCount !== 1 ? "s" : ""} from this
								server
							</p>
						</div>
					</div>

					{#if stickerCount > STICKER_PAGE_LIMIT}
						<a
							href="/stickers?guild={server.id}"
							class="text-xs font-semibold text-primary hover:text-primary/80 transition-colors shrink-0"
						>
							View all {stickerCount.toLocaleString()} →
						</a>
					{/if}
				</div>

				<div class="p-4">
					<div
						class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2"
					>
						{#each visibleStickers as sticker (sticker.id)}
							<StickerCard {sticker} />
						{/each}
					</div>

					{#if stickerCount > STICKER_PAGE_LIMIT}
						<div class="mt-4 text-center">
							<a
								href="/stickers?guild={server.id}"
								class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/70 text-sm font-semibold text-foreground transition-colors"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-4 h-4"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path
										d="M15.5 2H8.6c-.4 0-.8.2-1.1.5-.3.3-.5.7-.5 1.1v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8c.4 0 .8-.2 1.1-.5.3-.3.5-.7.5-1.1V6.5L15.5 2z"
									/>
									<path d="M3 7.6v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5H15" />
									<path d="M15 2v5h5" />
								</svg>
								View all {stickerCount.toLocaleString()} stickers from this server
							</a>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Random servers — shown below on smaller screens -->
		{#if randomServers && randomServers.length > 0}
			<div class="mt-10 xl:hidden">
				<h3 class="font-heading text-2xl font-bold mb-2 flex items-center gap-2">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-6 h-6 text-green-500"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
						<polyline points="9 22 9 12 15 12 15 22" />
					</svg>
					More Servers
				</h3>
				<p class="text-muted-foreground text-sm mb-5 font-semibold">
					Discover other communities you might enjoy.
				</p>
				<div class="flex flex-wrap justify-center gap-4">
					{#each randomServers as s}
						<ServerCard server={s} edit={false} />
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- ── Sidebar: random servers — xl screens only ──────────────────────── -->
	{#if randomServers && randomServers.length > 0}
		<aside
			class="hidden xl:flex xl:flex-col gap-4 w-80 shrink-0 sticky top-28 self-start"
			aria-label="Other servers"
		>
			<div class="flex items-center gap-2 px-1">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="w-6 h-6 text-green-500 shrink-0"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
					<polyline points="9 22 9 12 15 12 15 22" />
				</svg>
				<h3 class="font-heading text-lg font-bold leading-tight">More Servers</h3>
			</div>
			<p class="text-muted-foreground text-sm px-1 -mt-2 font-medium">
				Other communities you might enjoy.
			</p>
			{#each randomServers as s}
				<ServerCard server={s} edit={false} />
			{/each}
		</aside>
	{/if}
</div>
