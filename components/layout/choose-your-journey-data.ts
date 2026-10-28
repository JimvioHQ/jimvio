/**
 * Ecosystem cards for Home “Choose Your Journey”.
 * Routes verified against existing app pages.
 */

export type JourneyVisualKey =
  | "marketplace"
  | "commerce"
  | "affiliates"
  | "ugc"
  | "communities"
  | "digital"
  | "monetize"
  | "campaigns"
  | "live"
  | "global"
  | "wallet"
  | "ai";

export type JourneyCardAction =
  | { type: "link"; href: string }
  | { type: "ai" };

export type JourneyCardConfig = {
  id: string;
  title: string;
  description: string;
  bullets: readonly [string, string, string, string];
  cta: string;
  visual: JourneyVisualKey;
  action: JourneyCardAction;
};

export const JOURNEY_CARDS: readonly JourneyCardConfig[] = [
  {
    id: "marketplace",
    title: "Marketplace",
    description:
      "Discover, buy, and sell physical and digital products from verified sellers worldwide.",
    bullets: [
      "Physical & digital products",
      "Verified suppliers",
      "Secure checkout",
      "Global shipping",
    ],
    cta: "Explore Marketplace",
    visual: "marketplace",
    action: { type: "link", href: "/marketplace" },
  },
  {
    id: "commerce",
    title: "Commerce",
    description: "Manage stores, catalog sync, orders and fulfillment in one place.",
    bullets: [
      "Store dashboard",
      "Inventory & orders",
      "Catalog management",
      "Fast & global fulfillment",
    ],
    cta: "Open Commerce",
    visual: "commerce",
    action: { type: "link", href: "/commerce" },
  },
  {
    id: "affiliates",
    title: "Affiliates",
    description: "Promote products and earn commissions with tracking links.",
    bullets: [
      "Custom affiliate links",
      "Real-time tracking",
      "Performance analytics",
      "Multiple payout methods",
    ],
    cta: "Start Earning",
    visual: "affiliates",
    action: { type: "link", href: "/affiliates" },
  },
  {
    id: "ugc",
    title: "UGC & Clipping",
    description: "Connect brands, campaigns and creators through UGC and clips.",
    bullets: [
      "Create UGC content",
      "Make short clips",
      "Join brand campaigns",
      "Get paid per views",
    ],
    cta: "Create Content",
    visual: "ugc",
    action: { type: "link", href: "/ugc" },
  },
  {
    id: "communities",
    title: "Communities",
    description: "Build and join spaces for buyers, sellers and creators.",
    bullets: [
      "Public & private spaces",
      "Live sessions",
      "Courses & events",
      "Member monetization",
    ],
    cta: "Explore Communities",
    visual: "communities",
    action: { type: "link", href: "/communities" },
  },
  {
    id: "digital",
    title: "Digital Products",
    description: "Sell courses, e-books, software and other digital goods.",
    bullets: [
      "Course builder",
      "Digital downloads",
      "Subscriptions",
      "Automated delivery",
    ],
    cta: "Start Selling",
    visual: "digital",
    action: { type: "link", href: "/marketplace/digital" },
  },
  {
    id: "monetize",
    title: "Creator Monetization",
    description: "Turn your content and skills into income across Jimvio tools.",
    bullets: [
      "Multiple income streams",
      "Fan support & subscriptions",
      "Campaign earnings",
      "Payouts to your wallet",
    ],
    cta: "Monetize Now",
    visual: "monetize",
    action: { type: "link", href: "/creator/revenue" },
  },
  {
    id: "campaigns",
    title: "Brand Campaigns",
    description: "Run creator collaborations through UGC and clipping.",
    bullets: [
      "Campaign marketplace",
      "Creator matching",
      "ROI tracking",
      "Real-time analytics",
    ],
    cta: "Find Campaigns",
    visual: "campaigns",
    action: { type: "link", href: "/ugc/campaign-center" },
  },
  {
    id: "live",
    title: "Live Commerce",
    description: "Sell and engage through Jimvio live community tools.",
    bullets: [
      "Go live instantly",
      "Pin products",
      "Multi-platform streaming",
      "Live orders & analytics",
    ],
    cta: "Go Live",
    visual: "live",
    action: { type: "link", href: "/communities/live" },
  },
  {
    id: "global",
    title: "Cross-Border Commerce",
    description: "Reach buyers across supported markets with global checkout.",
    bullets: [
      "Multi-currency support",
      "Global shipping options",
      "Localized checkout",
      "Duty & tax support",
    ],
    cta: "Sell Globally",
    visual: "global",
    action: { type: "link", href: "/commerce" },
  },
  {
    id: "wallet",
    title: "Wallet & Payouts",
    description: "Access supported earnings, withdrawals, and payout methods.",
    bullets: [
      "Track all earnings",
      "Multiple payout methods",
      "Secure withdrawals",
      "Transaction history",
    ],
    cta: "Open Wallet",
    visual: "wallet",
    action: { type: "link", href: "/wallet" },
  },
  {
    id: "ai",
    title: "AI Assistance",
    description: "Use Jimvio AI tools where they are already available in-product.",
    bullets: [
      "Content ideas",
      "Product recommendations",
      "Campaign suggestions",
      "Smart analytics & insights",
    ],
    cta: "Open Jimvio AI",
    visual: "ai",
    action: { type: "ai" },
  },
];
