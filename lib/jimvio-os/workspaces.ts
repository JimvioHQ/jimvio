/**
 * Jimvio Creator Commerce OS — workspace definitions (UI-only).
 * Every href maps to an EXISTING production route.
 */

import type { OsWorkspaceMode } from "./types";

export type WorkspaceNavItem = {
  id: string;
  label: string;
  href: string;
  icon: string;
  section?: "core" | "workspace" | "system";
};

export type WorkspaceDefinition = {
  id: OsWorkspaceMode;
  label: string;
  emoji: string;
  description: string;
  homeHref: string;
  /** Contextual tools shown under the active workspace */
  tools: WorkspaceNavItem[];
  quickActions: Array<{ label: string; href: string }>;
  recommendations: string[];
};

/** Global OS rail — always visible, intentionally short. */
export const OS_GLOBAL_RAIL: WorkspaceNavItem[] = [
  { id: "home", label: "Home", href: "/dashboard", icon: "home", section: "core" },
  { id: "marketplace", label: "Marketplace", href: "/marketplace", icon: "store", section: "core" },
  { id: "creator", label: "Creator", href: "/ugc", icon: "megaphone", section: "core" },
  { id: "brand", label: "Brand", href: "/ugc/campaign-center", icon: "users", section: "core" },
  { id: "seller", label: "Seller", href: "/dashboard/vendor/store", icon: "package", section: "core" },
  { id: "affiliate", label: "Affiliate", href: "/affiliates", icon: "chart", section: "core" },
  { id: "community", label: "Community", href: "/communities", icon: "users-round", section: "core" },
  { id: "live", label: "Live Commerce", href: "/communities/live", icon: "live", section: "core" },
  { id: "wallet", label: "Wallet", href: "/wallet", icon: "wallet", section: "core" },
  { id: "analytics", label: "Analytics", href: "/dashboard/analytics", icon: "chart", section: "core" },
  { id: "ai", label: "AI", href: "#open-ai", icon: "sparkles", section: "core" },
  { id: "inbox", label: "Inbox", href: "/dashboard/notifications", icon: "message", section: "core" },
  { id: "settings", label: "Settings", href: "/dashboard/settings", icon: "settings", section: "system" },
];

