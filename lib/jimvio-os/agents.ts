/**
 * Jimvio Agent OS — specialized AI coworker scaffold (UI-only).
 *
 * Every agent below is RECOMMEND-ONLY: it never edits data, never calls an
 * API, and never touches auth/schema/payments. Content is presentation
 * scaffolding — every `href` maps to an EXISTING production route. Agents
 * exist to explain "what to do next" and WHY, so the human always decides.
 */

import type { OsWorkspaceMode } from "./types";

export type AgentId =
  | "seller"
  | "creator"
  | "brand"
  | "affiliate"
  | "community"
  | "buyer"
  | "live"
  | "executive";

export type AgentStatus = "active" | "watching" | "idle";

export type AgentRecommendation = {
  id: string;
  title: string;
  summary: string;
  href: string;
  cta: string;
  priority: "critical" | "high" | "medium" | "low";
  /** 0–100 */
  confidence: number;
  /** Human explainability — why the agent is suggesting this. */
  why: string;
  /** 2–4 short labels of what influenced this recommendation. */
  dataInfluences: string[];
  expectedOutcome: string;
};

export type JimvioAgent = {
  id: AgentId;
  /** "Seller Agent" */
  name: string;
  /** One-line job description. */
  role: string;
  emoji: string;
  /** Hex accent within the Jimvio system. */
  accent: string;
  status: AgentStatus;
  /** "2m ago" style scaffold. */
  lastUpdatedLabel: string;
  domain: string;
  /** What it watches. */
  analyzes: string[];
  /** 3–5 recommend-only entries. */
  recommendations: AgentRecommendation[];
};

