<script lang="ts">
	import { onMount, afterUpdate } from "svelte";
	import { browser } from "$app/environment";
	import getAvatarURL from "$lib/get-avatar-url";
	import BotCard from "$lib/components/BotCard.svelte";
	import ServerCard from "$lib/components/ServerCard.svelte";
	import TwemojiText from "$lib/components/TwemojiText.svelte";
	import SEO from "$lib/components/SEO.svelte";
	import BotComments from "$lib/components/BotComments.svelte";

	export let data: {
		bot: {
			id: string;
			slug: string;
			username: string;
			discriminator: string;
			avatar: string | null;
			short: string;
			desc?: string | null;
			votes: number;
			servers: number;
			invite: string | null;
			bg: string | null;
			support?: string | null;
			website?: string | null;
			source_repo?: string | null;
			donate?: string | null;
			prefix?: string | null;
			lib?: string | null;
			owners?: any;
			badges?: any;
			tags?: string[] | null;
			added_at?: string | null;
			status?: string;
		};
		descHtml: string | null;
		randombots: Array<any>;
		comments: Array<any>;
		relatedServers: Array<{
			id: string;
			name: string;
			short: string;
			icon: string | null;
			votes: number;
			owner: string;
			slug: string;
			promoted: boolean;
			badges: any[];
			added_at: string | null;
			member_count?: number | null;
		}>;
		user: {
			id: string;
			username: string;
			avatar: string | null;
			discriminator?: string;
		} | null;
	};

	// Reactive destructuring — re-runs whenever SvelteKit replaces `data` after
	// a client-side navigation to a different bot ID.
	$: ({ bot, randombots, comments, relatedServers, user } = data);

	// ── iframe sandboxing ─────────────────────────────────────────────────────

	/**
	 * The allowed sandbox tokens for user-supplied iframes.
	 * Notably absent: allow-same-origin, allow-top-navigation, allow-forms, allow-modals.
	 */
	const IFRAME_SANDBOX = "allow-scripts allow-popups";

	/**
	 * Pre-process the server-rendered HTML before inserting it into the DOM:
	 * ensure every <iframe> has a strict sandbox attribute so even if the browser
	 * sees it before the DOM-patch below the attribute is already present.
	 */
	function sanitizeDesc(html: string | null | undefined): string {
		if (!html) return "";
		return html.replace(/<iframe(\s[^>]*)?>/gi, (match, attrs = "") => {
			// Strip any existing sandbox attribute so we control the value entirely.
			const stripped = attrs.replace(/\s+sandbox\s*=\s*(?:"[^"]*"|'[^']*'|\S+)/gi, "");
			return `<iframe${stripped} sandbox="${IFRAME_SANDBOX}">`;
		});
	}

	/** Reference to the long-description container so we can patch the DOM after render. */
	let descEl: HTMLDivElement | null = null;

	/** Walk every iframe in the rendered description and enforce our sandbox. */
	function patchIframes() {
		if (!descEl) return;
		descEl.querySelectorAll("iframe").forEach((frame) => {
			frame.setAttribute("sandbox", IFRAME_SANDBOX);
		});
	}

	$: descHtml = sanitizeDesc(data.descHtml);

	// ── SEO info section helpers ──────────────────────────────────────────────

	/** Friendly label map for known Discord bot libraries */
	const LIB_LABELS: Record<string, string> = {
		"discord.js": "Discord.js (JavaScript/Node.js)",
		"discord.py": "discord.py (Python)",
		discordgo: "DiscordGo (Go)",
		JDA: "JDA (Java)",
		discord4j: "Discord4J (Java/Kotlin)",
		eris: "Eris (JavaScript/Node.js)",
		hikari: "Hikari (Python)",
		serenity: "Serenity (Rust)",
		nextcord: "Nextcord (Python)",
		disnake: "Disnake (Python)",
		pycord: "Pycord (Python)",
		"interactions.py": "interactions.py (Python)",
		discordnet: "Discord.Net (C#)",
		DSharpPlus: "DSharpPlus (C#)",
		nyxx: "Nyxx (Dart)",
		discordrb: "discordrb (Ruby)"
	};

	function friendlyLib(lib: string | null | undefined): string {
		if (!lib) return "";
		return LIB_LABELS[lib] ?? lib;
	}

	/** Turn an ISO date string into a human-readable "Month Year" */
	function formatDate(iso: string | null | undefined): string {
		if (!iso) return "";
		try {
			return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long" });
		} catch {
			return "";
		}
	}

	/** Summarise server count in prose form */
	function serversLabel(n: number): string {
		if (n >= 1_000_000) return `over ${Math.floor(n / 1_000_000)} million Discord servers`;
		if (n >= 1_000)
			return `over ${Math.floor(n / 1_000).toLocaleString()} thousand Discord servers`;
		if (n > 0) return `${n.toLocaleString()} Discord servers`;
		return "many Discord servers";
	}

	/** Build a natural-language prefix sentence */
	function prefixSentence(prefix: string | null | undefined): string {
		if (!prefix || prefix === "/") {
			return `${bot.username} is a slash-command bot and uses Discord's native <code>/</code> command system, meaning all commands appear in Discord's built-in autocomplete menu — no prefix memorisation needed.`;
		}
		return `${bot.username} uses the command prefix <code>${prefix}</code>. Type <code>${prefix}help</code> in any channel the bot has access to for a full list of available commands.`;
	}

	/** Derive SEO tag chips from available data */
	function buildTags(): string[] {
		const t: string[] = [];
		if (bot.tags && Array.isArray(bot.tags)) t.push(...bot.tags);
		if (bot.prefix === "/" || !bot.prefix) t.push("Slash Commands");
		if (bot.lib) t.push(bot.lib);
		if (bot.source_repo) t.push("Open Source");
		if (bot.support) t.push("Support Server");
		if (bot.website) t.push("Official Website");
		// deduplicate case-insensitively
		return [...new Map(t.map((x) => [x.toLowerCase(), x])).values()];
	}

	$: seoTags = bot && buildTags();
	$: addedDate = formatDate(bot.added_at);
	$: libFriendly = friendlyLib(bot.lib);

	function approx(n: number | null | undefined): string {
		if (n == null || isNaN(Number(n))) return "0";
		const num = Number(n);
		if (num >= 1_000_000) return (num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1) + "M";
		if (num >= 1_000) return (num / 1_000).toFixed(num % 1_000 === 0 ? 0 : 1) + "k";
		return String(num);
	}

	function resolveBg(bg: string | null | undefined, id: string): string | null {
		if (!bg) return null;
		if (bg.startsWith("http")) return bg;
		return `https://cdn.discordapp.com/banners/${id}/${bg}.webp?size=1024`;
	}

	$: bgUrl = resolveBg(bot.bg, bot.id);

	$: avatarSrc = (() => {
		if (!bot.avatar || bot.avatar === "0") return getAvatarURL(bot.id, bot.avatar ?? "0");
		return getAvatarURL(bot.id, bot.avatar, 128).replace(".png", ".webp");
	})();

	let bgImgRef: HTMLImageElement | null = null;
	let avatarImgRef: HTMLImageElement | null = null;
	let gradientColor: [number, number, number] | null = null;

	// Reset per-bot transient state whenever the bot changes so a navigation to
	// a different bot doesn't show the previous bot's accent colour or skip the
	// image-refresh guard.
	$: if (bot) {
		gradientColor = null;
		refreshDispatched = false;
	}

	// Lazily-loaded ColorThief instance — created once, reused.
	let colorThief: { getColor: (img: HTMLImageElement) => [number, number, number] } | null = null;

	onMount(() => {
		patchIframes();
	});

	afterUpdate(() => {
		patchIframes();
	});

	async function ensureColorThief() {
		if (colorThief) return colorThief;
		try {
			const { default: CT } = await import("colorthief");
			colorThief = new (CT as any)();
		} catch {
			// colorthief unavailable (e.g. SSR or bundling issue)
		}
		return colorThief;
	}

	function extractColor(img: HTMLImageElement) {
		if (!colorThief) return;
		try {
			// naturalWidth === 0 means the image hasn't loaded yet or failed
			if (!img.naturalWidth) return;
			const c = colorThief.getColor(img);
			if (Array.isArray(c) && c.length === 3) gradientColor = c as [number, number, number];
		} catch {
			// Cross-origin or decode error — silently skip
		}
	}

	// Called every time bgImgRef is bound/rebound by Svelte.
	// Svelte calls use:* actions on mount; we use a plain action here so the
	// callback fires synchronously after the element is inserted into the DOM,
	// avoiding the race condition that existed with onMount.
	function colorThiefAction(node: HTMLImageElement) {
		ensureColorThief().then(() => {
			if (node.complete && node.naturalWidth) {
				extractColor(node);
			} else {
				node.addEventListener("load", () => extractColor(node), { once: true });
			}
		});
		return {};
	}

	// Svelte action applied to the avatar <img>. We always bind this so that
	// if the bg image is absent or fails, we can still extract a colour from
	// the avatar as a fallback.
	function avatarColorThiefAction(node: HTMLImageElement) {
		avatarImgRef = node;
		// If there is no bg image at all, extract from the avatar immediately.
		if (!bgUrl) {
			ensureColorThief().then(() => {
				if (node.complete && node.naturalWidth) {
					extractColor(node);
				} else {
					node.addEventListener("load", () => extractColor(node), { once: true });
				}
			});
		}
		return {
			destroy() {
				avatarImgRef = null;
			}
		};
	}

	/**
	 * Called when the bg/banner image fails to load.
	 * - If the URL is a Discord CDN image, delegate to handleImageError so the
	 *   server is asked to refresh the bot's data.
	 * - Regardless of origin, fall back to extracting the accent colour from
	 *   the already-loaded avatar image instead, so the gradient still works.
	 */
	function handleBgError(event: Event) {
		const target = event.target as HTMLImageElement;
		const src = target?.src ?? "";

		const isDiscordImage =
			src.startsWith("https://cdn.discordapp.com/") ||
			src.startsWith("https://media.discordapp.net/");

		// Only ping the server for actual Discord CDN images (stale hash etc.)
		if (isDiscordImage) {
			handleImageError(event);
		}

		// Fall back to avatar for colour extraction regardless of origin.
		if (!gradientColor && avatarImgRef) {
			ensureColorThief().then(() => {
				if (!gradientColor && avatarImgRef) {
					if (avatarImgRef.complete && avatarImgRef.naturalWidth) {
						extractColor(avatarImgRef);
					} else {
						avatarImgRef.addEventListener("load", () => extractColor(avatarImgRef!), {
							once: true
						});
					}
				}
			});
		}
	}

	$: gc = gradientColor;
	$: borderStyle = gc ? `border-color: rgba(${gc[0]},${gc[1]},${gc[2]},0.3);` : "";
	// Gradient overlay applied to the content area below the banner, matching old behaviour.
	// Uses a subtle tinted-to-transparent gradient so the dominant colour bleeds through.
	$: gradientOverlayStyle = gc
		? `background: linear-gradient(to bottom, rgba(${gc[0]},${gc[1]},${gc[2]},0.18) 0%, rgba(${gc[0]},${gc[1]},${gc[2]},0.06) 40%, transparent 100%);`
		: "";

	function supportUrl(support: string | null | undefined): string | null {
		if (!support) return null;
		if (support.startsWith("http")) return support;
		return `https://discord.gg/${support}`;
	}

	// ---------------------------------------------------------------------------
	// Image error → bot refresh
	// ---------------------------------------------------------------------------

	/**
	 * Called when any bot image (bg banner or avatar) fails to load with a Discord CDN URL.
	 * Fires a background POST to the public report-broken-image route, which runs the
	 * refresh logic server-side (with the INTERNAL_SECRET kept on the server, never
	 * exposed to the client).
	 *
	 * We only dispatch once per page view to avoid hammering the endpoint when
	 * multiple images fail simultaneously (e.g. both avatar and banner are stale).
	 */
	let refreshDispatched = false; // reset reactively above when bot changes

	function handleImageError(event: Event) {
		// Only run client-side, only once per page view.
		if (!browser || refreshDispatched) return;

		const target = event.target as HTMLImageElement;
		const src = target?.src ?? "";

		// Only trigger a refresh for Discord CDN images — external images that
		// happen to 404 should not cause a bot refresh.
		const isDiscordImage =
			src.startsWith("https://cdn.discordapp.com/") ||
			src.startsWith("https://media.discordapp.net/");

		if (!isDiscordImage) return;

		refreshDispatched = true;
		console.debug("[bot-page] Discord image load error, queuing refresh for bot", bot.id);

		// POST to the public proxy route — the server adds the INTERNAL_SECRET
		// before forwarding to /api/internals/refresh-bot/[id], so no secret
		// is ever exposed in the browser.
		fetch(`/api/bots/${encodeURIComponent(bot.id)}/refresh`, {
			method: "POST",
			headers: { "Content-Type": "application/json" }
		})
			.then(async (res) => {
				const body = await res.json().catch(() => ({}));
				if (!res.ok) {
					console.warn("[bot-page] Refresh request failed:", res.status, body);
				} else {
					console.debug("[bot-page] Refresh response:", body);
					if (body.updated) {
						// soft reload the page to fetch new images — this won't cause a full reload if the data hasn't changed.
						location.reload();
					} else {
						console.debug("[bot-page] Bot data is already up to date, no reload needed.");
					}
				}
			})
			.catch((err) => {
				// Network errors are entirely non-fatal — best-effort only.
				console.debug("[bot-page] Refresh request network error (non-fatal):", err);
			});
	}
</script>

<SEO
	title="{bot.username}#{bot.discriminator} Discord Bot"
	description="{bot.username} is in {approx(
		bot.servers
	).toUpperCase()} servers. Add it today! {bot.short}"
	image={bgUrl}
	imageSmall={avatarSrc}