export const CREATOR_OS_WORKSPACES: WorkspaceDefinition[] = [
  {
    id: "buyer",
    label: "Buyer",
    emoji: "🛒",
    description: "Shop and discover",
    homeHref: "/marketplace",
    tools: [
      { id: "products", label: "Products", href: "/marketplace", icon: "store" },
      { id: "flash", label: "Flash Deals", href: "/marketplace/flash-deals", icon: "ticket" },
      { id: "orders", label: "Orders", href: "/dashboard/orders", icon: "shopping-bag" },
      { id: "wishlist", label: "Wishlist", href: "/dashboard/wishlist", icon: "heart" },
    ],
    quickActions: [
      { label: "Browse marketplace", href: "/marketplace" },
      { label: "View orders", href: "/dashboard/orders" },
      { label: "Open wishlist", href: "/dashboard/wishlist" },
    ],
    recommendations: [
      "Check flash deals before they expire",
      "Review pending orders",
      "Ask AI to find products matching your taste",
    ],
  },
  {
    id: "seller",
    label: "Seller",
    emoji: "🏪",
    description: "Orders, inventory, shipping",
    homeHref: "/dashboard/vendor/store",
    tools: [
      { id: "orders", label: "Orders", href: "/dashboard/orders", icon: "shopping-bag" },
      { id: "products", label: "Products", href: "/dashboard/products", icon: "package" },
      { id: "customers", label: "Customers", href: "/dashboard/vendor/orders", icon: "users" },
      { id: "store", label: "Store", href: "/dashboard/vendor/store", icon: "store" },
      { id: "payments", label: "Revenue", href: "/dashboard/payments", icon: "wallet" },
    ],
    quickActions: [
      { label: "Add product", href: "/dashboard/products/new" },
      { label: "Fulfill orders", href: "/dashboard/orders" },
      { label: "View analytics", href: "/dashboard/analytics" },
    ],
    recommendations: [
      "Restock low-inventory SKUs",
      "Follow up on unfulfilled orders",
      "Ask AI for pricing opportunities",
    ],
  },
  {
    id: "creator",
    label: "Creator",
    emoji: "🎥",
    description: "Content, campaigns, portfolio",
    homeHref: "/ugc",
    tools: [
      { id: "campaigns", label: "Campaigns", href: "/ugc", icon: "megaphone" },
      { id: "applications", label: "Applications", href: "/ugc/applications", icon: "layout" },
      { id: "submissions", label: "Submissions", href: "/ugc/submissions", icon: "package" },
      { id: "library", label: "Content", href: "/ugc/library", icon: "graduation" },
      { id: "portfolio", label: "Portfolio", href: "/identity", icon: "users" },
      { id: "earnings", label: "Revenue", href: "/ugc/earnings", icon: "wallet" },
      { id: "coach", label: "AI Coach", href: "/ugc/creator-copilot", icon: "sparkles" },
    ],
    quickActions: [
      { label: "Find campaigns", href: "/ugc" },
      { label: "Open portfolio", href: "/identity" },
      { label: "Creator coach", href: "/ugc/creator-copilot" },
    ],
    recommendations: [
      "Apply to high-fit campaigns",
      "Refresh your media kit",
      "Ask AI coach for content ideas",
    ],
  },
  {
    id: "brand",
    label: "Brand",
    emoji: "💼",
    description: "Campaigns and creator discovery",
    homeHref: "/ugc/campaign-center",
    tools: [
      { id: "campaigns", label: "Campaigns", href: "/ugc/campaign-center", icon: "megaphone" },
      { id: "recruit", label: "Creator Finder", href: "/ugc/campaign-center/recruitment", icon: "users" },
      { id: "copilot", label: "Campaign Builder", href: "/ugc/campaign-center/copilot", icon: "sparkles" },
      { id: "crm", label: "Creator CRM", href: "/ugc/campaign-center/crm", icon: "users-round" },
      { id: "assets", label: "Brand Assets", href: "/ugc/campaign-center/assets", icon: "package" },
      { id: "escrow", label: "Payments", href: "/ugc/campaign-center/escrow", icon: "wallet" },
      { id: "performance", label: "ROI", href: "/ugc/campaign-center/analytics", icon: "chart" },
    ],
    quickActions: [
      { label: "Create campaign", href: "/ugc/campaign-center/create" },
      { label: "Find creators", href: "/ugc/campaign-center/recruitment" },
      { label: "AI brief", href: "/ugc/campaign-center/copilot" },
    ],
    recommendations: [
      "Invite creators from your CRM lists",
      "Review pending submissions",
      "Generate a campaign brief with AI",
    ],
  },
  {
    id: "affiliate",
    label: "Affiliate",
    emoji: "🤝",
    description: "Links, conversions, referrals",
    homeHref: "/affiliates",
    tools: [
      { id: "hub", label: "Affiliate Hub", href: "/affiliates", icon: "megaphone" },
      { id: "campaigns", label: "Campaigns", href: "/dashboard/vendor/campaigns", icon: "megaphone" },
      { id: "performance", label: "Performance", href: "/dashboard/analytics", icon: "chart" },
      { id: "wallet", label: "Wallet", href: "/wallet", icon: "wallet" },
      { id: "referrals", label: "Referral Center", href: "/ugc/referrals", icon: "users" },
    ],
    quickActions: [
      { label: "Open affiliate hub", href: "/affiliates" },
      { label: "Check wallet", href: "/wallet" },
      { label: "Referrals", href: "/ugc/referrals" },
    ],
    recommendations: [
      "Promote your highest-converting links",
      "Check pending commissions",
      "Ask AI which products to push next",
    ],
  },
  {
    id: "community",
    label: "Community",
    emoji: "👥",
    description: "Hubs, courses, events",
    homeHref: "/communities",
    tools: [
      { id: "communities", label: "Communities", href: "/communities", icon: "users-round" },
      { id: "spaces", label: "Spaces", href: "/communities/spaces", icon: "layout" },
      { id: "courses", label: "Courses", href: "/communities/courses", icon: "graduation" },
      { id: "events", label: "Events", href: "/communities/events", icon: "megaphone" },
      { id: "live", label: "Live Rooms", href: "/communities/live", icon: "live" },
      { id: "manage", label: "My hubs", href: "/dashboard/communities", icon: "users" },
    ],
    quickActions: [
      { label: "Explore communities", href: "/communities" },
      { label: "Go live", href: "/communities/live" },
      { label: "Manage hubs", href: "/dashboard/communities" },
    ],
    recommendations: [
      "Engage members in active spaces",
      "Schedule your next live or event",
      "Ask AI for community growth ideas",
    ],
  },
  {
    id: "live",
    label: "Live Commerce",
    emoji: "📺",
    description: "Go live and sell",
    homeHref: "/communities/live",
    tools: [
      { id: "go-live", label: "Go Live", href: "/communities/live", icon: "live" },
      { id: "schedule", label: "Upcoming", href: "/communities/events", icon: "megaphone" },
      { id: "products", label: "Products", href: "/dashboard/products", icon: "package" },
      { id: "revenue", label: "Revenue", href: "/dashboard/analytics", icon: "chart" },
      { id: "wallet", label: "Wallet", href: "/wallet", icon: "wallet" },
    ],
    quickActions: [
      { label: "Start live", href: "/communities/live" },
      { label: "Schedule event", href: "/communities/events" },
      { label: "Pick products", href: "/dashboard/products" },
    ],
    recommendations: [
      "Prep product highlights before going live",
      "Promote your next live in communities",
      "Review last live revenue in analytics",
    ],
  },
  {
    id: "ai",
    label: "AI Workspace",
    emoji: "🤖",
    description: "Copilot and automation",
    homeHref: "/dashboard",
    tools: [
      { id: "copilot", label: "Jimvio Copilot", href: "#open-ai", icon: "sparkles" },
      { id: "campaign-ai", label: "Campaign Builder", href: "/ugc/campaign-center/copilot", icon: "megaphone" },
      { id: "creator-ai", label: "Creator Coach", href: "/ugc/creator-copilot", icon: "users" },
      { id: "search", label: "Universal Search", href: "/identity/search", icon: "layout" },
      { id: "wallet-ai", label: "Financial AI", href: "/wallet/ai", icon: "wallet" },
      { id: "analytics", label: "Analytics", href: "/dashboard/analytics", icon: "chart" },
    ],
    quickActions: [
      { label: "Open campaign AI", href: "/ugc/campaign-center/copilot" },
      { label: "Creator coach", href: "/ugc/creator-copilot" },
      { label: "Wallet AI", href: "/wallet/ai" },
    ],
    recommendations: [
      "Generate a campaign brief",
      "Ask for growth opportunities",
      "Run a financial summary in Wallet AI",
    ],
  },
];

/** Map legacy `admin` mode (pre-Brand) to Brand workspace. */
export function normalizeWorkspaceMode(mode: string | null | undefined): OsWorkspaceMode {
  if (mode === "admin") return "brand";
  const valid = CREATOR_OS_WORKSPACES.some((w) => w.id === mode);
  return valid ? (mode as OsWorkspaceMode) : "seller";
}

export function getWorkspaceDefinition(mode: OsWorkspaceMode): WorkspaceDefinition {
  const normalized = normalizeWorkspaceMode(mode);
  return CREATOR_OS_WORKSPACES.find((w) => w.id === normalized) ?? CREATOR_OS_WORKSPACES[1];
}

/** @deprecated Prefer getWorkspaceDefinition(mode).tools + OS_GLOBAL_RAIL */
export function getWorkspaceNav(mode: OsWorkspaceMode): WorkspaceNavItem[] {
  const ws = getWorkspaceDefinition(mode);
  return [...OS_GLOBAL_RAIL.filter((i) => i.section === "core"), ...ws.tools, ...OS_GLOBAL_RAIL.filter((i) => i.section === "system")];
}
