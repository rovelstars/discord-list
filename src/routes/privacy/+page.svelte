<script lang="ts">
	import SEO from '$lib/components/SEO.svelte';

	const lastUpdated = 'March 1, 2026';
	const email = 'support@rovelstars.com';
	const siteName = 'Rovel Discord List';
	const siteUrl = 'https://discord.rovelstars.com';
</script>

<SEO
	title="Privacy Policy"
	description="Read the Rovel Discord List Privacy Policy to understand how we collect, use, and protect your data."
	imageSmall="/assets/img/bot/logo-512.png"
/>

<!-- ── Hero ──────────────────────────────────────────────────────────────── -->
<section class="relative overflow-hidden border-b border-border bg-card pt-32 -mt-28">
	<div
		class="pointer-events-none absolute -top-32 -left-32 w-lg h-128 rounded-full bg-primary/10 blur-3xl"
	></div>
	<div class="relative max-w-4xl mx-auto px-4 py-16 text-center">
		<div
			class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20 mb-6"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="w-3.5 h-3.5"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
			</svg>
			Privacy Policy
		</div>
		<h1 class="text-4xl md:text-5xl font-extrabold font-heading leading-tight mb-4">
			Your privacy matters
		</h1>
		<p class="text-muted-foreground max-w-xl mx-auto leading-relaxed">
			We keep it simple. Here's exactly what data we collect, why we collect it, and how you can
			control it.
		</p>
		<p class="text-xs text-muted-foreground mt-4">Last updated: {lastUpdated}</p>
	</div>
</section>

<!-- ── Quick summary cards ───────────────────────────────────────────────── -->
<section class="border-b border-border bg-background">
	<div class="max-w-4xl mx-auto px-4 py-10">
		<div class="grid sm:grid-cols-3 gap-4">
			<div class="bg-card border border-border rounded-2xl p-5">
				<div class="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center mb-3">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-5 h-5 text-green-500"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<polyline points="20 6 9 17 4 12" />
					</svg>
				</div>
				<p class="font-bold text-sm mb-1">We don't sell your data</p>
				<p class="text-xs text-muted-foreground leading-relaxed">
					Your personal information is never sold, rented, or traded to third parties. Full stop.
				</p>
			</div>
			<div class="bg-card border border-border rounded-2xl p-5">
				<div class="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-5 h-5 text-blue-500"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line
							x1="12"
							y1="16"
							x2="12.01"
							y2="16"
						/>
					</svg>
				</div>
				<p class="font-bold text-sm mb-1">Minimal collection</p>
				<p class="text-xs text-muted-foreground leading-relaxed">
					We only collect what's necessary to provide the service — your Discord profile data.
				</p>
			</div>
			<div class="bg-card border border-border rounded-2xl p-5">
				<div class="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-5 h-5 text-primary"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
					</svg>
				</div>
				<p class="font-bold text-sm mb-1">You're in control</p>
				<p class="text-xs text-muted-foreground leading-relaxed">
					You can request deletion of your account and all associated data at any time.
				</p>
			</div>
		</div>
	</div>
</section>

