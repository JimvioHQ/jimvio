import type { SuperAppAiEntry, SuperAppModule, SuperAppWorkspaceMode } from "./types";

export const SUPER_APP_MODULES: SuperAppModule[] = [
  {
    id: "marketplace",
    label: "Marketplace",
    description: "Shop & discover",
    href: "/marketplace",
    icon: "store",
    accent: "#fd5000",
    connectedTo: ["orders", "wallet", "affiliate"],
  },
  {
    id: "communities",
    label: "Communities",
    description: "Hubs & members",
    href: "/dashboard/communities",
    icon: "users",
    accent: "#ca8a04",
    connectedTo: ["courses", "live", "messages"],
  },
  {
    id: "affiliate",
    label: "Affiliate",
    description: "Links & commissions",
    href: "/dashboard/affiliate",
    icon: "link",
    accent: "#16a34a",
    connectedTo: ["marketplace", "wallet", "analytics"],
  },
  {
    id: "ugc",
    label: "UGC",
    description: "Creator campaigns",
    href: "/ugc",
    icon: "video",
    accent: "#7c3aed",
    connectedTo: ["creator-hub", "wallet", "messages"],
  },
  {
    id: "courses",
    label: "Courses",
    description: "Digital learning",
    href: "/dashboard/products?type=digital",
    icon: "graduation",
    accent: "#db2777",
    connectedTo: ["communities", "creator-hub", "wallet"],
  },
  {
    id: "creator-hub",
    label: "Creator Hub",
    description: "Audience tools",
    href: "/dashboard/influencer",
    icon: "sparkles",
    accent: "#2563eb",
    connectedTo: ["ugc", "live", "analytics"],
  },
  {
    id: "seller-hub",
    label: "Seller Hub",
    description: "Store operations",
    href: "/dashboard/vendor",
    icon: "package",
    accent: "#ea580c",
    connectedTo: ["orders", "marketplace", "analytics"],
  },
  {
    id: "orders",
    label: "Orders",
    description: "Fulfillment",
    href: "/dashboard/orders",
    icon: "shopping-bag",
    accent: "#0891b2",
    connectedTo: ["wallet", "messages", "marketplace"],
  },
  {
    id: "wallet",
    label: "Wallet",
    description: "Balances & payouts",
    href: "/dashboard/wallet",
    icon: "wallet",
    accent: "#0d9488",
    connectedTo: ["affiliate", "analytics", "settings"],
  },
  {
    id: "analytics",
    label: "Analytics",
    description: "Performance",
    href: "/dashboard/analytics",
    icon: "chart",
    accent: "#4f46e5",
    connectedTo: ["seller-hub", "creator-hub", "affiliate"],
  },
  {
    id: "ai",
    label: "AI",
    description: "Jimvio assistant",
    href: "#open-ai",
    icon: "bot",
    accent: "#db2777",
    connectedTo: ["marketplace", "seller-hub", "creator-hub"],
  },
  {
    id: "messages",
    label: "Messages",
    description: "Unified inbox",
    href: "/dashboard/messages",
    icon: "message",
    accent: "#64748b",
    connectedTo: ["orders", "communities", "settings"],
  },
  {
    id: "live",
    label: "Live",
    description: "Streaming",
    href: "/dashboard/influencer/videos",
    icon: "radio",
    accent: "#dc2626",
    connectedTo: ["creator-hub", "communities", "ugc"],
  },
  {
    id: "settings",
    label: "Settings",
    description: "Account & prefs",
    href: "/dashboard/settings",
    icon: "settings",
    accent: "#64748b",
    connectedTo: ["wallet", "messages"],
  },
];

export const SUPER_APP_WORKSPACE_MODES: Array<{
  id: SuperAppWorkspaceMode;
  label: string;
  description: string;
}> = [
  { id: "buyer", label: "Buyer", description: "Shop across Jimvio" },
  { id: "seller", label: "Seller", description: "Run your store" },
  { id: "creator", label: "Creator", description: "Build your audience" },
  { id: "affiliate", label: "Affiliate", description: "Promote & earn" },
  { id: "community-owner", label: "Community Owner", description: "Manage your hub" },
  { id: "admin", label: "Admin", description: "Platform operations" },
];

export const SUPER_APP_AI_ENTRIES: SuperAppAiEntry[] = [
  { context: "marketplace", label: "Marketplace", placeholder: "AI recommends profitable products." },
  { context: "community", label: "Community", placeholder: "AI recommends discussions and growth actions." },
  { context: "affiliate", label: "Affiliate", placeholder: "AI recommends high-converting campaigns." },
  { context: "seller-hub", label: "Seller", placeholder: "AI recommends pricing and catalog moves." },
  { context: "courses", label: "Courses", placeholder: "AI recommends learning paths." },
  { context: "orders", label: "Orders", placeholder: "AI summarizes fulfillment issues." },
  { context: "analytics", label: "Analytics", placeholder: "AI explains revenue trends." },
  { context: "default", label: "Jimvio", placeholder: "Ask anything across the super app." },
];

export const SUPER_APP_MODE_STORAGE_KEY = "jimvio-super-app-mode-v1";

export function loadSuperAppMode(): SuperAppWorkspaceMode {
  if (typeof window === "undefined") return "buyer";
  try {
    return (localStorage.getItem(SUPER_APP_MODE_STORAGE_KEY) as SuperAppWorkspaceMode) || "buyer";
  } catch {
    return "buyer";
  }
}

export function saveSuperAppMode(mode: SuperAppWorkspaceMode) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SUPER_APP_MODE_STORAGE_KEY, mode);
  } catch { /* silent */ }
}

export const SUPER_APP_MESSAGE_SCAFFOLD = [
  { id: "msg-1", kind: "customer" as const, name: "Buyer inquiry", preview: "Shipping question on order #1042", time: "5m ago", unread: true, href: "/dashboard/messages" },
  { id: "msg-2", kind: "creator" as const, name: "Creator collab", preview: "UGC campaign thread", time: "1h ago", unread: true, href: "/dashboard/messages" },
  { id: "msg-3", kind: "community" as const, name: "Community mod", preview: "New member welcome", time: "2h ago", href: "/dashboard/messages" },
  { id: "msg-4", kind: "brand" as const, name: "Brand partner", preview: "Partnership proposal", time: "3h ago", href: "/dashboard/messages" },
  { id: "msg-5", kind: "affiliate" as const, name: "Affiliate manager", preview: "Commission tier update", time: "5h ago", href: "/dashboard/affiliate" },
  { id: "msg-6", kind: "support" as const, name: "Jimvio Support", preview: "Your ticket was updated", time: "1d ago", href: "/dashboard/messages" },
];
