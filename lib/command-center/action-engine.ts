/**
 * Action Engine — maps natural-language action phrases to executable
 * Command Center results wired to EXISTING routes. Presentation/navigation
 * only: no API calls, no schema, no business logic.
 */

import type { CommandResult } from "./types";

type ActionResultSeed = {
  id: string;
  title: string;
  subtitle: string;
  href?: string;
  actionId?: string;
};

type ActionSeed = {
  id: string;
  phrases: string[];
  results: ActionResultSeed[];
};

const ACTION_SEEDS: ActionSeed[] = [
  {
    id: "create-campaign",
    phrases: ["create campaign", "create a campaign", "new campaign", "launch campaign", "start a campaign"],
    results: [
      {
        id: "action-create-ugc-campaign",
        title: "Create UGC campaign",
        subtitle: "Launch a creator content campaign",
        href: "/ugc/campaign-center/create",
      },
      {
        id: "action-create-vendor-campaign",
        title: "Create seller campaign",
        subtitle: "Launch a vendor promo campaign",
        href: "/dashboard/vendor/campaigns/new",
      },
    ],
  },
  {
    id: "upload-product",
    phrases: ["upload product", "add a product", "list a product", "upload a product", "add product"],
    results: [
      {
        id: "action-upload-product",
        title: "Upload product",
        subtitle: "Open the product composer",
        href: "/dashboard/products/new",
      },
    ],
  },
  {
    id: "withdraw",
    phrases: ["withdraw", "withdraw funds", "withdraw money", "cash out", "request payout"],
    results: [
      {
        id: "action-withdraw",
        title: "Withdraw funds",
        subtitle: "Cash out your wallet balance",
        href: "/wallet/withdrawals",
      },
    ],
  },
  {
    id: "create-community",
    phrases: ["create community", "new community", "launch community", "start a community", "start community"],
    results: [
      {
        id: "action-create-community",
        title: "Create community",
        subtitle: "Launch a new community hub",
        href: "/dashboard/communities",
      },
    ],
  },
  {
    id: "go-live",
    phrases: ["go live", "start live", "start a live", "go live now", "live session"],
    results: [
      {
        id: "action-go-live",
        title: "Go live",
        subtitle: "Start a live session with your community",
        href: "/communities/live",
      },
    ],
  },
  {
    id: "generate-product-description",
    phrases: [
      "generate product description",
      "write product description",
      "product description",
      "write a description",
      "write a description for my product",
    ],
    results: [
      {
        id: "action-generate-product-description",
        title: "Generate product description",
        subtitle: "AI product writer — draft compelling copy",
        actionId: "open-ai",
      },
    ],
  },
  {
    id: "generate-campaign",
    phrases: ["generate campaign", "generate a campaign", "ai campaign", "generate campaign brief"],
    results: [
      {
        id: "action-generate-campaign",
        title: "Create UGC campaign",
        subtitle: "Open the campaign composer",
        href: "/ugc/campaign-center/create",
      },
      {
        id: "action-generate-campaign-ai",
        title: "Generate campaign with AI",
        subtitle: "AI drafts your brief, budget, and creator targets",
        actionId: "open-ai",
      },
    ],
  },
  {
    id: "find-creators",
    phrases: [
      "find creators rwanda",
      "find creators in rwanda",
      "find creators",
      "find creators in",
      "recruit creators",
      "discover creators",
      "search creators",
    ],
    results: [
      {
        id: "action-find-creators",
        title: "Find creators",
        subtitle: "Browse and recruit creators for your campaign",
        href: "/ugc/campaign-center/recruitment",
      },
    ],
  },
  {
    id: "todays-revenue",
    phrases: ["today's revenue", "todays revenue", "revenue today", "show revenue", "how much revenue"],
    results: [
      {
        id: "action-todays-revenue",
        title: "Today's revenue",
        subtitle: "Open revenue analytics",
        href: "/dashboard/analytics",
      },
    ],
  },
  {
    id: "pending-orders",
    phrases: ["pending orders", "show pending orders", "orders pending", "unfulfilled orders"],
    results: [
      {
        id: "action-pending-orders",
        title: "Pending orders",
        subtitle: "Review orders awaiting fulfillment",
        href: "/orders",
      },
    ],
  },
  {
    id: "analyze-store",
    phrases: ["analyze store", "analyze my store", "store analysis", "analyze business", "analyze my business"],
    results: [
      {
        id: "action-analyze-store",
        title: "Analyze my store",
        subtitle: "AI insights on your store performance",
        actionId: "open-ai",
      },
    ],
  },
  {
    id: "recommend-products",
    phrases: ["recommend products", "suggest products", "product ideas", "what should i sell"],
    results: [
      {
        id: "action-recommend-products",
        title: "Recommend products",
        subtitle: "AI product recommendations",
        actionId: "open-ai",
      },
    ],
  },
  {
    id: "low-stock",
    phrases: ["low stock", "inventory low", "out of stock", "restock", "stock levels"],
    results: [
      {
        id: "action-low-stock",
        title: "Low stock alerts",
        subtitle: "Products running low on inventory",
        href: "/dashboard/products",
      },
    ],
  },
  {
    id: "affiliate-link",
    phrases: ["affiliate link", "create affiliate link", "generate affiliate link", "referral link"],
    results: [
      {
        id: "action-affiliate-link",
        title: "Affiliate link",
        subtitle: "Create a referral link to earn commissions",
        href: "/affiliates/links",
      },
    ],
  },
  {
    id: "automation-workflow",
    phrases: ["automation", "workflow", "create automation", "create workflow", "automate"],
    results: [
      {
        id: "action-automation",
        title: "Automations",
        subtitle: "Build campaign automations & workflows",
        href: "/ugc/campaign-center/automations",
      },
    ],
  },
];

function scorePhrase(query: string, phrases: string[]): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  let best = 0;
  for (const p of phrases) {
    if (q === p) best = Math.max(best, 100);
    else if (q.includes(p) || p.includes(q)) best = Math.max(best, 86);
    else {
      const tokens = q.split(/\s+/).filter(Boolean);
      const hits = tokens.filter((t) => p.includes(t)).length;
      if (hits > 0) best = Math.max(best, 50 + hits * 12);
    }
  }
  return best;
}

/** Resolves a free-text query into executable action results, highest score first. */
export function resolveActionEngine(query: string, limit = 6): CommandResult[] {
  const q = query.trim();
  if (q.length < 2) return [];

  const scored = ACTION_SEEDS.map((seed) => ({ seed, score: scorePhrase(q, seed.phrases) }))
    .filter((s) => s.score >= 50)
    .sort((a, b) => b.score - a.score);

  const results: CommandResult[] = [];
  for (const { seed, score } of scored) {
    for (const result of seed.results) {
      results.push({
        id: result.id,
        kind: result.actionId === "open-ai" ? "ai" : "command",
        title: result.title,
        subtitle: result.subtitle,
        href: result.href,
        actionId: result.actionId,
        keywords: seed.phrases,
        icon: result.actionId === "open-ai" ? "sparkles" : "command",
        badge: "Action",
        section: "search",
        score,
      });
      if (results.length >= limit) return results;
    }
  }
  return results;
}
