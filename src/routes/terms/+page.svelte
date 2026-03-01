<script lang="ts">
	import SEO from "$lib/components/SEO.svelte";

	const lastUpdated = "March 1, 2026";
	const email = "support@rovelstars.com";
	const siteName = "Rovel Discord List";
	const siteUrl = "https://discord.rovelstars.com";
</script>

<SEO
	title="Terms of Service"
	description="Read the Rovel Discord List Terms of Service to understand the rules and guidelines for using our platform."
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
				<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline
					points="14 2 14 8 20 8"
				/><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline
					points="10 9 9 9 8 9"
				/>
			</svg>
			Terms of Service
		</div>
		<h1 class="text-4xl md:text-5xl font-extrabold font-heading leading-tight mb-4">
			Rules of the road
		</h1>
		<p class="text-muted-foreground max-w-xl mx-auto leading-relaxed">
			By using Rovel Discord List you agree to these terms. They're written in plain language — no
			legalese. Please take a few minutes to read them.
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
				<p class="font-bold text-sm mb-1">Free to use</p>
				<p class="text-xs text-muted-foreground leading-relaxed">
					Browsing bots, voting, and listing your bot is completely free with no hidden charges.
				</p>
			</div>
			<div class="bg-card border border-border rounded-2xl p-5">
				<div class="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center mb-3">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-5 h-5 text-yellow-500"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path
							d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
						/><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
					</svg>
				</div>
				<p class="font-bold text-sm mb-1">No abuse tolerated</p>
				<p class="text-xs text-muted-foreground leading-relaxed">
					Vote manipulation, spam, and malicious bots will result in immediate removal.
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
						<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
					</svg>
				</div>
				<p class="font-bold text-sm mb-1">We moderate fairly</p>
				<p class="text-xs text-muted-foreground leading-relaxed">
					All moderation decisions can be appealed by contacting our support team.
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
					{#each [["#acceptance", "Acceptance"], ["#eligibility", "Eligibility"], ["#your-account", "Your Account"], ["#acceptable-use", "Acceptable Use"], ["#bot-listings", "Bot Listings"], ["#voting", "Voting & Rewards"], ["#intellectual-prop", "Intellectual Property"], ["#third-party", "Third-Party Services"], ["#disclaimers", "Disclaimers"], ["#limitation", "Limitation of Liability"], ["#termination", "Termination"], ["#changes", "Changes to Terms"], ["#contact", "Contact Us"]] as [href, label]}
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
			<!-- 1. Acceptance -->
			<div id="acceptance" class="scroll-mt-28">
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
							<polyline points="20 6 9 17 4 12" />
						</svg>
					</div>
					<h2 class="text-xl font-bold font-heading">Acceptance of Terms</h2>
				</div>
				<div class="text-muted-foreground leading-relaxed space-y-3 text-sm">
					<p>
						By accessing or using <strong class="text-foreground">{siteName}</strong> (the
						"Service"), available at
						<a href={siteUrl} class="text-primary hover:underline">{siteUrl}</a>, you agree to be
						bound by these Terms of Service ("Terms") and our
						<a href="/privacy" class="text-primary hover:underline">Privacy Policy</a>.
					</p>
					<p>
						If you do not agree with any part of these Terms, you must not use the Service. These
						Terms apply to all visitors, registered users, and bot developers using the platform.
					</p>
				</div>
			</div>

			<hr class="border-border" />

			<!-- 2. Eligibility -->
			<div id="eligibility" class="scroll-mt-28">
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
					<h2 class="text-xl font-bold font-heading">Eligibility</h2>
				</div>
				<div class="text-muted-foreground leading-relaxed space-y-3 text-sm">
					<p>To use this Service you must:</p>
					<ul class="space-y-2">
						{#each ["Be at least 13 years of age (the minimum age required by Discord's Terms of Service).", "Have a valid Discord account in good standing.", "Not have been previously banned or suspended from our platform.", "Comply with all applicable laws and regulations in your jurisdiction."] as item}
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
					<p>
						By using the Service you represent that you meet all of the above eligibility
						requirements.
					</p>
				</div>
			</div>

			<hr class="border-border" />

			<!-- 3. Your Account -->
			<div id="your-account" class="scroll-mt-28">
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
							<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
						</svg>
					</div>
					<h2 class="text-xl font-bold font-heading">Your Account</h2>
				</div>
				<div class="text-muted-foreground leading-relaxed space-y-3 text-sm">
					<p>
						Accounts are created by authenticating with Discord via OAuth2. You are responsible for
						maintaining the security of your Discord account. Any activity performed through your
						account is your responsibility.
					</p>
					<p>You agree not to:</p>
					<ul class="space-y-2">
						{#each ["Share your session or allow others to use your account.", "Use automated tools, scripts, or bots to interact with the Service on your behalf.", "Attempt to access another user's account or data without authorisation.", "Impersonate another person or organisation."] as item}
							<li class="flex items-start gap-2">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-4 h-4 text-destructive shrink-0 mt-0.5"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2.5"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
								</svg>
								{item}
							</li>
						{/each}
					</ul>
					<p>
						We reserve the right to suspend or terminate accounts that violate these Terms without
						prior notice.
					</p>
				</div>
			</div>

			<hr class="border-border" />

			<!-- 4. Acceptable Use -->
			<div id="acceptable-use" class="scroll-mt-28">
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
					<h2 class="text-xl font-bold font-heading">Acceptable Use</h2>
				</div>
				<div class="text-muted-foreground leading-relaxed space-y-4 text-sm">
					<p>
						You agree to use the Service only for lawful purposes. The following are strictly
						prohibited:
					</p>

					<div class="bg-card border border-destructive/20 rounded-2xl overflow-hidden">
						<div class="px-5 py-3 border-b border-border bg-destructive/5">
							<p class="text-xs font-semibold uppercase tracking-wider text-destructive/80">
								Prohibited Conduct
							</p>
						</div>
						<ul class="divide-y divide-border">
							{#each ["Posting content that is illegal, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable.", "Distributing malware, viruses, or any code designed to disrupt, damage, or gain unauthorised access to systems.", "Scraping, crawling, or indexing the Service without our prior written consent.", "Attempting to overload, attack, or interfere with the availability of the Service (DDoS, etc.).", "Circumventing any rate limits, access controls, or security measures.", "Using the Service for commercial spam or unsolicited bulk messaging.", "Posting content that infringes any third-party intellectual property rights."] as item}
								<li class="px-5 py-3 flex items-start gap-2.5 text-xs">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2.5"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
									</svg>
									{item}
								</li>
							{/each}
						</ul>
					</div>

					<p>
						Violations may result in immediate suspension, permanent ban, and/or referral to
						appropriate law enforcement authorities.
					</p>
				</div>
			</div>

			<hr class="border-border" />

			<!-- 5. Bot Listings -->
			<div id="bot-listings" class="scroll-mt-28">
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
							<rect x="3" y="11" width="18" height="10" rx="2" /><circle
								cx="12"
								cy="5"
								r="2"
							/><path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" /><line
								x1="16"
								y1="16"
								x2="16"
								y2="16"
							/>
						</svg>
					</div>
					<h2 class="text-xl font-bold font-heading">Bot Listings</h2>
				</div>
				<div class="text-muted-foreground leading-relaxed space-y-4 text-sm">
					<p>
						Bot developers may submit bots for listing subject to the following rules. Submission
						does not guarantee approval — all bots are reviewed before going live.
					</p>

					<div class="bg-card border border-border rounded-2xl overflow-hidden">
						<div class="px-5 py-3 border-b border-border bg-muted/30">
							<p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								Listing Requirements
							</p>
						</div>
						<ul class="divide-y divide-border">
							{#each [["Ownership", "You must be a verified owner or co-owner of the bot you are submitting."], ["Functionality", "The bot must be online and functional at the time of submission and kept maintained thereafter."], ["Description accuracy", "All descriptions, tags, and links must accurately represent the bot. Misleading listings will be removed."], ["Discord ToS compliance", "The bot must fully comply with Discord's Developer Terms of Service and Developer Policy."], ["No NSFW on main listing", "NSFW content must not be present in any public-facing listing field (name, short description, tags, or avatar)."], ["Valid invite link", "A working bot invite link with the minimum required permissions must be provided."]] as [field, desc]}
								<li class="px-5 py-3 flex items-start gap-3 text-xs">
									<span class="font-semibold text-foreground shrink-0 w-36">{field}</span>
									<span>{desc}</span>
								</li>
							{/each}
						</ul>
					</div>

					<p>
						We reserve the right to remove, edit, or decline any listing at our sole discretion. If
						your listing is removed you will be notified by email where possible.
					</p>
				</div>
			</div>

			<hr class="border-border" />

			<!-- 6. Voting & Rewards -->
			<div id="voting" class="scroll-mt-28">
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
							<polyline points="18 15 12 9 6 15" />
						</svg>
					</div>
					<h2 class="text-xl font-bold font-heading">Voting & Rewards</h2>
				</div>
				<div class="text-muted-foreground leading-relaxed space-y-3 text-sm">
					<p>
						Registered users may cast one vote per bot every 12 hours. Votes contribute to a bot's
						ranking on the leaderboard and trigger webhook notifications to bot developers.
					</p>
					<p>
						Votes may award in-platform R$ balance, used for cosmetic or platform features. R$
						balance has no real-world monetary value, is non-transferable, and cannot be exchanged
						for cash or cryptocurrency.
					</p>
					<p>The following vote-related conduct is strictly prohibited:</p>
					<ul class="space-y-2">
						{#each ["Voting using automated scripts, bots, or any non-human method.", "Creating multiple accounts to inflate vote counts.", "Paying, incentivising, or coercing other users to vote for your bot outside of Discord server vote-reward systems.", "Attempting to manipulate the leaderboard rankings through any means other than legitimate organic votes."] as item}
							<li class="flex items-start gap-2">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-4 h-4 text-destructive shrink-0 mt-0.5"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2.5"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
								</svg>
								{item}
							</li>
						{/each}
					</ul>
					<p>
						Detected vote fraud will result in vote count resets and account termination. We may
						adjust vote counts at any time to correct detected abuse.
					</p>
				</div>
			</div>

			<hr class="border-border" />

			<!-- 7. Intellectual Property -->
			<div id="intellectual-prop" class="scroll-mt-28">
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
							<circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line
								x1="8"
								y1="12"
								x2="16"
								y2="12"
							/>
						</svg>
					</div>
					<h2 class="text-xl font-bold font-heading">Intellectual Property</h2>
				</div>
				<div class="text-muted-foreground leading-relaxed space-y-3 text-sm">
					<p>
						The {siteName} name, logo, website design, and all original content are the property of Rovel
						Stars™ and are protected by applicable copyright and trademark laws.
					</p>
					<p>
						By submitting content to the Service (including bot descriptions, banners, and profile
						bios), you grant us a non-exclusive, worldwide, royalty-free licence to display and
						distribute that content as part of operating the Service. You retain ownership of your
						content and may remove it at any time by deleting your listing or account.
					</p>
					<p>
						You represent that you have all necessary rights to any content you submit and that it
						does not infringe any third-party intellectual property rights.
					</p>
				</div>
			</div>

			<hr class="border-border" />

			<!-- 8. Third-Party Services -->
			<div id="third-party" class="scroll-mt-28">
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
					<h2 class="text-xl font-bold font-heading">Third-Party Services</h2>
				</div>
				<div class="text-muted-foreground leading-relaxed space-y-3 text-sm">
					<p>
						The Service uses Discord's OAuth2 API for authentication. Your use of Discord is subject
						to <a
							href="https://discord.com/terms"
							target="_blank"
							rel="noopener noreferrer"
							class="text-primary hover:underline">Discord's Terms of Service</a
						>
						and
						<a
							href="https://discord.com/privacy"
							target="_blank"
							rel="noopener noreferrer"
							class="text-primary hover:underline">Privacy Policy</a
						>.
					</p>
					<p>
						The Service may contain links to external websites or services. We are not responsible
						for the content, privacy practices, or terms of any third-party sites. Links do not
						imply endorsement.
					</p>
					<p>
						Bot invite links and support servers are provided by bot developers and are entirely
						outside our control. Rovel Stars™ accepts no responsibility for the conduct or content
						of third-party Discord bots.
					</p>
				</div>
			</div>

			<hr class="border-border" />

			<!-- 9. Disclaimers -->
			<div id="disclaimers" class="scroll-mt-28">
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
								d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
							/><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
						</svg>
					</div>
					<h2 class="text-xl font-bold font-heading">Disclaimers</h2>
				</div>
				<div class="text-muted-foreground leading-relaxed space-y-3 text-sm">
					<p>
						The Service is provided on an <strong class="text-foreground">"as is"</strong> and
						<strong class="text-foreground">"as available"</strong> basis without warranties of any kind,
						either express or implied.
					</p>
					<div class="space-y-2">
						{#each ["We do not warrant that the Service will be uninterrupted, error-free, or free of viruses or other harmful components.", "We do not guarantee the accuracy, completeness, or usefulness of any information provided by third-party bot listings.", "Rovel Stars™ is not affiliated with, endorsed by, or in any way officially connected with Discord Inc.", "All bot listings are provided by their respective developers. We are not responsible for any actions taken by listed bots in your Discord servers."] as item}
							<div
								class="bg-card border border-border rounded-xl px-4 py-3 flex items-start gap-2.5 text-xs"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-3.5 h-3.5 text-yellow-500 shrink-0 mt-0.5"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path
										d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
									/><line x1="12" y1="9" x2="12" y2="13" /><line
										x1="12"
										y1="17"
										x2="12.01"
										y2="17"
									/>
								</svg>
								{item}
							</div>
						{/each}
					</div>
				</div>
			</div>

			<hr class="border-border" />

			<!-- 10. Limitation of Liability -->
			<div id="limitation" class="scroll-mt-28">
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
							<rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line
								x1="9"
								y1="9"
								x2="15"
								y2="15"
							/><line x1="15" y1="9" x2="9" y2="15" />
						</svg>
					</div>
					<h2 class="text-xl font-bold font-heading">Limitation of Liability</h2>
				</div>
				<div class="text-muted-foreground leading-relaxed space-y-3 text-sm">
					<p>
						To the maximum extent permitted by applicable law, Rovel Stars™ and its operators shall
						not be liable for any indirect, incidental, special, consequential, or punitive damages,
						including but not limited to loss of profits, data, goodwill, or other intangible
						losses, arising out of or in connection with your use of or inability to use the
						Service.
					</p>
					<p>
						Our total aggregate liability to you for any claim arising out of or relating to these
						Terms or the Service shall not exceed <strong class="text-foreground">$10 USD</strong>.
					</p>
					<p>
						Some jurisdictions do not allow the exclusion or limitation of certain warranties or
						liabilities, so the above limitations may not apply to you in full.
					</p>
				</div>
			</div>

			<hr class="border-border" />

			<!-- 11. Termination -->
			<div id="termination" class="scroll-mt-28">
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
							<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline
								points="16 17 21 12 16 7"
							/><line x1="21" y1="12" x2="9" y2="12" />
						</svg>
					</div>
					<h2 class="text-xl font-bold font-heading">Termination</h2>
				</div>
				<div class="text-muted-foreground leading-relaxed space-y-3 text-sm">
					<p>
						<strong class="text-foreground">By you:</strong> You may stop using the Service at any
						time. You may request account deletion by contacting us at
						<a href="mailto:{email}" class="text-primary hover:underline">{email}</a>.
					</p>
					<p>
						<strong class="text-foreground">By us:</strong> We may suspend or terminate your access to
						the Service at any time, with or without notice, for any reason — including but not limited
						to violation of these Terms, inactivity, or actions deemed harmful to the community.
					</p>
					<p>
						Upon termination, your right to access the Service ceases immediately. Sections covering
						Intellectual Property, Disclaimers, Limitation of Liability, and any other provisions
						that by their nature should survive termination will remain in effect.
					</p>
				</div>
			</div>

			<hr class="border-border" />

			<!-- 12. Changes -->
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
					<h2 class="text-xl font-bold font-heading">Changes to Terms</h2>
				</div>
				<div class="text-muted-foreground leading-relaxed space-y-3 text-sm">
					<p>
						We reserve the right to modify these Terms at any time. When we make changes, we will
						update the "Last updated" date at the top of this page and, for material changes, post a
						notice on the site or via our Discord server.
					</p>
					<p>
						Your continued use of the Service after changes are posted constitutes your acceptance
						of the revised Terms. If you do not agree with the updated Terms, you must stop using
						the Service.
					</p>
				</div>
			</div>

			<hr class="border-border" />

			<!-- 13. Contact -->
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
						If you have questions about these Terms or need to report a violation, please reach out:
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
					<p class="text-xs text-muted-foreground pt-2">
						These Terms of Service were last updated on {lastUpdated} and are effective as of that date.
					</p>
				</div>
			</div>
		</div>
	</div>
</section>
