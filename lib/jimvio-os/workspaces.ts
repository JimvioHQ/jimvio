/**
 * Jimvio Creator Commerce OS — workspace definitions (UI-only).
 * Every href maps to an EXISTING production route.
 * Workspace switch stays on / — homeHref is informational only.
 */

import type { OsWorkspaceMode } from "./types";

export type WorkspaceNavItem = {
  id: string;
  label: string;
  href: string;
  icon: string;
  section?: "core" | "workspace" | "system";
};

export type WorkspaceKpi = {
  id: string;
  label: string;
  hint: string;
  href: string;
};

export type WorkspaceQuickAction = {
  label: string;
  href: string;
  icon: string;
};

export type WorkspaceFocusItem = {
  id: string;
  label: string;
  href: string;
  progress: number;
  deadline: string;
  priority: "high" | "medium" | "low";
  cta: string;
};

export type WorkspaceInsight = {
  id: string;
  label: string;
  value: string;
  trend: string;
  href: string;
};

export type WorkspaceCalendarItem = {
  id: string;
  label: string;
  when: string;
  href: string;
  kind: string;
};

export type WorkspaceActivityItem = {
  id: string;
  label: string;
  detail: string;
  time: string;
  href: string;
  kind: string;
};

export type WorkspaceHomeConfig = {
  eyebrow: string;
  title: string;
  subtitle: string;
  /** Soft accent tint for the workspace home surface (CSS color) */
  accent: string;
  /** One-line AI insight for the workspace header */
  aiInsight: string;
  /** AI Daily Brief bullets */
  brief: string[];
  suggestedActions: Array<{ label: string; href: string }>;
  focus: WorkspaceFocusItem[];
  insights: WorkspaceInsight[];
  calendar: WorkspaceCalendarItem[];
  activity: WorkspaceActivityItem[];
  /** @deprecated Prefer focus / insights — kept for compatibility */
  kpis: WorkspaceKpi[];
  priorities: Array<{ label: string; href: string; hint: string }>;
  productivity: Array<{ label: string; href: string }>;
};

export type WorkspaceDefinition = {
  id: OsWorkspaceMode;
  label: string;
  emoji: string;
  description: string;
  /** Kept for compatibility; switching does NOT navigate to module pages. */
  homeHref: string;
  tools: WorkspaceNavItem[];
  quickActions: WorkspaceQuickAction[];
  recommendations: string[];
  home: WorkspaceHomeConfig;
};

/**
 * Product navigation — discovery destinations only.
 * Wallet / Orders / Messages live under profile + OS profile rail.
 */
export const OS_CORE_RAIL: WorkspaceNavItem[] = [
  { id: "home", label: "Home", href: "/", icon: "home", section: "core" },
  { id: "marketplace", label: "Marketplace", href: "/marketplace", icon: "store", section: "core" },
  { id: "communities", label: "Communities", href: "/communities", icon: "users-round", section: "core" },
  { id: "affiliates", label: "Affiliates", href: "/affiliates", icon: "link", section: "core" },
  { id: "ugc", label: "UGC & Clipping", href: "/ugc", icon: "megaphone", section: "core" },
];

export const OS_PROFILE_RAIL: WorkspaceNavItem[] = [
  { id: "wallet", label: "Wallet", href: "/wallet", icon: "wallet", section: "system" },
  { id: "orders", label: "Orders", href: "/orders", icon: "shopping-bag", section: "system" },
  { id: "messages", label: "Messages", href: "/messages", icon: "message", section: "system" },
  { id: "inbox", label: "Inbox", href: "/notifications", icon: "bell", section: "system" },
  { id: "identity", label: "Profile", href: "/identity", icon: "users", section: "system" },
  { id: "settings", label: "Settings", href: "/settings/profile", icon: "settings", section: "system" },
];

/** @deprecated Prefer OS_CORE_RAIL + OS_PROFILE_RAIL */
export const OS_GLOBAL_RAIL: WorkspaceNavItem[] = [...OS_CORE_RAIL, ...OS_PROFILE_RAIL];

