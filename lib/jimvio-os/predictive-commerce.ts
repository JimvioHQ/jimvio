/**
 * Jimvio Predictive Commerce Engine — advisory intelligence scaffold (UI-only).
 *
 * This module powers Mission Control's predictive widgets: business health,
 * opportunities, risks, growth suggestions, business DNA, timeline, agent
 * collaboration, and the executive morning brief. It is presentation
 * scaffolding only — no auth/API/DB reads, no business logic, and every
 * `href` maps to an EXISTING production route. All predictions are
 * ADVISORY ONLY: Jimvio never auto-acts on them, the human always decides.
 */

import type { OsWorkspaceMode } from "./types";
import { normalizeWorkspaceMode } from "./workspaces";
import { JIMVIO_AGENTS, getAgentForWorkspace, getExecutiveBrief, type AgentId } from "./agents";

// ─── Types ──────────────────────────────────────────────────────────────────

export type HealthDomain =
  | "marketplace"
  | "creator"
  | "brand"
  | "affiliate"
  | "community"
  | "live"
  | "wallet"
  | "ai";

export type HealthSegment = {
  id: HealthDomain;
  label: string;
  score: number; // 0–100
  trend: "up" | "flat" | "down";
  risk: "low" | "medium" | "high";
  explanation: string;
  actionLabel: string;
  actionHref: string;
};

export type BusinessHealth = {
  score: number;
  summary: string;
  segments: HealthSegment[]; // all 8 domains
};

export type PredictiveOpportunity = {
  id: string;
  title: string;
  detail: string;
  metricLabel: string;
  metricValue: string;
  confidence: number;
  why: string;
  expectedOutcome: string;
  cta: string;
  href: string;
};

export type PredictiveRisk = {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  impact: string;
  recommendation: string;
  why: string;
  confidence: number;
  expectedOutcome: string;
  cta: string;
  href: string;
};

export type GrowthSuggestion = {
  id: string;
  title: string;
  why: string;
  confidence: number;
  signals: string[];
  expectedOutcome: string;
  cta: string;
  href: string;
};

export type BusinessDnaSlice = {
  id: string;
  label: string;
  percent: number;
  accent: string;
};

export type BusinessDna = {
  slices: BusinessDnaSlice[]; // sum ~100
  primaryLabel: string;
  insight: string;
};

export type TimelinePeriod = "today" | "yesterday" | "week" | "month";

export type BusinessTimelineEvent = {
  id: string;
  period: TimelinePeriod;
  title: string;
  detail: string;
  kind: "product" | "campaign" | "creator" | "affiliate" | "community" | "revenue" | "order" | "wallet";
  href: string;
  timeLabel: string;
};

export type AgentCollaborationStep = {
  agentId: string;
  name: string;
  emoji: string;
  note: string;
};

