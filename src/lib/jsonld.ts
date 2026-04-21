/**
 * jsonld.ts
 *
 * Helpers for building schema.org JSON-LD blobs that are emitted inside
 * <script type="application/ld+json"> tags in the document head. Rich
 * structured data gives Google the signal to render rich snippets in SERPs
 * (stars, sitelinks search box, breadcrumb trails, application pills).
 *
 * Usage from a Svelte page:
 *
 *   import { softwareApplicationSchema, breadcrumbSchema } from "$lib/jsonld";
 *
 *   const ld = [
 *     softwareApplicationSchema(bot, canonicalUrl),
 *     breadcrumbSchema([{ name: "Home", url: "/" }, ...])
 *   ];
 *
 *   <SEO ... jsonLd={ld} />
 *
 * Each builder returns a plain JS object. Pass one or an array to the SEO
 * component, which handles safe serialization.
 */

export const SITE_URL = "https://discord.rovelstars.com";
export const SITE_NAME = "Rovel Discord List";

// ---------------------------------------------------------------------------
// Serializer
// ---------------------------------------------------------------------------

/**
 * Serialize a JSON-LD object for safe embedding inside a <script> tag.
 *
 * Only `<` needs escaping — if an attacker-controlled string contains
 * `</script>` the parser would close our tag early. JSON-escaping `<` as
 * `\u003c` avoids that without breaking valid JSON.
 */
export function serializeJsonLd(data: unknown): string {
	return JSON.stringify(data).replace(/</g, "\\u003c");
}

// ---------------------------------------------------------------------------
// Shared input shapes
// ---------------------------------------------------------------------------

export interface BotForSchema {
	id: string;
	slug?: string | null;
	username: string;
	discriminator?: string | null;
	avatar?: string | null;
	short?: string | null;
	servers?: number | null;
	votes?: number | null;
	tags?: string[] | null;
	added_at?: string | null;
	invite?: string | null;
	website?: string | null;
	source_repo?: string | null;
}

export interface BreadcrumbItem {
	name: string;
	/** Absolute URL or path starting with `/`. Paths are expanded to SITE_URL. */
	url: string;
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

/**
 * WebSite schema with a SearchAction so Google may render the sitelinks
 * search box for our brand queries. The `target` URL must match a real
 * search endpoint — we use /bots?q=... which `/bots` already supports.
 */
export function websiteSchema(): Record<string, unknown> {
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: SITE_NAME,
		url: SITE_URL,
		potentialAction: {
			"@type": "SearchAction",
			target: {
				"@type": "EntryPoint",
				urlTemplate: `${SITE_URL}/bots?q={search_term_string}`
			},
			"query-input": "required name=search_term_string"
		}
	};
}

/**
 * SoftwareApplication schema for a bot detail page. Emits the richest
 * fields Google uses for application rich results. Omits `aggregateRating`
 * deliberately — we don't persist pre-aggregated rating values, and
 * emitting invalid rating data is penalised harder than omitting it.
 */
export function softwareApplicationSchema(
	bot: BotForSchema,
	canonicalUrl: string,
	avatarUrl: string
): Record<string, unknown> {
	const schema: Record<string, unknown> = {
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		name: bot.username,
		url: canonicalUrl,
		image: avatarUrl,
		applicationCategory: "CommunicationApplication",
		operatingSystem: "Discord",
		// Discord bots are free to add; emit a zero-cost Offer so Google will
		// consider this entry for application rich results.
		offers: {
			"@type": "Offer",
			price: "0",
			priceCurrency: "USD"
		}
	};

	if (bot.short) schema.description = bot.short;
	if (bot.tags && bot.tags.length > 0) schema.keywords = bot.tags.join(", ");
	if (bot.added_at) schema.datePublished = bot.added_at;

	const sameAs: string[] = [];
	if (bot.website) sameAs.push(bot.website);
	if (bot.source_repo) sameAs.push(bot.source_repo);
	if (sameAs.length > 0) schema.sameAs = sameAs;

	if (bot.invite) schema.installUrl = bot.invite;

	return schema;
}

/**
 * BreadcrumbList schema — lets Google render a breadcrumb trail in search
 * results instead of the raw URL, which significantly improves perceived
 * relevance and click-through rate.
 */
export function breadcrumbSchema(items: BreadcrumbItem[]): Record<string, unknown> {
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: items.map((it, i) => ({
			"@type": "ListItem",
			position: i + 1,
			name: it.name,
			item: it.url.startsWith("http") ? it.url : `${SITE_URL}${it.url}`
		}))
	};
}
