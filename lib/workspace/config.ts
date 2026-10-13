import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bookmark,
  Calendar,
  Clapperboard,
  Compass,
  DollarSign,
  FileVideo,
  GraduationCap,
  Home,
  Layers,
  LayoutDashboard,
  Link2,
  MessageSquare,
  Package,
  Radio,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  Target,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

export type WorkspaceId = "marketplace" | "communities" | "affiliates" | "ugc";

export type WorkspaceNavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

export type WorkspaceNavSection = {
  id: string;
  label: string;
  items: WorkspaceNavItem[];
};

export type WorkspaceProCard = {
  title: string;
  description: string;
  cta: string;
  href: string;
};

export type WorkspaceDefinition = {
  id: WorkspaceId;
  label: string;
  href: string;
  description: string;
  cta: string;
  accent: string;
  icon: LucideIcon;
  sidebar: WorkspaceNavItem[];
  sidebarSections?: WorkspaceNavSection[];
  proCard?: WorkspaceProCard;
  rightPanel?: {
    title: string;
    items: { label: string; href?: string; value?: string }[];
  };
};

export const WORKSPACES: Record<WorkspaceId, WorkspaceDefinition> = {
  marketplace: {
    id: "marketplace",
    label: "Marketplace",
    href: "/marketplace",
    description: "Buy, sell and manage commerce.",
    cta: "Open Marketplace",
    accent: "#fd5000",
    icon: ShoppingBag,
    sidebar: [
      { id: "browse", label: "Browse", href: "/marketplace", icon: Home },
      { id: "search", label: "Search", href: "/marketplace/search", icon: Search },
      { id: "digital", label: "Digital", href: "/marketplace/digital", icon: Package },
      { id: "physical", label: "Physical", href: "/marketplace/physical", icon: Package },
      { id: "deals", label: "Flash Deals", href: "/marketplace/flash-deals", icon: Zap },
      { id: "wishlist", label: "Wishlist", href: "/marketplace", icon: Bookmark },
      { id: "cart", label: "Cart", href: "/cart", icon: ShoppingBag },
      { id: "orders", label: "Orders", href: "/orders", icon: Package },
      { id: "store", label: "Seller Hub", href: "/seller/products", icon: Store },
    ],
  },
  communities: {
    id: "communities",
    label: "Communities",
    href: "/communities",
    description: "Connect, learn and grow communities.",
    cta: "Open Communities",
    accent: "#fd5000",
    icon: Users,
    sidebar: [
      { id: "feed", label: "Feed", href: "/communities", icon: Home },
      { id: "explore", label: "Explore", href: "/communities/explore", icon: Compass },
      { id: "live", label: "Live", href: "/communities/live", icon: Radio, badge: "Live" },
      { id: "messages", label: "Messages", href: "/communities/messages", icon: MessageSquare },
      { id: "groups", label: "Spaces", href: "/communities/spaces", icon: Layers },
      { id: "missions", label: "Missions", href: "/communities/missions", icon: Target },
      { id: "courses", label: "Courses", href: "/communities/courses", icon: GraduationCap },
      { id: "events", label: "Events", href: "/communities/events", icon: Calendar },
      { id: "leaderboard", label: "Leaderboard", href: "/communities/leaderboard", icon: BarChart3 },
    ],
    rightPanel: {
      title: "Trending",
      items: [
        { label: "Upcoming Events", href: "/communities/events" },
        { label: "Featured Communities", href: "/communities/explore" },
        { label: "Live Now", href: "/communities/live", value: "3" },
        { label: "Leaderboard", href: "/communities/leaderboard" },
      ],
    },
  },
  affiliates: {
    id: "affiliates",
    label: "Affiliates",
    href: "/affiliates",
    description: "Promote products and earn commissions.",
    cta: "Open Affiliate Workspace",
    accent: "#fd5000",
    icon: DollarSign,
    sidebar: [
      { id: "overview", label: "Overview", href: "/affiliates", icon: LayoutDashboard },
      { id: "dashboard", label: "Dashboard", href: "/affiliates/dashboard", icon: BarChart3 },
      { id: "products", label: "Products to Promote", href: "/affiliates", icon: Package },
      { id: "links", label: "My Links", href: "/affiliates/links", icon: Link2 },
      { id: "ai", label: "AI Promotion", href: "/affiliates/ai", icon: Sparkles },
      { id: "analytics", label: "Analytics", href: "/affiliates/analytics", icon: BarChart3 },
      { id: "earnings", label: "Earnings", href: "/affiliates/dashboard", icon: DollarSign },
      { id: "payouts", label: "Payouts", href: "/affiliates/payouts", icon: Wallet },
      { id: "guides", label: "Guides & Tutorials", href: "/help", icon: GraduationCap },
    ],
    sidebarSections: [
      {
        id: "center",
        label: "Affiliate Center",
        items: [
          { id: "overview", label: "Overview", href: "/affiliates", icon: LayoutDashboard },
          { id: "dashboard", label: "Dashboard", href: "/affiliates/dashboard", icon: BarChart3 },
        ],
      },
      {
        id: "discover",
        label: "Discover",
        items: [
          { id: "products", label: "Products to Promote", href: "/affiliates", icon: Package },
          { id: "ai", label: "AI Promotion", href: "/affiliates/ai", icon: Sparkles },
        ],
      },
      {
        id: "tracking",
        label: "Tracking",
        items: [
          { id: "links", label: "My Links", href: "/affiliates/links", icon: Link2 },
          { id: "analytics", label: "Analytics", href: "/affiliates/analytics", icon: BarChart3 },
        ],
      },
      {
        id: "earnings",
        label: "Earnings",
        items: [
          { id: "earnings", label: "Earnings", href: "/affiliates/dashboard", icon: DollarSign },
          { id: "payouts", label: "Payouts", href: "/affiliates/payouts", icon: Wallet },
        ],
      },
      {
        id: "resources",
        label: "Resources",
        items: [
          { id: "guides", label: "Guides & Tutorials", href: "/help", icon: GraduationCap },
        ],
      },
    ],
  },
  ugc: {
    id: "ugc",
    label: "UGC & Clipping",
    href: "/ugc",
    description: "Join campaigns and create content.",
    cta: "Open Creator Workspace",
    accent: "#e11d48",
    icon: Clapperboard,
    sidebar: [
      { id: "dashboard", label: "Dashboard", href: "/ugc/dashboard", icon: LayoutDashboard },
      { id: "discover", label: "Discover Campaigns", href: "/ugc", icon: Compass },
      { id: "applications", label: "My Applications", href: "/ugc/applications", icon: FileVideo },
      { id: "projects", label: "Active Projects", href: "/ugc/campaigns", icon: Clapperboard },
      { id: "submissions", label: "Submissions", href: "/ugc/submissions", icon: FileVideo },
      { id: "analytics", label: "Analytics", href: "/ugc/analytics", icon: BarChart3 },
      { id: "earnings", label: "Earnings", href: "/ugc/earnings", icon: DollarSign },
      { id: "wallet", label: "Wallet", href: "/wallet", icon: Wallet },
      { id: "profile", label: "Creator Profile", href: "/communities/profile", icon: Users },
    ],
    rightPanel: {
      title: "Campaign Insights",
      items: [
        { label: "Trending Campaigns", href: "/ugc" },
        { label: "Top Payouts", href: "/ugc/earnings" },
        { label: "Application Status", href: "/ugc/applications" },
      ],
    },
  },
};
export const WORKSPACE_LIST: WorkspaceDefinition[] = [
  WORKSPACES.marketplace,
  WORKSPACES.communities,
  WORKSPACES.affiliates,
  WORKSPACES.ugc,
];

