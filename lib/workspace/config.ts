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
  Link2,
  MessageSquare,
  Package,
  Radio,
  Search,
  ShoppingBag,
  Store,
  Target,
  TrendingUp,
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

export type WorkspaceDefinition = {
  id: WorkspaceId;
  label: string;
  href: string;
  description: string;
  cta: string;
  accent: string;
  icon: LucideIcon;
  sidebar: WorkspaceNavItem[];
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
      { id: "wishlist", label: "Wishlist", href: "/dashboard/wishlist", icon: Bookmark },
      { id: "cart", label: "Cart", href: "/cart", icon: ShoppingBag },
      { id: "orders", label: "Orders", href: "/dashboard/orders", icon: Package },
      { id: "store", label: "Seller Hub", href: "/dashboard/vendor/store", icon: Store },
    ],
  },
  communities: {
    id: "communities",
    label: "Communities",
    href: "/c",
    description: "Connect, learn and grow communities.",
    cta: "Open Communities",
    accent: "#7c3aed",
    icon: Users,
    sidebar: [
      { id: "feed", label: "Feed", href: "/c", icon: Home },
      { id: "explore", label: "Explore", href: "/communities/explore", icon: Compass },
      { id: "live", label: "Live", href: "/c/live", icon: Radio, badge: "Live" },
      { id: "spaces", label: "Spaces", href: "/c/spaces", icon: Layers },
      { id: "messages", label: "Messages", href: "/c/messages", icon: MessageSquare },
      { id: "events", label: "Events", href: "/c/events", icon: Calendar },
      { id: "courses", label: "Courses", href: "/c/courses", icon: GraduationCap },
      { id: "bookmarks", label: "Bookmarks", href: "/c/bookmarks", icon: Bookmark },
      { id: "create", label: "Create Community", href: "/communities/create", icon: Users },
      { id: "settings", label: "Settings", href: "/c/settings", icon: Target },
    ],
    rightPanel: {
      title: "Trending",
      items: [
        { label: "Upcoming Events", href: "/c/events" },
        { label: "Featured Communities", href: "/communities/explore" },
        { label: "Live Now", href: "/c/live", value: "3" },
      ],
    },
  },
  affiliates: {
    id: "affiliates",
    label: "Affiliates",
    href: "/affiliates",
    description: "Promote products and earn commissions.",
    cta: "Open Affiliate Workspace",
    accent: "#0d9488",
    icon: DollarSign,
    sidebar: [
      { id: "overview", label: "Overview", href: "/affiliates", icon: Home },
      { id: "products", label: "Products to Promote", href: "/marketplace", icon: Package },
      { id: "analytics", label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
      { id: "commissions", label: "Commissions", href: "/dashboard/payments", icon: TrendingUp },
      { id: "wallet", label: "Wallet", href: "/dashboard/wallet", icon: Wallet },
      { id: "links", label: "My Links", href: "/dashboard/activate/affiliate", icon: Link2 },
      { id: "resources", label: "Resources", href: "/help", icon: GraduationCap },
    ],
    rightPanel: {
      title: "Performance",
      items: [
        { label: "Top Products", href: "/marketplace" },
        { label: "Recent Sales", href: "/dashboard/analytics" },
        { label: "Conversion Rate", value: "—" },
      ],
    },
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
      { id: "discover", label: "Discover Campaigns", href: "/ugc", icon: Compass },
      { id: "featured", label: "Featured", href: "/ugc?featured=1", icon: Zap },
      { id: "submissions", label: "My Submissions", href: "/dashboard/vendor/submissions", icon: FileVideo },
      { id: "analytics", label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
      { id: "earnings", label: "Earnings", href: "/dashboard/payments", icon: DollarSign },
      { id: "wallet", label: "Wallet", href: "/dashboard/wallet", icon: Wallet },
      { id: "profile", label: "Creator Profile", href: "/c/profile", icon: Users },
    ],
    rightPanel: {
      title: "Campaign Insights",
      items: [
        { label: "Trending Campaigns", href: "/ugc" },
        { label: "Top Payouts", href: "/ugc" },
        { label: "Application Status", href: "/dashboard/vendor/submissions" },
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
    pathname.startsWith("/affiliates/")
  );
}

export function resolveWorkspaceNavActive(pathname: string, workspace: WorkspaceId): string {
  const def = WORKSPACES[workspace];
  if (workspace === "communities") {
    if (pathname.startsWith("/communities/explore")) return "explore";
    if (pathname.startsWith("/c") || pathname === "/communities") return "feed";
  }
  for (const item of def.sidebar) {
    const base = item.href.split("?")[0];
    if (pathname === base || (base !== "/" && pathname.startsWith(`${base}/`))) {
      return item.id;
    }
  }
  if (workspace === "ugc" && pathname.startsWith("/ugc")) return "discover";
  return def.sidebar[0]?.id ?? "overview";
}
