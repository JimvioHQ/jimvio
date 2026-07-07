import type { SuperAppContext } from "./types";

export function resolveSuperAppContext(pathname: string): SuperAppContext {
  if (pathname.startsWith("/marketplace")) return "marketplace";
  if (pathname.startsWith("/c/") || pathname.includes("/communities")) return "community";
  if (pathname.includes("/affiliate")) return "affiliate";
  if (pathname.startsWith("/ugc")) return "ugc";
  if (pathname.includes("type=digital") || pathname.includes("/courses")) return "courses";
  if (pathname.includes("/influencer") || pathname.includes("/influencers")) return "creator-hub";
  if (pathname.includes("/vendor") || pathname.includes("/products")) return "seller-hub";
  if (pathname.includes("/orders")) return "orders";
  if (pathname.includes("/wallet") || pathname.includes("/withdrawals")) return "wallet";
  if (pathname.includes("/analytics")) return "analytics";
  if (pathname.includes("/messages")) return "messages";
  if (pathname.includes("/videos") || pathname.includes("/live")) return "live";
  if (pathname.includes("/settings")) return "settings";
  if (pathname.startsWith("/dashboard")) return "dashboard";
  return "default";
}

export function contextToModuleLabel(context: SuperAppContext): string {
  const labels: Record<SuperAppContext, string> = {
    marketplace: "Marketplace",
    community: "Communities",
    affiliate: "Affiliate",
    ugc: "UGC",
    courses: "Courses",
    "creator-hub": "Creator Hub",
    "seller-hub": "Seller Hub",
    orders: "Orders",
    wallet: "Wallet",
    analytics: "Analytics",
    messages: "Messages",
    live: "Live",
    settings: "Settings",
    dashboard: "Dashboard",
    default: "Jimvio",
  };
  return labels[context];
}
