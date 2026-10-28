/**
 * Config for the Home “What do you want to build today?” journey.
 * Routes are verified against existing app/ pages only.
 */

export type JourneyPathId =
  | "build"
  | "shop"
  | "sell"
  | "earn"
  | "create"
  | "dropship"
  | "live";

export type JourneyVisualId =
  | "communities"
  | "courses"
  | "post"
  | "buy"
  | "deals"
  | "digital"
  | "sell"
  | "sellToStore"
  | "commerce"
  | "affiliate"
  | "monetize"
  | "partnerships"
  | "ugc"
  | "clipping"
  | "findProducts"
  | "import"
  | "fulfill"
  | "goLive"
  | "multiPlatform"
  | "liveCommerce";

export type JourneyIconId =
  | "users"
  | "shoppingBag"
  | "store"
  | "trendingUp"
  | "wand"
  | "package"
  | "radio"
  | "bookOpen"
  | "fileText"
  | "percent"
  | "laptop"
  | "box"
  | "clipboard"
  | "link"
  | "sparkles"
  | "handshake"
  | "clapperboard"
  | "penLine"
  | "search"
  | "download"
  | "globe"
  | "video"
  | "share2"
  | "shoppingCart"
  | "userCog"
  | "dollarSign"
  | "calendar"
  | "barChart"
  | "grid"
  | "badgeCheck"
  | "truck"
  | "shield"
  | "gift"
  | "wallet"
  | "plus"
  | "megaphone"
  | "crown"
  | "monitor";

export type JourneyCard = {
  id: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  featured?: boolean;
  icon: JourneyIconId;
  visual: JourneyVisualId;
  ctaVariant?: "primary" | "outline" | "link";
};

export type JourneySecondary = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: JourneyIconId;
};

export type JourneyPathConfig = {
  id: JourneyPathId;
  label: string;
  subtitle: string;
  icon: JourneyIconId;
  eyebrow: string;
  headline: string;
  description: string;
  moreWaysTitle: string;
  exploreAllHref?: string;
  exploreAllLabel?: string;
  cards: JourneyCard[];
  secondary: JourneySecondary[];
  ai: {
    title: string;
    description: string;
    placeholder: string;
    suggestions: string[];
  };
};

