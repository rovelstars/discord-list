<script context="module" lang="ts">
	// ── Types (module scope so they can be imported by other files) ───────────

	export type CommentUser = {
		id: string;
		username: string;
		avatar: string | null;
		discriminator?: string;
	};

	export type ReactionCount = {
		emoji: ReactionEmoji;
		count: number;
		reacted: boolean;
	};

	export type ReactionEmoji =
		| "funny"
		| "useful"
		| "informative"
		| "like"
		| "dislike"
		| "love"
		| "angry"
		| "sad"
		| "skull";

	export type Comment = {
		id: string;
		bot_id: string;
		user_id: string;
		/** rating × 10 integer (e.g. 43 = 4.3). NULL for reply comments. */
		rating: number | null;
		text: string | null;
		parent_id: string | null;
		created_at: string;
		updated_at: string | null;
		author_username: string;
		author_avatar: string | null;
		author_discriminator: string;
		replies?: Comment[];
		reactions: ReactionCount[];
	};
</script>

<script lang="ts">
	import getAvatarURL from "$lib/get-avatar-url";

	// ── Reaction emoji display map ────────────────────────────────────────────

	const REACTION_EMOJIS: ReactionEmoji[] = [
		"funny",
		"useful",
		"informative",
		"like",
		"dislike",
		"love",
		"angry",
		"sad",
		"skull"
	];

	const EMOJI_GLYPH: Record<ReactionEmoji, string> = {
		funny: "😂",
		useful: "👍",
		informative: "💡",
		like: "❤️",
		dislike: "👎",
		love: "😍",
		angry: "😡",
		sad: "😢",
		skull: "💀"
	};

	const EMOJI_LABEL: Record<ReactionEmoji, string> = {
		funny: "Funny",
		useful: "Useful",
		informative: "Informative",
		like: "Like",
		dislike: "Dislike",
		love: "Love",
		angry: "Angry",
		sad: "Sad",
		skull: "💀"
	};

	/** Sentence fragment used in "X people found it ___" tooltip / aria-label. */
	const EMOJI_SENTENCE: Record<ReactionEmoji, string> = {
		funny: "Funny",
		useful: "Useful",
		informative: "Informative",
		like: "Liked this",
		dislike: "Disliked this",
		love: "Loved this",
		angry: "Angry",
		sad: "Sad",
		skull: "💀"
	};

	/** Build the human-readable alt/title text for a reaction pill. */
	function reactionAltText(emoji: ReactionEmoji, count: number, reacted: boolean): string {
		const n = count;
		const people = n === 1 ? "1 person found it" : `${n} people found it`;
		const base = n === 0 ? EMOJI_LABEL[emoji] : `${people} ${EMOJI_SENTENCE[emoji]}`;
		return reacted ? `${base} · You reacted` : base;
	}

	// ── Props ─────────────────────────────────────────────────────────────────

	/** Initial comments tree passed from the server load. */
	export let comments: Comment[] = [];

	/** Logged-in user. null = not logged in. */
	export let user: CommentUser | null = null;

	/** The bot's id, used for API calls. */
	export let botId: string;

	/** Array of owner user IDs for this bot. Used to pin owner reviews and badge official replies. */
	export let owners: string[] = [];

	// ── State ─────────────────────────────────────────────────────────────────

	// Local mutable copy so we can update without a page reload
	let tree: Comment[] = JSON.parse(JSON.stringify(comments));

	/** Whether a given user id is a bot owner. */
	function isOwner(userId: string): boolean {
		return owners.includes(userId);
	}

	// New top-level review form
	let newRating = 0; // 0 = not yet chosen; will be set in 0.5 increments
	let newHoverRating = 0;
	let newText = "";
	let submitting = false;
	let submitError = "";
	let submitSuccess = false;

	// Which comment's reply box is open (by comment id)
	let replyOpenFor: string | null = null;
	let replyText = "";
	let replySubmitting = false;
	let replyError = "";

	// Edit state
	let editingId: string | null = null;
	let editText = "";
	let editRating = 0;
	let editHoverRating = 0;
	let editSubmitting = false;
	let editError = "";

	// Delete confirmation
	let deletingId: string | null = null;
	let deleteSubmitting = false;

	// Reaction state — tracks in-flight toggles per "commentId:emoji" key
	let reactionPending = new Set<string>();

	// Which comment's emoji picker is open (by comment id, covers both top-level and replies)
	let pickerOpenFor: string | null = null;

	/** Single document-level listener that closes the picker when clicking outside it.
	 *  Uses 'click' (not 'mousedown') so it fires after Svelte's on:click handlers,
	 *  meaning the toggle click on the + button sets pickerOpenFor before this runs. */
	function handleDocClick(e: MouseEvent) {
		if (!pickerOpenFor) return;
		const picker = document.getElementById(`reaction-picker-${pickerOpenFor}`);
		const trigger = document.getElementById(`reaction-trigger-${pickerOpenFor}`);
		if (
			picker &&
			!picker.contains(e.target as Node) &&
			trigger &&
			!trigger.contains(e.target as Node)
		) {
			pickerOpenFor = null;
		}
	}

	// ── Computed ──────────────────────────────────────────────────────────────

	/** Whether the current user has already left a top-level review. */
	$: userHasReviewed = user
		? tree.some((c) => c.user_id === user!.id && c.parent_id === null)
		: false;

	/** Average rating across all top-level reviews that carry one. */
	$: avgRating = (() => {
		const rated = tree.filter((c) => c.rating != null && c.parent_id === null);
		if (rated.length === 0) return null;
		const sum = rated.reduce((acc, c) => acc + c.rating! / 10, 0);
		return (sum / rated.length).toFixed(1);
	})();

	$: totalReviews = tree.filter((c) => c.parent_id === null).length;

	/**
	 * Sorted comment tree: owner top-level reviews float to the top (pinned),
	 * everything else retains its original order.
	 */
	$: sortedTree = (() => {
		const pinned = tree.filter((c) => isOwner(c.user_id));
		const rest = tree.filter((c) => !isOwner(c.user_id));
		return [...pinned, ...rest];
	})();

	// ── Helpers ───────────────────────────────────────────────────────────────

	function ratingFromInt(r: number | null): number {
		return r != null ? r / 10 : 0;
	}

	function formatDate(iso: string): string {
		try {
			return new Date(iso).toLocaleDateString("en-US", {
				year: "numeric",
				month: "short",
				day: "numeric"
			});
		} catch {
			return iso;
		}
	}

	function formatRelative(iso: string): string {
		try {
			const diff = Date.now() - new Date(iso).getTime();
			const secs = Math.floor(diff / 1000);
			if (secs < 60) return "just now";
			const mins = Math.floor(secs / 60);
			if (mins < 60) return `${mins}m ago`;
			const hrs = Math.floor(mins / 60);
			if (hrs < 24) return `${hrs}h ago`;
			const days = Math.floor(hrs / 24);
			if (days < 30) return `${days}d ago`;
			return formatDate(iso);
		} catch {
			return iso;
		}
	}

	// Find a comment anywhere in the tree by id
	function findComment(id: string, list: Comment[] = tree): Comment | null {
		for (const c of list) {
			if (c.id === id) return c;
			if (c.replies?.length) {
				const found = findComment(id, c.replies);
				if (found) return found;
			}
		}
		return null;
	}

	// Remove a comment from the tree by id (and its replies)
	function removeComment(id: string, list: Comment[] = tree): Comment[] {
		return list
			.filter((c) => c.id !== id)
			.map((c) => ({
				...c,
				replies: c.replies ? removeComment(id, c.replies) : []
			}));
	}

	// ── Star rendering helpers ────────────────────────────────────────────────

	/** Render star fill for a given position (1-5) given a 0–5 rating value. */
	function starFill(pos: number, rating: number): "full" | "half" | "empty" {
		if (rating >= pos) return "full";
		if (rating >= pos - 0.5) return "half";
		return "empty";
	}

	/** For hover-based rating input: compute rating from mouse X within the star element. */
	function ratingFromEvent(e: MouseEvent, pos: number): number {
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const half = rect.width / 2;
		return e.clientX - rect.left < half ? pos - 0.5 : pos;
	}

	// ── API calls ─────────────────────────────────────────────────────────────

	async function submitReview() {
		if (!user) return;
		if (newRating === 0) {
			submitError = "Please choose a star rating before submitting.";
			return;
		}
		submitting = true;
		submitError = "";
		try {
			const res = await fetch(`/api/bots/${botId}/comments`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					rating: newRating,
					text: newText.trim() || null,
					parent_id: null
				})
			});
			const data = await res.json();
			if (!res.ok) {
				submitError = data.message ?? data.err ?? "Something went wrong.";
				return;
			}
			tree = [data.comment, ...tree];
			newRating = 0;
			newHoverRating = 0;
			newText = "";
			submitSuccess = true;
			setTimeout(() => (submitSuccess = false), 3500);
		} catch {
			submitError = "Network error — please try again.";
		} finally {
			submitting = false;
		}
	}

	async function submitReply(parentId: string) {
		if (!user) return;
		const text = replyText.trim();
		if (!text) {
			replyError = "Reply cannot be empty.";
			return;
		}
		replySubmitting = true;
		replyError = "";
		try {
			const res = await fetch(`/api/bots/${botId}/comments`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text, parent_id: parentId })
			});
			const data = await res.json();
			if (!res.ok) {
				replyError = data.message ?? data.err ?? "Something went wrong.";
				return;
			}
			// Attach reply to the right parent in the tree
			tree = tree.map((c) => {
				if (c.id === parentId) {
					return { ...c, replies: [...(c.replies ?? []), data.comment] };
				}
				return c;
			});
			replyText = "";
			replyOpenFor = null;
		} catch {
			replyError = "Network error — please try again.";
		} finally {
			replySubmitting = false;
		}
	}

	function startEdit(c: Comment) {
		editingId = c.id;
		editText = c.text ?? "";
		editRating = c.parent_id === null ? ratingFromInt(c.rating) : 0;
		editHoverRating = editRating;
		editError = "";
	}

	function cancelEdit() {
		editingId = null;
		editError = "";
	}

	async function submitEdit(commentId: string, isReply: boolean) {
		editSubmitting = true;
		editError = "";
		try {
			const body: Record<string, any> = { text: editText.trim() || null };
			if (!isReply) {
				if (editRating === 0) {
					editError = "Please choose a star rating.";
					editSubmitting = false;
					return;
				}
				body.rating = editRating;
			}
			const res = await fetch(`/api/bots/${botId}/comments/${commentId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body)
			});
			const data = await res.json();
			if (!res.ok) {
				editError = data.message ?? data.err ?? "Something went wrong.";
				return;
			}
			// Update comment in tree
			function patchTree(list: Comment[]): Comment[] {
				return list.map((c) => {
					if (c.id === commentId) return { ...c, ...data.comment, replies: c.replies };
					return { ...c, replies: c.replies ? patchTree(c.replies) : [] };
				});
			}
			tree = patchTree(tree);
			editingId = null;
		} catch {
			editError = "Network error — please try again.";
		} finally {
			editSubmitting = false;
		}
	}

	async function confirmDelete(commentId: string) {
		deleteSubmitting = true;
		try {
			const res = await fetch(`/api/bots/${botId}/comments/${commentId}`, {
				method: "DELETE"
			});
			if (res.ok) {
				tree = removeComment(commentId);
			}
		} catch {
			// non-fatal
		} finally {
			deleteSubmitting = false;
			deletingId = null;
		}
	}

	// ── Login redirect ────────────────────────────────────────────────────────

	function goLogin() {
		try {
			document.cookie = `redirect=${encodeURIComponent(window.location.pathname)}; path=/;`;
			window.location.href = "/login";
		} catch {
			window.location.href = "/login";
		}
	}

	// ── Reactions ─────────────────────────────────────────────────────────────

	/**
	 * Patch the reactions array of a comment (or reply) anywhere in `tree`
	 * without triggering a full re-render.
	 */
	function patchReactions(commentId: string, reactions: ReactionCount[]): void {
		function walk(list: Comment[]): Comment[] {
			return list.map((c) => {
				if (c.id === commentId) return { ...c, reactions };
				if (c.replies && c.replies.length > 0) return { ...c, replies: walk(c.replies) };
				return c;
			});
		}
		tree = walk(tree);
	}

	async function toggleReaction(commentId: string, emoji: ReactionEmoji) {
		if (!user) {
			goLogin();
			return;
		}
		const key = `${commentId}:${emoji}`;
		if (reactionPending.has(key)) return; // debounce double-clicks

		// ── Optimistic update ─────────────────────────────────────────────────
		reactionPending = new Set(reactionPending).add(key);

		function findReactions(list: Comment[]): ReactionCount[] | null {
			for (const c of list) {
				if (c.id === commentId) return c.reactions ?? [];
				if (c.replies) {
					const found = findReactions(c.replies);
					if (found !== null) return found;
				}
			}
			return null;
		}

		const currentReactions = findReactions(tree) ?? [];
		const optimistic = currentReactions.map((r) => {
			if (r.emoji !== emoji) return r;
			return r.reacted
				? { ...r, reacted: false, count: Math.max(0, r.count - 1) }
				: { ...r, reacted: true, count: r.count + 1 };
		});
		patchReactions(commentId, optimistic);

		// ── Server call ───────────────────────────────────────────────────────
		try {
			const res = await fetch(`/api/bots/${botId}/comments/${commentId}/react`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ emoji })
			});
			const data = await res.json();
			if (res.ok && data.reactions) {
				// Reconcile with authoritative server state
				patchReactions(commentId, data.reactions);
			} else {
				// Roll back optimistic update on error
				patchReactions(commentId, currentReactions);
			}
		} catch {
			// Roll back on network failure
			patchReactions(commentId, currentReactions);
		} finally {
			const next = new Set(reactionPending);
			next.delete(key);
			reactionPending = next;
		}
	}
</script>

<svelte:document on:click={handleDocClick} />

<!-- ═══════════════════════════════════════════════════════════════════════════
     Root container
═══════════════════════════════════════════════════════════════════════════ -->
<section class="mt-10 border-t border-border/50 pt-10" aria-label="Reviews and comments">
	<!-- ── Section header ──────────────────────────────────────────────────── -->
	<div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
		<div>
			<h2 class="text-xl font-bold font-heading text-foreground">Reviews &amp; Comments</h2>
			{#if totalReviews > 0}
				<div class="flex items-center gap-2 mt-1">
					<!-- Static average stars -->
					<div class="flex items-center gap-0.5" aria-label="Average rating {avgRating} out of 5">
						{#each [1, 2, 3, 4, 5] as pos}
							<svg
								class="w-4 h-4 {starFill(pos, Number(avgRating ?? 0)) === 'empty'
									? 'text-muted-foreground/30'
									: 'text-yellow-400'}"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								{#if starFill(pos, Number(avgRating ?? 0)) === "full"}
									<path
										d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
										fill="currentColor"
									/>
								{:else if starFill(pos, Number(avgRating ?? 0)) === "half"}
									<defs>
										<linearGradient id="half-avg-{pos}">
											<stop offset="50%" stop-color="currentColor" />
											<stop offset="50%" stop-color="transparent" />
										</linearGradient>
									</defs>
									<path
										d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
										fill="url(#half-avg-{pos})"
										stroke="currentColor"
										stroke-width="1"
									/>
								{:else}
									<path
										d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
										fill="none"
										stroke="currentColor"
										stroke-width="1.5"
									/>
								{/if}
							</svg>
						{/each}
					</div>
					<span class="text-sm font-bold text-foreground">{avgRating}</span>
					<span class="text-sm text-muted-foreground">
						({totalReviews}
						{totalReviews === 1 ? "review" : "reviews"})
					</span>
				</div>
			{/if}
		</div>

		<!-- Total reply count sub-label -->
		{#if totalReviews === 0}
			<p class="text-sm text-muted-foreground italic">No reviews yet — be the first!</p>
		{/if}
	</div>

	<!-- ── Write a review ──────────────────────────────────────────────────── -->
	{#if !user}
		<!-- Not logged in: login prompt -->
		<div
			class="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-dashed border-border bg-muted/20 px-5 py-4 mb-8"
		>
			<div>
				<p class="text-sm font-semibold text-foreground">Want to leave a review?</p>
				<p class="text-xs text-muted-foreground mt-0.5">
					Log in with Discord to rate this bot and share your experience.
				</p>
			</div>
			<button
				on:click={goLogin}
				class="inline-flex items-center gap-2 shrink-0 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] active:scale-[0.97] transition-all px-4 py-2 text-sm font-semibold text-white shadow-sm"
			>
				<!-- Discord icon -->
				<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path
						d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.003.02.014.04.03.05a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"
					/>
				</svg>
				Log in with Discord
			</button>
		</div>
	{:else if userHasReviewed}
		<!-- Already reviewed: soft notice -->
		<div
			class="rounded-xl border border-border bg-muted/20 px-5 py-3 mb-8 text-sm text-muted-foreground flex items-center gap-2"
		>
			<svg
				class="w-4 h-4 text-green-500 shrink-0"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M20 6 9 17l-5-5" />
			</svg>
			You've already reviewed this bot. You can edit or delete your review below.
		</div>
	{:else}
		<!-- Write review form -->
		<div
			class="rounded-xl border border-border bg-card px-5 py-5 mb-8 shadow-sm"
			role="form"
			aria-label="Write a review"
		>
			<p class="text-sm font-semibold text-foreground mb-3">Write a review</p>

			<!-- Star rating picker -->
			<div class="flex items-center gap-1 mb-4" role="radiogroup" aria-label="Star rating">
				{#each [1, 2, 3, 4, 5] as pos}
					<!-- Each star is split into two interactive halves for half-star precision -->
					<button
						type="button"
						class="relative w-8 h-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
						aria-label="{pos - 0.5} stars"
						on:mousemove={(e) => (newHoverRating = ratingFromEvent(e, pos))}
						on:mouseleave={() => (newHoverRating = 0)}
						on:click={(e) => (newRating = ratingFromEvent(e, pos))}
					>
						<svg
							class="w-8 h-8 transition-colors {starFill(pos, newHoverRating || newRating) ===
							'empty'
								? 'text-muted-foreground/30'
								: 'text-yellow-400'}"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							{#if starFill(pos, newHoverRating || newRating) === "full"}
								<path
									d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
									fill="currentColor"
								/>
							{:else if starFill(pos, newHoverRating || newRating) === "half"}
								<defs>
									<linearGradient id="half-new-{pos}" x1="0" x2="1" y1="0" y2="0">
										<stop offset="50%" stop-color="currentColor" />
										<stop offset="50%" stop-color="transparent" />
									</linearGradient>
								</defs>
								<path
									d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
									fill="url(#half-new-{pos})"
									stroke="currentColor"
									stroke-width="1.5"
								/>
							{:else}
								<path
									d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
								/>
							{/if}
						</svg>
					</button>
				{/each}
				{#if newRating > 0}
					<span class="ml-2 text-sm font-bold text-foreground tabular-nums"
						>{newRating.toFixed(1)}</span
					>
				{/if}
			</div>

			<!-- Comment text (optional) -->
			<textarea
				bind:value={newText}
				placeholder="Share your experience with this bot (optional)…"
				rows={3}
				maxlength={2000}
				disabled={submitting}
				class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-50 mb-3"
			></textarea>

			<div class="flex items-center justify-between gap-3">
				<span class="text-xs text-muted-foreground">{newText.length}/2000</span>
				<div class="flex items-center gap-2">
					{#if submitError}
						<p class="text-xs text-destructive">{submitError}</p>
					{/if}
					{#if submitSuccess}
						<p class="text-xs text-green-500 flex items-center gap-1">
							<svg
								class="w-3.5 h-3.5"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg
							>
							Review posted!
						</p>
					{/if}
					<button
						on:click={submitReview}
						disabled={submitting || newRating === 0}
						class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{#if submitting}
							<svg
								class="w-3.5 h-3.5 animate-spin"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg
							>
							Posting…
						{:else}
							Post Review
						{/if}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- ── Comment list ─────────────────────────────────────────────────────── -->
	{#if tree.length === 0}
		<div class="flex flex-col items-center justify-center py-12 text-center gap-2">
			<svg
				class="w-10 h-10 text-muted-foreground/30 mb-1"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
			</svg>
			<p class="text-sm font-medium text-muted-foreground">No reviews yet.</p>
			<p class="text-xs text-muted-foreground/60">Be the first to share your thoughts!</p>
		</div>
	{:else}
		<ol class="space-y-5 list-none" aria-label="Reviews list">
			{#each sortedTree as comment (comment.id)}
				<li>
					<!-- ── Top-level comment card ──────────────────────────────── -->
					<div
						class="rounded-xl border bg-card shadow-sm overflow-hidden
							{isOwner(comment.user_id) ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border'}"
						id="comment-{comment.id}"
					>
						<!-- Pinned banner (owner review) -->
						{#if isOwner(comment.user_id)}
							<div
								class="flex items-center gap-1.5 px-4 py-1.5 bg-primary/8 border-b border-primary/20 text-xs font-medium text-primary"
							>
								<svg
									class="w-3 h-3 shrink-0"
									viewBox="0 0 24 24"
									fill="currentColor"
									aria-hidden="true"
								>
									<path
										d="M16 3a1 1 0 0 1 .707.293l4 4A1 1 0 0 1 20 9h-1v5a1 1 0 0 1-.553.894L13 17.618V21a1 1 0 0 1-1.707.707l-3-3A1 1 0 0 1 8 18v-.382L2.553 14.894A1 1 0 0 1 2 14V9a1 1 0 0 1 .293-.707l4-4A1 1 0 0 1 7 4h1V3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1zm-6 1v1H7.414L4 7.414V13.382l5.447 2.724A1 1 0 0 1 10 17v.382l1 1 1-1V17a1 1 0 0 1 .553-.894L18 13.382V7.414L14.586 4H10z"
									/>
								</svg>
								Pinned · Developer Notice
							</div>
						{/if}

						<!-- Comment header -->
						<div class="flex items-start gap-3 px-4 pt-4 pb-3">
							<!-- Avatar -->
							<a
								href="/users/{comment.user_id}"
								class="shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
								tabindex="0"
								aria-label="{comment.author_username}'s profile"
							>
								<img
									src={getAvatarURL(comment.user_id, comment.author_avatar ?? "0", 40)}
									alt="{comment.author_username}'s avatar"
									width="40"
									height="40"
									loading="lazy"
									class="w-10 h-10 rounded-full border border-border bg-muted object-cover"
									on:error={(e) => {
										(e.currentTarget as HTMLImageElement).src =
											"https://cdn.discordapp.com/embed/avatars/0.png";
									}}
								/>
							</a>

							<!-- Name + rating + date -->
							<div class="flex-1 min-w-0">
								<div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
									<a
										href="/users/{comment.user_id}"
										class="text-sm font-semibold text-foreground hover:underline truncate"
									>
										{comment.author_username}
									</a>
									{#if isOwner(comment.user_id)}
										<span
											class="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/30 px-1.5 py-0.5 text-[10px] font-semibold text-primary leading-none"
										>
											<svg
												class="w-2.5 h-2.5"
												viewBox="0 0 24 24"
												fill="currentColor"
												aria-hidden="true"
												><path
													d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"
												/></svg
											>
											Developer
										</span>
									{/if}
									{#if comment.rating != null}
										<div
											class="flex items-center gap-0.5"
											aria-label="Rated {ratingFromInt(comment.rating)} out of 5"
										>
											{#each [1, 2, 3, 4, 5] as pos}
												<svg
													class="w-3.5 h-3.5 {starFill(pos, ratingFromInt(comment.rating)) ===
													'empty'
														? 'text-muted-foreground/25'
														: 'text-yellow-400'}"
													viewBox="0 0 24 24"
													aria-hidden="true"
												>
													{#if starFill(pos, ratingFromInt(comment.rating)) === "full"}
														<path
															d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
															fill="currentColor"
														/>
													{:else if starFill(pos, ratingFromInt(comment.rating)) === "half"}
														<defs>
															<linearGradient
																id="half-c-{comment.id}-{pos}"
																x1="0"
																x2="1"
																y1="0"
																y2="0"
															>
																<stop offset="50%" stop-color="currentColor" />
																<stop offset="50%" stop-color="transparent" />
															</linearGradient>
														</defs>
														<path
															d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
															fill="url(#half-c-{comment.id}-{pos})"
															stroke="currentColor"
															stroke-width="1"
														/>
													{:else}
														<path
															d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
															fill="none"
															stroke="currentColor"
															stroke-width="1.5"
														/>
													{/if}
												</svg>
											{/each}
											<span class="ml-1 text-xs font-bold text-foreground tabular-nums">
												{ratingFromInt(comment.rating).toFixed(1)}
											</span>
										</div>
									{/if}
								</div>
								<p class="text-xs text-muted-foreground mt-0.5">
									<time datetime={comment.created_at} title={formatDate(comment.created_at)}>
										{formatRelative(comment.created_at)}
									</time>
									{#if comment.updated_at}
										<span class="ml-1 opacity-60">(edited)</span>
									{/if}
								</p>
							</div>

							<!-- Actions: edit / delete (own comment) -->
							{#if user && user.id === comment.user_id && editingId !== comment.id}
								<div class="flex items-center gap-1 ml-auto shrink-0">
									<button
										on:click={() => startEdit(comment)}
										title="Edit review"
										class="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
										aria-label="Edit review"
									>
										<svg
											class="w-3.5 h-3.5"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											aria-hidden="true"
										>
											<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
											<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
										</svg>
									</button>
									<button
										on:click={() => (deletingId = comment.id)}
										title="Delete review"
										class="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
										aria-label="Delete review"
									>
										<svg
											class="w-3.5 h-3.5"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											aria-hidden="true"
										>
											<polyline points="3 6 5 6 21 6" />
											<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
											<path d="M10 11v6" />
											<path d="M14 11v6" />
											<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
										</svg>
									</button>
								</div>
							{/if}
						</div>

						<!-- Inline edit form -->
						{#if editingId === comment.id}
							<div class="px-4 pb-4 border-t border-border/50 pt-3 bg-muted/10">
								<!-- Edit star rating -->
								<div
									class="flex items-center gap-1 mb-3"
									role="radiogroup"
									aria-label="New star rating"
								>
									{#each [1, 2, 3, 4, 5] as pos}
										<button
											type="button"
											class="relative w-7 h-7 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
											aria-label="{pos - 0.5} stars"
											on:mousemove={(e) => (editHoverRating = ratingFromEvent(e, pos))}
											on:mouseleave={() => (editHoverRating = 0)}
											on:click={(e) => (editRating = ratingFromEvent(e, pos))}
										>
											<svg
												class="w-7 h-7 transition-colors {starFill(
													pos,
													editHoverRating || editRating
												) === 'empty'
													? 'text-muted-foreground/30'
													: 'text-yellow-400'}"
												viewBox="0 0 24 24"
												aria-hidden="true"
											>
												{#if starFill(pos, editHoverRating || editRating) === "full"}
													<path
														d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
														fill="currentColor"
													/>
												{:else if starFill(pos, editHoverRating || editRating) === "half"}
													<defs>
														<linearGradient id="half-edit-{pos}" x1="0" x2="1" y1="0" y2="0">
															<stop offset="50%" stop-color="currentColor" />
															<stop offset="50%" stop-color="transparent" />
														</linearGradient>
													</defs>
													<path
														d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
														fill="url(#half-edit-{pos})"
														stroke="currentColor"
														stroke-width="1.5"
													/>
												{:else}
													<path
														d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
														fill="none"
														stroke="currentColor"
														stroke-width="1.5"
													/>
												{/if}
											</svg>
										</button>
									{/each}
									{#if editRating > 0}
										<span class="ml-1.5 text-xs font-bold text-foreground tabular-nums"
											>{editRating.toFixed(1)}</span
										>
									{/if}
								</div>

								<textarea
									bind:value={editText}
									rows={3}
									maxlength={2000}
									disabled={editSubmitting}
									placeholder="Edit your review…"
									class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-50 mb-2"
								></textarea>

								<div class="flex items-center justify-between gap-2">
									<span class="text-xs text-muted-foreground">{editText.length}/2000</span>
									<div class="flex items-center gap-2">
										{#if editError}
											<p class="text-xs text-destructive">{editError}</p>
										{/if}
										<button
											on:click={cancelEdit}
											disabled={editSubmitting}
											class="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
										>
											Cancel
										</button>
										<button
											on:click={() => submitEdit(comment.id, false)}
											disabled={editSubmitting}
											class="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
										>
											{editSubmitting ? "Saving…" : "Save"}
										</button>
									</div>
								</div>
							</div>

							<!-- Comment body (not editing) -->
						{:else if comment.text}
							<p
								class="px-4 pb-3 text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words"
							>
								{comment.text}
							</p>
						{/if}

						<!-- Reactions row (top-level comment) -->
						{#if editingId !== comment.id}
							{@const activeReactions = comment.reactions.filter((r) => r.count > 0)}
							<div class="px-4 pb-3 flex flex-wrap items-center gap-1" aria-label="Reactions">
								<!-- Only show pills for emojis that have at least one reaction -->
								{#each activeReactions as reaction (reaction.emoji)}
									{@const pending = reactionPending.has(`${comment.id}:${reaction.emoji}`)}
									<button
										type="button"
										on:click={() => toggleReaction(comment.id, reaction.emoji)}
										disabled={pending}
										title={reactionAltText(reaction.emoji, reaction.count, reaction.reacted)}
										aria-label={reactionAltText(reaction.emoji, reaction.count, reaction.reacted)}
										aria-pressed={reaction.reacted}
										class="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs font-medium transition-all select-none
											{reaction.reacted
											? 'border-primary/60 bg-primary/10 text-primary'
											: 'border-border/60 bg-muted/40 text-muted-foreground hover:border-border hover:bg-muted/80 hover:text-foreground'}
											{pending ? 'opacity-60 cursor-wait' : 'cursor-pointer'}
											disabled:opacity-50"
									>
										<span aria-hidden="true">{EMOJI_GLYPH[reaction.emoji]}</span>
										<span class="tabular-nums">{reaction.count}</span>
									</button>
								{/each}

								<!-- Add-reaction picker button -->
								<div class="relative">
									<button
										id="reaction-trigger-{comment.id}"
										type="button"
										on:click={() =>
											(pickerOpenFor = pickerOpenFor === comment.id ? null : comment.id)}
										title="Add reaction"
										aria-label="Add reaction"
										aria-expanded={pickerOpenFor === comment.id}
										class="inline-flex items-center justify-center w-6 h-6 rounded-full border border-dashed border-border/60 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/60 transition-all"
									>
										<svg
											class="w-3 h-3"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2.5"
											stroke-linecap="round"
											stroke-linejoin="round"
											aria-hidden="true"
										>
											<path d="M12 5v14M5 12h14" />
										</svg>
									</button>

									{#if pickerOpenFor === comment.id}
										<div
											id="reaction-picker-{comment.id}"
											class="absolute bottom-full left-0 mb-1.5 z-50 flex gap-1 rounded-xl border border-border bg-popover p-1.5 shadow-lg"
											role="menu"
											aria-label="Choose a reaction"
										>
											{#each REACTION_EMOJIS as emoji}
												{@const pending = reactionPending.has(`${comment.id}:${emoji}`)}
												{@const reacted =
													comment.reactions.find((r) => r.emoji === emoji)?.reacted ?? false}
												<button
													type="button"
													role="menuitem"
													on:click={() => {
														toggleReaction(comment.id, emoji);
														pickerOpenFor = null;
													}}
													disabled={pending}
													title={EMOJI_LABEL[emoji]}
													aria-label="{EMOJI_LABEL[emoji]}{reacted ? ' · Remove reaction' : ''}"
													class="flex items-center justify-center w-8 h-8 rounded-lg text-base transition-all hover:bg-muted/80 hover:scale-125
														{reacted ? 'bg-primary/10 ring-1 ring-primary/40' : ''}
														{pending ? 'opacity-50 cursor-wait' : 'cursor-pointer'}"
												>
													{EMOJI_GLYPH[emoji]}
												</button>
											{/each}
										</div>
									{/if}
								</div>
							</div>
						{/if}

						<!-- Delete confirmation -->
						{#if deletingId === comment.id}
							<div
								class="px-4 pb-4 pt-2 border-t border-border/50 bg-destructive/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
							>
								<p class="text-sm font-medium text-foreground">
									Delete this review? This cannot be undone and will also remove all replies.
								</p>
								<div class="flex gap-2 shrink-0">
									<button
										on:click={() => (deletingId = null)}
										disabled={deleteSubmitting}
										class="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
									>
										Cancel
									</button>
									<button
										on:click={() => confirmDelete(comment.id)}
										disabled={deleteSubmitting}
										class="rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
									>
										{deleteSubmitting ? "Deleting…" : "Delete"}
									</button>
								</div>
							</div>
						{/if}

						<!-- Replies section -->
						{#if (comment.replies && comment.replies.length > 0) || (user && replyOpenFor !== comment.id)}
							<div class="border-t border-border/40">
								<!-- Existing replies -->
								{#if comment.replies && comment.replies.length > 0}
									<ol class="list-none flex flex-col gap-2 p-3" aria-label="Replies">
										{#each comment.replies as reply (reply.id)}
											<li
												class="flex items-start gap-3 px-3 py-3 rounded-lg bg-muted/30 border-l-2
												{isOwner(reply.user_id) ? 'border-primary/60 bg-primary/5' : 'border-border/60'}"
											>
												<!-- Reply avatar -->
												<a
													href="/users/{reply.user_id}"
													class="shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
													aria-label="{reply.author_username}'s profile"
												>
													<img
														src={getAvatarURL(reply.user_id, reply.author_avatar ?? "0", 32)}
														alt="{reply.author_username}'s avatar"
														width="32"
														height="32"
														loading="lazy"
														class="w-8 h-8 rounded-full border border-border bg-muted object-cover"
														on:error={(e) => {
															(e.currentTarget as HTMLImageElement).src =
																"https://cdn.discordapp.com/embed/avatars/0.png";
														}}
													/>
												</a>

												<div class="flex-1 min-w-0">
													<div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
														<a
															href="/users/{reply.user_id}"
															class="text-xs font-semibold text-foreground hover:underline truncate"
														>
															{reply.author_username}
														</a>
														{#if isOwner(reply.user_id)}
															<span
																class="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/30 px-1.5 py-0.5 text-[10px] font-semibold text-primary leading-none"
															>
																<svg
																	class="w-2.5 h-2.5"
																	viewBox="0 0 24 24"
																	fill="currentColor"
																	aria-hidden="true"
																	><path
																		d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"
																	/></svg
																>
																Official Reply
															</span>
														{/if}
														<time
															datetime={reply.created_at}
															class="text-xs text-muted-foreground"
															title={formatDate(reply.created_at)}
														>
															{formatRelative(reply.created_at)}
														</time>
														{#if reply.updated_at}
															<span class="text-xs text-muted-foreground/60">(edited)</span>
														{/if}
													</div>

													<!-- Reply inline edit -->
													{#if editingId === reply.id}
														<div class="mt-2">
															<textarea
																bind:value={editText}
																rows={2}
																maxlength={2000}
																disabled={editSubmitting}
																placeholder="Edit your reply…"
																class="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-50 mb-1.5"
															></textarea>
															<div class="flex items-center justify-end gap-2">
																{#if editError}
																	<p class="text-xs text-destructive mr-auto">{editError}</p>
																{/if}
																<button
																	on:click={cancelEdit}
																	disabled={editSubmitting}
																	class="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
																>
																	Cancel
																</button>
																<button
																	on:click={() => submitEdit(reply.id, true)}
																	disabled={editSubmitting}
																	class="rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
																>
																	{editSubmitting ? "Saving…" : "Save"}
																</button>
															</div>
														</div>
													{:else}
														<p
															class="text-xs text-foreground/90 leading-relaxed mt-0.5 whitespace-pre-wrap break-words"
														>
															{reply.text ?? ""}
														</p>
													{/if}

													<!-- Reply reactions -->
													{#if editingId !== reply.id}
														{@const activeReplyReactions = reply.reactions.filter(
															(r) => r.count > 0
														)}
														<div
															class="mt-2 flex flex-wrap items-center gap-1"
															aria-label="Reactions"
														>
															{#each activeReplyReactions as reaction (reaction.emoji)}
																{@const pending = reactionPending.has(
																	`${reply.id}:${reaction.emoji}`
																)}
																<button
																	type="button"
																	on:click={() => toggleReaction(reply.id, reaction.emoji)}
																	disabled={pending}
																	title={reactionAltText(
																		reaction.emoji,
																		reaction.count,
																		reaction.reacted
																	)}
																	aria-label={reactionAltText(
																		reaction.emoji,
																		reaction.count,
																		reaction.reacted
																	)}
																	aria-pressed={reaction.reacted}
																	class="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs font-medium transition-all select-none
																		{reaction.reacted
																		? 'border-primary/60 bg-primary/10 text-primary'
																		: 'border-border/60 bg-muted/40 text-muted-foreground hover:border-border hover:bg-muted/80 hover:text-foreground'}
																		{pending ? 'opacity-60 cursor-wait' : 'cursor-pointer'}
																		disabled:opacity-50"
																>
																	<span aria-hidden="true">{EMOJI_GLYPH[reaction.emoji]}</span>
																	<span class="tabular-nums">{reaction.count}</span>
																</button>
															{/each}

															<!-- Add-reaction picker button (reply) -->
															<div class="relative">
																<button
																	id="reaction-trigger-{reply.id}"
																	type="button"
																	on:click={() =>
																		(pickerOpenFor = pickerOpenFor === reply.id ? null : reply.id)}
																	title="Add reaction"
																	aria-label="Add reaction"
																	aria-expanded={pickerOpenFor === reply.id}
																	class="inline-flex items-center justify-center w-5 h-5 rounded-full border border-dashed border-border/60 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/60 transition-all text-xs"
																>
																	<svg
																		class="w-2.5 h-2.5"
																		viewBox="0 0 24 24"
																		fill="none"
																		stroke="currentColor"
																		stroke-width="2.5"
																		stroke-linecap="round"
																		stroke-linejoin="round"
																		aria-hidden="true"
																	>
																		<path d="M12 5v14M5 12h14" />
																	</svg>
																</button>

																{#if pickerOpenFor === reply.id}
																	<div
																		id="reaction-picker-{reply.id}"
																		class="absolute bottom-full left-0 mb-1.5 z-50 flex gap-1 rounded-xl border border-border bg-popover p-1.5 shadow-lg"
																		role="menu"
																		aria-label="Choose a reaction"
																	>
																		{#each REACTION_EMOJIS as emoji}
																			{@const pending = reactionPending.has(`${reply.id}:${emoji}`)}
																			{@const reacted =
																				reply.reactions.find((r) => r.emoji === emoji)?.reacted ??
																				false}
																			<button
																				type="button"
																				role="menuitem"
																				on:click={() => {
																					toggleReaction(reply.id, emoji);
																					pickerOpenFor = null;
																				}}
																				disabled={pending}
																				title={EMOJI_LABEL[emoji]}
																				aria-label="{EMOJI_LABEL[emoji]}{reacted
																					? ' · Remove reaction'
																					: ''}"
																				class="flex items-center justify-center w-8 h-8 rounded-lg text-base transition-all hover:bg-muted/80 hover:scale-125
																					{reacted ? 'bg-primary/10 ring-1 ring-primary/40' : ''}
																					{pending ? 'opacity-50 cursor-wait' : 'cursor-pointer'}"
																			>
																				{EMOJI_GLYPH[emoji]}
																			</button>
																		{/each}
																	</div>
																{/if}
															</div>
														</div>
													{/if}
												</div>

												<!-- Reply own actions -->
												{#if user && user.id === reply.user_id && editingId !== reply.id}
													<div class="flex items-center gap-0.5 ml-auto shrink-0">
														<button
															on:click={() => startEdit(reply)}
															title="Edit reply"
															class="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
															aria-label="Edit reply"
														>
															<svg
																class="w-3 h-3"
																viewBox="0 0 24 24"
																fill="none"
																stroke="currentColor"
																stroke-width="2"
																stroke-linecap="round"
																stroke-linejoin="round"
																aria-hidden="true"
															>
																<path
																	d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
																/>
																<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
															</svg>
														</button>
														<button
															on:click={() => (deletingId = reply.id)}
															title="Delete reply"
															class="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
															aria-label="Delete reply"
														>
															<svg
																class="w-3 h-3"
																viewBox="0 0 24 24"
																fill="none"
																stroke="currentColor"
																stroke-width="2"
																stroke-linecap="round"
																stroke-linejoin="round"
																aria-hidden="true"
															>
																<polyline points="3 6 5 6 21 6" />
																<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
																<path d="M10 11v6" />
																<path d="M14 11v6" />
																<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
															</svg>
														</button>
													</div>
												{/if}

												<!-- Delete confirmation (reply) -->
												{#if deletingId === reply.id}
													<div
														class="col-span-full mt-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
													>
														<p class="text-xs font-medium text-foreground">Delete this reply?</p>
														<div class="flex gap-2">
															<button
																on:click={() => (deletingId = null)}
																class="rounded px-2.5 py-1 text-xs border border-border hover:bg-muted transition-colors"
																>Cancel</button
															>
															<button
																on:click={() => confirmDelete(reply.id)}
																disabled={deleteSubmitting}
																class="rounded px-2.5 py-1 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
																>{deleteSubmitting ? "Deleting…" : "Delete"}</button
															>
														</div>
													</div>
												{/if}
											</li>
										{/each}
									</ol>
								{/if}

								<!-- Reply input box -->
								{#if user}
									{#if replyOpenFor === comment.id}
										<div class="px-4 py-3 bg-muted/10">
											<div class="flex items-start gap-2">
												<img
													src={getAvatarURL(user.id, user.avatar ?? "0", 28)}
													alt="Your avatar"
													width="28"
													height="28"
													loading="lazy"
													class="w-7 h-7 rounded-full border border-border shrink-0 mt-0.5"
												/>
												<div class="flex-1">
													<textarea
														bind:value={replyText}
														rows={2}
														maxlength={2000}
														disabled={replySubmitting}
														placeholder="Write a reply…"
														class="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-50"
													></textarea>
													<div class="flex items-center justify-end gap-2 mt-1.5">
														{#if replyError}
															<p class="text-xs text-destructive mr-auto">{replyError}</p>
														{/if}
														<button
															on:click={() => {
																replyOpenFor = null;
																replyText = "";
																replyError = "";
															}}
															disabled={replySubmitting}
															class="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
														>
															Cancel
														</button>
														<button
															on:click={() => submitReply(comment.id)}
															disabled={replySubmitting || !replyText.trim()}
															class="rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
														>
															{replySubmitting ? "Posting…" : "Reply"}
														</button>
													</div>
												</div>
											</div>
										</div>
									{:else}
										<div class="px-4 py-2">
											<button
												on:click={() => {
													replyOpenFor = comment.id;
													replyText = "";
													replyError = "";
												}}
												class="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
											>
												<svg
													class="w-3.5 h-3.5"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"
													aria-hidden="true"
												>
													<path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
												</svg>
												Reply
											</button>
										</div>
									{/if}
								{:else}
									<!-- Not logged in: tiny reply prompt -->
									<div class="px-4 py-2">
										<button
											on:click={goLogin}
											class="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
										>
											<svg
												class="w-3.5 h-3.5"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
												aria-hidden="true"
											>
												<path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
											</svg>
											Log in to reply
										</button>
									</div>
								{/if}
							</div>
						{:else if user}
							<!-- No replies yet, show reply button directly -->
							<div class="border-t border-border/40 px-4 py-2">
								{#if replyOpenFor === comment.id}
									<div class="flex items-start gap-2 mt-1">
										<img
											src={getAvatarURL(user.id, user.avatar ?? "0", 28)}
											alt="Your avatar"
											width="28"
											height="28"
											loading="lazy"
											class="w-7 h-7 rounded-full border border-border shrink-0 mt-0.5"
										/>
										<div class="flex-1">
											<textarea
												bind:value={replyText}
												rows={2}
												maxlength={2000}
												disabled={replySubmitting}
												placeholder="Write a reply…"
												class="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-50"
											></textarea>
											<div class="flex items-center justify-end gap-2 mt-1.5">
												{#if replyError}
													<p class="text-xs text-destructive mr-auto">{replyError}</p>
												{/if}
												<button
													on:click={() => {
														replyOpenFor = null;
														replyText = "";
														replyError = "";
													}}
													disabled={replySubmitting}
													class="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
												>
													Cancel
												</button>
												<button
													on:click={() => submitReply(comment.id)}
													disabled={replySubmitting || !replyText.trim()}
													class="rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
												>
													{replySubmitting ? "Posting…" : "Reply"}
												</button>
											</div>
										</div>
									</div>
								{:else}
									<button
										on:click={() => {
											replyOpenFor = comment.id;
											replyText = "";
											replyError = "";
										}}
										class="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
									>
										<svg
											class="w-3.5 h-3.5"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											aria-hidden="true"
										>
											<path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
										</svg>
										Reply
									</button>
								{/if}
							</div>
						{:else}
							<div class="border-t border-border/40 px-4 py-2">
								<button
									on:click={goLogin}
									class="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
								>
									<svg
										class="w-3.5 h-3.5"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										aria-hidden="true"
									>
										<path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
									</svg>
									Log in to reply
								</button>
							</div>
						{/if}
					</div>
				</li>
			{/each}
		</ol>
	{/if}
</section>
