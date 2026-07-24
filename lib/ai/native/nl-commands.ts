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
    href: "/dashboard/products/new",
    phrases: ["create a product", "new product", "add product", "list a product"],
  },
  {
    id: "nl-start-live",
    title: "Start a live",
    subtitle: "Go live with your community",
    phrases: ["start a live", "go live", "start live", "live session"],
  },
  {
    id: "nl-invite",
    title: "Invite members",
    subtitle: "Open members & invites",
    phrases: ["invite members", "invite people", "add members"],
  },
  {
    id: "nl-campaign",
    title: "Launch campaign",
    subtitle: "Create a seller / UGC campaign",
    href: "/dashboard/vendor/campaigns/new",
    phrases: ["launch campaign", "create campaign", "start campaign"],
  },
  {
    id: "nl-find-creators",
    title: "Find creators",
    subtitle: "Browse creators & members",
    phrases: ["find creators", "search creators", "discover creators"],
  },
  {
    id: "nl-course",
    title: "Generate course",
    subtitle: "Open courses / AI outline",
    phrases: ["generate course", "create course", "new course", "course outline"],
  },
  {
    id: "nl-wallet",
    title: "Open wallet",
    subtitle: "Balances and payouts",
    href: "/dashboard/wallet",
    phrases: ["open wallet", "show wallet", "payouts", "balance"],
  },
  {
    id: "nl-analytics",
    title: "Show analytics",
    subtitle: "Creator analytics dashboard",
    href: "/dashboard/analytics",
    phrases: ["show analytics", "open analytics", "stats", "metrics"],
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
      if (intent.id === "nl-start-live") href = `${base}/live`;
      if (intent.id === "nl-invite" || intent.id === "nl-find-creators")
        href = `${base}/members`;
      if (intent.id === "nl-course") href = `${base}/courses`;
      if (intent.id === "nl-shop") href = `${base}/shop`;
      if (intent.id === "nl-feed") href = `${base}/feed`;
    }
    if (!href && intent.id === "nl-start-live") href = "/ugc";
    if (!href && intent.id === "nl-course") href = "/dashboard/products/new";

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