/>

<!--
	Outer two-column layout on xl+:
	  left  → bot detail card (grows to fill)
	  right → sticky recommendations sidebar
	Stacked on anything below xl.
-->
<div class="flex flex-col xl:flex-row xl:items-start gap-6 p-4">
	<!-- ── LEFT: bot detail ─────────────────────────────────────── -->
	<div class="min-w-0 flex-1">
		<div class="bg-card rounded-lg overflow-hidden">
			<!-- Banner -->
			<div
				class="relative flex flex-col items-center rounded-t-lg h-72 overflow-hidden"
				style={bgUrl
					? `background-image: url('${bgUrl}'); background-size: cover; background-position: center;`
					: gc
						? `background-color: rgb(${gc[0]},${gc[1]},${gc[2]});`
						: "background: linear-gradient(135deg, hsl(var(--color-primary) / 0.2), hsl(var(--color-muted)));"}
			>
				{#if bgUrl}
					<!--
							Hidden image solely for ColorThief to read pixel data from.
							- crossorigin="anonymous" is required for canvas access (ColorThief uses a canvas internally).
							- use:colorThiefAction fires after the element is in the DOM, eliminating the
							  onMount timing race where bgImgRef was null when the callback ran.
							- opacity-0 + pointer-events-none keeps it invisible but fully decoded.
						-->
					<img
						use:colorThiefAction
						src={bgUrl}
						crossorigin="anonymous"
						width="1"
						height="1"
						class="opacity-0 pointer-events-none absolute w-px h-px"
						aria-hidden="true"
						alt=""
						on:error={handleBgError}
					/>
				{/if}
			</div>

			<!-- Body: 3-col info grid — gradient overlay matches dominant banner colour -->
			<div class="grid grid-cols-1 md:grid-cols-4 gap-6 p-4" style={gradientOverlayStyle}>
				<!-- Description column (spans 3) -->
				<div
					class="flex flex-col min-w-0 md:col-span-3 px-2 pb-8 border-b-2 md:border-b-0 md:border-r-2"
					style={borderStyle}
				>
					<!-- Avatar -->
					<img
						use:avatarColorThiefAction
						src={avatarSrc}
						loading="lazy"
						crossorigin="anonymous"
						class="w-36 h-36 rounded-full bg-card border-card border-8 mt-[-5.3rem] mb-4 shadow-xl z-10"
						alt="{bot.username}'s Avatar"
						on:error={handleImageError}
					/>

					<!-- Name -->
					<h1 class="text-3xl md:text-5xl font-heading text-center md:text-start my-4 font-black">
						{bot.username}
						<span class="text-muted-foreground text-lg mx-2 font-bold">#{bot.discriminator}</span>
					</h1>

					<!-- Short description -->
					<div class="border-b-2 pb-4 text-lg text-muted-foreground" style={borderStyle}>
						<TwemojiText>{bot.short}</TwemojiText>
					</div>

					<!-- Long description (markdown rendered to HTML server-side) -->
					{#if descHtml}
						<div
							bind:this={descEl}
							class="mt-6 w-full min-w-0 prose prose-sm sm:prose md:prose-base lg:prose-lg dark:prose-invert max-w-none
													prose-headings:font-heading prose-headings:scroll-mt-20
													prose-h1:text-3xl prose-h1:font-black prose-h1:mb-2 prose-h1:pb-4 prose-h1:border-b prose-h1:border-border
													prose-h2:text-xl prose-h2:font-bold prose-h2:mt-10 prose-h2:mb-4 prose-h2:pt-4
													prose-h3:text-base prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-3
													prose-code:before:content-[''] prose-code:after:content-['']
													prose-code:bg-muted prose-code:text-foreground prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:font-mono
													prose-pre:bg-card prose-pre:border prose-pre:border-border prose-pre:rounded-xl prose-pre:shadow-sm
													prose-pre:code:bg-transparent prose-pre:code:p-0
													prose-table:border-collapse prose-table:w-full prose-table:text-sm
													prose-th:bg-muted/50 prose-th:px-4 prose-th:py-2.5 prose-th:text-left prose-th:font-semibold prose-th:text-foreground
													prose-td:px-4 prose-td:py-2.5 prose-td:border-b prose-td:border-border
													prose-tr:hover:bg-accent/30
													prose-a:text-primary prose-a:no-underline hover:prose-a:underline
													prose-blockquote:border-l-primary/50 prose-blockquote:bg-primary/5 prose-blockquote:rounded-r-lg prose-blockquote:py-1
													prose-hr:border-border"
						>
							{@html descHtml}
						</div>
					{/if}

					<!-- ── Dynamically generated SEO info section ──────────────── -->
					<div class="mt-8 border-t border-border/50 pt-8" aria-label="Bot details">
						<h2 class="text-xl font-bold font-heading mb-5 text-foreground">
							About {bot.username}
						</h2>

						<!-- Overview paragraph -->
						<p class="text-muted-foreground text-base leading-relaxed mb-6">
							<strong class="text-foreground">{bot.username}</strong> is a Discord bot currently
							active in {serversLabel(bot.servers)}, with
							<strong class="text-foreground"
								>{(bot.votes ?? 0).toLocaleString()} community votes</strong
							>
							on Rovel Discord List.
							{#if bot.short}
								{bot.short.replace(/[#*_~`]/g, "")}
							{/if}
							{#if addedDate}
								It was listed on Rovel Discord List in <strong class="text-foreground"
									>{addedDate}</strong
								>.
							{/if}
						</p>

						<!-- Stats grid -->
						<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
							<div
								class="rounded-xl bg-muted/40 border border-border px-4 py-3 flex flex-col items-center text-center"
							>
								<span class="text-2xl font-black text-foreground leading-none"
									>{approx(bot.servers)}</span
								>
								<span class="text-xs text-muted-foreground font-medium mt-1">Servers</span>
							</div>
							<div
								class="rounded-xl bg-muted/40 border border-border px-4 py-3 flex flex-col items-center text-center"
							>
								<span class="text-2xl font-black text-foreground leading-none"
									>{approx(bot.votes)}</span
								>
								<span class="text-xs text-muted-foreground font-medium mt-1">Votes</span>
							</div>
							<div
								class="rounded-xl bg-muted/40 border border-border px-4 py-3 flex flex-col items-center text-center"
							>
								<span class="text-2xl font-black text-foreground leading-none truncate max-w-full">
									{#if bot.prefix === "/" || !bot.prefix}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="w-6 h-6 mx-auto text-primary/80"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											><path d="M7 8l-4 4 4 4" /><path d="M17 8l4 4-4 4" /><path
												d="M14 4l-4 16"
											/></svg
										>
									{:else}
										{bot.prefix}
									{/if}
								</span>
								<span class="text-xs text-muted-foreground font-medium mt-1">Prefix</span>
							</div>
							<div
								class="rounded-xl bg-muted/40 border border-border px-4 py-3 flex flex-col items-center text-center"
							>
								{#if bot.lib}
									<span class="text-sm font-bold text-foreground leading-none break-all"
										>{bot.lib}</span
									>
								{:else}
									<span class="text-sm font-bold text-muted-foreground leading-none">—</span>
								{/if}
								<span class="text-xs text-muted-foreground font-medium mt-1">Library</span>
							</div>
						</div>

						<!-- Commands / prefix detail -->
						<div class="mb-6">
							<h3 class="text-base font-semibold text-foreground mb-2">
								How to use {bot.username}
							</h3>
							<p class="text-muted-foreground text-sm leading-relaxed">
								{@html prefixSentence(bot.prefix)}
								{#if bot.support}
									For live help, join the <a
										href={bot.support.startsWith("http")
											? bot.support
											: `https://discord.gg/${bot.support}`}
										rel="noopener noreferrer"
										target="_blank"
										class="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
										>official support server</a
									>.
								{/if}
							</p>
						</div>

						<!-- Technical details -->
						{#if bot.lib || bot.source_repo || bot.website}
							<div class="mb-6">
								<h3 class="text-base font-semibold text-foreground mb-2">Technical details</h3>
								<ul class="text-sm text-muted-foreground space-y-1.5 leading-relaxed list-none">
									{#if libFriendly}
										<li class="flex items-start gap-2">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="w-4 h-4 mt-0.5 text-primary/70 shrink-0"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
												><polyline points="16 18 22 12 16 6" /><polyline
													points="8 6 2 12 8 18"
												/></svg
											>
											<span><strong class="text-foreground">Library:</strong> {libFriendly}</span>
										</li>
									{/if}
									{#if bot.source_repo}
										<li class="flex items-start gap-2">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="w-4 h-4 mt-0.5 text-primary/70 shrink-0"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
												><path
													d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"
												/><path d="M9 18c-4.51 2-5-2-7-2" /></svg
											>
											<span
												><strong class="text-foreground">Source code:</strong>
												<a
													href={bot.source_repo}
													target="_blank"
													rel="noopener noreferrer"
													class="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
													>{bot.source_repo}</a
												></span
											>
										</li>
									{/if}
									{#if bot.website}
										<li class="flex items-start gap-2">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="w-4 h-4 mt-0.5 text-primary/70 shrink-0"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
												><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path
													d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
												/></svg
											>
											<span
												><strong class="text-foreground">Official website:</strong>
												<a
													href={bot.website}
													target="_blank"
													rel="noopener noreferrer"
													class="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
													>{bot.website}</a
												></span
											>
										</li>
									{/if}
									<li class="flex items-start gap-2">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="w-4 h-4 mt-0.5 text-primary/70 shrink-0"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M8 12h8" /><path
												d="M12 8v8"
											/></svg
										>
										<span
											><strong class="text-foreground">Bot ID:</strong>
											<code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground"
												>{bot.id}</code
											></span
										>
									</li>
								</ul>
							</div>
						{/if}

						<!-- Tags / categories -->
						{#if seoTags.length > 0}
							<div class="mb-6">
								<h3 class="text-base font-semibold text-foreground mb-2">
									Categories &amp; features
								</h3>
								<div class="flex flex-wrap gap-2" aria-label="Bot tags">
									{#each seoTags as tag (tag)}
										<span
											class="inline-flex items-center px-3 py-1 rounded-full bg-muted/60 border border-border text-xs font-semibold text-foreground/80 hover:bg-muted transition-colors"
										>
											{tag}
										</span>
									{/each}
								</div>
							</div>
						{/if}

						<!-- FAQ / Q&A block — great for featured snippets -->
						<div class="mb-2">
							<h3 class="text-base font-semibold text-foreground mb-3">
								Frequently asked questions
							</h3>
							<dl class="space-y-4">
								<div class="rounded-xl bg-muted/30 border border-border px-4 py-3">
									<dt class="font-semibold text-sm text-foreground mb-1">
										How do I add {bot.username} to my Discord server?
									</dt>
									<dd class="text-sm text-muted-foreground leading-relaxed">
										Click the <strong>Add to Server</strong> button at the top of this page to open
										Discord's official authorisation flow. Select the server you want to add {bot.username}
										to, grant the requested permissions, and the bot will join immediately.
										{#if bot.invite}
											You can also use its direct invite link: <a
												href={bot.invite}
												target="_blank"
												rel="noopener noreferrer"
												class="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
												>invite {bot.username}</a
											>.
										{/if}
									</dd>
								</div>

								<div class="rounded-xl bg-muted/30 border border-border px-4 py-3">
									<dt class="font-semibold text-sm text-foreground mb-1">
										How many Discord servers is {bot.username} in?
									</dt>
									<dd class="text-sm text-muted-foreground leading-relaxed">
										{bot.username} is currently active in {serversLabel(bot.servers)}, making it one
										of the bots listed on Rovel Discord List. Server counts update periodically as
										the bot grows.
									</dd>
								</div>

								<div class="rounded-xl bg-muted/30 border border-border px-4 py-3">
									<dt class="font-semibold text-sm text-foreground mb-1">
										{#if bot.prefix === "/" || !bot.prefix}
											Does {bot.username} support slash commands?
										{:else}
											What is {bot.username}'s command prefix?
										{/if}
									</dt>
									<dd class="text-sm text-muted-foreground leading-relaxed">
										{@html prefixSentence(bot.prefix)}
									</dd>
								</div>

								{#if bot.support}
									<div class="rounded-xl bg-muted/30 border border-border px-4 py-3">
										<dt class="font-semibold text-sm text-foreground mb-1">
											Where can I get support for {bot.username}?
										</dt>
										<dd class="text-sm text-muted-foreground leading-relaxed">
											The developers of {bot.username} maintain an official support server on Discord.
											You can join via the
											<a
												href={bot.support.startsWith("http")
													? bot.support
													: `https://discord.gg/${bot.support}`}
												target="_blank"
												rel="noopener noreferrer"
												class="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
												>support server link</a
											> to ask questions, report bugs, or suggest features.
										</dd>
									</div>
								{/if}

								<div class="rounded-xl bg-muted/30 border border-border px-4 py-3">
									<dt class="font-semibold text-sm text-foreground mb-1">
										How do I vote for {bot.username}?
									</dt>
									<dd class="text-sm text-muted-foreground leading-relaxed">
										Click the <strong>Upvote</strong> button on this page. You can vote once every
										12 hours. Votes help {bot.username} rank higher on Rovel Discord List, increasing
										its visibility to other server owners looking for bots. It currently has
										<strong class="text-foreground"
											>{(bot.votes ?? 0).toLocaleString()} votes</strong
										>.
									</dd>
								</div>

								{#if bot.source_repo}
									<div class="rounded-xl bg-muted/30 border border-border px-4 py-3">
										<dt class="font-semibold text-sm text-foreground mb-1">
											Is {bot.username} open source?
										</dt>
										<dd class="text-sm text-muted-foreground leading-relaxed">
											Yes — {bot.username} is open source. You can browse, fork, or contribute to its
											source code on
											<a
												href={bot.source_repo}
												target="_blank"
												rel="noopener noreferrer"
												class="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
												>its repository</a
											>.
										</dd>
									</div>
								{/if}
							</dl>
						</div>
					</div>
					<!-- ── End SEO info section ─────────────────────────────────── -->
				</div>

				<!-- Stats / actions sidebar (spans 1) -->
				<div class="flex flex-col gap-4 mt-4 md:mt-0">
					<!-- Stat pills -->
					<div class="grid grid-cols-2 gap-2">
						<div
							class="flex flex-col items-center justify-center gap-0.5 rounded-lg bg-muted/50 border border-border px-3 py-3"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-5 h-5 mb-1 text-primary/80"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<circle cx="12" cy="12" r="10" />
								<polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
							</svg>
							<span class="text-xl font-black text-foreground leading-none"
								>{approx(bot.servers)}</span
							>
							<span class="text-xs text-muted-foreground font-medium mt-0.5">Servers</span>
						</div>
						<div
							class="flex flex-col items-center justify-center gap-0.5 rounded-lg bg-muted/50 border border-border px-3 py-3"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-5 h-5 mb-1 text-green-500/80"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path d="m18 15-6-6-6 6" />
							</svg>
							<span class="text-xl font-black text-foreground leading-none"
								>{approx(bot.votes)}</span
							>
							<span class="text-xs text-muted-foreground font-medium mt-0.5">Votes</span>
						</div>
					</div>

					<!-- Invite + Vote buttons -->
					<div class="flex flex-col gap-2">
						{#if bot.invite}
							<div class="relative">
								<button
									class="inline-flex items-center justify-center gap-2 w-full rounded-lg text-sm font-semibold bg-primary text-primary-foreground px-4 py-2.5 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm cursor-pointer"
									on:click={() => {
										const el = document.getElementById(`invite-menu-${bot.id}`);
										if (el) el.classList.toggle("hidden");
									}}
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
										<path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" />
										<path d="m21 3-9 9" /><path d="M15 3h6v6" />
									</svg>
									Add to Server
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-3.5 h-3.5 ml-auto opacity-70"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2.5"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path d="m6 9 6 6 6-6" />
									</svg>
								</button>
								<div
									id="invite-menu-{bot.id}"
									class="hidden absolute left-0 right-0 mt-1 z-20 bg-card border border-border rounded-lg shadow-xl overflow-hidden"
								>
									<p
										class="px-3 pt-2.5 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
									>
										Choose invite type
									</p>
									<a
										href={bot.invite}
										target="_blank"
										rel="noopener noreferrer"
										class="flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="w-4 h-4 text-primary shrink-0"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" /><path
												d="m21 3-9 9"
											/><path d="M15 3h6v6" />
										</svg>
										Original Invite
									</a>
									<a
										href="https://discord.com/oauth2/authorize?scope=bot+applications.commands&permissions=0&client_id={bot.id}"
										target="_blank"
										rel="noopener noreferrer"
										class="flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-accent transition-colors border-t border-border/50"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="w-4 h-4 text-muted-foreground shrink-0"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path
												d="M7 11V7a5 5 0 0 1 10 0v4"
											/>
										</svg>
										No Permissions
									</a>
								</div>
							</div>
						{/if}

						<a
							href="/bots/{bot.slug}/vote"
							class="inline-flex items-center justify-center gap-2 w-full rounded-lg text-sm font-semibold border border-border bg-muted/40 px-4 py-2.5 hover:bg-muted hover:border-primary/40 active:scale-[0.98] transition-all"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-4 h-4 text-green-500"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path d="m18 15-6-6-6 6" />
							</svg>
							Upvote
						</a>
					</div>

					<!-- Links section -->
					{#if bot.website || bot.source_repo || bot.support}
						<div class="flex flex-col gap-1 border-t border-border pt-4">
							<p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
								Links
							</p>

							{#if bot.website}
								<a
									href={bot.website}
									target="_blank"
									rel="noopener noreferrer"
									class="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted border border-transparent hover:border-border text-sm font-medium text-foreground transition-all group"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<circle cx="12" cy="12" r="10" /><path d="M2 12h20" />
										<path
											d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
										/>
									</svg>
									Website
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-3 h-3 ml-auto text-muted-foreground/50 group-hover:text-muted-foreground transition-colors"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline
											points="15 3 21 3 21 9"
										/><line x1="10" x2="21" y1="14" y2="3" />
									</svg>
								</a>
							{/if}

							{#if bot.source_repo}
								<a
									href={bot.source_repo}
									target="_blank"
									rel="noopener noreferrer"
									class="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted border border-transparent hover:border-border text-sm font-medium text-foreground transition-all group"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path
											d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"
										/>
										<path d="M9 18c-4.51 2-5-2-7-2" />
									</svg>
									GitHub
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-3 h-3 ml-auto text-muted-foreground/50 group-hover:text-muted-foreground transition-colors"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline
											points="15 3 21 3 21 9"
										/><line x1="10" x2="21" y1="14" y2="3" />
									</svg>
								</a>
							{/if}

							{#if bot.support}
								<a
									href={supportUrl(bot.support)}
									target="_blank"
									rel="noopener noreferrer"
									class="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#5865F2]/10 hover:bg-[#5865F2]/20 border border-transparent hover:border-[#5865F2]/30 text-sm font-medium text-foreground transition-all group"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-4 h-4 text-[#5865F2] shrink-0"
										viewBox="0 0 24 24"
										fill="currentColor"
									>
										<path
											d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.003.02.014.04.03.05a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
										/>
									</svg>
									Support Server
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-3 h-3 ml-auto text-[#5865F2]/40 group-hover:text-[#5865F2]/70 transition-colors"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline
											points="15 3 21 3 21 9"
										/><line x1="10" x2="21" y1="14" y2="3" />
									</svg>
								</a>
							{/if}
						</div>
					{/if}

					<!-- Prefix / Library info block -->
					{#if bot.prefix || bot.lib}
						<div class="flex flex-col gap-2 border-t border-border pt-4">
							<p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
								Info
							</p>
							{#if bot.prefix}
								<div
									class="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 border border-border/50"
								>
									<span class="text-xs text-muted-foreground font-medium">Prefix</span>
									<code
										class="text-xs bg-background border border-border px-2 py-0.5 rounded font-mono text-foreground"
										>{bot.prefix}</code
									>
								</div>
							{/if}
							{#if bot.lib}
								<div
									class="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 border border-border/50"
								>
									<span class="text-xs text-muted-foreground font-medium">Library</span>
									<span class="text-xs font-semibold text-foreground">{bot.lib}</span>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- ── Reviews & Comments ─────────────────────────────────────────────── -->
		<div class="mt-6 bg-card rounded-lg px-6 py-2 shadow-sm">
			<BotComments {comments} {user} botId={bot.id} owners={bot.owners ?? []} />
		</div>

		<!-- ── In These Servers ───────────────────────────────────────────────── -->
		{#if relatedServers && relatedServers.length > 0}
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
							<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
							<polyline points="9 22 9 12 15 12 15 22" />
						</svg>
					</div>
					<div>
						<h2 class="text-base font-bold font-heading leading-none">
							{bot.username} is in these servers
						</h2>
						<p class="text-xs text-muted-foreground mt-0.5">
							Servers managed by this bot's owners, sorted by member count
						</p>
					</div>
				</div>
				<div class="p-4 flex flex-wrap justify-center gap-4">
					{#each relatedServers as s (s.id)}
						<ServerCard server={s} edit={false} />
					{/each}
				</div>
			</div>
		{/if}

		<!-- You Might Also Like — mobile only (below the card, visible only on < xl) -->
		{#if randombots && randombots.length > 0}
			<div class="mt-10 xl:hidden">
				<h3 class="font-heading text-3xl font-bold mb-2 flex items-center gap-2">
					<img alt="" src="/assets/img/mostvote.svg" class="w-7 h-7 -mt-1" />
					You Might Also Like
				</h3>
				<p class="text-muted-foreground text-base mb-6 font-semibold">
					Discover related Discord bots that offer comparable features or serve similar purposes.
				</p>
				<div class="flex flex-wrap justify-center gap-4">
					{#each randombots as rbot}
						<BotCard bot={rbot} edit={false} />
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- ── RIGHT: sticky recommendations sidebar (desktop only) ─── -->
	{#if randombots && randombots.length > 0}
		<aside
			class="hidden xl:flex flex-col gap-4 w-104 shrink-0 sticky top-28 self-start max-h-[calc(100vh-8rem)] overflow-y-auto pb-4 pr-1"
		>
			<div class="flex items-center gap-2 px-1">
				<img alt="" src="/assets/img/mostvote.svg" class="w-7 h-7 shrink-0" />
				<h3 class="font-heading text-xl font-bold leading-tight">You Might Also Like</h3>
			</div>
			<p class="text-muted-foreground text-sm px-1 -mt-2 font-medium">
				Discover related bots for your server.
			</p>

			{#each randombots as rbot}
				<BotCard bot={rbot} edit={false} />
			{/each}
		</aside>
	{/if}
</div>
