import type {
  WorkspaceModule,
  WorkspaceQuickAction,
  WorkspaceWidgetId,
  WorkspaceWidgetLayout,
} from "./types";

export const WORKSPACE_WIDGET_META: Record<
  WorkspaceWidgetId,
  { label: string; description: string; minColSpan: 3 | 4 | 6 | 12 }
> = {
  earnings: { label: "Earnings", description: "Revenue overview", minColSpan: 3 },
  sales: { label: "Sales", description: "Recent sales activity", minColSpan: 3 },
  orders: { label: "Orders", description: "Order pipeline", minColSpan: 3 },
  communities: { label: "Communities", description: "Your hubs", minColSpan: 3 },
  "affiliate-revenue": { label: "Affiliate Revenue", description: "Commission earnings", minColSpan: 3 },
  "ugc-campaigns": { label: "UGC Campaigns", description: "Active creator campaigns", minColSpan: 3 },
  "creator-score": { label: "Creator Score", description: "Performance score", minColSpan: 3 },
  notifications: { label: "Notifications", description: "Unified inbox", minColSpan: 6 },
  messages: { label: "Messages", description: "Conversations", minColSpan: 6 },
  tasks: { label: "Tasks", description: "Action items", minColSpan: 4 },
  "upcoming-events": { label: "Upcoming Events", description: "Live and scheduled", minColSpan: 4 },
  "ai-suggestions": { label: "Jimvio AI", description: "AI-powered suggestions", minColSpan: 6 },
  "quick-actions": { label: "Quick Actions", description: "Launch pad", minColSpan: 12 },
  "module-nav": { label: "Modules", description: "Jimvio modules", minColSpan: 12 },
};

export const DEFAULT_WORKSPACE_LAYOUT: WorkspaceWidgetLayout[] = [
  { instanceId: "w-earnings", widgetId: "earnings", col: 1, row: 1, colSpan: 3, rowSpan: 1, pinned: true, hidden: false },
  { instanceId: "w-sales", widgetId: "sales", col: 4, row: 1, colSpan: 3, rowSpan: 1, pinned: true, hidden: false },
  { instanceId: "w-orders", widgetId: "orders", col: 7, row: 1, colSpan: 3, rowSpan: 1, pinned: false, hidden: false },
  { instanceId: "w-creator-score", widgetId: "creator-score", col: 10, row: 1, colSpan: 3, rowSpan: 1, pinned: false, hidden: false },
  { instanceId: "w-notifications", widgetId: "notifications", col: 1, row: 2, colSpan: 6, rowSpan: 2, pinned: true, hidden: false },
  { instanceId: "w-messages", widgetId: "messages", col: 7, row: 2, colSpan: 6, rowSpan: 1, pinned: false, hidden: false },
  { instanceId: "w-quick-actions", widgetId: "quick-actions", col: 1, row: 4, colSpan: 12, rowSpan: 1, pinned: false, hidden: false },
  { instanceId: "w-module-nav", widgetId: "module-nav", col: 1, row: 5, colSpan: 12, rowSpan: 1, pinned: false, hidden: false },
  { instanceId: "w-affiliate", widgetId: "affiliate-revenue", col: 1, row: 6, colSpan: 3, rowSpan: 1, pinned: false, hidden: false },
  { instanceId: "w-ugc", widgetId: "ugc-campaigns", col: 4, row: 6, colSpan: 3, rowSpan: 1, pinned: false, hidden: false },
  { instanceId: "w-communities", widgetId: "communities", col: 7, row: 6, colSpan: 3, rowSpan: 1, pinned: false, hidden: false },
  { instanceId: "w-tasks", widgetId: "tasks", col: 10, row: 6, colSpan: 3, rowSpan: 1, pinned: false, hidden: false },
  { instanceId: "w-events", widgetId: "upcoming-events", col: 1, row: 7, colSpan: 6, rowSpan: 1, pinned: false, hidden: false },
  { instanceId: "w-ai", widgetId: "ai-suggestions", col: 7, row: 7, colSpan: 6, rowSpan: 2, pinned: false, hidden: false },
];