export const JOURNEY_PATHS: JourneyPathConfig[] = [
  {
    id: "build",
    label: "Build",
    subtitle: "Communities",
    icon: "users",
    eyebrow: "BUILD",
    headline: "Build communities and grow together",
    description:
      "Create spaces for your audience, customers, or community members. Share, engage, monetize, and build long-term relationships.",
    moreWaysTitle: "More ways to build on Jimvio",
    exploreAllHref: "/communities",
    exploreAllLabel: "Explore all community tools",
    cards: [
      {
        id: "build-communities",
        title: "Build Communities",
        description: "Create free or paid communities and grow lasting relationships.",
        cta: "Build Community",
        href: "/communities/create",
        featured: true,
        icon: "users",
        visual: "communities",
        ctaVariant: "primary",
      },
      {
        id: "courses-events",
        title: "Courses & Events",
        description: "Turn your knowledge into courses, events and paid experiences.",
        cta: "Create Experience",
        href: "/communities/courses",
        icon: "bookOpen",
        visual: "courses",
        ctaVariant: "outline",
      },
      {
        id: "post",
        title: "Post",
        description:
          "Create and share posts, stories, photos, videos and more to engage your audience across Jimvio.",
        cta: "Create Post",
        href: "/create/post",
        icon: "fileText",
        visual: "post",
        ctaVariant: "link",
      },
    ],
    secondary: [
      {
        id: "manage-members",
        title: "Manage Members",
        description: "Grow and engage your community.",
        href: "/communities",
        icon: "userCog",
      },
      {
        id: "monetize-content",
        title: "Monetize Content",
        description: "Subscriptions, paid content, and memberships.",
        href: "/creator/revenue",
        icon: "dollarSign",
      },
      {
        id: "host-events",
        title: "Host Events",
        description: "Live sessions, webinars, and community events.",
        href: "/communities/events",
        icon: "calendar",
      },
      {
        id: "build-analytics",
        title: "Analytics",
        description: "Understand growth and engagement.",
        href: "/communities/analytics",
        icon: "barChart",
      },
    ],
    ai: {
      title: "Not sure where to start with building?",
      description:
        "Tell Jimvio what you want to build and get personalized recommendations.",
      placeholder: "What do you want to build?",
      suggestions: [
        "I want to start a community",
        "I want to create a paid community",
        "I want to host online events",
        "I want to monetize my content",
        "I want to grow my audience",
      ],
    },
  },
  {
    id: "shop",
    label: "Shop",
    subtitle: "Discover & Buy",
    icon: "shoppingBag",
    eyebrow: "SHOP",
    headline: "Discover, buy and get inspired",
    description:
      "Explore physical and digital products from sellers and suppliers, plus current deals.",
    moreWaysTitle: "More ways to shop on Jimvio",
    exploreAllHref: "/marketplace",
    exploreAllLabel: "Explore marketplace",
    cards: [
      {
        id: "buy-products",
        title: "Buy Products",
        description: "Browse and buy from verified suppliers worldwide.",
        cta: "Explore Marketplace",
        href: "/marketplace",
        featured: true,
        icon: "shoppingCart",
        visual: "buy",
        ctaVariant: "primary",
      },
      {
        id: "discover-deals",
        title: "Discover Deals",
        description: "Find trending products, flash deals and special offers.",
        cta: "View Deals",
        href: "/marketplace/flash-deals",
        icon: "percent",
        visual: "deals",
        ctaVariant: "outline",
      },
      {
        id: "digital-products",
        title: "Digital Products",
        description: "Explore courses, e-books, software and downloadable products.",
        cta: "Explore Digital",
        href: "/marketplace/digital",
        icon: "laptop",
        visual: "digital",
        ctaVariant: "link",
      },
    ],
    secondary: [
      {
        id: "browse-categories",
        title: "Browse Categories",
        description: "Explore products across all categories.",
        href: "/marketplace",
        icon: "grid",
      },
      {
        id: "verified-suppliers",
        title: "Verified Suppliers",
        description: "Buy from trusted and verified suppliers.",
        href: "/vendors",
        icon: "badgeCheck",
      },
      {
        id: "global-shipping",
        title: "Global Shipping",
        description: "Shop from worldwide suppliers.",
        href: "/marketplace/physical",
        icon: "globe",
      },
      {
        id: "buyer-protection",
        title: "Buyer Protection",
        description: "Secure and safe shopping experience.",
        href: "/help",
        icon: "shield",
      },
    ],
    ai: {
      title: "Not sure what to shop for?",
      description:
        "Tell Jimvio what you're looking for and get personalized product recommendations.",
      placeholder: "What do you want to shop for?",
      suggestions: [
        "I want to buy trending products",
        "Find the best deals",
        "Show me products for my business",
        "Find digital products",
        "Show products with fast shipping",
      ],
    },
  },
  {
    id: "sell",
    label: "Sell",
    subtitle: "Start a Business",
    icon: "store",
    eyebrow: "SELL",
    headline: "Start selling and grow your business",
    description:
      "Launch your store, manage products, fulfill orders and reach customers worldwide.",
    moreWaysTitle: "More ways to sell on Jimvio",
    exploreAllHref: "/commerce",
    exploreAllLabel: "Open Commerce",
    cards: [
      {
        id: "sell-products",
        title: "Sell Products",
        description: "Launch your store, list products, and start selling on Jimvio.",
        cta: "Open Seller Hub",
        href: "/seller/products",
        featured: true,
        icon: "store",
        visual: "sell",
        ctaVariant: "primary",
      },
      {
        id: "sell-to-store",
        title: "Sell to Store",
        description: "Turn marketplace products into store opportunities.",
        cta: "Start Selling",
        href: "/marketplace",
        icon: "box",
        visual: "sellToStore",
        ctaVariant: "outline",
      },
      {
        id: "commerce-management",
        title: "Commerce Management",
        description: "Manage inventory, orders, fulfillment, and store operations.",
        cta: "Open Commerce",
        href: "/commerce",
        icon: "clipboard",
        visual: "commerce",
        ctaVariant: "link",
      },
    ],
    secondary: [
      {
        id: "manage-orders",
        title: "Manage Orders",
        description: "Track and fulfill customer orders.",
        href: "/commerce/orders",
        icon: "box",
      },
      {
        id: "inventory-catalog",
        title: "Inventory & Catalog",
        description: "Keep your catalog and stock in sync.",
        href: "/commerce/inventory",
        icon: "store",
      },
      {
        id: "shipping-fulfillment",
        title: "Shipping & Fulfillment",
        description: "Ship orders with confidence.",
        href: "/commerce/shipping",
        icon: "truck",
      },
      {
        id: "sell-analytics",
        title: "Analytics",
        description: "Measure sales and store performance.",
        href: "/commerce/analytics",
        icon: "barChart",
      },
    ],
    ai: {
      title: "Not sure what to sell?",
      description:
        "Tell Jimvio what you want to sell and get personalized product recommendations.",
      placeholder: "What do you want to sell?",
      suggestions: [
        "I want to sell trending products",
        "I want to start a dropshipping store",
        "I want to sell digital products",
        "I want to find profitable products",
        "I want to grow my brand",
      ],
    },
  },
  {
    id: "earn",
    label: "Earn",
    subtitle: "Make Income",
    icon: "trendingUp",
    eyebrow: "EARN",
    headline: "Earn income and grow your revenue",
    description:
      "Join affiliate programs, promote products, create content and earn commissions worldwide.",
    moreWaysTitle: "More ways to earn on Jimvio",
    exploreAllHref: "/affiliates",
    exploreAllLabel: "Explore earning tools",
    cards: [
      {
        id: "affiliate-marketplace",
        title: "Affiliate Marketplace",
        description: "Promote products and earn commissions with tracked links.",
        cta: "Browse Products",
        href: "/affiliates",
        featured: true,
        icon: "link",
        visual: "affiliate",
        ctaVariant: "primary",
      },
      {
        id: "content-monetization",
        title: "Content Monetization",
        description: "Create content for brands and earn from campaigns.",
        cta: "Explore Campaigns",
        href: "/ugc",
        icon: "sparkles",
        visual: "monetize",
        ctaVariant: "outline",
      },
      {
        id: "creator-partnerships",
        title: "Creator Partnerships",
        description: "Find brand collaborations and paid opportunities.",
        cta: "Find Opportunities",
        href: "/ugc/brand-deals",
        icon: "handshake",
        visual: "partnerships",
        ctaVariant: "link",
      },
    ],
    secondary: [
      {
        id: "track-earnings",
        title: "Track Earnings",
        description: "Monitor your commissions and performance.",
        href: "/affiliates/dashboard",
        icon: "trendingUp",
      },
      {
        id: "campaigns-offers",
        title: "Campaigns & Offers",
        description: "Join brand campaigns and special offers.",
        href: "/ugc",
        icon: "gift",
      },
      {
        id: "payouts",
        title: "Payouts",
        description: "Get paid securely to your preferred method.",
        href: "/affiliates/payouts",
        icon: "wallet",
      },
      {
        id: "earn-analytics",
        title: "Analytics",
        description: "Understand your growth and earnings.",
        href: "/affiliates/analytics",
        icon: "barChart",
      },
    ],
    ai: {
      title: "Not sure how to start earning?",
      description:
        "Tell Jimvio what you want to earn from and get personalized recommendations.",
      placeholder: "What do you want to earn from?",
      suggestions: [
        "I want to promote products",
        "I want to earn from my content",
        "I want to join brand campaigns",
        "I want to find high paying offers",
        "I want to grow my audience",
      ],
    },
  },
  {
    id: "create",
    label: "Create",
    subtitle: "Content & UGC",
    icon: "wand",
    eyebrow: "CREATE",
    headline: "Create content and grow your audience",
    description:
      "Share your creativity, create posts, UGC and video content, and turn your content into real opportunities.",
    moreWaysTitle: "More ways to create on Jimvio",
    exploreAllHref: "/ugc",
    exploreAllLabel: "Explore creator tools",
    cards: [
      {
        id: "create-ugc",
        title: "Create UGC Content",
        description: "Get paid for authentic content that matches brand briefs.",
        cta: "Create UGC Content",
        href: "/ugc",
        featured: true,
        icon: "sparkles",
        visual: "ugc",
        ctaVariant: "primary",
      },
      {
        id: "clipping",
        title: "Clipping (Get Paid Per Views)",
        description: "Create short clips and earn based on performance.",
        cta: "Start Clipping",
        href: "/ugc/clipping",
        icon: "clapperboard",
        visual: "clipping",
        ctaVariant: "outline",
      },
      {
        id: "create-posts",
        title: "Create Posts",
        description: "Share stories, photos, and videos that drive engagement.",
        cta: "Create Post",
        href: "/create/post",
        icon: "penLine",
        visual: "post",
        ctaVariant: "link",
      },
    ],
    secondary: [
      {
        id: "stories",
        title: "Stories",
        description: "Share daily moments with your audience.",
        href: "/create/post",
        icon: "plus",
      },
      {
        id: "live-content",
        title: "Live Content",
        description: "Go live, interact and grow in real time.",
        href: "/communities/live",
        icon: "radio",
      },
      {
        id: "campaign-content",
        title: "Create Campaign Content",
        description: "Make UGC for brands and earn from campaigns.",
        href: "/ugc",
        icon: "megaphone",
      },
      {
        id: "content-analytics",
        title: "Content Analytics",
        description: "Track your content performance.",
        href: "/ugc/analytics",
        icon: "barChart",
      },
    ],
    ai: {
      title: "Not sure what to create?",
      description:
        "Tell Jimvio what you want to create and get personalized recommendations.",
      placeholder: "What do you want to create?",
      suggestions: [
        "I want to create UGC content",
        "I want to make short clips",
        "I want to create a post",
        "I want to go live",
        "I want to create content for a campaign",
      ],
    },
  },
  {
    id: "dropship",
    label: "Dropship",
    subtitle: "Products",
    icon: "package",
    eyebrow: "DROPSHIP",
    headline: "Find, import and sell products worldwide",
    description:
      "Browse dropshipping products, import them to your store and sell with supplier fulfillment.",
    moreWaysTitle: "More ways to dropship on Jimvio",
    exploreAllHref: "/commerce",
    exploreAllLabel: "Open Commerce",
    cards: [
      {
        id: "find-products",
        title: "Find Products",
        description: "Browse products ready to import and sell worldwide.",
        cta: "Browse Products",
        href: "/marketplace",
        featured: true,
        icon: "search",
        visual: "findProducts",
        ctaVariant: "primary",
      },
      {
        id: "import-store",
        title: "Import to Your Store",
        description: "Import products into your Jimvio commerce catalog.",
        cta: "Import Products",
        href: "/commerce/products",
        icon: "download",
        visual: "import",
        ctaVariant: "outline",
      },
      {
        id: "fulfill-deliver",
        title: "Fulfill & Deliver",
        description: "Fulfill orders with global shipping and tracking.",
        cta: "Learn How It Works",
        href: "/commerce/fulfillment",
        icon: "globe",
        visual: "fulfill",
        ctaVariant: "link",
      },
    ],
    secondary: [
      {
        id: "ds-browse-categories",
        title: "Browse Categories",
        description: "Explore products across all categories.",
        href: "/marketplace",
        icon: "search",
      },
      {
        id: "trending-products",
        title: "Trending Products",
        description: "See what’s selling right now.",
        href: "/marketplace/new",
        icon: "crown",
      },
      {
        id: "ds-verified-suppliers",
        title: "Verified Suppliers",
        description: "Source from trusted suppliers.",
        href: "/commerce/suppliers",
        icon: "shield",
      },
      {
        id: "track-orders",
        title: "Track Orders",
        description: "Follow fulfillment and delivery status.",
        href: "/commerce/orders",
        icon: "barChart",
      },
    ],
    ai: {
      title: "Not sure what to dropship?",
      description:
        "Tell Jimvio what you want to dropship and get personalized recommendations.",
      placeholder: "What do you want to dropship?",
      suggestions: [
        "I want to find trending products",
        "I want products with high profit margins",
        "I want fast shipping products",
        "I want home & living products",
        "I want products for my niche",
      ],
    },
  },
  {
    id: "live",
    label: "Go Live",
    subtitle: "Live Commerce",
    icon: "radio",
    eyebrow: "GO LIVE",
    headline: "Go live and grow your audience",
    description:
      "Stream live, sell products, engage your community and reach more people — everywhere.",
    moreWaysTitle: "More ways to go live on Jimvio",
    exploreAllHref: "/communities/live",
    exploreAllLabel: "Explore live tools",
    cards: [
      {
        id: "go-live-now",
        title: "Go Live Now",
        description: "Start a live stream and engage your community in real time.",
        cta: "Start Live Stream",
        href: "/communities/live",
        featured: true,
        icon: "video",
        visual: "goLive",
        ctaVariant: "primary",
      },
      {
        id: "multi-platform",
        title: "Multi-Platform Streaming",
        description: "Connect destinations and reach audiences across platforms.",
        cta: "Connect Platforms",
        href: "/identity/live-destinations",
        icon: "share2",
        visual: "multiPlatform",
        ctaVariant: "outline",
      },
      {
        id: "live-commerce",
        title: "Live Commerce",
        description: "Sell products in real time while you stream.",
        cta: "Go Live & Sell",
        href: "/communities/live",
        icon: "shoppingCart",
        visual: "liveCommerce",
        ctaVariant: "outline",
      },
    ],
    secondary: [
      {
        id: "host-guests",
        title: "Host with Guests",
        description: "Bring collaborators into your live sessions.",
        href: "/communities/live",
        icon: "users",
      },
      {
        id: "screen-sharing",
        title: "Screen Sharing",
        description: "Teach, demo, and present live.",
        href: "/communities/live",
        icon: "monitor",
      },
      {
        id: "schedule-live",
        title: "Schedule Live",
        description: "Plan upcoming live sessions and events.",
        href: "/communities/events",
        icon: "calendar",
      },
      {
        id: "live-analytics",
        title: "Live Analytics",
        description: "Track reach, engagement, and growth.",
        href: "/communities/analytics",
        icon: "barChart",
      },
    ],
    ai: {
      title: "Not sure how to go live?",
      description:
        "Tell Jimvio what you want to do and get personalized recommendations.",
      placeholder: "What do you want to go live for?",
      suggestions: [
        "I want to go live and sell products",
        "I want to live stream to multiple platforms",
        "I want to host a live event",
        "I want to teach with screen sharing",
        "I want to grow my audience",
      ],
    },
  },
];

export const DEFAULT_JOURNEY_PATH: JourneyPathId = "build";

export function getJourneyPath(id: JourneyPathId): JourneyPathConfig {
  return JOURNEY_PATHS.find((p) => p.id === id) ?? JOURNEY_PATHS[0];
}
