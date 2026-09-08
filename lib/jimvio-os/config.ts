import type {
  OsAiEntry,
  OsNavItem,
  OsQuickCreateItem,
  OsWorkspaceMode,
} from "./types";

/** Recents / search labels — product-based destinations (no Dashboard product label). */
export const OS_NAV_ITEMS: OsNavItem[] = [
  { id: "home", label: "Home", href: "/", icon: "home" },
  { id: "marketplace", label: "Marketplace", href: "/marketplace", icon: "store" },
  { id: "orders", label: "Orders", href: "/orders", icon: "shopping-bag" },
  { id: "wallet", label: "Wallet", href: "/wallet", icon: "wallet" },
  { id: "communities", label: "Communities", href: "/communities", icon: "users-round" },
  { id: "affiliate", label: "Affiliates", href: "/affiliates", icon: "link" },
  { id: "ugc", label: "UGC & Clipping", href: "/ugc", icon: "megaphone" },
  { id: "messages", label: "Messages", href: "/messages", icon: "message" },
  { id: "inbox", label: "Inbox", href: "/notifications", icon: "bell" },
  { id: "products", label: "Products", href: "/marketplace", icon: "package" },
  { id: "analytics", label: "Analytics", href: "/", icon: "chart" },
  { id: "ai", label: "Jimvio AI", href: "#open-ai", icon: "sparkles" },
  { id: "settings", label: "Settings", href: "/identity/settings", icon: "settings" },
];

export const OS_WORKSPACE_MODES: Array<{
  id: OsWorkspaceMode;
  label: string;
  description: string;
  emoji: string;
}> = [
  { id: "buyer", label: "Buyer", description: "Shop and discover", emoji: "🛒" },
  { id: "seller", label: "Seller", description: "Manage your store", emoji: "🏪" },
  { id: "creator", label: "Creator", description: "Content and deals", emoji: "🎥" },
  { id: "brand", label: "Brand", description: "Campaigns & creators", emoji: "💼" },
  { id: "affiliate", label: "Affiliate", description: "Promote and earn", emoji: "🤝" },
  { id: "community", label: "Community", description: "Hubs and members", emoji: "👥" },
  { id: "live", label: "Live Commerce", description: "Go live and sell", emoji: "📺" },
  { id: "ai", label: "AI Workspace", description: "Copilot & automation", emoji: "🤖" },
];

export const OS_SEARCH_CATEGORIES = [
  { id: "all" as const, label: "All" },
  { id: "products" as const, label: "Products" },
  { id: "orders" as const, label: "Orders" },
  { id: "creators" as const, label: "Creators" },
  { id: "communities" as const, label: "Communities" },
  { id: "campaigns" as const, label: "Campaigns" },
  { id: "messages" as const, label: "Messages" },
  { id: "courses" as const, label: "Courses" },
  { id: "analytics" as const, label: "Analytics" },
  { id: "ai" as const, label: "AI" },
];

export const OS_NOTIFICATION_FILTERS = [
  { id: "all" as const, label: "All" },
  { id: "orders" as const, label: "Orders" },
  { id: "payments" as const, label: "Payments" },
  { id: "messages" as const, label: "Messages" },
  { id: "affiliate" as const, label: "Affiliate" },
  { id: "ugc" as const, label: "UGC" },
  { id: "communities" as const, label: "Communities" },
  { id: "security" as const, label: "Security" },
  { id: "system" as const, label: "System" },
];

export const OS_QUICK_CREATE_ITEMS: OsQuickCreateItem[] = [
  // Commerce
  { id: "product", label: "Product", description: "New listing", href: "/marketplace/new", icon: "package", accent: "#fd5000", group: "commerce" },
  { id: "course", label: "Course", description: "Digital learning", href: "/marketplace/new", icon: "graduation", accent: "#7c3aed", group: "commerce" },
  { id: "coupon", label: "Coupon", description: "Discount code", href: "/marketplace", icon: "ticket", accent: "#ca8a04", group: "commerce" },
  { id: "folder", label: "Folder", description: "Organize your content library", href: "/ugc/library", icon: "folder", accent: "#64748b", group: "commerce" },

  // Creator
  { id: "ugc-request", label: "UGC Campaign", description: "Launch a creator campaign", href: "/ugc/campaign-center/create", icon: "megaphone", accent: "#fd5000", group: "creator" },
  { id: "campaign", label: "Seller Campaign", description: "Vendor promo campaign", href: "/ugc/campaign-center/create", icon: "megaphone", accent: "#ea580c", group: "creator" },
  { id: "creator-invite", label: "Creator Invite", description: "Recruit creators", href: "/ugc/campaign-center/recruitment", icon: "user-plus", accent: "#0ea5e9", group: "creator" },
  { id: "brand-invite", label: "Brand Invite", description: "Invite a brand partner", href: "/ugc/campaign-center/invitations", icon: "handshake", accent: "#7c3aed", group: "creator" },
  { id: "automation", label: "Automation", description: "Automate campaign steps", href: "/ugc/campaign-center/automations", icon: "workflow", accent: "#0d9488", group: "creator" },
  { id: "workflow", label: "Workflow", description: "Multi-step campaign workflow", href: "/ugc/campaign-center/workflows", icon: "git-branch", accent: "#0d9488", group: "creator" },

  // Community
  { id: "community", label: "Community", description: "Launch a hub", href: "/owner/communities", icon: "users", accent: "#16a34a", group: "community" },
  { id: "space", label: "Space", description: "Open a new collaboration space", href: "/communities/spaces", icon: "layers", accent: "#16a34a", group: "community" },
  { id: "event", label: "Event", description: "Schedule a community event", href: "/communities/events", icon: "calendar", accent: "#16a34a", group: "community" },
  { id: "live-event", label: "Live Event", description: "Schedule a live room", href: "/communities/live", icon: "live", accent: "#dc2626", group: "community" },
  { id: "message", label: "Message", description: "Start conversation", href: "/messages", icon: "message", accent: "#4f46e5", group: "community" },

  // Money
  { id: "affiliate-link", label: "Affiliate Link", description: "Create a referral link", href: "/affiliates", icon: "link", accent: "#0d9488", group: "money" },
  { id: "deposit", label: "Deposit", description: "Add funds to wallet", href: "/wallet/deposits", icon: "wallet", accent: "#16a34a", group: "money" },
  { id: "withdraw", label: "Withdraw", description: "Cash out your balance", href: "/wallet/withdrawals", icon: "wallet", accent: "#0ea5e9", group: "money" },
];