export type ExecutiveMorningBrief = {
  greeting: string;
  yesterday: Array<{ label: string; value: string; tone: "positive" | "neutral" | "attention" }>;
  attention: string;
  recommendation: string;
  expectedImpact: string;
  cta: string;
  href: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function resolveMode(mode?: OsWorkspaceMode): OsWorkspaceMode {
  return normalizeWorkspaceMode(mode ?? "seller");
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function riskFromScore(score: number): HealthSegment["risk"] {
  if (score >= 80) return "low";
  if (score >= 60) return "medium";
  return "high";
}

// ─── Business Health ────────────────────────────────────────────────────────

type HealthDomainBase = {
  id: HealthDomain;
  label: string;
  baseScore: number;
  baseTrend: HealthSegment["trend"];
  explanation: string;
  actionLabel: string;
  actionHref: string;
};

const HEALTH_DOMAIN_BASE: HealthDomainBase[] = [
  {
    id: "marketplace",
    label: "Marketplace",
    baseScore: 78,
    baseTrend: "up",
    explanation: "Inventory turns are healthy, but two SKUs are trending toward stockout within days.",
    actionLabel: "Review inventory",
    actionHref: "/dashboard/products",
  },
  {
    id: "creator",
    label: "Creator Network",
    baseScore: 71,
    baseTrend: "flat",
    explanation: "Campaign applications are steady, though content cadence has softened this week.",
    actionLabel: "Open creator hub",
    actionHref: "/ugc",
  },
  {
    id: "brand",
    label: "Brand Campaigns",
    baseScore: 69,
    baseTrend: "up",
    explanation: "Campaign ROI is concentrated in a handful of creators — budget reallocation could help.",
    actionLabel: "Open campaign analytics",
    actionHref: "/ugc/campaign-center/analytics",
  },
  {
    id: "affiliate",
    label: "Affiliate Program",
    baseScore: 74,
    baseTrend: "up",
    explanation: "EPC leaders are outperforming the rest of your link portfolio by a wide margin.",
    actionLabel: "View affiliate analytics",
    actionHref: "/affiliates/analytics",
  },
  {
    id: "community",
    label: "Community",
    baseScore: 66,
    baseTrend: "down",
    explanation: "A segment of members has gone quiet over the past two weeks — worth a nudge.",
    actionLabel: "Review community activity",
    actionHref: "/dashboard/communities",
  },
  {
    id: "live",
    label: "Live Commerce",
    baseScore: 58,
    baseTrend: "flat",
    explanation: "Live sessions are infrequent relative to your audience's peak activity windows.",
    actionLabel: "Schedule a live session",
    actionHref: "/communities/live",
  },
  {
    id: "wallet",
    label: "Wallet & Payouts",
    baseScore: 82,
    baseTrend: "up",
    explanation: "Settled balances across revenue streams are ready and waiting to be withdrawn.",
    actionLabel: "Open wallet",
    actionHref: "/wallet",
  },
  {
    id: "ai",
    label: "AI Copilot",
    baseScore: 64,
    baseTrend: "up",
    explanation: "Agent recommendations are being reviewed at a healthy pace, with room to act on more.",
    actionLabel: "Open Agent Center",
    actionHref: "/dashboard/agents",
  },
];

/** Small per-mode score emphasis — keeps the health ring personal without changing structure. */
const MODE_HEALTH_EMPHASIS: Record<OsWorkspaceMode, Partial<Record<HealthDomain, number>>> = {
  buyer: { marketplace: 6, wallet: 3, community: 2 },
  seller: { marketplace: 10, wallet: 6, ai: 2 },
  creator: { creator: 10, ai: 6, brand: 3 },
  brand: { brand: 10, creator: 6, affiliate: 3 },
  affiliate: { affiliate: 10, wallet: 6, marketplace: 2 },
  community: { community: 10, live: 6, creator: 2 },
  live: { live: 10, community: 6, marketplace: 2 },
  ai: { ai: 10, brand: 4, marketplace: 3 },
  admin: { brand: 10, creator: 6, affiliate: 3 },
};

function summaryForScore(score: number, mode: OsWorkspaceMode): string {
  const modeLabel = mode === "admin" ? "brand" : mode;
  if (score >= 80) return `Your ${modeLabel} workspace is in excellent shape — most signals are trending up.`;
  if (score >= 65) return `Your ${modeLabel} workspace is healthy overall, with a few areas worth a closer look.`;
  if (score >= 50) return `Your ${modeLabel} workspace is stable, but a couple of domains need attention soon.`;
  return `Your ${modeLabel} workspace has a few domains that need attention this week.`;
}

/** Overall business health across all 8 domains, lightly personalized per workspace mode. */
export function getBusinessHealth(mode?: OsWorkspaceMode): BusinessHealth {
  const resolved = resolveMode(mode);
  const emphasis = MODE_HEALTH_EMPHASIS[resolved] ?? {};

  const segments: HealthSegment[] = HEALTH_DOMAIN_BASE.map((domain) => {
    const delta = emphasis[domain.id] ?? 0;
    const score = clampScore(domain.baseScore + delta);
    const trend: HealthSegment["trend"] = delta > 3 ? "up" : delta < -3 ? "down" : domain.baseTrend;
    return {
      id: domain.id,
      label: domain.label,
      score,
      trend,
      risk: riskFromScore(score),
      explanation: domain.explanation,
      actionLabel: domain.actionLabel,
      actionHref: domain.actionHref,
    };
  });

  const overall = clampScore(segments.reduce((sum, s) => sum + s.score, 0) / segments.length);

  return {
    score: overall,
    summary: summaryForScore(overall, resolved),
    segments,
  };
}

// ─── Opportunities ──────────────────────────────────────────────────────────

const OPPORTUNITY_LIBRARY: Record<string, PredictiveOpportunity> = {
  "opp-product-creator-match": {
    id: "opp-product-creator-match",
    title: "Pair your top product with a matching creator",
    detail: "A creator's recent content niche overlaps strongly with one of your best-converting products.",
    metricLabel: "Estimated monthly revenue",
    metricValue: "$12,400",
    confidence: 84,
    why: "Audience overlap and past conversion rate on similar creator-product pairings both point to a strong fit.",
    expectedOutcome: "Faster conversion on an already-strong product via a highly aligned audience.",
    cta: "View creator matches",
    href: "/ugc/campaign-center/recruitment",
  },
  "opp-community-product": {
    id: "opp-community-product",
    title: "A community is asking about a product you sell",
    detail: "Recent discussion volume in a community you're connected to points to unmet demand.",
    metricLabel: "Estimated new buyers",
    metricValue: "~140",
    confidence: 71,
    why: "Conversation topic frequency in this community has risen sharply and maps directly to your catalog.",
    expectedOutcome: "New buyers sourced from a warm, already-engaged audience.",
    cta: "Explore community",
    href: "/communities",
  },
  "opp-affiliate-epc": {
    id: "opp-affiliate-epc",
    title: "Scale your highest-EPC affiliate link",
    detail: "One product is earning meaningfully more per click than the rest of your affiliate portfolio.",
    metricLabel: "EPC vs. portfolio average",
    metricValue: "+38%",
    confidence: 88,
    why: "This link's EPC has stayed well above your account average for the last two settlement cycles.",
    expectedOutcome: "More commission per unit of promotional effort by leaning into what's already working.",
    cta: "View EPC leaders",
    href: "/affiliates/analytics",
  },
  "opp-live-bundle": {
    id: "opp-live-bundle",
    title: "Bundle fast movers for your next live session",
    detail: "Two frequently co-bought products would make a strong featured bundle on your next stream.",
    metricLabel: "Estimated session lift",
    metricValue: "+22%",
    confidence: 66,
    why: "Order history shows these items are purchased together often, and live bundles historically convert well.",
    expectedOutcome: "Higher average order value during your next live commerce session.",
    cta: "Select products",
    href: "/dashboard/products",
  },
  "opp-brand-reallocation": {
    id: "opp-brand-reallocation",
    title: "Reallocate budget toward your top-ROI creators",
    detail: "A small subset of creators is driving most of your campaign ROI this cycle.",
    metricLabel: "Estimated ROI uplift",
    metricValue: "+16%",
    confidence: 76,
    why: "Performance analytics show ROI concentration among a handful of creators relative to spend distribution.",
    expectedOutcome: "More efficient budget use without increasing total campaign spend.",
    cta: "Open campaign analytics",
    href: "/ugc/campaign-center/analytics",
  },
};

/** Priority order of opportunity ids per workspace mode — same pool, personalized ranking. */
const MODE_OPPORTUNITY_ORDER: Record<OsWorkspaceMode, string[]> = {
  buyer: ["opp-community-product", "opp-live-bundle", "opp-affiliate-epc"],
  seller: ["opp-product-creator-match", "opp-live-bundle", "opp-community-product", "opp-brand-reallocation"],
  creator: ["opp-product-creator-match", "opp-brand-reallocation", "opp-community-product"],
  brand: ["opp-brand-reallocation", "opp-product-creator-match", "opp-community-product"],
  affiliate: ["opp-affiliate-epc", "opp-community-product", "opp-product-creator-match"],
  community: ["opp-community-product", "opp-product-creator-match", "opp-live-bundle"],
  live: ["opp-live-bundle", "opp-product-creator-match", "opp-community-product"],
  ai: ["opp-product-creator-match", "opp-affiliate-epc", "opp-brand-reallocation", "opp-community-product"],
  admin: ["opp-brand-reallocation", "opp-product-creator-match", "opp-community-product"],
};

/** 3–4 premium, advisory-only opportunities, ranked by workspace mode relevance. */
export function getOpportunities(mode?: OsWorkspaceMode): PredictiveOpportunity[] {
  const resolved = resolveMode(mode);
  const order = MODE_OPPORTUNITY_ORDER[resolved] ?? Object.keys(OPPORTUNITY_LIBRARY);
  return order.slice(0, 4).map((id) => OPPORTUNITY_LIBRARY[id]).filter(Boolean);
}

// ─── Risks ──────────────────────────────────────────────────────────────────

const RISK_LIBRARY: Record<string, PredictiveRisk> = {
  "risk-low-stock": {
    id: "risk-low-stock",
    title: "Inventory running low on top sellers",
    severity: "critical",
    impact: "A few of your highest-revenue SKUs may sell through before you can restock.",
    recommendation: "Reorder now to avoid an estimated 2–4 days of stockout on high-demand listings.",
    why: "Sell-through velocity has outpaced replenishment for several consecutive days on top-10 revenue SKUs.",
    confidence: 92,
    expectedOutcome: "Avoided stockout and preserved revenue momentum on your best sellers.",
    cta: "Review inventory",
    href: "/dashboard/products",
  },
  "risk-fulfillment-sla": {
    id: "risk-fulfillment-sla",
    title: "Orders approaching fulfillment deadline",
    severity: "critical",
    impact: "Several orders are nearing the final third of your typical fulfillment window.",
    recommendation: "Prioritize shipping these orders today to protect your on-time delivery rate.",
    why: "Late shipments correlate with lower repeat-purchase rates in your order history.",
    confidence: 90,
    expectedOutcome: "Protected delivery reliability and customer satisfaction.",
    cta: "Review orders",
    href: "/dashboard/orders",
  },
  "risk-inactive-community": {
    id: "risk-inactive-community",
    title: "A member segment has gone quiet",
    severity: "medium",
    impact: "A group of previously active members hasn't engaged in nearly two weeks.",
    recommendation: "A timely event or direct outreach historically re-activates members like these.",
    why: "Engagement decline in this segment closely matches patterns that preceded churn last quarter.",
    confidence: 68,
    expectedOutcome: "Reduced churn risk among previously engaged members.",
    cta: "Review community activity",
    href: "/dashboard/communities",
  },
  "risk-campaign-deadline": {
    id: "risk-campaign-deadline",
    title: "A campaign milestone is close to deadline",
    severity: "high",
    impact: "Deliverables tied to an active campaign milestone are due soon and pending review.",
    recommendation: "Review and release the milestone to keep creator trust and momentum high.",
    why: "Deliverables were marked complete and are awaiting escrow review before the milestone window closes.",
    confidence: 81,
    expectedOutcome: "On-time milestone completion and stronger creator relationships.",
    cta: "Review escrow",
    href: "/ugc/campaign-center/escrow",
  },
  "risk-late-orders": {
    id: "risk-late-orders",
    title: "A subset of orders is running late",
    severity: "high",
    impact: "Shipping times have crept up for a group of orders in one region.",
    recommendation: "Check fulfillment status for this region before it affects more orders.",
    why: "Regional fulfillment times have trended upward over the last week relative to your baseline.",
    confidence: 74,
    expectedOutcome: "Faster resolution before delays compound into support volume.",
    cta: "Review orders",
    href: "/dashboard/orders",
  },
};

const MODE_RISK_ORDER: Record<OsWorkspaceMode, string[]> = {
  buyer: ["risk-late-orders", "risk-low-stock", "risk-fulfillment-sla"],
  seller: ["risk-low-stock", "risk-fulfillment-sla", "risk-late-orders"],
  creator: ["risk-campaign-deadline", "risk-fulfillment-sla", "risk-inactive-community"],
  brand: ["risk-campaign-deadline", "risk-inactive-community", "risk-fulfillment-sla"],
  affiliate: ["risk-late-orders", "risk-low-stock", "risk-campaign-deadline"],
  community: ["risk-inactive-community", "risk-campaign-deadline", "risk-late-orders"],
  live: ["risk-low-stock", "risk-inactive-community", "risk-fulfillment-sla"],
  ai: ["risk-low-stock", "risk-fulfillment-sla", "risk-inactive-community", "risk-campaign-deadline"],
  admin: ["risk-campaign-deadline", "risk-inactive-community", "risk-fulfillment-sla"],
};

/** 3–4 advisory-only risk flags, ranked by workspace mode relevance. Never auto-acted on. */
export function getRisks(mode?: OsWorkspaceMode): PredictiveRisk[] {
  const resolved = resolveMode(mode);
  const order = MODE_RISK_ORDER[resolved] ?? Object.keys(RISK_LIBRARY);
  return order.slice(0, 4).map((id) => RISK_LIBRARY[id]).filter(Boolean);
}

// ─── Growth suggestions ─────────────────────────────────────────────────────

const GROWTH_LIBRARY: Record<string, GrowthSuggestion> = {
  "growth-expand-country": {
    id: "growth-expand-country",
    title: "Expand into a trending market",
    why: "Demand signals show rising interest from a market outside your current focus.",
    confidence: 69,
    signals: ["Trending demand", "Low current coverage"],
    expectedOutcome: "Incremental revenue from an underserved but warming market.",
    cta: "Open analytics",
    href: "/dashboard/analytics",
  },
  "growth-course-launch": {
    id: "growth-course-launch",
    title: "Launch a course on a trending topic",
    why: "Members are asking about a topic your community hasn't covered yet.",
    confidence: 65,
    signals: ["Rising discussion volume", "No existing coverage"],
    expectedOutcome: "Higher engagement and a potential new revenue stream.",
    cta: "Open courses",
    href: "/communities/courses",
  },
  "growth-recurring-live": {
    id: "growth-recurring-live",
    title: "Set a recurring live commerce slot",
    why: "A consistent weekly time tends to build a returning, higher-intent audience.",
    confidence: 63,
    signals: ["Post-live engagement lift", "Irregular current cadence"],
    expectedOutcome: "Stronger retention and more predictable live revenue.",
    cta: "Schedule live",
    href: "/communities/events",
  },
  "growth-recruit-winning-brief": {
    id: "growth-recruit-winning-brief",
    title: "Recruit creators matching your last winning brief",
    why: "These creators share traits with your top-performing past collaborators.",
    confidence: 78,
    signals: ["Past campaign performance", "Audience match"],
    expectedOutcome: "Higher expected ROI on your next recruitment wave.",
    cta: "View recommended creators",
    href: "/ugc/campaign-center/recruitment",
  },
  "growth-automate-workflow": {
    id: "growth-automate-workflow",
    title: "Automate a repetitive workflow",
    why: "An idle automation could be enabled to save time on routine tasks this week.",
    confidence: 58,
    signals: ["Idle automation detected", "Repetitive manual pattern"],
    expectedOutcome: "Time saved without adding operational overhead.",
    cta: "View automations",
    href: "/ugc/campaign-center/automations",
  },
};

const MODE_GROWTH_ORDER: Record<OsWorkspaceMode, string[]> = {
  buyer: ["growth-course-launch", "growth-recurring-live", "growth-expand-country"],
  seller: ["growth-expand-country", "growth-recruit-winning-brief", "growth-recurring-live"],
  creator: ["growth-recruit-winning-brief", "growth-course-launch", "growth-automate-workflow"],
  brand: ["growth-recruit-winning-brief", "growth-expand-country", "growth-automate-workflow"],
  affiliate: ["growth-expand-country", "growth-recruit-winning-brief", "growth-automate-workflow"],
  community: ["growth-course-launch", "growth-recurring-live", "growth-recruit-winning-brief"],
  live: ["growth-recurring-live", "growth-course-launch", "growth-expand-country"],
  ai: ["growth-automate-workflow", "growth-recruit-winning-brief", "growth-expand-country", "growth-course-launch"],
  admin: ["growth-recruit-winning-brief", "growth-expand-country", "growth-automate-workflow"],
};

/** 3–4 concise growth suggestions with an explicit WHY, ranked by workspace mode. */
export function getGrowthSuggestions(mode?: OsWorkspaceMode): GrowthSuggestion[] {
  const resolved = resolveMode(mode);
  const order = MODE_GROWTH_ORDER[resolved] ?? Object.keys(GROWTH_LIBRARY);
  return order.slice(0, 4).map((id) => GROWTH_LIBRARY[id]).filter(Boolean);
}

// ─── Business DNA ───────────────────────────────────────────────────────────

type DnaBase = { id: string; label: string; weight: number; accent: string; domain: HealthDomain };

const DNA_BASE: DnaBase[] = [
  { id: "dna-marketplace", label: "Marketplace Sales", weight: 26, accent: "#16A34A", domain: "marketplace" },
  { id: "dna-creator", label: "Creator Content", weight: 16, accent: "#FF5A1F", domain: "creator" },
  { id: "dna-brand", label: "Brand Campaigns", weight: 14, accent: "#7C3AED", domain: "brand" },
  { id: "dna-affiliate", label: "Affiliate Growth", weight: 13, accent: "#CA8A04", domain: "affiliate" },
  { id: "dna-community", label: "Community Engagement", weight: 12, accent: "#2D7DD2", domain: "community" },
  { id: "dna-live", label: "Live Commerce", weight: 8, accent: "#DC2626", domain: "live" },
  { id: "dna-wallet", label: "Wallet Velocity", weight: 7, accent: "#0D9488", domain: "wallet" },
  { id: "dna-ai", label: "AI-Assisted Actions", weight: 4, accent: "#4F46E5", domain: "ai" },
];

/** Multiplies a domain's DNA weight per workspace mode so each mode sees a distinct mix. */
const MODE_DNA_MULTIPLIER: Record<OsWorkspaceMode, Partial<Record<HealthDomain, number>>> = {
  buyer: { marketplace: 1.4, community: 1.3, wallet: 1.1 },
  seller: { marketplace: 1.6, wallet: 1.2, ai: 1.1 },
  creator: { creator: 1.8, ai: 1.3, brand: 1.2 },
  brand: { brand: 1.8, creator: 1.3, affiliate: 1.2 },
  affiliate: { affiliate: 1.8, wallet: 1.3, marketplace: 1.1 },
  community: { community: 1.8, live: 1.3, creator: 1.1 },
  live: { live: 1.8, community: 1.3, marketplace: 1.1 },
  ai: { ai: 1.9, brand: 1.2, marketplace: 1.1 },
  admin: { brand: 1.8, creator: 1.3, affiliate: 1.2 },
};

/** Personalized business DNA mix — percentages shift per workspace mode. */
export function getBusinessDna(mode?: OsWorkspaceMode): BusinessDna {
  const resolved = resolveMode(mode);
  const multipliers = MODE_DNA_MULTIPLIER[resolved] ?? {};

  const weighted = DNA_BASE.map((d) => ({
    ...d,
    weighted: d.weight * (multipliers[d.domain] ?? 1),
  }));
  const total = weighted.reduce((sum, d) => sum + d.weighted, 0);

  const rounded = weighted.map((d) => ({
    id: d.id,
    label: d.label,
    accent: d.accent,
    percent: Math.round((d.weighted / total) * 100),
  }));

  // Reconcile rounding drift against the largest slice so the total stays ~100.
  const drift = 100 - rounded.reduce((sum, d) => sum + d.percent, 0);
  if (drift !== 0 && rounded.length > 0) {
    const largest = rounded.reduce((max, d) => (d.percent > max.percent ? d : max), rounded[0]);
    largest.percent += drift;
  }

  const primary = rounded.reduce((max, d) => (d.percent > max.percent ? d : max), rounded[0]);

  return {
    slices: rounded,
    primaryLabel: primary.label,
    insight: `${primary.label} is currently the biggest driver of your business mix — a strong signal for where to double down next.`,
  };
}

// ─── Business timeline ──────────────────────────────────────────────────────

const TIMELINE_EVENTS: BusinessTimelineEvent[] = [
  {
    id: "timeline-order-1",
    period: "today",
    title: "3 new orders came in",
    detail: "Orders across two product categories, all within your standard fulfillment window.",
    kind: "order",
    href: "/dashboard/orders",
    timeLabel: "2h ago",
  },
  {
    id: "timeline-creator-1",
    period: "today",
    title: "A creator applied to your campaign",
    detail: "Application niche closely matches your target audience profile.",
    kind: "creator",
    href: "/ugc/campaign-center/active",
    timeLabel: "4h ago",
  },
  {
    id: "timeline-wallet-1",
    period: "today",
    title: "A settlement cleared to your wallet",
    detail: "Commission from last week's affiliate activity is now available.",
    kind: "wallet",
    href: "/wallet",
    timeLabel: "6h ago",
  },
  {
    id: "timeline-product-1",
    period: "yesterday",
    title: "A product crossed a low-stock threshold",
    detail: "Sell-through velocity outpaced your restock schedule on one SKU.",
    kind: "product",
    href: "/dashboard/products",
    timeLabel: "Yesterday",
  },
  {
    id: "timeline-community-1",
    period: "yesterday",
    title: "A community event drew strong attendance",
    detail: "Turnout was ahead of your recent average for scheduled events.",
    kind: "community",
    href: "/communities/events",
    timeLabel: "Yesterday",
  },
  {
    id: "timeline-affiliate-1",
    period: "yesterday",
    title: "An affiliate link hit a new EPC high",
    detail: "This link is now your top earner per click across all active campaigns.",
    kind: "affiliate",
    href: "/affiliates/analytics",
    timeLabel: "Yesterday",
  },
  {
    id: "timeline-campaign-1",
    period: "week",
    title: "A campaign closed with strong ROI",
    detail: "Performance finished ahead of your typical benchmark for this campaign type.",
    kind: "campaign",
    href: "/ugc/campaign-center/analytics",
    timeLabel: "3 days ago",
  },
  {
    id: "timeline-revenue-1",
    period: "week",
    title: "Weekly revenue trended upward",
    detail: "This week is tracking ahead of the prior week across active workspaces.",
    kind: "revenue",
    href: "/dashboard/analytics",
    timeLabel: "This week",
  },
  {
    id: "timeline-order-2",
    period: "week",
    title: "Fulfillment times improved",
    detail: "Average time-to-ship dropped compared to last week's baseline.",
    kind: "order",
    href: "/dashboard/orders",
    timeLabel: "This week",
  },
  {
    id: "timeline-creator-2",
    period: "month",
    title: "Creator portfolio views grew",
    detail: "More brands viewed creator profiles this month than the month prior.",
    kind: "creator",
    href: "/ugc/analytics",
    timeLabel: "This month",
  },
  {
    id: "timeline-community-2",
    period: "month",
    title: "Course completion rates rose",
    detail: "More members finished courses this month compared to last.",
    kind: "community",
    href: "/communities/courses",
    timeLabel: "This month",
  },
  {
    id: "timeline-revenue-2",
    period: "month",
    title: "Monthly payout total trended up",
    detail: "Combined payouts across revenue streams are ahead of last month.",
    kind: "revenue",
    href: "/wallet",
    timeLabel: "This month",
  },
];

/** Grouped Today / Yesterday / This Week / This Month timeline — same for all users. */
export function getBusinessTimeline(): BusinessTimelineEvent[] {
  return TIMELINE_EVENTS;
}

// ─── Agent collaboration chain ──────────────────────────────────────────────

const COLLABORATION_NOTES: Partial<Record<AgentId, string>> = {
  seller: "Flags inventory and fulfillment signals worth acting on first.",
  creator: "Matches content and campaign fit against what's trending.",
  brand: "Weighs ROI and timing before recommending a campaign move.",
  affiliate: "Surfaces the highest-EPC products worth promoting next.",
  community: "Watches engagement and retention across your community.",
  buyer: "Tracks personalized deals and wishlist signals for shoppers.",
  live: "Times live sessions to your audience's peak activity windows.",
  executive: "Synthesizes every agent into one prioritized morning brief.",
};

/** Fixed hand-off order the chain rotates through, always finishing at Executive. */
const COLLABORATION_BASE_ORDER: AgentId[] = ["seller", "brand", "creator", "affiliate", "community", "live", "executive"];

/** Clean, human-readable agent-to-agent recommendation chain — not a technical graph. */
export function getAgentCollaborationChain(mode?: OsWorkspaceMode): AgentCollaborationStep[] {
  const resolved = resolveMode(mode);
  const lead = getAgentForWorkspace(resolved);

  const withoutExecutive = COLLABORATION_BASE_ORDER.filter((id) => id !== "executive");
  const rest = withoutExecutive.filter((id) => id !== lead);
  const order: AgentId[] = [lead, ...rest.slice(0, 3), "executive"];

  return order.map((id) => {
    const agent = JIMVIO_AGENTS.find((a) => a.id === id) ?? JIMVIO_AGENTS[0];
    return {
      agentId: agent.id,
      name: agent.name,
      emoji: agent.emoji,
      note: COLLABORATION_NOTES[agent.id] ?? agent.role,
    };
  });
}

// ─── Executive morning brief ────────────────────────────────────────────────

/** Concise "Good Morning" executive briefing — recommend-only, one-click CTA. */
export function getExecutiveMorningBrief(mode?: OsWorkspaceMode): ExecutiveMorningBrief {
  const resolved = resolveMode(mode);
  const brief = getExecutiveBrief();
  const health = getBusinessHealth(resolved);
  const topOpportunity = getOpportunities(resolved)[0];
  const topRisk = getRisks(resolved)[0];

  return {
    greeting: "Good morning — here's what changed while you were away.",
    yesterday: [
      { label: "Revenue", value: brief.growth, tone: "positive" },
      { label: "Business health", value: `${health.score}/100`, tone: health.score >= 65 ? "positive" : "attention" },
      { label: "Fulfillment", value: brief.risk, tone: "attention" },
    ],
    attention: topRisk
      ? `${topRisk.title} — ${topRisk.impact}`
      : "Nothing urgent needs your attention this morning.",
    recommendation: topOpportunity
      ? `${topOpportunity.title}. ${topOpportunity.why}`
      : "Review today's priorities in Mission Control.",
    expectedImpact: topOpportunity
      ? `${topOpportunity.expectedOutcome} (est. ${topOpportunity.metricValue})`
      : "Keeps your workspace running smoothly with no immediate action needed.",
    cta: topOpportunity?.cta ?? "Open Agent Center",
    href: topOpportunity?.href ?? "/dashboard/agents",
  };
}