export const JIMVIO_AGENTS: JimvioAgent[] = [
  {
    id: "seller",
    name: "Seller Agent",
    role: "Watches your store health and recommends revenue-safe moves.",
    emoji: "🏪",
    accent: "#16A34A",
    status: "active",
    lastUpdatedLabel: "2m ago",
    domain: "Inventory, pricing & fulfillment intelligence",
    analyzes: ["Inventory velocity", "Order fulfillment SLAs", "Price elasticity", "Bundle attach rate"],
    recommendations: [
      {
        id: "seller-restock",
        title: "Restock before you lose sales",
        summary: "3 SKUs are trending toward zero within days at current sell-through.",
        href: "/marketplace",
        cta: "Review inventory",
        priority: "critical",
        confidence: 92,
        why: "Sell-through velocity on these SKUs has outpaced replenishment for 6 straight days, and each is a top-10 revenue contributor this month.",
        dataInfluences: ["Inventory velocity", "Sales trend (7d)", "Revenue contribution"],
        expectedOutcome: "Avoid an estimated 2–4 days of stockout on high-demand listings.",
      },
      {
        id: "seller-promote-margin",
        title: "Promote your highest-margin product",
        summary: "This listing converts well and carries the best margin in your catalog right now.",
        href: "/marketplace",
        cta: "Open product",
        priority: "high",
        confidence: 81,
        why: "Margin and conversion rate are both above your catalog average, but impressions have been flat — a light promotional push could compound existing demand.",
        dataInfluences: ["Margin per unit", "Conversion rate", "Impression trend"],
        expectedOutcome: "Potential lift in high-margin revenue without added discount cost.",
      },
      {
        id: "seller-bundle",
        title: "Bundle two frequently co-bought items",
        summary: "Two of your products are purchased together often enough to justify a bundle.",
        href: "/marketplace/new",
        cta: "Create bundle",
        priority: "medium",
        confidence: 74,
        why: "Order history shows a recurring co-purchase pattern between these SKUs, suggesting a bundle could raise average order value.",
        dataInfluences: ["Co-purchase frequency", "Average order value", "Catalog overlap"],
        expectedOutcome: "Higher average order value with minimal cannibalization risk.",
      },
      {
        id: "seller-discount-timing",
        title: "Time your next discount for the weekend",
        summary: "Conversion rate historically peaks on weekends for your store category.",
        href: "/",
        cta: "View timing insight",
        priority: "medium",
        confidence: 68,
        why: "Weekly traffic patterns show a recurring conversion spike on Saturdays, so a scheduled discount could land when buying intent is naturally higher.",
        dataInfluences: ["Weekly traffic pattern", "Category benchmark", "Past discount performance"],
        expectedOutcome: "More efficient discount spend by aligning with natural demand peaks.",
      },
      {
        id: "seller-ship-orders",
        title: "Ship pending orders before SLA risk",
        summary: "5 orders are approaching your fulfillment SLA window.",
        href: "/orders",
        cta: "Fulfill orders",
        priority: "critical",
        confidence: 95,
        why: "These orders are within the final third of your typical fulfillment window, and late shipments correlate with lower repeat-purchase rates.",
        dataInfluences: ["Fulfillment SLA", "Order age", "Repeat-purchase correlation"],
        expectedOutcome: "Protects on-time delivery rate and customer satisfaction.",
      },
    ],
  },
  {
    id: "creator",
    name: "Creator Agent",
    role: "Surfaces campaign fit, content ideas, and earnings opportunities.",
    emoji: "🎥",
    accent: "#FF5A1F",
    status: "active",
    lastUpdatedLabel: "5m ago",
    domain: "Campaign fit, content, & portfolio growth",
    analyzes: ["Campaign-niche fit", "Content performance", "Posting cadence", "Payout readiness"],
    recommendations: [
      {
        id: "creator-apply-campaign",
        title: "Apply to a high-fit campaign",
        summary: "A live campaign matches your recent content niche closely.",
        href: "/ugc",
        cta: "View campaign",
        priority: "high",
        confidence: 84,
        why: "The campaign's target niche and audience demographics overlap strongly with your last 3 published pieces of content.",
        dataInfluences: ["Niche overlap", "Audience demographics", "Content history"],
        expectedOutcome: "Higher acceptance odds and stronger content-brand fit.",
      },
      {
        id: "creator-brand-match",
        title: "A brand is actively seeking creators like you",
        summary: "Recruitment activity in your category has picked up this week.",
        href: "/ugc",
        cta: "Explore brands",
        priority: "medium",
        confidence: 70,
        why: "Recruitment volume in your content category is trending up, suggesting more brand budget is currently available.",
        dataInfluences: ["Recruitment volume", "Category trend"],
        expectedOutcome: "Improved odds of landing a paid collaboration this cycle.",
      },
      {
        id: "creator-community",
        title: "Join a community aligned with your audience",
        summary: "This community's members overlap with your typical viewers.",
        href: "/communities",
        cta: "Explore community",
        priority: "medium",
        confidence: 66,
        why: "Audience interest signals from your content overlap with this community's most active topics.",
        dataInfluences: ["Audience interest overlap", "Community activity level"],
        expectedOutcome: "New distribution channel for your content and offers.",
      },
      {
        id: "creator-content-idea",
        title: "Plan your next content batch",
        summary: "Your posting cadence has slowed — a content sprint could help.",
        href: "/ugc/library",
        cta: "Open library",
        priority: "medium",
        confidence: 62,
        why: "Upload frequency has dropped relative to your rolling 30-day average, which historically precedes a dip in campaign eligibility.",
        dataInfluences: ["Upload cadence", "30-day rolling average"],
        expectedOutcome: "Keeps you eligible for cadence-sensitive campaigns.",
      },
      {
        id: "creator-earnings",
        title: "Your earnings are ready to withdraw",
        summary: "Settled UGC payouts are sitting in your balance.",
        href: "/ugc/earnings",
        cta: "Review earnings",
        priority: "low",
        confidence: 90,
        why: "Payouts from your last two completed campaigns have cleared escrow and are available.",
        dataInfluences: ["Escrow settlement status", "Payout history"],
        expectedOutcome: "Funds available for withdrawal without further action needed.",
      },
    ],
  },
  {
    id: "brand",
    name: "Brand Agent",
    role: "Recommends creators, timing, and budget moves for campaign ROI.",
    emoji: "💼",
    accent: "#7C3AED",
    status: "active",
    lastUpdatedLabel: "3m ago",
    domain: "Creator recruitment & campaign ROI",
    analyzes: ["Creator performance", "Campaign timing", "Budget allocation", "Community fit"],
    recommendations: [
      {
        id: "brand-recruit",
        title: "Recruit creators matching your last winning brief",
        summary: "These creators share traits with your top-performing collaborators.",
        href: "/ugc/campaign-center/recruitment",
        cta: "View recommended creators",
        priority: "high",
        confidence: 83,
        why: "Engagement and conversion patterns from your best-performing past campaign map closely to this creator segment.",
        dataInfluences: ["Past campaign performance", "Creator engagement rate", "Audience match"],
        expectedOutcome: "Higher expected ROI on your next recruitment wave.",
      },
      {
        id: "brand-timing",
        title: "Launch your next campaign this week",
        summary: "Creator application rates are trending higher than usual.",
        href: "/ugc/campaign-center/create",
        cta: "Create campaign",
        priority: "medium",
        confidence: 71,
        why: "Application volume across similar campaigns has risen, suggesting more creator supply is currently available for your niche.",
        dataInfluences: ["Application volume trend", "Category seasonality"],
        expectedOutcome: "Faster campaign fill time and stronger creator selection.",
      },
      {
        id: "brand-budget",
        title: "Reallocate budget toward top-ROI creators",
        summary: "A small subset of creators is driving most of your campaign ROI.",
        href: "/ugc/campaign-center/analytics",
        cta: "Open performance",
        priority: "high",
        confidence: 78,
        why: "Performance analytics show a concentration of ROI among a handful of creators relative to overall spend distribution.",
        dataInfluences: ["ROI concentration", "Spend distribution"],
        expectedOutcome: "More efficient budget use without increasing total spend.",
      },
      {
        id: "brand-community",
        title: "Partner with an aligned community",
        summary: "This community's audience overlaps with your target buyers.",
        href: "/communities",
        cta: "Explore communities",
        priority: "medium",
        confidence: 64,
        why: "Audience overlap between this community and your buyer profile suggests an efficient distribution partnership.",
        dataInfluences: ["Audience overlap", "Buyer profile match"],
        expectedOutcome: "Incremental reach into a highly relevant audience segment.",
      },
      {
        id: "brand-escrow",
        title: "Release a milestone payment",
        summary: "A campaign milestone is complete and ready for escrow release.",
        href: "/ugc/campaign-center/escrow",
        cta: "Review escrow",
        priority: "low",
        confidence: 88,
        why: "Deliverables tied to this milestone were marked complete and are awaiting your review.",
        dataInfluences: ["Milestone completion status", "Deliverable review queue"],
        expectedOutcome: "Keeps creator trust and campaign momentum high.",
      },
    ],
  },
  {
    id: "affiliate",
    name: "Affiliate Agent",
    role: "Flags which products, links, and audiences will earn the most.",
    emoji: "🤝",
    accent: "#CA8A04",
    status: "watching",
    lastUpdatedLabel: "8m ago",
    domain: "Link performance & commission optimization",
    analyzes: ["EPC (earnings per click)", "Conversion rate", "Audience match", "Commission settlement"],
    recommendations: [
      {
        id: "affiliate-epc",
        title: "Promote your highest-EPC product",
        summary: "This product is earning more per click than the rest of your links.",
        href: "/affiliates",
        cta: "View product",
        priority: "high",
        confidence: 86,
        why: "EPC for this product is significantly above your account average over the last 7 days, indicating strong audience fit.",
        dataInfluences: ["EPC (7d)", "Click volume", "Audience fit"],
        expectedOutcome: "More commission per unit of promotional effort.",
      },
      {
        id: "affiliate-links",
        title: "Generate links for a trending product",
        summary: "This product's marketplace demand is rising fast.",
        href: "/affiliates/links",
        cta: "Generate link",
        priority: "medium",
        confidence: 72,
        why: "Marketplace-wide interest in this product is trending upward, ahead of your own current link coverage.",
        dataInfluences: ["Marketplace trend", "Existing link coverage"],
        expectedOutcome: "Early positioning ahead of rising demand.",
      },
      {
        id: "affiliate-analytics",
        title: "Review your best-converting traffic source",
        summary: "One channel is converting notably better than the others.",
        href: "/affiliates/analytics",
        cta: "Open analytics",
        priority: "medium",
        confidence: 69,
        why: "Conversion rate from this traffic source outpaces your other channels by a wide margin.",
        dataInfluences: ["Conversion rate by source", "Traffic mix"],
        expectedOutcome: "Clearer picture of where to focus future promotion.",
      },
      {
        id: "affiliate-audience",
        title: "Match your audience to a better-fit offer",
        summary: "Your audience profile suggests a different program could convert higher.",
        href: "/affiliates/dashboard",
        cta: "Compare programs",
        priority: "low",
        confidence: 61,
        why: "Audience demographic signals align more closely with a different active program than your current top promotion.",
        dataInfluences: ["Audience demographics", "Program fit score"],
        expectedOutcome: "Potential conversion lift from better audience-offer alignment.",
      },
      {
        id: "affiliate-withdraw",
        title: "Withdraw settled commissions",
        summary: "Your commission balance has cleared and is ready.",
        href: "/wallet",
        cta: "Open wallet",
        priority: "low",
        confidence: 91,
        why: "Commissions from your last settlement cycle have cleared and no holds are pending.",
        dataInfluences: ["Settlement status", "Wallet balance"],
        expectedOutcome: "Funds available without further waiting.",
      },
    ],
  },
  {
    id: "community",
    name: "Community Agent",
    role: "Suggests courses, lives, and creators to keep your community growing.",
    emoji: "👥",
    accent: "#2D7DD2",
    status: "active",
    lastUpdatedLabel: "4m ago",
    domain: "Member engagement & content programming",
    analyzes: ["Member activity", "Course completion", "Event attendance", "Creator collaboration fit"],
    recommendations: [
      {
        id: "community-course",
        title: "Launch a course on a trending topic",
        summary: "Members are asking about a topic you haven't covered yet.",
        href: "/communities/courses",
        cta: "Create course",
        priority: "medium",
        confidence: 70,
        why: "Discussion volume around this topic has grown steadily among your most active members.",
        dataInfluences: ["Discussion topic frequency", "Member activity"],
        expectedOutcome: "Higher engagement and potential new revenue stream.",
      },
      {
        id: "community-live",
        title: "Schedule a live session this week",
        summary: "Engagement tends to spike after live sessions for your community.",
        href: "/communities/live",
        cta: "Schedule live",
        priority: "high",
        confidence: 77,
        why: "Historical data shows a consistent engagement bump in the days following a live session.",
        dataInfluences: ["Post-live engagement pattern", "Time since last live"],
        expectedOutcome: "Renewed engagement momentum across your community.",
      },
      {
        id: "community-event",
        title: "Host an event to re-engage quiet members",
        summary: "A segment of members has gone quiet over the past two weeks.",
        href: "/communities/events",
        cta: "Create event",
        priority: "medium",
        confidence: 64,
        why: "Activity from a subset of previously engaged members has dropped, and events historically help re-activate them.",
        dataInfluences: ["Member activity decline", "Past event re-activation rate"],
        expectedOutcome: "Reduced churn risk among previously active members.",
      },
      {
        id: "community-growth",
        title: "Grow membership with a referral push",
        summary: "Your community's growth rate has slowed this month.",
        href: "/owner/communities",
        cta: "Review growth",
        priority: "low",
        confidence: 58,
        why: "New member growth is below your trailing 3-month average, suggesting an opportunity to re-energize acquisition.",
        dataInfluences: ["Growth rate trend", "3-month average"],
        expectedOutcome: "Restored membership growth trajectory.",
      },
      {
        id: "community-creator",
        title: "Invite creators to co-host content",
        summary: "Collaborative content historically drives higher engagement here.",
        href: "/ugc/campaign-center/recruitment",
        cta: "Find creators",
        priority: "medium",
        confidence: 66,
        why: "Past collaborative sessions in your community outperformed solo content on engagement per post.",
        dataInfluences: ["Collaboration engagement lift", "Creator availability"],
        expectedOutcome: "Fresh content variety and broader reach.",
      },
    ],
  },
  {
    id: "buyer",
    name: "Buyer Agent",
    role: "Finds deals, bundles, and communities matched to your interests.",
    emoji: "🛒",
    accent: "#2563EB",
    status: "watching",
    lastUpdatedLabel: "1m ago",
    domain: "Personalized shopping & deal discovery",
    analyzes: ["Wishlist signals", "Browsing history", "Flash deal timing", "Community interests"],
    recommendations: [
      {
        id: "buyer-flash-deal",
        title: "Claim a flash deal before it ends",
        summary: "A deal matching your recent browsing is ending soon.",
        href: "/marketplace/flash-deals",
        cta: "View deal",
        priority: "critical",
        confidence: 89,
        why: "This deal covers a category you've browsed multiple times recently, and the countdown window is closing.",
        dataInfluences: ["Browsing history", "Deal countdown", "Category interest"],
        expectedOutcome: "Save on an item you've already shown interest in.",
      },
      {
        id: "buyer-wishlist",
        title: "A wishlist item dropped in price",
        summary: "One of your saved items is now discounted.",
        href: "/marketplace",
        cta: "Open wishlist",
        priority: "high",
        confidence: 85,
        why: "Price tracking on your saved items detected a drop below your typical purchase threshold.",
        dataInfluences: ["Wishlist price tracking", "Historical purchase threshold"],
        expectedOutcome: "Opportunity to buy a wanted item at a better price.",
      },
      {
        id: "buyer-bundle",
        title: "Explore a bundle that fits your cart",
        summary: "A bundle including items similar to your recent purchases is available.",
        href: "/marketplace",
        cta: "Browse bundles",
        priority: "medium",
        confidence: 68,
        why: "This bundle overlaps with categories from your last two orders, suggesting relevance to your needs.",
        dataInfluences: ["Order history", "Category overlap"],
        expectedOutcome: "Potential savings by purchasing related items together.",
      },
      {
        id: "buyer-community",
        title: "Join a community for exclusive drops",
        summary: "This community regularly shares early access to deals you like.",
        href: "/communities",
        cta: "Explore community",
        priority: "low",
        confidence: 60,
        why: "Members of this community frequently discuss products matching your recent interest signals.",
        dataInfluences: ["Community topic match", "Interest signals"],
        expectedOutcome: "Earlier access to relevant deals and drops.",
      },
      {
        id: "buyer-creator-match",
        title: "Follow creators who match your taste",
        summary: "These creators post about products similar to what you've bought.",
        href: "/identity/search",
        cta: "Find creators",
        priority: "low",
        confidence: 57,
        why: "Content themes from these creators align closely with your past purchase categories.",
        dataInfluences: ["Purchase category history", "Creator content themes"],
        expectedOutcome: "A curated discovery feed tailored to your taste.",
      },
    ],
  },
  {
    id: "live",
    name: "Live Agent",
    role: "Optimizes streaming time, product bags, and guest lineups.",
    emoji: "📺",
    accent: "#DC2626",
    status: "idle",
    lastUpdatedLabel: "15m ago",
    domain: "Live commerce timing & revenue readiness",
    analyzes: ["Audience online patterns", "Product bag performance", "Guest collaboration history", "Session revenue"],
    recommendations: [
      {
        id: "live-timing",
        title: "Go live during your audience's peak hours",
        summary: "Your audience is most active in the early evening on weekdays.",
        href: "/communities/live",
        cta: "Go live",
        priority: "high",
        confidence: 80,
        why: "Historical viewership data shows a consistent attendance peak in this time window over the past month.",
        dataInfluences: ["Audience activity pattern", "Past session attendance"],
        expectedOutcome: "Higher live viewership and real-time engagement.",
      },
      {
        id: "live-schedule",
        title: "Schedule your next session now",
        summary: "Sessions announced 48+ hours in advance see stronger turnout.",
        href: "/communities/events",
        cta: "Schedule live",
        priority: "medium",
        confidence: 73,
        why: "Turnout correlates with advance notice — sessions with longer lead time consistently outperform same-day announcements.",
        dataInfluences: ["Advance notice correlation", "Past turnout"],
        expectedOutcome: "Stronger expected turnout for your next session.",
      },
      {
        id: "live-products",
        title: "Prep your product bag ahead of time",
        summary: "Sessions with a curated bag convert noticeably better.",
        href: "/marketplace",
        cta: "Select products",
        priority: "high",
        confidence: 76,
        why: "Sessions where products were pre-loaded show higher in-stream conversion than improvised sessions.",
        dataInfluences: ["Conversion by session type", "Product readiness"],
        expectedOutcome: "Smoother session flow and better conversion.",
      },
      {
        id: "live-revenue",
        title: "Review last session's revenue breakdown",
        summary: "Your last session's top-selling moment is worth repeating.",
        href: "/",
        cta: "Open analytics",
        priority: "low",
        confidence: 65,
        why: "A specific segment of your last session drove a disproportionate share of revenue and could inform your next format.",
        dataInfluences: ["Session revenue breakdown", "Moment-level performance"],
        expectedOutcome: "Sharper session format based on what already worked.",
      },
      {
        id: "live-guests",
        title: "Invite a guest creator from your community",
        summary: "Co-hosted sessions have historically drawn a larger audience.",
        href: "/communities",
        cta: "Find a guest",
        priority: "medium",
        confidence: 63,
        why: "Sessions with a guest co-host show a measurable lift in concurrent viewers compared to solo sessions.",
        dataInfluences: ["Concurrent viewer lift", "Guest availability"],
        expectedOutcome: "Larger expected audience for your next stream.",
      },
    ],
  },
  {
    id: "executive",
    name: "Executive Agent",
    role: "Summarizes every agent into one morning brief and one-click actions.",
    emoji: "🧭",
    accent: "#4F46E5",
    status: "active",
    lastUpdatedLabel: "Just now",
    domain: "Cross-agent summary & morning briefing",
    analyzes: ["Revenue signals", "Growth trend", "Risk flags", "Priorities across all agents"],
    recommendations: [
      {
        id: "executive-revenue",
        title: "Review this morning's revenue snapshot",
        summary: "Revenue is trending up week-over-week across your active workspaces.",
        href: "/",
        cta: "Open analytics",
        priority: "high",
        confidence: 82,
        why: "Aggregated signals from Seller, Affiliate, and Brand agents all point to positive week-over-week revenue movement.",
        dataInfluences: ["Seller agent signal", "Affiliate agent signal", "Brand agent signal"],
        expectedOutcome: "Clear visibility into what's driving today's growth.",
      },
      {
        id: "executive-orders",
        title: "Clear orders before they risk SLA",
        summary: "Pending orders are the highest-urgency item across your agents today.",
        href: "/orders",
        cta: "Review orders",
        priority: "critical",
        confidence: 90,
        why: "The Seller Agent flagged fulfillment SLA risk as the top critical item across all agent domains this morning.",
        dataInfluences: ["Seller agent priority", "Fulfillment SLA"],
        expectedOutcome: "Protects delivery reliability across your store.",
      },
      {
        id: "executive-wallet",
        title: "Withdraw funds ready across your wallet",
        summary: "Settled balances from multiple revenue streams are ready.",
        href: "/wallet",
        cta: "Open wallet",
        priority: "medium",
        confidence: 87,
        why: "Creator, Affiliate, and Brand agents each report cleared balances ready for withdrawal.",
        dataInfluences: ["Creator agent signal", "Affiliate agent signal", "Wallet settlement status"],
        expectedOutcome: "Consolidated visibility into funds ready to move.",
      },
      {
        id: "executive-agent-center",
        title: "Open the full Agent Center",
        summary: "See every specialized agent's recommendations in one place.",
        href: "/",
        cta: "Open Agent Center",
        priority: "medium",
        confidence: 100,
        why: "This is a direct index into all 8 specialized agents so you can review every recommendation with full context.",
        dataInfluences: ["Cross-agent index"],
        expectedOutcome: "A single place to review and act on every recommendation.",
      },
      {
        id: "executive-priorities",
        title: "Check today's cross-workspace priorities",
        summary: "Mission Control has today's top items ready for you.",
        href: "/",
        cta: "Open Mission Control",
        priority: "low",
        confidence: 75,
        why: "Today's Focus on Mission Control already reflects the same priority signals surfaced by your agents.",
        dataInfluences: ["Mission Control focus items", "Cross-agent priorities"],
        expectedOutcome: "A calm, unified starting point for the day.",
      },
    ],
  },
];

