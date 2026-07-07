import type {
  OsAiEntry,
  OsNavItem,
  OsQuickCreateItem,
  OsWorkspaceMode,
} from "./types";

export const OS_NAV_ITEMS: OsNavItem[] = [
  { id: "home", label: "Home", href: "/dashboard", icon: "home" },
  { id: "marketplace", label: "Marketplace", href: "/marketplace", icon: "store" },
  { id: "products", label: "Products", href: "/dashboard/products", icon: "package" },
  { id: "orders", label: "Orders", href: "/dashboard/orders", icon: "shopping-bag" },
  { id: "customers", label: "Customers", href: "/dashboard/vendor/customers", icon: "users" },
  { id: "affiliate", label: "Affiliate", href: "/dashboard/affiliate", icon: "link" },
  { id: "ugc", label: "UGC", href: "/ugc", icon: "video" },
  { id: "communities", label: "Communities", href: "/dashboard/communities", icon: "users-round" },
  { id: "courses", label: "Courses", href: "/dashboard/products?type=digital", icon: "graduation" },
  { id: "campaigns", label: "Campaigns", href: "/dashboard/vendor/campaigns", icon: "megaphone" },
  { id: "live", label: "Live", href: "/dashboard/influencer/videos", icon: "radio" },
  { id: "messages", label: "Messages", href: "/dashboard/messages", icon: "message" },
  { id: "payments", label: "Payments", href: "/dashboard/wallet", icon: "wallet" },
  { id: "analytics", label: "Analytics", href: "/dashboard/analytics", icon: "chart" },
  { id: "workspace", label: "Workspace", href: "/dashboard", icon: "layout" },
  { id: "ai", label: "Jimvio AI", href: "#open-ai", icon: "sparkles" },
  { id: "settings", label: "Settings", href: "/dashboard/settings", icon: "settings" },
];

export const OS_WORKSPACE_MODES: Array<{
  id: OsWorkspaceMode;
  label: string;
  description: string;
}> = [
  { id: "buyer", label: "Buyer", description: "Shop and discover" },
  { id: "seller", label: "Seller", description: "Manage your store" },
  { id: "creator", label: "Creator", description: "Content and audience" },
  { id: "affiliate", label: "Affiliate", description: "Promote and earn" },
  { id: "community", label: "Community", description: "Hubs and members" },
  { id: "admin", label: "Admin", description: "Platform operations" },
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
  { id: "product", label: "Product", description: "New listing", href: "/dashboard/products/new", icon: "package", accent: "#fd5000" },
  { id: "community", label: "Community", description: "Launch a hub", href: "/dashboard/communities", icon: "users", accent: "#16a34a" },
  { id: "campaign", label: "Campaign", description: "UGC or affiliate", href: "/dashboard/vendor/campaigns/new", icon: "megaphone", accent: "#ea580c" },
  { id: "course", label: "Course", description: "Digital learning", href: "/dashboard/products/new", icon: "graduation", accent: "#7c3aed" },
  { id: "live-event", label: "Live Event", description: "Go live", href: "/dashboard/influencer/videos", icon: "radio", accent: "#dc2626" },
  { id: "coupon", label: "Coupon", description: "Discount code", href: "/dashboard/products", icon: "ticket", accent: "#ca8a04" },
  { id: "affiliate-link", label: "Affiliate Link", description: "Track commissions", href: "/dashboard/affiliate", icon: "link", accent: "#0891b2" },
  { id: "ugc-request", label: "UGC Request", description: "Creator content", href: "/ugc", icon: "video", accent: "#2563eb" },
  { id: "message", label: "Message", description: "Start conversation", href: "/dashboard/messages", icon: "message", accent: "#4f46e5" },
];

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
  { id: "n-1", category: "orders" as const, title: "Order shipped", body: "Order #1040 is on the way.", time: "10m ago", read: false, archived: false, href: "/dashboard/orders" },
  { id: "n-2", category: "payments" as const, title: "Payout processed", body: "Withdrawal completed successfully.", time: "1h ago", read: false, archived: false, href: "/dashboard/wallet" },
  { id: "n-3", category: "messages" as const, title: "New message", body: "Buyer asked about shipping.", time: "2h ago", read: true, archived: false, href: "/dashboard/messages" },
  { id: "n-4", category: "affiliate" as const, title: "Commission earned", body: "New affiliate conversion.", time: "3h ago", read: false, archived: false, href: "/dashboard/affiliate" },
  { id: "n-5", category: "ugc" as const, title: "UGC submission", body: "Creator submitted content for review.", time: "4h ago", read: false, archived: false, href: "/ugc" },
  { id: "n-6", category: "communities" as const, title: "Community post", body: "New discussion in your hub.", time: "5h ago", read: true, archived: false, href: "/dashboard/communities" },
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
    return (raw as OsWorkspaceMode) || "seller";
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
