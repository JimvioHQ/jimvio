/**
 * Public brand definition for website copy, metadata, and structured data.
 * Descriptions stay within features the product actually ships.
 * Payment methods, payout options, and country coverage vary.
 */

export const BRAND_NAME = "Jimvio";

/** Primary positioning line. */
export const BRAND_POSITIONING =
  "The All-in-One Creator Commerce & Digital Business Platform";

export const BRAND_TITLE = `${BRAND_NAME} — ${BRAND_POSITIONING}`;

export const CLOSING_LINE =
  "Create. Sell. Connect. Monetize. Grow. All in one place.";

export const MASTER_DEFINITION_PARAGRAPHS = [
  "Jimvio is an all-in-one global creator-commerce and digital business platform that enables individuals, creators, affiliates, brands, sellers, and businesses to discover, create, sell, promote, and monetize physical and digital products, content, and communities—all within one connected ecosystem.",
  "By bringing together e-commerce, product discovery, dropshipping, affiliate marketing, user-generated content (UGC), content clipping campaigns, brand collaborations, digital products, online communities, live streaming, live commerce, creator monetization, business tools, integrated payment and payout capabilities, and AI-powered assistance, Jimvio helps people build, manage, and grow digital businesses and reach customers worldwide.",
] as const;

export const MASTER_DEFINITION = `${MASTER_DEFINITION_PARAGRAPHS[0]}

${MASTER_DEFINITION_PARAGRAPHS[1]}

${CLOSING_LINE}`;

/** Short company profile. Longer than a search snippet. */
export const CONCISE_DEFINITION =
  "Jimvio is an all-in-one global creator-commerce and digital business platform combining e-commerce, dropshipping, affiliate marketing, UGC and clipping campaigns, digital products, brand collaborations, online communities, live streaming, live commerce, creator monetization, payments, and AI-powered business tools in one ecosystem.";

/**
 * Natural meta description. Kept within a typical search snippet
 * so it is not cut mid-phrase.
 */
export const SEO_DESCRIPTION =
  "Jimvio is the all-in-one creator commerce and digital business platform to discover, sell, promote, and grow products, content, and communities.";

export const HERO_SUPPORT =
  "Discover products, start and manage a digital business, sell, collaborate with brands, build communities, and grow — in one connected ecosystem.";

export type EcosystemCategory = {
  id: string;
  title: string;
  description: string;
  href: string;
};

/**
 * Public product areas and the routes that already exist.
 * Commerce and wallet routes may ask the visitor to sign in.
 */
export const PUBLIC_ECOSYSTEM: readonly EcosystemCategory[] = [
  {
    id: "marketplace",
    title: "Marketplace & e-commerce",
    description: "Discover, list, buy, and sell physical and digital products.",
    href: "/marketplace",
  },
  {
    id: "communities",
    title: "Communities & messaging",
    description:
      "Build communities, engage audiences, and message members with the tools available in each space.",
    href: "/communities",
  },
  {
    id: "affiliates",
    title: "Affiliate marketing",
    description:
      "Share tracking links, promote products, and earn a commission when that tracking records a sale.",
    href: "/affiliates",
  },
  {
    id: "ugc",
    title: "UGC & clipping",
    description:
      "Join creator briefs and clipping campaigns, submit content, and follow performance on the campaign.",
    href: "/ugc",
  },
  {
    id: "seller",
    title: "Seller & business tools",
    description:
      "Manage products, storefronts, orders, customers, inventory, and seller analytics in Commerce.",
    href: "/commerce",
  },
  {
    id: "digital",
    title: "Digital products",
    description:
      "Discover and sell supported digital goods, including downloads, courses, templates, and similar listings.",
    href: "/marketplace/digital",
  },
  {
    id: "dropshipping",
    title: "Dropshipping & sourcing",
    description:
      "Import supplier products, sync catalog and stock, and process orders where those Commerce tools are enabled.",
    href: "/commerce",
  },
  {
    id: "collaborations",
    title: "Brand collaborations",
    description:
      "Connect businesses and creators through supported UGC and clipping campaigns.",
    href: "/ugc",
  },
  {
    id: "live",
    title: "Live streaming & live commerce",
    description:
      "Host live sessions from community tools and point viewers to products when a session supports it.",
    href: "/communities",
  },
  {
    id: "monetization",
    title: "Creator monetization",
    description:
      "Monetize eligible products, content, campaigns, and communities. Income is not guaranteed.",
    href: "/ugc",
  },
  {
    id: "payments",
    title: "Payments, wallets & payouts",
    description:
      "Checkout can include card payment, mobile money, crypto, Binance Pay, and wallet balance when offered. Withdrawals support bank, mobile money, crypto, and Binance ID. Available methods vary.",
    href: "/wallet",
  },
  {
    id: "ai",
    title: "AI-powered assistance",
    description:
      "Ask Jimvio AI for help with discovery, selling, and growth. It assists inside the product and does not guarantee results.",
    href: "/ai",
  },
  {
    id: "global",
    title: "Cross-border commerce",
    description:
      "Built for international reach. Shipping, checkout, and payout availability vary by country and product.",
    href: "/marketplace",
  },
  {
    id: "growth",
    title: "Notifications, analytics & growth",
    description:
      "Follow orders, campaign stats, and account activity, and use Help when you need a guide.",
    href: "/help",
  },
];
