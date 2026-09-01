/**
 * Natural-language → command intents for ⌘K AI Universal Command.
 */

import type { NlCommandIntent } from "./types";
import { getCommandSearchContext } from "@/lib/command-center/search-context";

type IntentSeed = {
  id: string;
  title: string;
  subtitle: string;
  href?: string;
  actionId?: string;
  phrases: string[];
};

const INTENTS: IntentSeed[] = [
  {
    id: "nl-create-product",
    title: "Create a product",
    subtitle: "Open product composer",
    href: "/marketplace/new",
    phrases: ["create a product", "new product", "add product", "list a product"],
  },
  {
    id: "nl-create-ugc-campaign",
    title: "Create UGC campaign",
    subtitle: "Launch a creator content campaign",
    href: "/ugc/campaign-center/create",
    phrases: [
      "create ugc campaign",
      "create a ugc campaign",
      "new ugc campaign",
      "create campaign for my",
      "create a campaign for my",
      "launch a ugc campaign",
      "start a content campaign",
      "creator campaign",
      "content campaign",
      "create campaign",
    ],
  },
  {
    id: "nl-launch-seller-campaign",
    title: "Launch seller campaign",
    subtitle: "Create a vendor promo campaign",
    href: "/ugc/campaign-center/campaigns/new",
    phrases: ["launch seller campaign", "vendor campaign", "seller campaign", "launch campaign"],
  },
  {
    id: "nl-find-creators",
    title: "Find creators",
    subtitle: "Browse and recruit creators",
    href: "/ugc/campaign-center/recruitment",
    phrases: [
      "find creators",
      "find creators in rwanda",
      "find creators in",
      "search creators",
      "discover creators",
      "recruit creators",
      "invite creators",
      "creators near me",
      "browse creators",
    ],
  },
  {
    id: "nl-generate-product-description",
    title: "Generate product description",
    subtitle: "AI writes your product copy",
    actionId: "open-ai",
    phrases: [
      "generate product description",
      "write product description",
      "generate a description",
      "product description",
      "write a description for my product",
    ],
  },
  {
    id: "nl-todays-revenue",
    title: "Show today's revenue",
    subtitle: "Open revenue analytics",
    href: "/",
    phrases: [
      "show today's revenue",
      "show todays revenue",
      "today's revenue",
      "todays revenue",
      "revenue today",
      "show revenue",
      "my revenue",
    ],
  },
  {
    id: "nl-pending-orders",
    title: "Show pending orders",
    subtitle: "Orders awaiting fulfillment",
    href: "/orders",
    phrases: [
      "show pending orders",
      "pending orders",
      "unfulfilled orders",
      "orders waiting",
      "orders to ship",
    ],
  },
  {
    id: "nl-generate-campaign",
    title: "Generate campaign",
    subtitle: "Open campaign builder with AI assist",
    href: "/ugc/campaign-center/create",
    phrases: [
      "generate campaign",
      "generate a campaign",
      "build a campaign",
      "campaign builder",
      "open campaign builder",
    ],
  },
  {
    id: "nl-create-community",
    title: "Create community",
    subtitle: "Open community wizard",
    href: "/owner/communities",
    phrases: ["create community", "create a community", "new community", "community wizard", "launch community"],
  },
  {
    id: "nl-upload-product",
    title: "Upload product",
    subtitle: "Open product upload",
    href: "/marketplace/new",
    phrases: ["upload product", "upload a product", "new listing", "add listing"],
  },
  {
    id: "nl-create-affiliate-link",
    title: "Create affiliate link",
    subtitle: "Generate a referral link",
    href: "/affiliates/links",
    phrases: ["create affiliate link", "generate affiliate link", "new affiliate link", "referral link"],
  },
  {
    id: "nl-open-live-studio",
    title: "Open Live Studio",
    subtitle: "Go live and sell",
    href: "/communities/live",
    phrases: ["open live studio", "live studio", "streaming studio"],
  },
  {
    id: "nl-product-writer",
    title: "AI Product Writer",
    subtitle: "Generate title, description, SEO & tags",
    actionId: "open-ai",
    phrases: [
      "generate product description",
      "ai product writer",
      "product writer",
      "write product copy",
      "generate title description seo",
    ],
  },
  {
    id: "nl-automations",
    title: "Open automations",
    subtitle: "Campaign workflow automations",
    href: "/ugc/campaign-center/automations",
    phrases: ["open automations", "create automation", "automation", "workflow"],
  },
  {
    id: "nl-todays-sales",
    title: "Show today's sales",
    subtitle: "Open sales analytics",
    href: "/",
    phrases: [
      "show today's sales",
      "show todays sales",
      "today's sales",
      "todays sales",
      "show sales",
      "sales today",
      "how much did i sell",
      "sales",
    ],
  },
  {
    id: "nl-pending-withdrawals",
    title: "Show pending withdrawals",
    subtitle: "Review withdrawal requests",
    href: "/wallet/withdrawals",
    phrases: [
      "show pending withdrawals",
      "pending withdrawals",
      "my withdrawals",
      "withdrawal status",
    ],
  },
  {
    id: "nl-deposit-funds",
    title: "Deposit funds",
    subtitle: "Add money to your wallet",
    href: "/wallet/deposits",
    phrases: ["deposit funds", "deposit money", "add funds", "top up wallet", "top up"],
  },
  {
    id: "nl-withdraw-funds",
    title: "Withdraw funds",
    subtitle: "Cash out your balance",
    href: "/wallet/withdrawals",
    phrases: ["withdraw funds", "withdraw money", "cash out", "request payout", "withdraw"],
  },
  {
    id: "nl-open-wallet",
    title: "Open wallet",
    subtitle: "Balances and payouts",
    href: "/wallet",
    phrases: ["open wallet", "show wallet", "my wallet", "wallet", "balance"],
  },
  {
    id: "nl-open-store",
    title: "Open store",
    subtitle: "Manage your vendor storefront",
    href: "/ugc/campaign-center/store",
    phrases: ["open store", "my store", "manage store", "storefront settings", "vendor store"],
  },
  {
    id: "nl-open-orders",
    title: "Open orders",
    subtitle: "View and fulfill orders",
    href: "/orders",
    phrases: ["open orders", "show orders", "my orders", "view orders", "order history"],
  },
  {
    id: "nl-open-messages",
    title: "Open messages",
    subtitle: "Your conversations and inbox",
    href: "/messages",
    phrases: ["open messages", "open inbox", "show messages", "my messages", "chats", "inbox"],
  },
  {
    id: "nl-open-notifications",
    title: "Open notifications",
    subtitle: "Recent alerts and updates",
    href: "/settings/notifications",
    phrases: ["open notifications", "show notifications", "my notifications", "notifications"],
  },
  {
    id: "nl-open-identity",
    title: "Open identity",
    subtitle: "Your public portfolio & profile",
    href: "/identity",
    phrases: ["open identity", "my identity", "open portfolio", "my portfolio", "identity"],
  },
  {
    id: "nl-flash-deals",
    title: "Flash deals",
    subtitle: "Time-limited marketplace offers",
    href: "/marketplace/flash-deals",
    phrases: ["flash deals", "show flash deals", "open flash deals", "deals", "hot deals"],
  },
  {
    id: "nl-start-live",
    title: "Go live",
    subtitle: "Start a live session with your community",
    href: "/communities/live",
    phrases: ["go live", "start a live", "start live", "live session", "start streaming"],
  },
  {
    id: "nl-affiliate-hub",
    title: "Affiliate hub",
    subtitle: "Commissions and referral links",
    href: "/affiliates",
    phrases: ["affiliate hub", "open affiliates", "my affiliate", "affiliate program", "commissions"],
  },
  {
    id: "nl-analyze-business",
    title: "Analyze my business",
    subtitle: "AI insights on your performance",
    actionId: "open-ai",
    phrases: [
      "analyze my business",
      "analyze my store",
      "business insights",
      "how is my business doing",
    ],
  },
  {
    id: "nl-recommend-products",
    title: "Recommend products",
    subtitle: "AI product recommendations",
    actionId: "open-ai",
    phrases: ["recommend products", "suggest products", "what should i sell", "product ideas"],
  },
  {
    id: "nl-low-stock",
    title: "Low stock alerts",
    subtitle: "Products running low on inventory",
    href: "/marketplace",
    phrases: ["low stock", "inventory", "out of stock", "stock levels", "restock"],
  },
  {
    id: "nl-create-event",
    title: "Create event",
    subtitle: "Schedule a community event",
    href: "/communities/events",
    phrases: ["create event", "new event", "schedule event", "plan an event"],
  },
  {
    id: "nl-upload-content",
    title: "Upload content",
    subtitle: "Add to your content library",
    href: "/ugc/library",
    phrases: ["upload content", "content library", "my library", "upload video", "media library"],
  },
  {
    id: "nl-invite",
    title: "Invite members",
    subtitle: "Open members & invites",
    phrases: ["invite members", "invite people", "add members"],
  },
  {
    id: "nl-course",
    title: "Generate course",
    subtitle: "Open courses / AI outline",
    phrases: ["generate course", "create course", "new course", "course outline"],
  },
  {
    id: "nl-analytics",
    title: "Show analytics",
    subtitle: "Creator analytics dashboard",
    href: "/",
    phrases: ["show analytics", "open analytics", "stats", "metrics"],
  },
  {
    id: "nl-open-agents",
    title: "Open Agent Center",
    subtitle: "Your specialized AI coworkers — recommend only",
    href: "/",
    phrases: ["open agents", "agent center", "ai agents", "open agent center", "jimvio agents", "my agents"],
  },
  {
    id: "nl-ai",
    title: "Ask Jimvio AI",
    subtitle: "Open the AI copilot",
    actionId: "open-ai",
    phrases: ["ask ai", "open ai", "copilot", "help me", "generate post", "write announcement"],
  },
  {
    id: "nl-shop",
    title: "Open shop",
    subtitle: "Community commerce",
    phrases: ["open shop", "storefront", "sell products"],
  },
  {
    id: "nl-feed",
    title: "Open feed",
    subtitle: "Community discussions",
    phrases: ["open feed", "announcement", "post update"],
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

export function resolveNlCommandIntents(query: string): NlCommandIntent[] {
  const ctx = getCommandSearchContext();
  const base = ctx.base;

  return INTENTS.map((intent) => {
    let href = intent.href;
    if (!href && base) {
      if (intent.id === "nl-invite") href = `${base}/members`;
      if (intent.id === "nl-course") href = `${base}/courses`;
      if (intent.id === "nl-shop") href = `${base}/shop`;
      if (intent.id === "nl-feed") href = `${base}/feed`;
    }
    if (!href && intent.id === "nl-course") href = "/marketplace/new";

    return {
      id: intent.id,
      title: intent.title,
      subtitle: intent.subtitle,
      href,
      actionId: intent.actionId,
      keywords: intent.phrases,
      score: scorePhrase(query, intent.phrases),
    };
  })
    .filter((i) => i.score >= 50)
    .sort((a, b) => b.score - a.score);
}