export const OS_QUICK_CREATE_GROUP_LABELS: Record<string, string> = {
  commerce: "Commerce",
  creator: "Creator",
  community: "Community",
  money: "Money",
  ai: "AI",
};

export const OS_AI_ENTRIES: OsAiEntry[] = [
  { context: "marketplace", label: "Marketplace", placeholder: "Find profitable products." },
  { context: "orders", label: "Orders", placeholder: "Summarize order issues." },
  { context: "analytics", label: "Analytics", placeholder: "Explain revenue trends." },
  { context: "communities", label: "Communities", placeholder: "Recommend growth actions." },
  { context: "affiliate", label: "Affiliate", placeholder: "Suggest high-converting campaigns." },
  { context: "default", label: "Jimvio AI", placeholder: "Ask anything about your business." },
];

export const OS_FAVORITES_STORAGE_KEY = "jimvio-os-favorites-v1";
export const OS_RECENTS_STORAGE_KEY = "jimvio-os-recents-v1";
export const OS_MODE_STORAGE_KEY = "jimvio-os-mode-v1";
export const OS_SIDEBAR_COLLAPSED_KEY = "jimvio-os-sidebar-collapsed-v1";

export const OS_ACTIVITY_SCAFFOLD = [
  { id: "act-1", kind: "order" as const, title: "New order received", subtitle: "Order #1042 · awaiting fulfillment", time: "2m ago", live: true },
  { id: "act-2", kind: "sale" as const, title: "New sale", subtitle: "Digital course purchase", time: "8m ago", live: true },
  { id: "act-3", kind: "affiliate" as const, title: "Affiliate commission", subtitle: "+$12.40 credited", time: "15m ago" },
  { id: "act-4", kind: "ugc" as const, title: "UGC request", subtitle: "Brand campaign application", time: "22m ago" },
  { id: "act-5", kind: "community" as const, title: "Community activity", subtitle: "3 new members joined", time: "1h ago" },
  { id: "act-6", kind: "campaign" as const, title: "Campaign update", subtitle: "Budget 80% utilized", time: "2h ago" },
  { id: "act-7", kind: "follower" as const, title: "Follower growth", subtitle: "+24 followers today", time: "3h ago" },
  { id: "act-8", kind: "review" as const, title: "Recent review", subtitle: "5★ product review", time: "5h ago" },
];

export const OS_NOTIFICATIONS_SCAFFOLD = [
  { id: "n-1", category: "orders" as const, title: "Order shipped", body: "Order #1040 is on the way.", time: "10m ago", read: false, archived: false, href: "/orders" },
  { id: "n-2", category: "payments" as const, title: "Payout processed", body: "Withdrawal completed successfully.", time: "1h ago", read: false, archived: false, href: "/wallet" },
  { id: "n-3", category: "messages" as const, title: "New message", body: "Buyer asked about shipping.", time: "2h ago", read: true, archived: false, href: "/messages" },
  { id: "n-4", category: "payments" as const, title: "Payment received", body: "New store payment.", time: "3h ago", read: false, archived: false, href: "/wallet" },
  { id: "n-5", category: "ugc" as const, title: "UGC submission", body: "Creator submitted content for review.", time: "4h ago", read: false, archived: false, href: "/ugc" },
  { id: "n-6", category: "communities" as const, title: "Community post", body: "New discussion in your hub.", time: "5h ago", read: true, archived: false, href: "/owner/communities" },
  { id: "n-7", category: "security" as const, title: "New login", body: "Account accessed from new device.", time: "1d ago", read: true, archived: false },
  { id: "n-8", category: "system" as const, title: "Platform update", body: "Jimvio OS frontend architecture ready.", time: "1d ago", read: true, archived: false },
];

export function loadOsFavorites(): string[] {
  if (typeof window === "undefined") return ["home", "products", "analytics"];
  try {
    const raw = localStorage.getItem(OS_FAVORITES_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : ["home", "products", "analytics"];
  } catch {
    return ["home", "products", "analytics"];
  }
}

export function saveOsFavorites(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(OS_FAVORITES_STORAGE_KEY, JSON.stringify(ids));
  } catch { /* silent */ }
}

export function loadOsMode(): OsWorkspaceMode {
  if (typeof window === "undefined") return "seller";
  try {
    const raw = localStorage.getItem(OS_MODE_STORAGE_KEY);
    // Lazy import avoided — inline legacy admin → brand mapping
    if (raw === "admin") return "brand";
    const allowed: OsWorkspaceMode[] = [
      "buyer",
      "seller",
      "creator",
      "affiliate",
      "community",
      "brand",
      "live",
      "ai",
    ];
    if (raw && allowed.includes(raw as OsWorkspaceMode)) return raw as OsWorkspaceMode;
    return "seller";
  } catch {
    return "seller";
  }
}

export function saveOsMode(mode: OsWorkspaceMode) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(OS_MODE_STORAGE_KEY, mode);
  } catch { /* silent */ }
}
