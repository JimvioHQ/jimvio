/**
 * Workspace-aware navigation for Jimvio Creator Commerce OS.
 * UI-only: every href points at an EXISTING route. No new product routes.
 */

import type { OsWorkspaceMode } from "./types";

export type WorkspaceNavItem = {
  id: string;
  label: string;
  href: string;
  /** Lucide-style key resolved by OsIcon / intelligent sidebar */
  icon: string;
  section?: "primary" | "tools" | "finance" | "system";
};

export type WorkspaceDefinition = {
  id: OsWorkspaceMode;
  label: string;
  description: string;
  homeHref: string;
  nav: WorkspaceNavItem[];
  quickActions: Array<{ label: string; href: string }>;
};

/** Extended modes — keep backward-compatible with existing store values. */
export const CREATOR_OS_WORKSPACES: WorkspaceDefinition[] = [
  {
    id: "buyer",
    label: "Buyer",
    description: "Shop and discover",
    homeHref: "/marketplace",
    nav: [
      { id: "home", label: "Home", href: "/dashboard", icon: "home", section: "primary" },
      { id: "marketplace", label: "Marketplace", href: "/marketplace", icon: "store", section: "primary" },
      { id: "orders", label: "Orders", href: "/dashboard/orders", icon: "shopping-bag", section: "primary" },
      { id: "wishlist", label: "Wishlist", href: "/dashboard/wishlist", icon: "heart", section: "primary" },
      { id: "trending", label: "Trending", href: "/marketplace", icon: "chart", section: "tools" },
      { id: "flash", label: "Flash Deals", href: "/marketplace/flash-deals", icon: "ticket", section: "tools" },
      { id: "messages", label: "Messages", href: "/dashboard/messages", icon: "message", section: "tools" },
      { id: "wallet", label: "Wallet", href: "/wallet", icon: "wallet", section: "finance" },
      { id: "settings", label: "Settings", href: "/dashboard/settings", icon: "settings", section: "system" },
    ],
    quickActions: [
      { label: "Browse marketplace", href: "/marketplace" },
      { label: "View orders", href: "/dashboard/orders" },
    ],
  },
  {
    id: "seller",
    label: "Seller",
    description: "Store, inventory, shipping",
    homeHref: "/dashboard/vendor/store",
    nav: [
      { id: "home", label: "Home", href: "/dashboard", icon: "home", section: "primary" },
      { id: "orders", label: "Orders", href: "/dashboard/orders", icon: "shopping-bag", section: "primary" },
      { id: "products", label: "Products", href: "/dashboard/products", icon: "package", section: "primary" },
      { id: "inventory", label: "Inventory", href: "/dashboard/products", icon: "package", section: "primary" },
      { id: "customers", label: "Customers", href: "/dashboard/vendor/orders", icon: "users", section: "primary" },
      { id: "store", label: "Store", href: "/dashboard/vendor/store", icon: "store", section: "tools" },
      { id: "analytics", label: "Analytics", href: "/dashboard/analytics", icon: "chart", section: "tools" },
      { id: "payments", label: "Payments", href: "/dashboard/payments", icon: "wallet", section: "finance" },
      { id: "wallet", label: "Wallet OS", href: "/wallet", icon: "wallet", section: "finance" },
      { id: "settings", label: "Settings", href: "/dashboard/settings", icon: "settings", section: "system" },
    ],
    quickActions: [
      { label: "Add product", href: "/dashboard/products/new" },
      { label: "Fulfill orders", href: "/dashboard/orders" },
    ],
  },
  {
    id: "creator",
    label: "Creator",
    description: "Studio, portfolio, deals",
    homeHref: "/ugc",
    nav: [
      { id: "home", label: "Home", href: "/dashboard", icon: "home", section: "primary" },
      { id: "ugc", label: "Discover campaigns", href: "/ugc", icon: "megaphone", section: "primary" },
      { id: "applications", label: "Applications", href: "/ugc/applications", icon: "layout", section: "primary" },
      { id: "submissions", label: "Submissions", href: "/ugc/submissions", icon: "package", section: "primary" },
      { id: "library", label: "Content library", href: "/ugc/library", icon: "graduation", section: "tools" },
      { id: "identity", label: "Portfolio", href: "/identity", icon: "users", section: "tools" },
      { id: "earnings", label: "Revenue", href: "/ugc/earnings", icon: "wallet", section: "finance" },
      { id: "analytics", label: "Analytics", href: "/ugc/analytics", icon: "chart", section: "tools" },
      { id: "copilot", label: "AI Creator Coach", href: "/ugc/creator-copilot", icon: "sparkles", section: "tools" },
      { id: "wallet", label: "Wallet", href: "/wallet", icon: "wallet", section: "finance" },
      { id: "settings", label: "Settings", href: "/identity/settings", icon: "settings", section: "system" },
    ],
    quickActions: [
      { label: "Find campaigns", href: "/ugc" },
      { label: "Open portfolio", href: "/identity" },
    ],
  },
  {
    id: "affiliate",
    label: "Affiliate",
    description: "Links, campaigns, referrals",
    homeHref: "/affiliates",
    nav: [
      { id: "home", label: "Home", href: "/dashboard", icon: "home", section: "primary" },
      { id: "hub", label: "Affiliate Hub", href: "/affiliates", icon: "megaphone", section: "primary" },
      { id: "campaigns", label: "Campaigns", href: "/dashboard/vendor/campaigns", icon: "megaphone", section: "primary" },
      { id: "analytics", label: "Performance", href: "/dashboard/analytics", icon: "chart", section: "tools" },
      { id: "wallet", label: "Wallet", href: "/wallet", icon: "wallet", section: "finance" },
      { id: "referrals", label: "Referral Center", href: "/ugc/referrals", icon: "users", section: "tools" },
      { id: "messages", label: "Messages", href: "/dashboard/messages", icon: "message", section: "tools" },
      { id: "settings", label: "Settings", href: "/dashboard/settings", icon: "settings", section: "system" },
    ],
    quickActions: [
      { label: "Open affiliate hub", href: "/affiliates" },
      { label: "Check wallet", href: "/wallet" },
    ],
  },
  {
    id: "community",
    label: "Community",
    description: "Hubs, spaces, courses",
    homeHref: "/communities",
    nav: [
      { id: "home", label: "Home", href: "/dashboard", icon: "home", section: "primary" },
      { id: "communities", label: "Communities", href: "/communities", icon: "users-round", section: "primary" },
      { id: "spaces", label: "Spaces", href: "/communities/spaces", icon: "layout", section: "primary" },
      { id: "courses", label: "Courses", href: "/communities/courses", icon: "graduation", section: "primary" },
      { id: "events", label: "Events", href: "/communities/events", icon: "megaphone", section: "tools" },
      { id: "live", label: "Live Rooms", href: "/communities/live", icon: "live", section: "tools" },
      { id: "manage", label: "My hubs", href: "/dashboard/communities", icon: "users", section: "tools" },
      { id: "messages", label: "Messages", href: "/communities/messages", icon: "message", section: "tools" },
      { id: "wallet", label: "Wallet", href: "/wallet", icon: "wallet", section: "finance" },
      { id: "settings", label: "Settings", href: "/communities/settings", icon: "settings", section: "system" },
    ],
    quickActions: [
      { label: "Explore communities", href: "/communities" },
      { label: "Go live", href: "/communities/live" },
    ],
  },
  {
    id: "admin",
    label: "Brand",
    description: "Campaigns and creator discovery",
    homeHref: "/ugc/campaign-center",
    nav: [
      { id: "home", label: "Home", href: "/dashboard", icon: "home", section: "primary" },
      { id: "campaigns", label: "Campaigns", href: "/ugc/campaign-center", icon: "megaphone", section: "primary" },
      { id: "recruit", label: "Creator Discovery", href: "/ugc/campaign-center/recruitment", icon: "users", section: "primary" },
      { id: "copilot", label: "AI Brand Assistant", href: "/ugc/campaign-center/copilot", icon: "sparkles", section: "tools" },
      { id: "crm", label: "Creator CRM", href: "/ugc/campaign-center/crm", icon: "users-round", section: "tools" },
      { id: "assets", label: "Assets", href: "/ugc/campaign-center/assets", icon: "package", section: "tools" },
      { id: "payments", label: "Payments", href: "/ugc/campaign-center/escrow", icon: "wallet", section: "finance" },
      { id: "analytics", label: "Performance", href: "/ugc/campaign-center/analytics", icon: "chart", section: "tools" },
      { id: "wallet", label: "Wallet", href: "/wallet", icon: "wallet", section: "finance" },
      { id: "settings", label: "Settings", href: "/dashboard/settings", icon: "settings", section: "system" },
    ],
    quickActions: [
      { label: "Create campaign", href: "/ugc/campaign-center/create" },
      { label: "Find creators", href: "/ugc/campaign-center/recruitment" },
    ],
  },
];