export function isWorkspacePublicRoute(pathname: string): boolean {
  return (
    pathname === "/communities" ||
    pathname.startsWith("/communities/") ||
    pathname === "/affiliates" ||
    pathname.startsWith("/affiliates/") ||
    pathname === "/commerce" ||
    pathname.startsWith("/commerce/")
  );
}

export function resolveWorkspaceNavActive(pathname: string, workspace: WorkspaceId): string {
  const def = WORKSPACES[workspace];
  if (workspace === "communities") {
    if (pathname.startsWith("/communities/explore")) return "explore";
    if (pathname.startsWith("/communities") || pathname === "/communities") return "feed";
  }
  // Affiliates: many nav items share routes — prefer the most specific surface.
  if (workspace === "affiliates") {
    if (pathname.startsWith("/affiliates/ai")) return "ai";
    if (pathname.startsWith("/affiliates/analytics")) return "analytics";
    if (pathname.startsWith("/affiliates/links")) return "links";
    if (pathname.startsWith("/affiliates/payouts")) return "payouts";
    if (pathname.startsWith("/affiliates/promote")) return "products";
    if (pathname.startsWith("/affiliates/dashboard")) return "dashboard";
    if (pathname === "/affiliates" || pathname.startsWith("/affiliates?")) return "products";
    if (pathname.startsWith("/help")) return "guides";
  }
  // Longest exact/prefix match wins (avoids /affiliates shadowing /affiliates/links).
  let best: { id: string; len: number } | null = null;
  for (const item of def.sidebar) {
    const base = item.href.split("?")[0].split("#")[0];
    if (pathname === base || (base !== "/" && pathname.startsWith(`${base}/`))) {
      if (!best || base.length > best.len) {
        best = { id: item.id, len: base.length };
      }
    }
  }
  if (best) return best.id;
  if (workspace === "ugc" && pathname.startsWith("/ugc")) return "discover";
  return def.sidebar[0]?.id ?? "overview";
}
