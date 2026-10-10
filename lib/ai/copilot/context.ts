import type { CopilotPageContext } from "@/lib/store/use-ai-store";

export type CopilotContextMeta = {
  id: CopilotPageContext;
  label: string;
  description: string;
  placeholder: string;
};

const CONTEXT_META: Record<CopilotPageContext, CopilotContextMeta> = {
  home: {
    id: "home",
    label: "Homepage",
    description: "Discover earning opportunities across Jimvio.",
    placeholder: "Ask about products, campaigns, or communities…",
  },
  marketplace: {
    id: "marketplace",
    label: "Marketplace",
    description: "Help discover profitable products and trending picks.",
    placeholder: "Find products, compare deals, or search with AI…",
  },
  product: {
    id: "product",
    label: "Product",
    description: "Explain specs, summarize reviews, and compare alternatives.",
    placeholder: "Explain this product or compare similar items…",
  },
  cart: {
    id: "cart",
    label: "Cart",
    description: "Optimize your cart and find complementary products.",
    placeholder: "Help optimize my cart or suggest add-ons…",
  },
  checkout: {
    id: "checkout",
    label: "Checkout",
    description: "Answer questions before you complete your order.",
    placeholder: "Ask about shipping, totals, or payment…",
  },
  communities: {
    id: "communities",
    label: "Communities",
    description: "Recommend creators, hubs, and engagement opportunities.",
    placeholder: "Find communities or creators to collaborate with…",
  },
  affiliate: {
    id: "affiliate",
    label: "Affiliate",
    description: "Surface high-commission campaigns and promo ideas.",
    placeholder: "Find affiliate campaigns or profitable niches…",
  },
  "seller-dashboard": {
    id: "seller-dashboard",
    label: "Seller Dashboard",
    description: "Recommend listing, pricing, and growth actions.",
    placeholder: "Improve listings, pricing, or campaign strategy…",
  },
  general: {
    id: "general",
    label: "Jimvio",
    description: "Your creator commerce copilot across the platform.",
    placeholder: "Ask Jimvio AI anything…",
  },
};

export function resolveCopilotContext(pathname: string): CopilotPageContext {
  if (!pathname || pathname === "/") return "home";
  if (pathname.startsWith("/marketplace/") && pathname.split("/").length > 2) return "product";
  if (pathname.startsWith("/marketplace")) return "marketplace";
  if (pathname.startsWith("/cart")) return "cart";
  if (pathname.startsWith("/checkout")) return "checkout";
  if (pathname.startsWith("/communities")) return "communities";
  if (pathname.startsWith("/affiliates") || pathname.startsWith("/influencers")) return "affiliate";
  if (pathname === "/ai" || pathname === "/welcome") return "home";
  if (pathname.startsWith("/ugc")) return "affiliate";
  if (pathname.startsWith("/ugc/campaign-center") || pathname.startsWith("/admin")) {
    return "seller-dashboard";
  }
  if (pathname.startsWith("/")) return "seller-dashboard";
  return "general";
}

export function getCopilotContextMeta(context: CopilotPageContext): CopilotContextMeta {
  return CONTEXT_META[context] ?? CONTEXT_META.general;
}