/** Live Commerce + AI are presented as focused workspaces using existing admin/creator slots via aliases */
export const LIVE_COMMERCE_WORKSPACE: WorkspaceDefinition = {
  id: "creator",
  label: "Live Commerce",
  description: "Go live and sell",
  homeHref: "/communities/live",
  nav: [
    { id: "live", label: "Go Live", href: "/communities/live", icon: "live", section: "primary" },
    { id: "schedule", label: "Schedule", href: "/communities/events", icon: "megaphone", section: "primary" },
    { id: "products", label: "Products", href: "/dashboard/products", icon: "package", section: "primary" },
    { id: "analytics", label: "Revenue", href: "/dashboard/analytics", icon: "chart", section: "finance" },
    { id: "wallet", label: "Wallet", href: "/wallet", icon: "wallet", section: "finance" },
    { id: "home", label: "Home", href: "/dashboard", icon: "home", section: "system" },
  ],
  quickActions: [
    { label: "Start live", href: "/communities/live" },
  ],
};

export const AI_WORKSPACE: WorkspaceDefinition = {
  id: "seller",
  label: "AI Workspace",
  description: "Copilot and automation",
  homeHref: "/dashboard",
  nav: [
    { id: "home", label: "Home", href: "/dashboard", icon: "home", section: "primary" },
    { id: "ai", label: "Jimvio Copilot", href: "#open-ai", icon: "sparkles", section: "primary" },
    { id: "campaign-ai", label: "Campaign Builder", href: "/ugc/campaign-center/copilot", icon: "megaphone", section: "tools" },
    { id: "creator-ai", label: "Creator Coach", href: "/ugc/creator-copilot", icon: "users", section: "tools" },
    { id: "search", label: "Universal Search", href: "/identity/search", icon: "layout", section: "tools" },
    { id: "wallet-ai", label: "Financial AI", href: "/wallet/ai", icon: "wallet", section: "finance" },
    { id: "analytics", label: "Analytics", href: "/dashboard/analytics", icon: "chart", section: "tools" },
  ],
  quickActions: [
    { label: "Open campaign copilot", href: "/ugc/campaign-center/copilot" },
    { label: "Open wallet AI", href: "/wallet/ai" },
  ],
};

export function getWorkspaceDefinition(mode: OsWorkspaceMode): WorkspaceDefinition {
  return CREATOR_OS_WORKSPACES.find((w) => w.id === mode) ?? CREATOR_OS_WORKSPACES[1];
}

export function getWorkspaceNav(mode: OsWorkspaceMode): WorkspaceNavItem[] {
  return getWorkspaceDefinition(mode).nav;
}
