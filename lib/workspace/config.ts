import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bookmark,
  Calendar,
  Clapperboard,
  Compass,
  DollarSign,
  FileVideo,
  Gift,
  GraduationCap,
  Home,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  Link2,
  MessageSquare,
  Package,
  Radio,
  Search,
  ShoppingBag,
  Store,
  Target,
  Users,
  Wallet,
  Wrench,
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
      { id: "wishlist", label: "Wishlist", href: "/dashboard/wishlist", icon: Bookmark },
      { id: "cart", label: "Cart", href: "/cart", icon: ShoppingBag },
      { id: "orders", label: "Orders", href: "/dashboard/orders", icon: Package },
      { id: "store", label: "Seller Hub", href: "/dashboard/vendor/store", icon: Store },
    ],
  },
  communities: {
    id: "communities",
    label: "Communities",
    href: "/communities",
    description: "Connect, learn and grow communities.",
    cta: "Open Communities",
    accent: "#7c3aed",
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
    ],
    rightPanel: {
      title: "Trending",
      items: [
        { label: "Upcoming Events", href: "/communities/events" },
        { label: "Featured Communities", href: "/communities/explore" },
        { label: "Live Now", href: "/communities/live", value: "3" },
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
      { id: "products", label: "Products to Promote", href: "/marketplace", icon: Package },
      { id: "campaigns", label: "Top Campaigns", href: "/affiliates#campaigns", icon: Target },
      { id: "offers", label: "Exclusive Offers", href: "/affiliates#offers", icon: Gift },
      { id: "links", label: "My Links", href: "/dashboard/activate/affiliate", icon: Link2 },
      { id: "referrals", label: "Referrals", href: "/dashboard/analytics", icon: Users },
      { id: "creatives", label: "Creatives", href: "/affiliates#creatives", icon: ImageIcon },
      { id: "earnings", label: "Earnings", href: "/dashboard/analytics", icon: DollarSign },
      { id: "payouts", label: "Payouts", href: "/dashboard/wallet", icon: Wallet },
      { id: "guides", label: "Guides & Tutorials", href: "/help", icon: GraduationCap },
      { id: "tools", label: "Affiliate Tools", href: "/affiliates#tools", icon: Wrench },
    ],
    sidebarSections: [
      {
        id: "center",
        label: "Affiliate Center",
        items: [
          { id: "overview", label: "Overview", href: "/affiliates", icon: LayoutDashboard },
        ],
      },
      {
        id: "discover",
        label: "Discover",
        items: [
          { id: "products", label: "Products to Promote", href: "/marketplace", icon: Package },
          { id: "campaigns", label: "Top Campaigns", href: "/affiliates#campaigns", icon: Target },
          { id: "offers", label: "Exclusive Offers", href: "/affiliates#offers", icon: Gift },
        ],
      },
      {
        id: "tracking",
        label: "Tracking",
        items: [
          { id: "links", label: "My Links", href: "/dashboard/activate/affiliate", icon: Link2 },
          { id: "referrals", label: "Referrals", href: "/dashboard/analytics", icon: Users },
          { id: "creatives", label: "Creatives", href: "/affiliates#creatives", icon: ImageIcon },
        ],
      },
      {
        id: "earnings",
        label: "Earnings",
        items: [
          { id: "earnings", label: "Earnings", href: "/dashboard/analytics", icon: DollarSign },
          { id: "payouts", label: "Payouts", href: "/dashboard/wallet", icon: Wallet },
        ],
      },
      {
        id: "resources",
        label: "Resources",
        items: [
          { id: "guides", label: "Guides & Tutorials", href: "/help", icon: GraduationCap },
          { id: "tools", label: "Affiliate Tools", href: "/affiliates#tools", icon: Wrench },
        ],
      },
    ],
    proCard: {
      title: "Jimvio Pro",
      description: "Unlock higher commissions & exclusive benefits",
      cta: "Upgrade Now",
      href: "/pricing",
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
      { id: "dashboard", label: "Dashboard", href: "/ugc/dashboard", icon: LayoutDashboard },
      { id: "discover", label: "Discover Campaigns", href: "/ugc", icon: Compass },
      { id: "applications", label: "My Applications", href: "/ugc/applications", icon: FileVideo },
      { id: "projects", label: "Active Projects", href: "/ugc/campaigns", icon: Clapperboard },
      { id: "submissions", label: "Submissions", href: "/ugc/submissions", icon: FileVideo },
      { id: "analytics", label: "Analytics", href: "/ugc/analytics", icon: BarChart3 },
      { id: "earnings", label: "Earnings", href: "/ugc/earnings", icon: DollarSign },
      { id: "wallet", label: "Wallet", href: "/dashboard/wallet", icon: Wallet },
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
    pathname.startsWith("/affiliates/")
  );
}

export function resolveWorkspaceNavActive(pathname: string, workspace: WorkspaceId): string {
  const def = WORKSPACES[workspace];
  if (workspace === "communities") {
    if (pathname.startsWith("/communities/explore")) return "explore";
    if (pathname.startsWith("/communities") || pathname === "/communities") return "feed";
  }
  for (const item of def.sidebar) {
    const base = item.href.split("?")[0].split("#")[0];
    if (pathname === base || (base !== "/" && pathname.startsWith(`${base}/`))) {
      return item.id;
    }
  }
  if (workspace === "ugc" && pathname.startsWith("/ugc")) return "discover";
  return def.sidebar[0]?.id ?? "overview";
}