function legacyFromHome(home: Omit<WorkspaceHomeConfig, "kpis" | "priorities" | "productivity"> & {
  kpis?: WorkspaceKpi[];
  priorities?: WorkspaceHomeConfig["priorities"];
  productivity?: WorkspaceHomeConfig["productivity"];
}): WorkspaceHomeConfig {
  return {
    ...home,
    kpis:
      home.kpis ??
      home.insights.slice(0, 4).map((i) => ({
        id: i.id,
        label: i.label,
        hint: i.trend,
        href: i.href,
      })),
    priorities:
      home.priorities ??
      home.focus.map((f) => ({ label: f.label, href: f.href, hint: f.deadline })),
    productivity:
      home.productivity ??
      home.suggestedActions.slice(0, 3).map((a) => ({ label: a.label, href: a.href })),
  };
}

export const CREATOR_OS_WORKSPACES: WorkspaceDefinition[] = [
  {
    id: "buyer",
    label: "Buyer",
    emoji: "🛒",
    description: "Shop and discover",
    homeHref: "/",
    tools: [
      { id: "flash", label: "Flash Deals", href: "/marketplace/flash-deals", icon: "ticket" },
      { id: "orders", label: "Orders", href: "/orders", icon: "shopping-bag" },
      { id: "wishlist", label: "Wishlist", href: "/marketplace", icon: "heart" },
    ],
    quickActions: [
      { label: "Browse", href: "/marketplace", icon: "store" },
      { label: "Orders", href: "/orders", icon: "shopping-bag" },
      { label: "Wishlist", href: "/marketplace", icon: "heart" },
      { label: "Deals", href: "/marketplace/flash-deals", icon: "ticket" },
    ],
    recommendations: [
      "Check flash deals before they expire",
      "Track orders that need attention",
      "Ask AI to find products for you",
    ],
    home: legacyFromHome({
      eyebrow: "Buyer",
      title: "Shop smarter",
      subtitle: "Recommendations, orders, and wishlist — calm and ready.",
      accent: "#2563EB",
      aiInsight: "AI found 4 products matching your recent wishlist interests.",
      brief: [
        "2 orders in transit",
        "Wishlist has 5 saved items",
        "3 flash deals ending today",
        "1 new seller recommendation",
        "Wallet ready for checkout",
        "AI found 4 shopping opportunities",
      ],
      suggestedActions: [
        { label: "Continue shopping", href: "/marketplace" },
        { label: "Review orders", href: "/orders" },
        { label: "Open wishlist", href: "/marketplace" },
        { label: "Flash deals", href: "/marketplace/flash-deals" },
      ],
      focus: [
        { id: "f1", label: "Track pending order", href: "/orders", progress: 60, deadline: "Today", priority: "high", cta: "View order" },
        { id: "f2", label: "Checkout wishlist picks", href: "/marketplace", progress: 35, deadline: "This week", priority: "medium", cta: "Open wishlist" },
        { id: "f3", label: "Claim a flash deal", href: "/marketplace/flash-deals", progress: 10, deadline: "Ends soon", priority: "high", cta: "Browse deals" },
      ],
      insights: [
        { id: "i1", label: "Orders", value: "2", trend: "In transit", href: "/orders" },
        { id: "i2", label: "Wishlist", value: "5", trend: "Saved", href: "/marketplace" },
        { id: "i3", label: "Deals", value: "3", trend: "Ending today", href: "/marketplace/flash-deals" },
      ],
      calendar: [
        { id: "c1", label: "Flash deal ends", when: "Today · 6pm", href: "/marketplace/flash-deals", kind: "Deal" },
        { id: "c2", label: "Expected delivery", when: "Wed", href: "/orders", kind: "Order" },
      ],
      activity: [
        { id: "a1", label: "Order update", detail: "Shipment moved to out for delivery", time: "2h", href: "/orders", kind: "Orders" },
        { id: "a2", label: "Wishlist", detail: "A saved item dropped in price", time: "5h", href: "/marketplace", kind: "Shopping" },
        { id: "a3", label: "Message", detail: "Seller replied to your question", time: "1d", href: "/messages", kind: "Messages" },
      ],
    }),
  },
  {
    id: "seller",
    label: "Seller",
    emoji: "🏪",
    description: "Orders, inventory, shipping",
    homeHref: "/",
    tools: [
      { id: "products", label: "Products", href: "/marketplace", icon: "package" },
      { id: "orders", label: "Orders", href: "/orders", icon: "shopping-bag" },
      { id: "customers", label: "Customers", href: "/ugc/campaign-center/orders", icon: "users" },
      { id: "store", label: "Store", href: "/ugc/campaign-center/store", icon: "store" },
    ],
    quickActions: [
      { label: "Add Product", href: "/marketplace/new", icon: "plus" },
      { label: "Orders", href: "/orders", icon: "shopping-bag" },
      { label: "Inventory", href: "/marketplace", icon: "package" },
      { label: "Store", href: "/ugc/campaign-center/store", icon: "store" },
    ],
    recommendations: [
      "Fulfill unshipped orders first",
      "Restock low-inventory SKUs",
      "Ask AI for pricing opportunities",
    ],
    home: legacyFromHome({
      eyebrow: "Seller",
      title: "Run your store",
      subtitle: "Orders, inventory, and revenue in one operating view.",
      accent: "#16A34A",
      aiInsight: "5 pending orders are ready to fulfill — prioritize shipping today.",
      brief: [
        "5 pending orders",
        "Revenue trending up",
        "2 products low on stock",
        "1 storefront update suggested",
        "Wallet available for withdrawal",
        "AI found 3 pricing opportunities",
      ],
      suggestedActions: [
        { label: "Review orders", href: "/orders" },
        { label: "Add product", href: "/marketplace/new" },
        { label: "Update inventory", href: "/marketplace" },
        { label: "Withdraw earnings", href: "/wallet/withdrawals" },
      ],
      focus: [
        { id: "f1", label: "Ship pending orders", href: "/orders", progress: 45, deadline: "Today", priority: "high", cta: "Fulfill" },
        { id: "f2", label: "Publish product draft", href: "/marketplace", progress: 70, deadline: "Tomorrow", priority: "medium", cta: "Continue" },
        { id: "f3", label: "Restock inventory", href: "/marketplace", progress: 20, deadline: "This week", priority: "high", cta: "Update stock" },
      ],
      insights: [
        { id: "i1", label: "Revenue", value: "+18%", trend: "vs last week", href: "/" },
        { id: "i2", label: "Orders", value: "5", trend: "Awaiting ship", href: "/orders" },
        { id: "i3", label: "Growth", value: "Strong", trend: "Store health", href: "/ugc/campaign-center/store" },
      ],
      calendar: [
        { id: "c1", label: "Order SLA", when: "Today · 4pm", href: "/orders", kind: "Order" },
        { id: "c2", label: "Payout window", when: "Fri", href: "/wallet/withdrawals", kind: "Withdrawal" },
      ],
      activity: [
        { id: "a1", label: "New order", detail: "Customer placed an order awaiting fulfillment", time: "18m", href: "/orders", kind: "Orders" },
        { id: "a2", label: "Inventory", detail: "SKU inventory dipped below threshold", time: "3h", href: "/marketplace", kind: "Products" },
        { id: "a3", label: "Wallet", detail: "Balance ready for withdrawal", time: "1d", href: "/wallet", kind: "Wallet" },
      ],
    }),
  },
  {
    id: "creator",
    label: "Creator",
    emoji: "🎥",
    description: "Content, campaigns, portfolio",
    homeHref: "/",
    tools: [
      { id: "content", label: "My Content", href: "/ugc/library", icon: "graduation" },
      { id: "campaigns", label: "Campaigns", href: "/ugc", icon: "megaphone" },
      { id: "applications", label: "Applications", href: "/ugc/applications", icon: "layout" },
      { id: "earnings", label: "Earnings", href: "/ugc/earnings", icon: "wallet" },
      { id: "calendar", label: "Calendar", href: "/ugc/calendar", icon: "clock" },
      { id: "creator-analytics", label: "Analytics", href: "/ugc/analytics", icon: "chart" },
    ],
    quickActions: [
      { label: "Upload Content", href: "/ugc/library", icon: "upload" },
      { label: "Join Campaign", href: "/ugc", icon: "megaphone" },
      { label: "Portfolio", href: "/identity", icon: "users" },
      { label: "Earnings", href: "/ugc/earnings", icon: "wallet" },
    ],
    recommendations: [
      "Apply to high-fit campaigns",
      "Refresh your media kit",
      "Plan this week's content calendar",
    ],
    home: legacyFromHome({
      eyebrow: "Creator",
      title: "Create and earn",
      subtitle: "Campaigns, content, and portfolio — your creator OS.",
      accent: "#FF5A1F",
      aiInsight: "3 campaigns match your niche — apply before deadlines close.",
      brief: [
        "3 campaigns waiting",
        "2 applications need follow-up",
        "1 submission deadline today",
        "Portfolio profile 80% complete",
        "Wallet available for withdrawal",
        "AI found 6 opportunities",
      ],
      suggestedActions: [
        { label: "Continue editing", href: "/ugc/library" },
        { label: "Approve / apply", href: "/ugc/applications" },
        { label: "Withdraw earnings", href: "/wallet/withdrawals" },
        { label: "Join campaign", href: "/ugc" },
      ],
      focus: [
        { id: "f1", label: "Finish campaign application", href: "/ugc/applications", progress: 65, deadline: "Today", priority: "high", cta: "Continue" },
        { id: "f2", label: "Submit content draft", href: "/ugc/submissions", progress: 40, deadline: "Tomorrow", priority: "high", cta: "Upload" },
        { id: "f3", label: "Complete profile", href: "/settings/profile", progress: 80, deadline: "This week", priority: "medium", cta: "Edit profile" },
      ],
      insights: [
        { id: "i1", label: "Creator trend", value: "+12%", trend: "Engagement", href: "/ugc/analytics" },
        { id: "i2", label: "Earnings", value: "Ready", trend: "Withdraw", href: "/ugc/earnings" },
        { id: "i3", label: "Achievements", value: "2", trend: "This month", href: "/identity" },
      ],
      calendar: [
        { id: "c1", label: "Campaign deadline", when: "Today · 8pm", href: "/ugc/calendar", kind: "Campaign" },
        { id: "c2", label: "Content review", when: "Thu", href: "/ugc/submissions", kind: "Approval" },
        { id: "c3", label: "Live collab", when: "Sat", href: "/communities/live", kind: "Live" },
      ],
      activity: [
        { id: "a1", label: "Campaign", detail: "Brand viewed your application", time: "1h", href: "/ugc/applications", kind: "Campaigns" },
        { id: "a2", label: "Message", detail: "New brief shared for review", time: "4h", href: "/messages", kind: "Messages" },
        { id: "a3", label: "Wallet", detail: "UGC payout settled", time: "2d", href: "/wallet", kind: "Wallet" },
      ],
    }),
  },
  {
    id: "brand",
    label: "Brand",
    emoji: "💼",
    description: "Campaigns and creator discovery",
    homeHref: "/",
    tools: [
      { id: "campaigns", label: "Campaigns", href: "/ugc/campaign-center", icon: "megaphone" },
      { id: "creators", label: "Creators", href: "/ugc/campaign-center/recruitment", icon: "users" },
      { id: "applications", label: "Applications", href: "/ugc/campaign-center/active", icon: "layout" },
      { id: "performance", label: "Performance", href: "/ugc/campaign-center/analytics", icon: "chart" },
      { id: "payments", label: "Payments", href: "/ugc/campaign-center/escrow", icon: "wallet" },
      { id: "assets", label: "Assets", href: "/ugc/campaign-center/assets", icon: "package" },
    ],
    quickActions: [
      { label: "Launch Campaign", href: "/ugc/campaign-center/create", icon: "megaphone" },
      { label: "Find Creators", href: "/ugc/campaign-center/recruitment", icon: "users" },
      { label: "Review Apps", href: "/ugc/campaign-center/active", icon: "check" },
      { label: "AI Brief", href: "/ugc/campaign-center/copilot", icon: "sparkles" },
    ],
    recommendations: [
      "Review pending creator applications",
      "Invite creators from your CRM",
      "Generate a campaign brief with AI",
    ],
    home: legacyFromHome({
      eyebrow: "Brand",
      title: "Run creator campaigns",
      subtitle: "Discovery, briefs, performance, and escrow — brand OS.",
      accent: "#7C3AED",
      aiInsight: "4 creator applications are waiting for review in your active campaign.",
      brief: [
        "4 applications pending review",
        "2 campaigns active",
        "Escrow healthy",
        "1 brief draft unfinished",
        "Performance trending up",
        "AI found 5 creator matches",
      ],
      suggestedActions: [
        { label: "Approve campaign", href: "/ugc/campaign-center/active" },
        { label: "Find creators", href: "/ugc/campaign-center/recruitment" },
        { label: "Launch campaign", href: "/ugc/campaign-center/create" },
        { label: "AI brief", href: "/ugc/campaign-center/copilot" },
      ],
      focus: [
        { id: "f1", label: "Review applications", href: "/ugc/campaign-center/active", progress: 30, deadline: "Today", priority: "high", cta: "Review" },
        { id: "f2", label: "Finish campaign brief", href: "/ugc/campaign-center/create", progress: 55, deadline: "Tomorrow", priority: "medium", cta: "Continue" },
        { id: "f3", label: "Fund escrow", href: "/ugc/campaign-center/escrow", progress: 15, deadline: "This week", priority: "high", cta: "Open escrow" },
      ],
      insights: [
        { id: "i1", label: "Campaign ROI", value: "+22%", trend: "This month", href: "/ugc/campaign-center/analytics" },
        { id: "i2", label: "Creators", value: "12", trend: "In pipeline", href: "/ugc/campaign-center/recruitment" },
        { id: "i3", label: "Growth", value: "Rising", trend: "Applications", href: "/ugc/campaign-center" },
      ],
      calendar: [
        { id: "c1", label: "Approval deadline", when: "Today", href: "/ugc/campaign-center/active", kind: "Approval" },
        { id: "c2", label: "Campaign kickoff", when: "Mon", href: "/ugc/campaign-center", kind: "Campaign" },
      ],
      activity: [
        { id: "a1", label: "Application", detail: "New creator applied to your campaign", time: "32m", href: "/ugc/campaign-center/active", kind: "Campaigns" },
        { id: "a2", label: "Escrow", detail: "Milestone payment ready", time: "6h", href: "/ugc/campaign-center/escrow", kind: "Wallet" },
        { id: "a3", label: "AI", detail: "Suggested 5 creators for your brief", time: "1d", href: "/ugc/campaign-center/copilot", kind: "AI" },
      ],
    }),
  },
  {
    id: "affiliate",
    label: "Affiliate",
    emoji: "🤝",
    description: "Links, conversions, referrals",
    homeHref: "/",
    tools: [
      { id: "links", label: "Links", href: "/affiliates/links", icon: "link" },
      { id: "programs", label: "Programs", href: "/affiliates", icon: "megaphone" },
      { id: "conversions", label: "Conversions", href: "/affiliates/dashboard", icon: "chart" },
      { id: "leaderboard", label: "Leaderboard", href: "/ugc/referrals", icon: "users" },
    ],
    quickActions: [
      { label: "Generate Link", href: "/affiliates/links", icon: "link" },
      { label: "Withdraw", href: "/wallet/withdrawals", icon: "wallet" },
      { label: "Analytics", href: "/affiliates/analytics", icon: "chart" },
      { label: "Programs", href: "/affiliates", icon: "megaphone" },
    ],
    recommendations: [
      "Promote highest-converting links",
      "Check pending commissions",
      "Ask AI which products to push",
    ],
    home: legacyFromHome({
      eyebrow: "Affiliate",
      title: "Promote and earn",
      subtitle: "Links, conversions, and payouts — your growth OS.",
      accent: "#CA8A04",
      aiInsight: "Your top link is converting 2.1× better than average this week.",
      brief: [
        "Top link converting strongly",
        "Commissions pending settlement",
        "Wallet available for withdrawal",
        "2 programs with new offers",
        "Clicks up this week",
        "AI found 4 products to promote",
      ],
      suggestedActions: [
        { label: "Generate link", href: "/affiliates/links" },
        { label: "Withdraw earnings", href: "/wallet/withdrawals" },
        { label: "Review clicks", href: "/affiliates/analytics" },
        { label: "Open programs", href: "/affiliates" },
      ],
      focus: [
        { id: "f1", label: "Share top affiliate link", href: "/affiliates/links", progress: 50, deadline: "Today", priority: "high", cta: "Copy link" },
        { id: "f2", label: "Withdraw earnings", href: "/wallet/withdrawals", progress: 90, deadline: "Ready", priority: "medium", cta: "Withdraw" },
        { id: "f3", label: "Join new program", href: "/affiliates", progress: 10, deadline: "This week", priority: "low", cta: "Browse" },
      ],
      insights: [
        { id: "i1", label: "Revenue trend", value: "+9%", trend: "Commissions", href: "/affiliates/dashboard" },
        { id: "i2", label: "Clicks", value: "1.2k", trend: "This week", href: "/affiliates/analytics" },
        { id: "i3", label: "Growth", value: "Healthy", trend: "Conversions", href: "/affiliates" },
      ],
      calendar: [
        { id: "c1", label: "Payout window", when: "Fri", href: "/wallet/withdrawals", kind: "Withdrawal" },
        { id: "c2", label: "Program promo ends", when: "Sun", href: "/affiliates", kind: "Campaign" },
      ],
      activity: [
        { id: "a1", label: "Conversion", detail: "Affiliate sale attributed to your link", time: "45m", href: "/affiliates/dashboard", kind: "Orders" },
        { id: "a2", label: "Wallet", detail: "Commission unlocked", time: "5h", href: "/wallet", kind: "Wallet" },
        { id: "a3", label: "AI", detail: "Suggested products to promote", time: "1d", href: "/affiliates/ai", kind: "AI" },
      ],
    }),
  },
  {
    id: "community",
    label: "Community",
    emoji: "👥",
    description: "Hubs, courses, events",
    homeHref: "/",
    tools: [
      { id: "communities", label: "Communities", href: "/communities", icon: "users-round" },
      { id: "members", label: "Members", href: "/owner/communities", icon: "users" },
      { id: "spaces", label: "Spaces", href: "/communities/spaces", icon: "layout" },
      { id: "courses", label: "Courses", href: "/communities/courses", icon: "graduation" },
      { id: "events", label: "Events", href: "/communities/events", icon: "megaphone" },
    ],
    quickActions: [
      { label: "Create Space", href: "/communities/spaces", icon: "layout" },
      { label: "Create Event", href: "/communities/events", icon: "calendar" },
      { label: "Invite Members", href: "/owner/communities", icon: "users" },
      { label: "Courses", href: "/communities/courses", icon: "graduation" },
    ],
    recommendations: [
      "Engage members in active spaces",
      "Schedule your next event",
      "Ask AI for community growth ideas",
    ],
    home: legacyFromHome({
      eyebrow: "Community",
      title: "Grow your community",
      subtitle: "Members, spaces, events, and learning — connected.",
      accent: "#2D7DD2",
      aiInsight: "2 community invitations and 1 event need your attention today.",
      brief: [
        "2 community invitations",
        "Member activity rising",
        "1 event scheduled this week",
        "Course draft unfinished",
        "3 unread community messages",
        "AI found 3 growth ideas",
      ],
      suggestedActions: [
        { label: "Invite members", href: "/owner/communities" },
        { label: "Create event", href: "/communities/events" },
        { label: "Open spaces", href: "/communities/spaces" },
        { label: "Join live", href: "/communities/live" },
      ],
      focus: [
        { id: "f1", label: "Respond to invitations", href: "/communities", progress: 25, deadline: "Today", priority: "high", cta: "Review" },
        { id: "f2", label: "Publish community event", href: "/communities/events", progress: 50, deadline: "Tomorrow", priority: "medium", cta: "Continue" },
        { id: "f3", label: "Finish course draft", href: "/communities/courses", progress: 40, deadline: "This week", priority: "medium", cta: "Edit course" },
      ],
      insights: [
        { id: "i1", label: "Community trend", value: "+14%", trend: "Engagement", href: "/owner/communities" },
        { id: "i2", label: "Members", value: "Active", trend: "This week", href: "/communities" },
        { id: "i3", label: "Growth", value: "Steady", trend: "Spaces", href: "/communities/spaces" },
      ],
      calendar: [
        { id: "c1", label: "Community event", when: "Thu · 7pm", href: "/communities/events", kind: "Event" },
        { id: "c2", label: "Course release", when: "Next week", href: "/communities/courses", kind: "Course" },
      ],
      activity: [
        { id: "a1", label: "Community", detail: "New member joined your space", time: "1h", href: "/communities", kind: "Community" },
        { id: "a2", label: "Event", detail: "RSVP count updated", time: "4h", href: "/communities/events", kind: "Community" },
        { id: "a3", label: "Message", detail: "Space discussion needs a reply", time: "1d", href: "/communities/messages", kind: "Messages" },
      ],
    }),
  },
  {
    id: "live",
    label: "Live Commerce",
    emoji: "📺",
    description: "Go live and sell",
    homeHref: "/",
    tools: [
      { id: "go-live", label: "Streaming", href: "/communities/live", icon: "live" },
      { id: "upcoming", label: "Upcoming Lives", href: "/communities/events", icon: "megaphone" },
      { id: "products", label: "Products", href: "/marketplace", icon: "package" },
      { id: "audience", label: "Audience", href: "/communities", icon: "users" },
    ],
    quickActions: [
      { label: "Go Live", href: "/communities/live", icon: "live" },
      { label: "Schedule Live", href: "/communities/events", icon: "calendar" },
      { label: "Products", href: "/marketplace", icon: "package" },
      { label: "Replay", href: "/communities/live", icon: "play" },
    ],
    recommendations: [
      "Prep product highlights before going live",
      "Promote your next live in communities",
      "Review last session revenue",
    ],
    home: legacyFromHome({
      eyebrow: "Live",
      title: "Stream and sell",
      subtitle: "Upcoming lives, audience, products, and revenue.",
      accent: "#DC2626",
      aiInsight: "Your next live is under-promoted — share it in community spaces.",
      brief: [
        "1 live scheduled this week",
        "Product bag needs refresh",
        "Audience reminders ready",
        "Last session revenue settled",
        "Replay available",
        "AI found 3 products to feature",
      ],
      suggestedActions: [
        { label: "Go live", href: "/communities/live" },
        { label: "Schedule live", href: "/communities/events" },
        { label: "Load products", href: "/marketplace" },
        { label: "Join live", href: "/communities/live" },
      ],
      focus: [
        { id: "f1", label: "Prep live product bag", href: "/marketplace", progress: 35, deadline: "Today", priority: "high", cta: "Select products" },
        { id: "f2", label: "Schedule next live", href: "/communities/events", progress: 20, deadline: "Tomorrow", priority: "medium", cta: "Schedule" },
        { id: "f3", label: "Promote to community", href: "/communities", progress: 10, deadline: "This week", priority: "medium", cta: "Share" },
      ],
      insights: [
        { id: "i1", label: "Revenue", value: "Live", trend: "Last session", href: "/" },
        { id: "i2", label: "Audience", value: "Warm", trend: "Reminders", href: "/communities" },
        { id: "i3", label: "Growth", value: "+8%", trend: "Watch time", href: "/communities/live" },
      ],
      calendar: [
        { id: "c1", label: "Go live", when: "Sat · 5pm", href: "/communities/live", kind: "Live" },
        { id: "c2", label: "Product prep", when: "Fri", href: "/marketplace", kind: "Approval" },
      ],
      activity: [
        { id: "a1", label: "Live", detail: "Upcoming session reminder set", time: "2h", href: "/communities/live", kind: "Live" },
        { id: "a2", label: "Orders", detail: "Live-attributed order received", time: "1d", href: "/orders", kind: "Orders" },
        { id: "a3", label: "Community", detail: "Members asked about next stream", time: "2d", href: "/communities", kind: "Community" },
      ],
    }),
  },
  {
    id: "ai",
    label: "AI Workspace",
    emoji: "🤖",
    description: "Copilot and automation",
    homeHref: "/",
    tools: [
      { id: "campaign-ai", label: "Campaign Builder", href: "/ugc/campaign-center/copilot", icon: "megaphone" },
      { id: "creator-ai", label: "Creator Coach", href: "/ugc/creator-copilot", icon: "users" },
      { id: "automations", label: "Automations", href: "/ugc/campaign-center/automations", icon: "zap" },
      { id: "wallet-ai", label: "Financial AI", href: "/wallet/ai", icon: "wallet" },
    ],
    quickActions: [
      { label: "Generate", href: "/ugc/campaign-center/copilot", icon: "sparkles" },
      { label: "Analyze", href: "/", icon: "chart" },
      { label: "Automate", href: "/ugc/campaign-center/automations", icon: "zap" },
      { label: "Finance AI", href: "/wallet/ai", icon: "wallet" },
    ],
    recommendations: [
      "Generate a campaign brief",
      "Ask for growth opportunities",
      "Run a financial summary",
    ],
    home: legacyFromHome({
      eyebrow: "AI",
      title: "Think with Jimvio",
      subtitle: "Copilot, automations, and insights — intelligence first.",
      accent: "#4F46E5",
      aiInsight: "6 opportunities are ready — start with campaign brief generation.",
      brief: [
        "6 opportunities detected",
        "1 automation idle",
        "Campaign brief unfinished",
        "Finance summary ready",
        "Creator coach tips available",
        "AI recommends focusing on high-ROI tasks",
      ],
      suggestedActions: [
        { label: "Generate brief", href: "/ugc/campaign-center/copilot" },
        { label: "Analyze growth", href: "/" },
        { label: "Automate workflow", href: "/ugc/campaign-center/automations" },
        { label: "Wallet AI", href: "/wallet/ai" },
      ],
      focus: [
        { id: "f1", label: "Generate campaign brief", href: "/ugc/campaign-center/copilot", progress: 15, deadline: "Today", priority: "high", cta: "Generate" },
        { id: "f2", label: "Enable automation", href: "/ugc/campaign-center/automations", progress: 40, deadline: "Tomorrow", priority: "medium", cta: "Automate" },
        { id: "f3", label: "Review AI insights", href: "/", progress: 60, deadline: "This week", priority: "low", cta: "Open insights" },
      ],
      insights: [
        { id: "i1", label: "Opportunities", value: "6", trend: "Ready", href: "/" },
        { id: "i2", label: "Automations", value: "1", trend: "Idle", href: "/ugc/campaign-center/automations" },
        { id: "i3", label: "Growth", value: "AI+", trend: "Suggestions", href: "/" },
      ],
      calendar: [
        { id: "c1", label: "Automation review", when: "Today", href: "/ugc/campaign-center/automations", kind: "Approval" },
        { id: "c2", label: "Finance AI check-in", when: "Fri", href: "/wallet/ai", kind: "Withdrawal" },
      ],
      activity: [
        { id: "a1", label: "AI", detail: "New opportunity set generated", time: "20m", href: "/", kind: "AI" },
        { id: "a2", label: "Automation", detail: "Workflow waiting for enablement", time: "3h", href: "/ugc/campaign-center/automations", kind: "AI" },
        { id: "a3", label: "Wallet", detail: "Financial summary refreshed", time: "1d", href: "/wallet/ai", kind: "Wallet" },
      ],
    }),
  },
];

export function normalizeWorkspaceMode(mode: string | null | undefined): OsWorkspaceMode {
  if (mode === "admin") return "brand";
  const valid = CREATOR_OS_WORKSPACES.some((w) => w.id === mode);
  return valid ? (mode as OsWorkspaceMode) : "seller";
}

export function getWorkspaceDefinition(mode: OsWorkspaceMode): WorkspaceDefinition {
  const normalized = normalizeWorkspaceMode(mode);
  return CREATOR_OS_WORKSPACES.find((w) => w.id === normalized) ?? CREATOR_OS_WORKSPACES[1];
}

/** @deprecated Prefer tools + OS_CORE_RAIL */
export function getWorkspaceNav(mode: OsWorkspaceMode): WorkspaceNavItem[] {
  const ws = getWorkspaceDefinition(mode);
  return [...ws.tools, ...OS_CORE_RAIL, ...OS_PROFILE_RAIL];
}