<!-- ── Body ──────────────────────────────────────────────────────────────── -->
<section class="max-w-4xl mx-auto px-4 py-14">
	<div class="grid md:grid-cols-4 gap-10">
		<!-- Sticky TOC -->
		<aside class="hidden md:block md:col-span-1">
			<div class="sticky top-8 bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
				<div class="px-4 py-3 border-b border-border">
					<p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
						Contents
					</p>
				</div>
				<nav class="p-2">
					{#each [['#who-we-are', 'Who We Are'], ['#data-we-collect', 'Data We Collect'], ['#how-we-use-data', 'How We Use It'], ['#data-sharing', 'Data Sharing'], ['#cookies', 'Cookies'], ['#data-retention', 'Data Retention'], ['#your-rights', 'Your Rights'], ['#childrens-privacy', "Children's Privacy"], ['#changes', 'Policy Changes'], ['#contact', 'Contact Us']] as [href, label]}
						<a
							{href}
							class="block px-3 py-2 rounded-xl text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
						>
							{label}
						</a>
					{/each}
				</nav>
			</div>
		</aside>

		<!-- Content -->
		<div class="md:col-span-3 space-y-12">
			<!-- ── Section helper component emulated inline ── -->
			<!-- 1. Who We Are -->
			<div id="who-we-are" class="scroll-mt-28">
				<div class="flex items-center gap-3 mb-4">
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
							<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline
								points="9 22 9 12 15 12 15 22"
							/>
						</svg>
					</div>
					<h2 class="text-xl font-bold font-heading">Who We Are</h2>
				</div>
				<div class="text-muted-foreground leading-relaxed space-y-3 text-sm">
					<p>
						<strong class="text-foreground">{siteName}</strong> ("{siteName}", "we", "us", or "our")
						is a Discord bot discovery platform operated by Rovel Stars™. Our service is accessible
						at
						<a href={siteUrl} class="text-primary hover:underline">{siteUrl}</a>.
					</p>
					<p>
						This Privacy Policy explains how we collect, use, disclose, and safeguard your
						information when you visit our website or use our services. Please read it carefully.
					</p>
				</div>
			</div>

			<hr class="border-border" />

			<!-- 2. Data We Collect -->
			<div id="data-we-collect" class="scroll-mt-28">
				<div class="flex items-center gap-3 mb-4">
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
							<ellipse cx="12" cy="5" rx="9" ry="3" /><path
								d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"
							/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
						</svg>
					</div>
					<h2 class="text-xl font-bold font-heading">Data We Collect</h2>
				</div>
				<div class="text-muted-foreground leading-relaxed space-y-4 text-sm">
					<p>We collect information in the following ways:</p>

					<div class="bg-card border border-border rounded-2xl overflow-hidden">
						<div class="px-5 py-3 border-b border-border bg-muted/30">
							<p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								Via Discord OAuth2 Login
							</p>
						</div>
						<ul class="divide-y divide-border">
							{#each [['Discord User ID', 'Used as your unique identifier across our platform.'], ['Username & Discriminator', 'Displayed on your public profile and dashboard.'], ['Global Display Name', 'Your chosen display name shown across the site.'], ['Avatar Hash', "Used to load your profile picture from Discord's CDN."], ['Email Address', 'Optionally provided by Discord; used only for account support.'], ['Nitro Status', 'Used to display a Nitro badge on your profile.']] as [field, note]}
								<li class="px-5 py-3 flex items-start gap-3">
									<span class="font-semibold text-foreground shrink-0 w-44">{field}</span>
									<span>{note}</span>
								</li>
							{/each}
						</ul>
					</div>

					<div class="bg-card border border-border rounded-2xl overflow-hidden">
						<div class="px-5 py-3 border-b border-border bg-muted/30">
							<p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								Data You Provide Voluntarily
							</p>
						</div>
						<ul class="divide-y divide-border">
							{#each [['Profile Bio', 'A short description shown on your public profile page.'], ['Banner URL', 'An image URL used as your profile banner.'], ['Bot Listings', 'All information submitted when listing a bot (name, description, invite link, etc.).']] as [field, note]}
								<li class="px-5 py-3 flex items-start gap-3">
									<span class="font-semibold text-foreground shrink-0 w-44">{field}</span>
									<span>{note}</span>
								</li>
							{/each}
						</ul>
					</div>

					<div class="bg-card border border-border rounded-2xl overflow-hidden">
						<div class="px-5 py-3 border-b border-border bg-muted/30">
							<p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								Automatically Collected
							</p>
						</div>
						<ul class="divide-y divide-border">
							{#each [['Vote History', 'Timestamps and bot IDs for votes you cast, used for rewards and leaderboards.'], ['Session Cookie', 'A secure HTTP-only cookie storing your OAuth access token to keep you logged in.'], ['Standard Server Logs', 'IP address, browser type, referring URL, and pages visited. Retained for up to 30 days for security purposes.']] as [field, note]}
								<li class="px-5 py-3 flex items-start gap-3">
									<span class="font-semibold text-foreground shrink-0 w-44">{field}</span>
									<span>{note}</span>
								</li>
							{/each}
						</ul>
					</div>
				</div>
			</div>

			<hr class="border-border" />

			<!-- 3. How We Use It -->
			<div id="how-we-use-data" class="scroll-mt-28">
				<div class="flex items-center gap-3 mb-4">
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
							<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
						</svg>
					</div>
					<h2 class="text-xl font-bold font-heading">How We Use Your Data</h2>
				</div>
				<div class="text-muted-foreground leading-relaxed space-y-3 text-sm">
					<p>We use the information we collect solely to operate and improve the service:</p>
					<ul class="space-y-2 mt-2">
						{#each ['Authenticate you via Discord OAuth2 and maintain your session.', 'Display your public profile, avatar, and listed bots.', 'Track your vote history and calculate your R$ reward balance.', 'Send webhook notifications to bot developers when you vote.', 'Detect and prevent abuse, spam, or fraudulent activity.', 'Respond to support requests sent to our email.', 'Improve site performance and diagnose technical issues.'] as item}
							<li class="flex items-start gap-2">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-4 h-4 text-primary shrink-0 mt-0.5"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2.5"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<polyline points="20 6 9 17 4 12" />
								</svg>
								{item}
							</li>
						{/each}
					</ul>
					<p class="mt-3">
						We do <strong class="text-foreground">not</strong> use your data for advertising profiling,
						machine learning training, or any purpose beyond what's listed above.
					</p>
				</div>
			</div>

			<hr class="border-border" />

			<!-- 4. Data Sharing -->
			<div id="data-sharing" class="scroll-mt-28">
				<div class="flex items-center gap-3 mb-4">
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
							<circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle
								cx="18"
								cy="19"
								r="3"
							/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line
								x1="15.41"
								y1="6.51"
								x2="8.59"
								y2="10.49"
							/>
						</svg>
					</div>
					<h2 class="text-xl font-bold font-heading">Data Sharing</h2>
				</div>
				<div class="text-muted-foreground leading-relaxed space-y-3 text-sm">
					<p>
						We do <strong class="text-foreground">not</strong> sell, rent, or trade your personal information.
						We share data only in these limited circumstances:
					</p>
					<div class="space-y-3 mt-2">
						<div class="bg-card border border-border rounded-xl p-4">
							<p class="font-semibold text-foreground text-sm mb-1">
								Bot Developers — Vote Webhooks
							</p>
							<p>
								When you vote for a bot, we send the bot developer's configured webhook your Discord
								user ID and the timestamp of your vote. No other personal data is included.
							</p>
						</div>
						<div class="bg-card border border-border rounded-xl p-4">
							<p class="font-semibold text-foreground text-sm mb-1">Public Profile Data</p>
							<p>
								Your username, avatar, bio, and listed bots are visible to everyone on your public
								profile page. You control the bio and banner; all other data comes from Discord.
							</p>
						</div>
						<div class="bg-card border border-border rounded-xl p-4">
							<p class="font-semibold text-foreground text-sm mb-1">Legal Obligations</p>
							<p>
								We may disclose information if required to do so by law, court order, or
								governmental authority.
							</p>
						</div>
					</div>
				</div>
			</div>

			<hr class="border-border" />

			<!-- 5. Cookies -->
			<div id="cookies" class="scroll-mt-28">
				<div class="flex items-center gap-3 mb-4">
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
							<circle cx="12" cy="12" r="10" /><path
								d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"
							/>
						</svg>
					</div>
					<h2 class="text-xl font-bold font-heading">Cookies</h2>
				</div>
				<div class="text-muted-foreground leading-relaxed space-y-3 text-sm">
					<p>We use a minimal number of cookies strictly necessary to operate the site:</p>
					<div class="bg-card border border-border rounded-2xl overflow-hidden mt-2">
						<ul class="divide-y divide-border">
							{#each [['key', 'Session', 'Stores your Discord OAuth access token to keep you logged in. HTTP-only, Secure. Expires when you log out or after 7 days.'], ['theme', 'Preference', 'Stores your light/dark mode preference. No personal data. Expires after 1 year.']] as [name, type, desc]}
								<li class="px-5 py-3.5 grid grid-cols-3 gap-3 text-xs">
									<div>
										<code
											class="font-mono bg-background border border-border rounded px-1.5 py-0.5 text-foreground"
											>{name}</code
										>
									</div>
									<div>
										<span
											class="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold text-xs border border-primary/20"
											>{type}</span
										>
									</div>
									<div class="col-span-3 text-muted-foreground mt-1">{desc}</div>
								</li>
							{/each}
						</ul>
					</div>
					<p>
						We do not use advertising cookies, tracking pixels, or third-party analytics cookies.
					</p>
				</div>
			</div>

			<hr class="border-border" />

			<!-- 6. Data Retention -->
			<div id="data-retention" class="scroll-mt-28">
				<div class="flex items-center gap-3 mb-4">
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
							<circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
						</svg>
					</div>
					<h2 class="text-xl font-bold font-heading">Data Retention</h2>
				</div>
				<div class="text-muted-foreground leading-relaxed space-y-3 text-sm">
					<p>
						We retain your account data for as long as your account is active. If you request
						account deletion, we will permanently remove your profile, vote history, and any
						personally identifiable information within <strong class="text-foreground"
							>30 days</strong
						>.
					</p>
					<p>
						Bot listings you submitted may be retained in anonymised form (no owner link) for
						historical leaderboard integrity unless you explicitly request full removal.
					</p>
					<p>
						Server access logs are automatically purged after <strong class="text-foreground"
							>30 days</strong
						>.
					</p>
				</div>
			</div>

			<hr class="border-border" />

			<!-- 7. Your Rights -->
			<div id="your-rights" class="scroll-mt-28">
				<div class="flex items-center gap-3 mb-4">
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
							<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
						</svg>
					</div>
					<h2 class="text-xl font-bold font-heading">Your Rights</h2>
				</div>
				<div class="text-muted-foreground leading-relaxed space-y-3 text-sm">
					<p>
						Regardless of where you are located, you have the following rights regarding your data:
					</p>
					<ul class="space-y-2 mt-2">
						{#each [['Access', 'Request a copy of the personal data we hold about you.'], ['Rectification', "Ask us to correct inaccurate data (e.g. if your profile wasn't updated after a username change)."], ['Erasure', 'Request deletion of your account and all personally identifiable information.'], ['Restriction', 'Ask us to stop processing your data in certain ways while a dispute is resolved.'], ['Portability', 'Request your data in a structured, machine-readable format.'], ['Objection', 'Object to our processing of your data for any reason.']] as [right, desc]}
							<li class="flex items-start gap-2">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-4 h-4 text-primary shrink-0 mt-0.5"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2.5"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<polyline points="20 6 9 17 4 12" />
								</svg>
								<span><strong class="text-foreground">{right}:</strong> {desc}</span>
							</li>
						{/each}
					</ul>
					<p class="mt-3">
						To exercise any of these rights, email us at
						<a href="mailto:{email}" class="text-primary hover:underline font-medium">{email}</a>.
						We will respond within 30 days.
					</p>
				</div>
			</div>

			<hr class="border-border" />

			<!-- 8. Children's Privacy -->
			<div id="childrens-privacy" class="scroll-mt-28">
				<div class="flex items-center gap-3 mb-4">
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
							<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle
								cx="9"
								cy="7"
								r="4"
							/><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
						</svg>
					</div>
					<h2 class="text-xl font-bold font-heading">Children's Privacy</h2>
				</div>
				<div class="text-muted-foreground leading-relaxed space-y-3 text-sm">
					<p>
						Our service is not directed to children under the age of 13. We do not knowingly collect
						personal information from children under 13. Because our service requires a Discord
						account — and Discord's own Terms of Service require users to be at least 13 — access by
						younger users is inherently restricted.
					</p>
					<p>
						If you believe a child under 13 has provided us with personal data, please contact us at
						<a href="mailto:{email}" class="text-primary hover:underline font-medium">{email}</a>
						and we will delete it promptly.
					</p>
				</div>
			</div>

			<hr class="border-border" />

			<!-- 9. Policy Changes -->
			<div id="changes" class="scroll-mt-28">
				<div class="flex items-center gap-3 mb-4">
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
							<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path
								d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
							/>
						</svg>
					</div>
					<h2 class="text-xl font-bold font-heading">Policy Changes</h2>
				</div>
				<div class="text-muted-foreground leading-relaxed space-y-3 text-sm">
					<p>
						We may update this Privacy Policy from time to time. When we do, we will update the
						"Last updated" date at the top of this page. For significant changes we will post a
						notice on our website or send a message via our Discord server.
					</p>
					<p>
						Your continued use of the service after any changes constitutes your acceptance of the
						new policy. We encourage you to review this page periodically.
					</p>
				</div>
			</div>

			<hr class="border-border" />

			<!-- 10. Contact -->
			<div id="contact" class="scroll-mt-28">
				<div class="flex items-center gap-3 mb-4">
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
								d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
							/><polyline points="22,6 12,13 2,6" />
						</svg>
					</div>
					<h2 class="text-xl font-bold font-heading">Contact Us</h2>
				</div>
				<div class="text-muted-foreground leading-relaxed space-y-3 text-sm">
					<p>
						If you have any questions about this Privacy Policy or wish to exercise your rights,
						please reach out:
					</p>
					<div
						class="bg-card border border-border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
					>
						<div
							class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-5 h-5 text-primary"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path
									d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
								/><polyline points="22,6 12,13 2,6" />
							</svg>
						</div>
						<div>
							<p class="font-semibold text-foreground text-sm">Email</p>
							<a href="mailto:{email}" class="text-primary hover:underline text-sm">{email}</a>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>