export function getAgent(id: AgentId): JimvioAgent {
  const found = JIMVIO_AGENTS.find((a) => a.id === id);
  return found ?? JIMVIO_AGENTS[0];
}

/** Maps a workspace mode to its primary specialized agent. */
export function getAgentForWorkspace(mode: OsWorkspaceMode): AgentId {
  switch (mode) {
    case "buyer":
      return "buyer";
    case "seller":
      return "seller";
    case "creator":
      return "creator";
    case "brand":
    case "admin":
      return "brand";
    case "affiliate":
      return "affiliate";
    case "community":
      return "community";
    case "live":
      return "live";
    case "ai":
      return "executive";
    default:
      return "seller";
  }
}

export type ExecutiveBrief = {
  revenue: string;
  growth: string;
  risk: string;
  priorities: string[];
  opportunities: string[];
  actions: Array<{ label: string; href: string }>;
};

/**
 * Derives a morning executive brief from the Executive Agent plus a slice of
 * its peers — UI scaffold strings only, no computation over real data.
 */
export function getExecutiveBrief(): ExecutiveBrief {
  const executive = getAgent("executive");
  const peers = JIMVIO_AGENTS.filter((a) => a.id !== "executive");

  const criticalOrHigh = [executive, ...peers]
    .flatMap((agent) => agent.recommendations.map((rec) => ({ agent, rec })))
    .filter(({ rec }) => rec.priority === "critical" || rec.priority === "high")
    .sort((a, b) => b.rec.confidence - a.rec.confidence);

  const opportunitySource = peers
    .flatMap((agent) => agent.recommendations.map((rec) => ({ agent, rec })))
    .filter(({ rec }) => rec.priority === "medium" || rec.priority === "low")
    .sort((a, b) => b.rec.confidence - a.rec.confidence);

  return {
    revenue: "Revenue trending up across Seller, Affiliate & Brand agents",
    growth: "+14% week-over-week across active workspaces",
    risk: "2 orders approaching fulfillment SLA",
    priorities: criticalOrHigh.slice(0, 3).map(({ rec }) => rec.title),
    opportunities: opportunitySource.slice(0, 3).map(({ rec }) => rec.title),
    actions: [
      { label: "Open dashboard", href: "/" },
      { label: "Review orders", href: "/orders" },
      { label: "Open wallet", href: "/wallet" },
      { label: "View analytics", href: "/" },
      { label: "Open Agent Center", href: "/" },
    ],
  };
}
