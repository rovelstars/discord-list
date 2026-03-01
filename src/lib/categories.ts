/**
 * categories.ts
 *
 * Central registry of every supported bot category.
 * Lives in $lib so it can be imported by both the +page.server.ts route
 * (for the DB query keyword) and the +page.svelte (for rendering metadata)
 * without triggering SvelteKit's invalid-export warning that fires when
 * non-route symbols are exported directly from a +page.server.ts file.
 */

export interface CategoryMeta {
	name: string;
	/** Keyword passed to the DB LIKE query */
	keyword: string;
	emoji: string;
	/** Path to the icon image under /assets/img/ */
	icon: string;
	headline: string;
	/** Short description used in SEO meta and category cards */
	description: string;
	/** Longer paragraph shown on the category landing page */
	longDescription: string;
	faqs: { q: string; a: string }[];
	/** Slugs of related categories shown at the bottom of the page */
	relatedSlugs: string[];
}

export const CATEGORIES: Record<string, CategoryMeta> = {
	music: {
		name: "Music Bots",
		keyword: "music",
		emoji: "🎵",
		icon: "/assets/img/bot/wink.svg",
		headline: "The Best Discord Music Bots",
		description:
			"Stream music from YouTube, Spotify, SoundCloud and more. Queue management, equaliser, lyrics and 24/7 playback — everything your listening party needs.",
		longDescription:
			"Music bots are the most popular category on Discord by a wide margin. They let your server members queue songs, manage playlists, apply audio filters and listen together in voice channels. The best music bots support multiple sources (YouTube, Spotify, SoundCloud, Apple Music), offer reliable 24/7 uptime, and include useful extras like lyrics display, bass boost, and DJ role restrictions.",
		faqs: [
			{
				q: "What is the best music bot for Discord?",
				a: "The best music bot depends on your needs. For YouTube & Spotify support with high audio quality, look for bots near the top of this page — they are ranked by how many Discord servers actively use them."
			},
			{
				q: "Do Discord music bots still work in 2024?",
				a: "Yes — while some older bots were affected by YouTube API changes, many modern music bots have adapted by supporting multiple audio sources and using updated extraction methods. The bots listed here are community-verified to be working."
			},
			{
				q: "Can I use a music bot in multiple servers?",
				a: "Yes. Most public music bots can be invited to as many servers as you own. Simply invite the bot using its invite link and it will work independently in each server."
			},
			{
				q: "How do I add a music bot to my Discord server?",
				a: "Click the invite link on the bot's detail page, select your server from the dropdown, and authorise the required permissions. The bot will join your server immediately."
			}
		],
		relatedSlugs: ["utility", "fun", "announce"]
	},

	moderation: {
		name: "Moderation Bots",
		keyword: "moder",
		emoji: "🛡️",
		icon: "/assets/img/mod.svg",
		headline: "Best Discord Moderation Bots",
		description:
			"Keep your community safe and healthy. Auto-mod, anti-spam, logging, mute/ban commands and raid protection — the essential toolkit for any growing server.",
		longDescription:
			"As Discord servers grow, manual moderation becomes impossible. Moderation bots fill the gap by automatically filtering hate speech, spam and NSFW content; issuing warnings; managing mutes, kicks and bans; and keeping detailed audit logs. A good moderation bot is the backbone of any healthy community, silently enforcing your rules around the clock.",
		faqs: [
			{
				q: "What features should a good Discord moderation bot have?",
				a: "Look for: auto-mod rules (spam, invite links, bad words), a warning system with escalating punishments, detailed logging to a mod channel, anti-raid protection, and slash command support for fast manual actions."
			},
			{
				q: "Are moderation bots safe to give admin permissions?",
				a: "Most moderation bots only need 'Manage Messages', 'Kick Members', 'Ban Members' and 'Manage Roles' — not full Administrator. Only grant the minimum permissions each bot actually needs."
			},
			{
				q: "Can a moderation bot automatically remove spam?",
				a: "Yes. Most modern moderation bots include auto-mod features that can detect and delete spam messages, repeated messages, excessive mentions, and invite link advertisements without any human intervention."
			}
		],
		relatedSlugs: ["logging", "utility", "announce"]
	},

	gaming: {
		name: "Gaming & Esports Bots",
		keyword: "game",
		emoji: "🎮",
		icon: "/assets/img/game-controller.svg",
		headline: "Best Discord Gaming & Esports Bots",
		description:
			"Organise tournaments, track player stats, run in-chat mini-games and keep your competitive community engaged between matches.",
		longDescription:
			"Gaming bots bring the competitive spirit directly into your Discord server. From tracking player stats for popular games like League of Legends, Valorant and Minecraft to running full tournament brackets, these bots are purpose-built for gaming communities. Many also include in-chat text adventures, trivia games and mini-games to keep members entertained when not actively playing.",
		faqs: [
			{
				q: "What can Discord gaming bots do?",
				a: "Gaming bots can look up player stats, track rankings, organise tournaments and brackets, run in-server mini-games, and integrate with game APIs for live data like match history, leaderboards and server status."
			},
			{
				q: "Is there a Discord bot for tournament organisation?",
				a: "Yes — several bots on this page specialise in running tournaments with bracket generation, match scheduling, result reporting and automated role assignment for winners."
			}
		],
		relatedSlugs: ["economy", "leveling", "fun"]
	},

	economy: {
		name: "Economy Bots",
		keyword: "economy",
		emoji: "💰",
		icon: "/assets/img/bot/moneh.svg",
		headline: "Best Discord Economy Bots",
		description:
			"Virtual currency, shops, gambling, heist events and rich leaderboards. Give your members something to work towards and keep them coming back every day.",
		longDescription:
			"Economy bots introduce a virtual currency system to your Discord server, letting members earn coins through activity, daily rewards, gambling commands and server events. They typically include a shop where members can spend their earnings on custom roles, items or real-world prizes. A well-configured economy system is one of the most effective tools for boosting member retention and daily active participation.",
		faqs: [
			{
				q: "How do economy bots work on Discord?",
				a: "Economy bots assign a virtual currency balance to each server member. Members earn currency through activity (chatting, voice time), daily commands, or minigames. They can then spend it in the server's shop or gamble it for more."
			},
			{
				q: "Can I give members real rewards through an economy bot?",
				a: "Some bots support custom shop items where you can manually fulfill rewards (like real gift cards or custom roles). Check the bot's documentation for details on configuring redeemable items."
			}
		],
		relatedSlugs: ["leveling", "gaming", "fun"]
	},

	utility: {
		name: "Utility Bots",
		keyword: "utility",
		emoji: "🔧",
		icon: "/assets/img/chip.svg",
		headline: "Best Discord Utility Bots",
		description:
			"Server stats, polls, reminders, calculators, weather, translation and the hundreds of other handy tools that make running a Discord server easier.",
		longDescription:
			"Utility bots are the Swiss Army knives of Discord. They don't focus on one thing — they do everything. From posting server statistics and running polls to sending timed reminders, fetching weather data, converting currencies and translating messages in real time, utility bots fill in the gaps that more specialised bots leave. Most server admins keep at least one utility bot alongside their dedicated music and moderation bots.",
		faqs: [
			{
				q: "What is a utility bot on Discord?",
				a: "A utility bot is a general-purpose bot that provides a broad set of helpful commands — polls, reminders, server stats, search tools, calculators and more. They're designed to fill the everyday gaps in your server's functionality."
			},
			{
				q: "Do I need a utility bot if I already have a moderation bot?",
				a: "Yes, in most cases. Moderation bots focus on rule enforcement while utility bots handle day-to-day conveniences like polls, reminders and information lookup. They complement each other well."
			}
		],
		relatedSlugs: ["moderation", "logging", "announce"]
	},

	fun: {
		name: "Fun & Entertainment Bots",
		keyword: "fun",
		emoji: "🎉",
		icon: "/assets/img/bot/love.svg",
		headline: "Best Fun Discord Bots",
		description:
			"Memes, trivia, image manipulation, action commands and social games that keep conversations lively and members coming back for more.",
		longDescription:
			"Fun bots are the lifeblood of social Discord servers. They provide the entertainment layer that keeps conversations going when there's nothing else to talk about. Whether it's generating custom memes, running server-wide trivia tournaments, applying hilarious image filters or running probability games, fun bots turn passive server members into active participants.",
		faqs: [
			{
				q: "What are the most popular fun Discord bots?",
				a: "The most popular fun bots typically offer meme generation, trivia games, image manipulation commands (like distorting or captioning avatars), and social commands like hug, pat and ship. Check the top-rated bots on this page."
			},
			{
				q: "Are there Discord bots for playing games in chat?",
				a: "Yes — many fun bots include text-based games you can play directly in Discord. Common options include trivia, word games, number games, chess and simple card games."
			}
		],
		relatedSlugs: ["gaming", "anime", "economy"]
	},

	anime: {
		name: "Anime & Roleplay Bots",
		keyword: "anime",
		emoji: "⛩️",
		icon: "/assets/img/anime.svg",
		headline: "Best Anime Discord Bots",
		description:
			"Anime search, manga updates, waifu cards, roleplay actions and all the weeb content your server could ever want.",
		longDescription:
			"Anime bots cater to the massive anime and manga community on Discord. They let members search for anime and manga information, get episode notifications for airing shows, collect and battle waifu characters, and engage in anime-themed roleplay. Many servers built around anime fandom rely on these bots as their core feature rather than just a supplement.",
		faqs: [
			{
				q: "Is there a Discord bot for tracking anime episodes?",
				a: "Yes — several anime bots on this page can notify your server when new episodes of currently airing anime drop, pulling data from sources like AniList and MyAnimeList."
			},
			{
				q: "What is a waifu bot on Discord?",
				a: "Waifu bots let members collect anime character cards with varying rarities, trade them with other members, battle opponents and build a personal collection. They're popular in anime-themed servers as an ongoing engagement mechanic."
			}
		],
		relatedSlugs: ["fun", "roleplay", "gaming"]
	},

	leveling: {
		name: "Leveling & XP Bots",
		keyword: "level",
		emoji: "⭐",
		icon: "/assets/img/medal.svg",
		headline: "Best Discord Leveling Bots",
		description:
			"Reward activity with XP, rank cards and role unlocks. A well-configured leveling system turns lurkers into regulars by giving everyone a visible goal.",
		longDescription:
			"Leveling bots track member activity — messages, voice time, reactions — and convert it into experience points. As members accumulate XP they level up, unlocking custom role rewards and climbing a visible server leaderboard. This gamification mechanic is one of the most proven strategies for improving member retention and keeping a server active over the long term.",
		faqs: [
			{
				q: "What is the best leveling bot for Discord?",
				a: "The top leveling bots on this page are ranked by the number of servers using them. Look for bots that offer: customisable rank cards, role rewards at specific levels, XP multipliers for boosters, and a public leaderboard."
			},
			{
				q: "How do Discord leveling bots work?",
				a: "Members earn XP automatically by sending messages and spending time in voice channels. Each level requires more XP than the last. Admins can configure XP rates, blacklist channels, and set role rewards that unlock automatically when a member reaches a certain level."
			}
		],
		relatedSlugs: ["economy", "utility", "moderation"]
	},

	logging: {
		name: "Logging & Audit Bots",
		keyword: "log",
		emoji: "📋",
		icon: "/assets/img/log-format.svg",
		headline: "Best Discord Logging Bots",
		description:
			"Full audit trails, message edit/delete logs, join/leave events, voice channel tracking and mod action history for complete server visibility.",
		longDescription:
			"Logging bots give server admins full visibility into everything happening in their server. Every deleted message, edited message, member join/leave, role change, channel modification and moderation action gets posted to a dedicated log channel. This is invaluable for investigating incidents, identifying ban evaders and maintaining accountability among both members and staff.",
		faqs: [
			{
				q: "Why do I need a logging bot on Discord?",
				a: "Discord's built-in audit log is limited and doesn't capture things like deleted message content. A dedicated logging bot records far more detail — including the content of deleted messages, edit history, and a complete record of moderator actions."
			},
			{
				q: "Can a Discord logging bot record deleted messages?",
				a: "Yes — logging bots that are online when a message is sent cache its content. If the message is later deleted, the bot posts the original content to your log channel. Note that bots cannot retroactively retrieve messages they weren't online to see."
			}
		],
		relatedSlugs: ["moderation", "utility", "announce"]
	},

	roleplay: {
		name: "Roleplay & Social Bots",
		keyword: "roleplay",
		emoji: "💬",
		icon: "/assets/img/heart.svg",
		headline: "Best Discord Roleplay & Social Bots",
		description:
			"Hug, kiss, pat, slap and hundreds of other social interaction commands that bring warmth and personality to your community.",
		longDescription:
			"Social and roleplay bots add a human touch to Discord servers through animated GIF interaction commands. Members can hug, pat, kiss, poke, slap and wave at each other, usually accompanied by a relevant anime GIF. These bots are especially popular in friend groups and community servers where social dynamics and lighthearted interaction are central to the culture.",
		faqs: [
			{
				q: "What commands do roleplay bots have?",
				a: "Typical commands include: hug, pat, kiss, poke, slap, wave, bite, cuddle, feed, and many more. Most return an animated GIF from an anime source to accompany the action, making interactions feel expressive and fun."
			},
			{
				q: "Are roleplay bots appropriate for all servers?",
				a: "Most roleplay bots are designed to be family-friendly by default. Admins can typically configure which commands are allowed and in which channels, giving full control over the content."
			}
		],
		relatedSlugs: ["fun", "anime", "economy"]
	},

	announce: {
		name: "Announcement & Feed Bots",
		keyword: "announce",
		emoji: "📣",
		icon: "/assets/img/announce.svg",
		headline: "Best Discord Announcement Bots",
		description:
			"Auto-post YouTube uploads, Twitch live alerts, Reddit feeds and custom announcements so your community never misses important updates.",
		longDescription:
			"Announcement and feed bots act as automated news desks for your Discord server. They monitor external platforms — YouTube channels, Twitch streams, Twitter/X accounts, Reddit subreddits, RSS feeds — and automatically post to a designated Discord channel the moment new content appears. For content creators and community managers, these bots eliminate the manual work of cross-posting updates.",
		faqs: [
			{
				q: "Can a Discord bot automatically post when I go live on Twitch?",
				a: "Yes — several bots on this page support Twitch live notifications. You configure the Twitch channel to monitor and the Discord channel to post to, and the bot will automatically announce when the stream goes live, including a preview embed."
			},
			{
				q: "Is there a Discord bot that posts Reddit content automatically?",
				a: "Yes — Reddit feed bots let you subscribe to one or more subreddits and automatically post new submissions (with configurable filters for score, flair and NSFW) to a Discord channel of your choice."
			}
		],
		relatedSlugs: ["utility", "moderation", "logging"]
	},

	translate: {
		name: "Translation & Language Bots",
		keyword: "translate",
		emoji: "🌐",
		icon: "/assets/img/translate.svg",
		headline: "Best Discord Translation Bots",
		description:
			"Break language barriers with real-time message translation, automatic language detection and multilingual server support.",
		longDescription:
			"As Discord communities grow globally, language barriers become a real challenge. Translation bots solve this by automatically detecting and translating messages from dozens of languages into your preferred language. Some bots can translate entire channels automatically, while others provide on-demand translation through a reaction or slash command.",
		faqs: [
			{
				q: "Can a Discord bot translate messages automatically?",
				a: "Yes — some translation bots can be configured to automatically translate every message in a designated channel into a target language, making global communities much more accessible."
			},
			{
				q: "How many languages do Discord translation bots support?",
				a: "Most translation bots use Google Translate or DeepL under the hood, giving them access to 100+ languages. Check each bot's page for a specific list of supported language codes."
			}
		],
		relatedSlugs: ["utility", "announce", "fun"]
	}
};

/** Sorted list of all slugs — useful for sitemap generation and the index page. */
export const CATEGORY_SLUGS = Object.keys(CATEGORIES) as (keyof typeof CATEGORIES)[];