export const WORKSPACE_MODULES: WorkspaceModule[] = [
  { id: "marketplace", label: "Marketplace", description: "Browse and sell", href: "/marketplace" },
  { id: "products", label: "Products", description: "Your catalog", href: "/dashboard/products" },
  { id: "orders", label: "Orders", description: "Fulfillment", href: "/dashboard/orders" },
  { id: "affiliate", label: "Affiliate", description: "Links & commissions", href: "/dashboard/affiliate" },
  { id: "ugc", label: "UGC", description: "Creator campaigns", href: "/ugc" },
  { id: "communities", label: "Communities", description: "Hubs & members", href: "/dashboard/communities" },
  { id: "courses", label: "Courses", description: "Digital learning", href: "/dashboard/products?type=digital" },
  { id: "analytics", label: "Analytics", description: "Performance", href: "/dashboard/analytics" },
  { id: "payments", label: "Payments", description: "Wallet & payouts", href: "/dashboard/wallet" },
  { id: "messages", label: "Messages", description: "Inbox", href: "/dashboard/messages" },
  { id: "creator-hub", label: "Creator Hub", description: "Influencer tools", href: "/dashboard/influencer" },
  { id: "seller-hub", label: "Seller Hub", description: "Vendor tools", href: "/dashboard/vendor" },
  { id: "ai-hub", label: "AI Hub", description: "Jimvio AI", href: "#open-ai", badge: "AI" },
];

export const WORKSPACE_QUICK_ACTIONS: WorkspaceQuickAction[] = [
  { id: "create-product", label: "Create Product", description: "List a new offer", href: "/dashboard/products/new", icon: "package", accent: "#fd5000" },
  { id: "create-community", label: "Create Community", description: "Launch a hub", href: "/dashboard/communities", icon: "users", accent: "#16a34a" },
  { id: "create-course", label: "Create Course", description: "Publish learning", href: "/dashboard/products/new", icon: "graduation", accent: "#7c3aed" },
  { id: "create-campaign", label: "Create Campaign", description: "UGC or affiliate", href: "/dashboard/vendor/campaigns/new", icon: "megaphone", accent: "#ea580c" },
  { id: "upload-ugc", label: "Upload UGC", description: "Submit content", href: "/ugc", icon: "video", accent: "#2563eb" },
  { id: "go-live", label: "Start Live", description: "Open studio", href: "/dashboard/influencer/videos", icon: "radio", accent: "#dc2626" },
  { id: "invite-members", label: "Invite Members", description: "Grow audience", href: "/dashboard/requests", icon: "user-plus", accent: "#4f46e5" },
  { id: "withdraw", label: "Withdraw Earnings", description: "Move to wallet", href: "/dashboard/withdrawals", icon: "wallet", accent: "#0891b2" },
  { id: "generate-ai", label: "Generate with AI", description: "Jimvio copilot", actionId: "open-ai", icon: "sparkles", accent: "#db2777" },
  { id: "import-products", label: "Import Products", description: "Bulk catalog", href: "/dashboard/products", icon: "upload", accent: "#0d9488" },
];

export const WORKSPACE_NOTIFICATION_FILTERS = [
  { id: "all" as const, label: "All" },
  { id: "orders" as const, label: "Orders" },
  { id: "messages" as const, label: "Messages" },
  { id: "affiliate" as const, label: "Affiliate" },
  { id: "ugc" as const, label: "UGC" },
  { id: "community" as const, label: "Community" },
  { id: "course" as const, label: "Courses" },
  { id: "payout" as const, label: "Payouts" },
  { id: "system" as const, label: "System" },
];

export const WORKSPACE_AI_CARDS = [
  { id: "ai-opportunities", title: "Today's opportunities", description: "Top earning moves ranked for you today." },
  { id: "ai-actions", title: "Recommended actions", description: "Next best steps across your creator stack." },
  { id: "ai-revenue", title: "Revenue insights", description: "Placeholder trends and forecast cards." },
  { id: "ai-trending", title: "Trending products", description: "Products gaining momentum in your niche." },
  { id: "ai-community", title: "Community growth tips", description: "Engagement ideas for your hubs." },
  { id: "ai-seller", title: "Seller recommendations", description: "Catalog and pricing suggestions." },
];

export const WORKSPACE_LAYOUT_STORAGE_KEY = "jimvio-workspace-layout-v1";

export function loadWorkspaceLayout(): WorkspaceWidgetLayout[] {
  if (typeof window === "undefined") return DEFAULT_WORKSPACE_LAYOUT;
  try {
    const raw = localStorage.getItem(WORKSPACE_LAYOUT_STORAGE_KEY);
    if (!raw) return DEFAULT_WORKSPACE_LAYOUT;
    const parsed = JSON.parse(raw) as WorkspaceWidgetLayout[];
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_WORKSPACE_LAYOUT;
  } catch {
    return DEFAULT_WORKSPACE_LAYOUT;
  }
}

export function saveWorkspaceLayout(layout: WorkspaceWidgetLayout[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WORKSPACE_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  } catch {
    /* silent */
  }
}
