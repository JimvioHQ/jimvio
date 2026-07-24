import type { CopilotQuickAction } from "./types";
import type { CopilotPageContext } from "@/lib/store/use-ai-store";

export const COPILOT_QUICK_ACTIONS: CopilotQuickAction[] = [
  {
    id: "profitable-products",
    label: "Find profitable products",
    prompt: "What are the most profitable products to promote on Jimvio right now?",
    icon: "trending",
    contexts: ["home", "marketplace", "affiliate", "general"],
  },
  {
    id: "compare-products",
    label: "Compare products",
    prompt: "Help me compare similar products and highlight the best value.",
    icon: "scale",
    contexts: ["marketplace", "product", "cart"],
  },
  {
    id: "recommend-products",
    label: "Recommend products",
    prompt: "Recommend products tailored to my interests and browsing history.",
    icon: "sparkles",
    contexts: ["home", "marketplace", "product", "general"],
  },
  {
    id: "affiliate-campaigns",
    label: "Find affiliate campaigns",
    prompt: "Which affiliate products have the highest commission rates today?",
    icon: "percent",
    contexts: ["home", "affiliate", "general"],
  },
  {
    id: "ugc-opportunities",
    label: "Discover UGC opportunities",
    prompt: "What UGC campaigns are paying creators the most right now?",
    icon: "video",
    contexts: ["home", "affiliate", "general"],
  },
  {
    id: "find-communities",
    label: "Find communities",
    prompt: "Recommend active communities I should join on Jimvio.",
    icon: "users",
    contexts: ["home", "communities", "general"],
  },
  {
    id: "product-descriptions",
    label: "Create product descriptions",
    prompt: "Draft a high-converting product description for my listing.",
    icon: "pen",
    contexts: ["seller-dashboard", "product"],
  },
  {
    id: "explain-product",
    label: "Explain products",
    prompt: "Explain this product's key features, specs, and who it's best for.",
    icon: "info",
    contexts: ["product", "marketplace", "cart"],
  },
  {
    id: "summarize-reviews",
    label: "Summarize reviews",
    prompt: "Summarize buyer sentiment and common themes from product reviews.",
    icon: "message",
    contexts: ["product", "marketplace"],
  },
  {
    id: "trending-products",
    label: "Find trending products",
    prompt: "What trending products are winning sales this week on Jimvio?",
    icon: "flame",
    contexts: ["home", "marketplace", "general"],
  },
  {
    id: "search-with-ai",
    label: "Search with AI",
    prompt: "Help me search the marketplace with a smart, specific query.",
    icon: "search",
    contexts: ["marketplace", "home", "general"],
  },
  {
    id: "generate-announcement",
    label: "Generate announcement",
    prompt: "Draft a premium community announcement for today's update.",
    icon: "megaphone",
    contexts: ["communities", "home", "general", "seller-dashboard"],
  },
  {
    id: "generate-post",
    label: "Generate post",
    prompt: "Write an engaging community post that sparks replies.",
    icon: "pen",
    contexts: ["communities", "home", "general"],
  },
  {
    id: "generate-email",
    label: "Generate email",
    prompt: "Draft a short email campaign to re-engage members.",
    icon: "message",
    contexts: ["communities", "seller-dashboard", "general"],
  },
  {
    id: "recommend-campaigns",
    label: "Recommend campaigns",
    prompt: "Recommend creator campaigns and affiliate offers that fit me.",
    icon: "video",
    contexts: ["home", "affiliate", "general", "communities"],
  },
  {
    id: "recommend-courses",
    label: "Recommend courses",
    prompt: "Recommend courses and learning paths for my goals.",
    icon: "graduation",
    contexts: ["communities", "home", "general"],
  },
  {
    id: "summarize-page",
    label: "Summarize this page",
    prompt: "Summarize this page and tell me the three best next actions.",
    icon: "info",
    contexts: ["home", "marketplace", "communities", "seller-dashboard", "general", "product", "affiliate"],
  },
];

export function getQuickActionsForContext(context: CopilotPageContext, limit = 8) {
  const ranked = COPILOT_QUICK_ACTIONS.filter(
    (action) => !action.contexts || action.contexts.includes(context),
  );
  const fallback = COPILOT_QUICK_ACTIONS.filter((a) => !ranked.includes(a));
  return [...ranked, ...fallback].slice(0, limit);
}
