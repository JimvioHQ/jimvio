/**
 * Jimvio OS Intelligence Core — relationship intelligence scaffold (UI-only).
 *
 * Surfaces "what should I do next" recommendations with WHY explanations per
 * workspace. This is presentation scaffolding only: no auth/API/DB reads,
 * no business logic — every href below maps to an EXISTING production route.
 */

import type { OsWorkspaceMode } from "./types";

export type IntelligenceEntityKind =
  | "product"
  | "creator"
  | "brand"
  | "community"
  | "campaign"
  | "affiliate"
  | "order"
  | "customer"
  | "live"
  | "course"
  | "space";

export type IntelligenceReason =
  | "High conversion"
  | "Community overlap"
  | "Audience similarity"
  | "Trending in your country"
  | "Previous purchases"
  | "Creator performance"
  | "High margin"
  | "Low stock urgency"
  | "Fast mover"
  | "Retention risk"
  | "Growth opportunity"
  | "EPC leader"
  | "Campaign timing"
  | "Live commerce fit"
  | "Wishlist signal";

export type IntelligenceRecommendation = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  entityKind: IntelligenceEntityKind;
  /** 1–3 WHY labels explaining the recommendation. */
  reasons: IntelligenceReason[];
  confidence: "high" | "medium" | "emerging";
  cta: string;
};

export type IntelligenceChain = {
  id: string;
  /** e.g. "Product → Creator → Campaign → Revenue" */
  label: string;
  steps: Array<{ kind: IntelligenceEntityKind; label: string }>;
};

export type IntelligenceInsightPeriod = "daily" | "weekly" | "monthly";

export type GlobalInsight = {
  id: string;
  period: IntelligenceInsightPeriod;
  kind: "growth" | "risk" | "opportunity";
  title: string;
  detail: string;
  href: string;
  cta: string;
};

export type WorkspaceIntelligence = {
  mode: OsWorkspaceMode;
  headline: string;
  chain: IntelligenceChain;
  /** 4–6 max — kept intentionally short so nothing feels overwhelming. */
  recommendations: IntelligenceRecommendation[];
  /** Mixed daily/weekly/monthly, ~4–6 entries. */
  insights: GlobalInsight[];
};

const INTELLIGENCE_BY_MODE: Record<OsWorkspaceMode, WorkspaceIntelligence> = {
  seller: {
    mode: "seller",
    headline: "Turn signals into revenue — here's what to do next in your store.",
    chain: {
      id: "seller-chain",
      label: "Product → Creator → Campaign → Revenue",
      steps: [
        { kind: "product", label: "Product" },
        { kind: "creator", label: "Creator" },
        { kind: "campaign", label: "Campaign" },
        { kind: "order", label: "Revenue" },
      ],
    },
    recommendations: [
      {
        id: "seller-low-stock",
        title: "Restock before you lose sales",
        subtitle: "A few SKUs are trending toward zero within days — reorder now to protect momentum.",
        href: "/dashboard/products",
        entityKind: "product",
        reasons: ["Low stock urgency", "Fast mover"],
        confidence: "high",
        cta: "Review inventory",
      },
      {
        id: "seller-high-margin",
        title: "Push your highest-margin product",
        subtitle: "This listing converts well and carries the best margin in your catalog right now.",
        href: "/dashboard/products",
        entityKind: "product",
        reasons: ["High margin", "High conversion"],
        confidence: "high",
        cta: "Promote product",
      },
      {
        id: "seller-creator-match",
        title: "Creators who fit your catalog",
        subtitle: "Audience overlap suggests these creators could drive fast conversions for you.",
        href: "/ugc/campaign-center/recruitment",
        entityKind: "creator",
        reasons: ["Audience similarity", "Creator performance"],
        confidence: "medium",
        cta: "View creator matches",
      },
      {
        id: "seller-country-expand",
        title: "Expand into a trending country",
        subtitle: "Demand signals show rising interest outside your current markets.",
        href: "/dashboard/analytics",
        entityKind: "customer",
        reasons: ["Trending in your country", "Growth opportunity"],
        confidence: "medium",
        cta: "Open analytics",
      },
      {
        id: "seller-fast-mover",
        title: "Double down on your fastest mover",
        subtitle: "One product is selling faster than your recent average — keep it visible.",
        href: "/dashboard/products",
        entityKind: "product",
        reasons: ["Fast mover", "High conversion"],
        confidence: "high",
        cta: "See product",
      },
    ],
    insights: [
      { id: "seller-i1", period: "daily", kind: "risk", title: "Stock running out today", detail: "A couple of SKUs may sell through before you can restock.", href: "/dashboard/products", cta: "Check stock" },
      { id: "seller-i2", period: "daily", kind: "opportunity", title: "A campaign could clear slow stock", detail: "Recruiting creators for a slower SKU could move it faster.", href: "/ugc/campaign-center/recruitment", cta: "Find creators" },
      { id: "seller-i3", period: "weekly", kind: "growth", title: "Revenue trending up this week", detail: "Your weekly revenue is ahead of the prior period.", href: "/dashboard/analytics", cta: "View trend" },
      { id: "seller-i4", period: "weekly", kind: "risk", title: "Fulfillment slowing in one region", detail: "Shipping times are creeping up for a subset of orders.", href: "/dashboard/orders", cta: "Review orders" },
      { id: "seller-i5", period: "monthly", kind: "opportunity", title: "A new country is showing strong demand", detail: "Interest from a market you haven't targeted is climbing.", href: "/dashboard/analytics", cta: "Explore demand" },
      { id: "seller-i6", period: "monthly", kind: "growth", title: "Repeat purchase rate improving", detail: "More buyers are returning for a second order this month.", href: "/dashboard/analytics", cta: "See customer trends" },
    ],
  },
  creator: {
    mode: "creator",
    headline: "Your next best move — campaigns, communities, and revenue.",
    chain: {
      id: "creator-chain",
      label: "Content → Campaign → Brand → Earnings",
      steps: [
        { kind: "creator", label: "Content" },
        { kind: "campaign", label: "Campaign" },
        { kind: "brand", label: "Brand" },
        { kind: "order", label: "Earnings" },
      ],
    },
    recommendations: [
      {
        id: "creator-best-campaign",
        title: "Apply to your best-fit campaign",
        subtitle: "This campaign matches your niche and typically converts well for creators like you.",
        href: "/ugc",
        entityKind: "campaign",
        reasons: ["High conversion", "Creator performance"],
        confidence: "high",
        cta: "View campaigns",
      },
      {
        id: "creator-communities",
        title: "Communities where your audience already is",
        subtitle: "These communities overlap with your existing following.",
        href: "/communities",
        entityKind: "community",
        reasons: ["Community overlap", "Audience similarity"],
        confidence: "medium",
        cta: "Explore communities",
      },
      {
        id: "creator-brand-matches",
        title: "Brands matching your content style",
        subtitle: "AI paired these brands to your recent content and audience profile.",
        href: "/ugc/matches",
        entityKind: "brand",
        reasons: ["Audience similarity", "Growth opportunity"],
        confidence: "medium",
        cta: "See brand matches",
      },
      {
        id: "creator-earnings",
        title: "Your earnings are trending up",
        subtitle: "This week's payout pace is ahead of your recent average.",
        href: "/ugc/earnings",
        entityKind: "order",
        reasons: ["Fast mover", "High conversion"],
        confidence: "high",
        cta: "View earnings",
      },
      {
        id: "creator-growth",
        title: "Your growth is accelerating",
        subtitle: "Engagement is climbing — a good moment to publish more.",
        href: "/ugc/analytics",
        entityKind: "creator",
        reasons: ["Growth opportunity", "Fast mover"],
        confidence: "medium",
        cta: "Open analytics",
      },
      {
        id: "creator-collabs",
        title: "New collaboration opportunities",
        subtitle: "Brands are actively recruiting creators in your category.",
        href: "/ugc/campaign-center/recruitment",
        entityKind: "campaign",
        reasons: ["Campaign timing", "Creator performance"],
        confidence: "emerging",
        cta: "Browse collaborations",
      },
    ],
    insights: [
      { id: "creator-i1", period: "daily", kind: "opportunity", title: "Applications closing today", detail: "A couple of campaigns you match are closing soon.", href: "/ugc", cta: "Apply now" },
      { id: "creator-i2", period: "daily", kind: "growth", title: "Engagement rising on your latest post", detail: "Your most recent submission is outperforming your average.", href: "/ugc/analytics", cta: "View analytics" },
      { id: "creator-i3", period: "weekly", kind: "growth", title: "Earnings pace up this week", detail: "You're on track to beat last week's payout.", href: "/ugc/earnings", cta: "View earnings" },
      { id: "creator-i4", period: "weekly", kind: "risk", title: "A deliverable deadline is close", detail: "One submission is due soon — don't miss the window.", href: "/ugc/submissions", cta: "Review submissions" },
      { id: "creator-i5", period: "monthly", kind: "opportunity", title: "Brands actively recruiting your niche", detail: "Several brands opened campaigns matching your category this month.", href: "/ugc/matches", cta: "See matches" },
      { id: "creator-i6", period: "monthly", kind: "growth", title: "Portfolio views trending up", detail: "More brands are viewing your profile than last month.", href: "/identity", cta: "View profile" },
    ],
  },
  brand: {
    mode: "brand",
    headline: "Discovery, timing, and ROI — your campaign command center.",
    chain: {
      id: "brand-chain",
      label: "Creator → Campaign → Audience → Revenue",
      steps: [
        { kind: "creator", label: "Creator" },
        { kind: "campaign", label: "Campaign" },
        { kind: "community", label: "Audience" },
        { kind: "order", label: "Revenue" },
      ],
    },
    recommendations: [
      {
        id: "brand-creators",
        title: "High-fit creators ready to recruit",
        subtitle: "These creators' audiences closely match your target segment.",
        href: "/ugc/campaign-center/recruitment",
        entityKind: "creator",
        reasons: ["Audience similarity", "Creator performance"],
        confidence: "high",
        cta: "View creators",
      },
      {
        id: "brand-communities",
        title: "Communities aligned with your brand",
        subtitle: "These communities show strong overlap with your existing customers.",
        href: "/communities",
        entityKind: "community",
        reasons: ["Community overlap", "Growth opportunity"],
        confidence: "medium",
        cta: "Explore communities",
      },
      {
        id: "brand-products",
        title: "Products trending in your category",
        subtitle: "Demand is rising for products adjacent to your catalog.",
        href: "/marketplace",
        entityKind: "product",
        reasons: ["Trending in your country", "High conversion"],
        confidence: "medium",
        cta: "Browse marketplace",
      },
      {
        id: "brand-timing",
        title: "Best window to launch your next campaign",
        subtitle: "Creator availability and buyer demand both look favorable right now.",
        href: "/ugc/campaign-center/create",
        entityKind: "campaign",
        reasons: ["Campaign timing", "Fast mover"],
        confidence: "high",
        cta: "Create campaign",
      },
      {
        id: "brand-roi",
        title: "Your last campaign is outperforming",
        subtitle: "ROI on your most recent campaign is ahead of your typical benchmark.",
        href: "/ugc/campaign-center/analytics",
        entityKind: "campaign",
        reasons: ["High conversion", "Growth opportunity"],
        confidence: "medium",
        cta: "View performance",
      },
    ],
    insights: [
      { id: "brand-i1", period: "daily", kind: "opportunity", title: "New applications waiting", detail: "Creators applied to your active campaign today.", href: "/ugc/campaign-center/active", cta: "Review applications" },
      { id: "brand-i2", period: "daily", kind: "risk", title: "Escrow needs funding", detail: "Fund escrow before your next milestone to avoid delays.", href: "/ugc/campaign-center/escrow", cta: "Open escrow" },
      { id: "brand-i3", period: "weekly", kind: "growth", title: "Campaign ROI up this week", detail: "Performance is ahead of your recent weekly average.", href: "/ugc/campaign-center/analytics", cta: "View ROI" },
      { id: "brand-i4", period: "weekly", kind: "opportunity", title: "Recruitment pool growing", detail: "More qualified creators applied this week than usual.", href: "/ugc/campaign-center/recruitment", cta: "Browse pool" },
      { id: "brand-i5", period: "monthly", kind: "growth", title: "Creator retention improving", detail: "More creators are returning for repeat campaigns this month.", href: "/ugc/campaign-center/crm", cta: "Open CRM" },
      { id: "brand-i6", period: "monthly", kind: "risk", title: "One campaign is under budget target", detail: "Spend pacing is behind plan for a running campaign.", href: "/ugc/campaign-center/analytics", cta: "Review budget" },
    ],
  },
  community: {
    mode: "community",
    headline: "Retention, events, and growth — what your community needs next.",
    chain: {
      id: "community-chain",
      label: "Member → Space → Event → Retention",
      steps: [
        { kind: "community", label: "Member" },
        { kind: "space", label: "Space" },
        { kind: "campaign", label: "Event" },
        { kind: "customer", label: "Retention" },
      ],
    },
    recommendations: [
      {
        id: "community-retention-risk",
        title: "Members at risk of going quiet",
        subtitle: "A group of members hasn't engaged recently — a nudge now could keep them.",
        href: "/dashboard/communities",
        entityKind: "customer",
        reasons: ["Retention risk"],
        confidence: "high",
        cta: "Review members",
      },
      {
        id: "community-event",
        title: "Your next event has strong signal",
        subtitle: "Early interest suggests this is a good time to schedule and promote it.",
        href: "/communities/events",
        entityKind: "campaign",
        reasons: ["Growth opportunity", "Campaign timing"],
        confidence: "medium",
        cta: "Plan event",
      },
      {
        id: "community-creators",
        title: "Creators who'd resonate here",
        subtitle: "These creators' audiences overlap with your community's interests.",
        href: "/ugc/campaign-center/recruitment",
        entityKind: "creator",
        reasons: ["Audience similarity", "Community overlap"],
        confidence: "medium",
        cta: "Find creators",
      },
      {
        id: "community-spaces",
        title: "Spaces with rising engagement",
        subtitle: "Activity in one of your spaces is climbing faster than the rest.",
        href: "/communities",
        entityKind: "space",
        reasons: ["Fast mover", "Growth opportunity"],
        confidence: "medium",
        cta: "Open spaces",
      },
      {
        id: "community-products",
        title: "Products your members are asking about",
        subtitle: "Recent conversations point to demand for a specific category.",
        href: "/communities",
        entityKind: "product",
        reasons: ["Wishlist signal", "Community overlap"],
        confidence: "emerging",
        cta: "Explore community",
      },
    ],
    insights: [
      { id: "community-i1", period: "daily", kind: "risk", title: "Some members have gone quiet", detail: "A handful of members haven't engaged in nearly two weeks.", href: "/dashboard/communities", cta: "Review activity" },
      { id: "community-i2", period: "daily", kind: "opportunity", title: "Event RSVPs climbing fast", detail: "Interest in your upcoming event is building quickly.", href: "/communities/events", cta: "View event" },
      { id: "community-i3", period: "weekly", kind: "growth", title: "Member growth up this week", detail: "New joins are ahead of your recent weekly pace.", href: "/dashboard/communities", cta: "See growth" },
      { id: "community-i4", period: "weekly", kind: "risk", title: "Churn ticking up in one space", detail: "One space is seeing more departures than usual.", href: "/dashboard/communities", cta: "Investigate" },
      { id: "community-i5", period: "monthly", kind: "opportunity", title: "A creator collab could re-energize things", detail: "Pairing with the right creator tends to lift engagement fast.", href: "/ugc/campaign-center/recruitment", cta: "Find creators" },
      { id: "community-i6", period: "monthly", kind: "growth", title: "Course completion rates rising", detail: "More members are finishing courses than last month.", href: "/communities/courses", cta: "View courses" },
    ],
  },
  affiliate: {
    mode: "affiliate",
    headline: "Highest-converting links, matches, and payouts — prioritized.",
    chain: {
      id: "affiliate-chain",
      label: "Product → Link → Click → Commission",
      steps: [
        { kind: "product", label: "Product" },
        { kind: "affiliate", label: "Link" },
        { kind: "customer", label: "Click" },
        { kind: "order", label: "Commission" },
      ],
    },
    recommendations: [
      {
        id: "affiliate-epc",
        title: "Promote your highest-EPC product",
        subtitle: "This product earns more per click than anything else in your links.",
        href: "/affiliates/analytics",
        entityKind: "product",
        reasons: ["EPC leader", "High conversion"],
        confidence: "high",
        cta: "View EPC leaders",
      },
      {
        id: "affiliate-trending",
        title: "Trending campaigns to join now",
        subtitle: "These programs are converting above average this week.",
        href: "/affiliates",
        entityKind: "campaign",
        reasons: ["Trending in your country", "Fast mover"],
        confidence: "medium",
        cta: "Browse campaigns",
      },
      {
        id: "affiliate-creator-matches",
        title: "Creator matches for co-promotion",
        subtitle: "These creators have audiences that convert well on similar links.",
        href: "/ugc/referrals",
        entityKind: "creator",
        reasons: ["Creator performance", "Audience similarity"],
        confidence: "medium",
        cta: "See creator matches",
      },
      {
        id: "affiliate-traffic-idea",
        title: "New traffic idea: community promotion",
        subtitle: "Sharing links inside relevant communities tends to lift conversions.",
        href: "/affiliates/links",
        entityKind: "community",
        reasons: ["Community overlap", "Growth opportunity"],
        confidence: "emerging",
        cta: "Get promotion ideas",
      },
      {
        id: "affiliate-commission",
        title: "Expected commission is close to unlocking",
        subtitle: "Recent conversions are pending settlement — check your balance.",
        href: "/wallet",
        entityKind: "order",
        reasons: ["High conversion", "Fast mover"],
        confidence: "high",
        cta: "View wallet",
      },
    ],
    insights: [
      { id: "affiliate-i1", period: "daily", kind: "growth", title: "Clicks up sharply today", detail: "Traffic on your links is ahead of your daily average.", href: "/affiliates/analytics", cta: "View clicks" },
      { id: "affiliate-i2", period: "daily", kind: "opportunity", title: "A top link is over-converting", detail: "One link is converting well above average right now.", href: "/affiliates/dashboard", cta: "Open dashboard" },
      { id: "affiliate-i3", period: "weekly", kind: "growth", title: "Commissions trending up", detail: "This week's commission pace is ahead of last week.", href: "/affiliates/dashboard", cta: "View commissions" },
      { id: "affiliate-i4", period: "weekly", kind: "risk", title: "One link's conversion is slipping", detail: "A previously strong link is converting less than usual.", href: "/affiliates/analytics", cta: "Review link" },
      { id: "affiliate-i5", period: "monthly", kind: "opportunity", title: "A new high-EPC program launched", detail: "A newly opened program shows strong early EPC.", href: "/affiliates", cta: "Explore program" },
      { id: "affiliate-i6", period: "monthly", kind: "growth", title: "Payout total growing month over month", detail: "Your monthly payout is trending ahead of last month.", href: "/wallet", cta: "View wallet" },
    ],
  },
  buyer: {
    mode: "buyer",
    headline: "Personalized picks — products, communities, and deals worth your time.",
    chain: {
      id: "buyer-chain",
      label: "Wishlist → Product → Community → Purchase",
      steps: [
        { kind: "product", label: "Wishlist" },
        { kind: "product", label: "Product" },
        { kind: "community", label: "Community" },
        { kind: "order", label: "Purchase" },
      ],
    },
    recommendations: [
      {
        id: "buyer-wishlist",
        title: "Wishlist items are moving",
        subtitle: "A few saved items have dropped in price or are low on stock.",
        href: "/dashboard/wishlist",
        entityKind: "product",
        reasons: ["Wishlist signal", "Fast mover"],
        confidence: "high",
        cta: "Open wishlist",
      },
      {
        id: "buyer-picks",
        title: "Picks based on your browsing",
        subtitle: "These products match items you've viewed and purchased before.",
        href: "/marketplace",
        entityKind: "product",
        reasons: ["Previous purchases", "Audience similarity"],
        confidence: "medium",
        cta: "Browse picks",
      },
      {
        id: "buyer-communities",
        title: "Communities matching your interests",
        subtitle: "These communities overlap with what you shop and follow.",
        href: "/communities",
        entityKind: "community",
        reasons: ["Community overlap", "Growth opportunity"],
        confidence: "medium",
        cta: "Explore communities",
      },
      {
        id: "buyer-creators",
        title: "Creators worth following",
        subtitle: "These creators post about products similar to what you like.",
        href: "/identity/search",
        entityKind: "creator",
        reasons: ["Audience similarity", "Creator performance"],
        confidence: "emerging",
        cta: "Discover creators",
      },
      {
        id: "buyer-bundles",
        title: "Bundle deals from items you viewed",
        subtitle: "These collections combine products you've recently browsed.",
        href: "/marketplace/collections",
        entityKind: "product",
        reasons: ["Previous purchases", "High conversion"],
        confidence: "medium",
        cta: "See bundles",
      },
    ],
    insights: [
      { id: "buyer-i1", period: "daily", kind: "opportunity", title: "A wishlist item dropped in price", detail: "One of your saved items is now cheaper than when you saved it.", href: "/dashboard/wishlist", cta: "View wishlist" },
      { id: "buyer-i2", period: "daily", kind: "growth", title: "New products match your taste", detail: "A few new arrivals fit your recent browsing pattern.", href: "/marketplace", cta: "Browse now" },
      { id: "buyer-i3", period: "weekly", kind: "opportunity", title: "Flash deals ending this week", detail: "A handful of deals close out in the next few days.", href: "/marketplace/flash-deals", cta: "View deals" },
      { id: "buyer-i4", period: "weekly", kind: "risk", title: "An order needs your attention", detail: "One of your orders has an update worth checking.", href: "/dashboard/orders", cta: "View orders" },
      { id: "buyer-i5", period: "monthly", kind: "growth", title: "Your saved collection is growing", detail: "You've added more wishlist items than last month.", href: "/dashboard/wishlist", cta: "Open wishlist" },
      { id: "buyer-i6", period: "monthly", kind: "opportunity", title: "A community you'd love just opened", detail: "A new community matches your shopping interests closely.", href: "/communities", cta: "Explore" },
    ],
  },
  live: {
    mode: "live",
    headline: "Go live with confidence — products, timing, and audience, ready.",
    chain: {
      id: "live-chain",
      label: "Product → Live → Audience → Revenue",
      steps: [
        { kind: "product", label: "Product" },
        { kind: "live", label: "Live" },
        { kind: "community", label: "Audience" },
        { kind: "order", label: "Revenue" },
      ],
    },
    recommendations: [
      {
        id: "live-products",
        title: "Feature your fast movers on your next live",
        subtitle: "These products are selling quickly and tend to perform well on stream.",
        href: "/dashboard/products",
        entityKind: "product",
        reasons: ["Fast mover", "Live commerce fit"],
        confidence: "high",
        cta: "Select products",
      },
      {
        id: "live-timing",
        title: "Best time to go live this week",
        subtitle: "Your audience has historically been most active during this window.",
        href: "/communities/events",
        entityKind: "live",
        reasons: ["Trending in your country", "Campaign timing"],
        confidence: "medium",
        cta: "Schedule live",
      },
      {
        id: "live-guests",
        title: "Creators who'd make great live guests",
        subtitle: "These creators' audiences overlap with yours and fit live formats well.",
        href: "/communities",
        entityKind: "creator",
        reasons: ["Audience similarity", "Creator performance"],
        confidence: "medium",
        cta: "Find guests",
      },
      {
        id: "live-revenue",
        title: "Last session's revenue is ready to review",
        subtitle: "Your most recent live outperformed your recent average.",
        href: "/dashboard/analytics",
        entityKind: "order",
        reasons: ["High conversion", "Fast mover"],
        confidence: "high",
        cta: "View revenue",
      },
      {
        id: "live-go-live",
        title: "Go live — your audience is active now",
        subtitle: "Engagement signals suggest now is a strong moment to start streaming.",
        href: "/communities/live",
        entityKind: "live",
        reasons: ["Live commerce fit", "Trending in your country"],
        confidence: "emerging",
        cta: "Go live",
      },
    ],
    insights: [
      { id: "live-i1", period: "daily", kind: "opportunity", title: "Your audience is active tonight", detail: "Engagement is higher than usual this evening.", href: "/communities/live", cta: "Go live" },
      { id: "live-i2", period: "daily", kind: "growth", title: "Watch time up today", detail: "Average watch time is ahead of your recent sessions.", href: "/dashboard/analytics", cta: "View stats" },
      { id: "live-i3", period: "weekly", kind: "growth", title: "Live-attributed revenue up this week", detail: "Sales tied to live sessions are trending upward.", href: "/dashboard/analytics", cta: "View revenue" },
      { id: "live-i4", period: "weekly", kind: "risk", title: "Product bag hasn't been refreshed", detail: "Your featured products haven't changed in a while.", href: "/dashboard/products", cta: "Update products" },
      { id: "live-i5", period: "monthly", kind: "opportunity", title: "A recurring slot could boost retention", detail: "A consistent weekly time tends to build a returning audience.", href: "/communities/events", cta: "Schedule recurring" },
      { id: "live-i6", period: "monthly", kind: "growth", title: "Audience size growing month over month", detail: "Your live audience has grown compared to last month.", href: "/communities", cta: "View audience" },
    ],
  },
  ai: {
    mode: "ai",
    headline: "Meta-intelligence — the highest-leverage moves across your workspace.",
    chain: {
      id: "ai-chain",
      label: "Signal → Copilot → Action → Outcome",
      steps: [
        { kind: "campaign", label: "Signal" },
        { kind: "campaign", label: "Copilot" },
        { kind: "affiliate", label: "Action" },
        { kind: "order", label: "Outcome" },
      ],
    },
    recommendations: [
      {
        id: "ai-campaign-brief",
        title: "Generate a campaign brief with AI",
        subtitle: "Copilot can draft a brief from your recent performance data in seconds.",
        href: "/ugc/campaign-center/copilot",
        entityKind: "campaign",
        reasons: ["Campaign timing", "Growth opportunity"],
        confidence: "high",
        cta: "Open copilot",
      },
      {
        id: "ai-creator-coach",
        title: "Ask your creator coach for growth tips",
        subtitle: "Get tailored suggestions based on your recent content performance.",
        href: "/ugc/creator-copilot",
        entityKind: "creator",
        reasons: ["Creator performance", "Growth opportunity"],
        confidence: "medium",
        cta: "Open creator coach",
      },
      {
        id: "ai-automation",
        title: "Automate a repetitive workflow",
        subtitle: "An idle automation could be enabled to save time this week.",
        href: "/ugc/campaign-center/automations",
        entityKind: "campaign",
        reasons: ["Fast mover", "Growth opportunity"],
        confidence: "medium",
        cta: "View automations",
      },
      {
        id: "ai-cross-signals",
        title: "Cross-workspace growth signals found",
        subtitle: "AI spotted patterns worth reviewing across your recent activity.",
        href: "/dashboard/analytics",
        entityKind: "product",
        reasons: ["Growth opportunity", "Trending in your country"],
        confidence: "medium",
        cta: "Open analytics",
      },
      {
        id: "ai-financial-summary",
        title: "Get an AI financial summary",
        subtitle: "A quick automated summary of your balances, payouts, and trends.",
        href: "/wallet/ai",
        entityKind: "order",
        reasons: ["High margin", "Growth opportunity"],
        confidence: "emerging",
        cta: "Open financial AI",
      },
    ],
    insights: [
      { id: "ai-i1", period: "daily", kind: "opportunity", title: "Opportunities detected today", detail: "AI found several actionable opportunities across your workspace.", href: "/dashboard", cta: "Review opportunities" },
      { id: "ai-i2", period: "daily", kind: "growth", title: "Automation saved time today", detail: "An active automation handled tasks you'd otherwise do manually.", href: "/ugc/campaign-center/automations", cta: "View automations" },
      { id: "ai-i3", period: "weekly", kind: "opportunity", title: "AI recommends a new campaign angle", detail: "A fresh angle based on this week's performance is ready to try.", href: "/ugc/campaign-center/copilot", cta: "Open copilot" },
      { id: "ai-i4", period: "weekly", kind: "risk", title: "An automation is sitting idle", detail: "One automation hasn't run in a while — worth checking.", href: "/ugc/campaign-center/automations", cta: "Review automation" },
      { id: "ai-i5", period: "monthly", kind: "growth", title: "AI-assisted actions trending up", detail: "You're relying on AI suggestions more this month, with good results.", href: "/dashboard/analytics", cta: "View analytics" },
      { id: "ai-i6", period: "monthly", kind: "opportunity", title: "Financial AI found savings potential", detail: "A monthly review surfaced a few ways to optimize spend.", href: "/wallet/ai", cta: "Open financial AI" },
    ],
  },
  admin: {
    mode: "admin",
    headline: "Turn signals into revenue — here's what to do next in your store.",
    chain: {
      id: "admin-chain",
      label: "Product → Creator → Campaign → Revenue",
      steps: [
        { kind: "product", label: "Product" },
        { kind: "creator", label: "Creator" },
        { kind: "campaign", label: "Campaign" },
        { kind: "order", label: "Revenue" },
      ],
    },
    recommendations: [],
    insights: [],
  },
};

/**
 * Returns the Intelligence Core scaffold for a workspace mode. `admin` is a
 * deprecated legacy mode kept only for stored localStorage values — it
 * resolves to the `brand` content set, matching `normalizeWorkspaceMode`.
 */
export function getWorkspaceIntelligence(mode: OsWorkspaceMode): WorkspaceIntelligence {
  if (mode === "admin") return INTELLIGENCE_BY_MODE.brand;
  return INTELLIGENCE_BY_MODE[mode] ?? INTELLIGENCE_BY_MODE.seller;
}

/**
 * Soft relationship intelligence for product-context UI — best creators,
 * interested communities, affiliate opportunities, campaign ideas, similar
 * products, and frequently-bought-together. Used by the Intelligence Core's
 * expandable "Relationship pulse" strip for seller/buyer workspaces.
 */
export function getProductRelationshipIntelligence(): IntelligenceRecommendation[] {
  return [
    {
      id: "product-rel-creators",
      title: "Best creators for this product",
      subtitle: "These creators consistently convert similar products for their audience.",
      href: "/ugc/campaign-center/recruitment",
      entityKind: "creator",
      reasons: ["Creator performance", "Audience similarity"],
      confidence: "medium",
      cta: "View creators",
    },
    {
      id: "product-rel-communities",
      title: "Communities interested in this category",
      subtitle: "Members in these communities frequently discuss products like this one.",
      href: "/communities",
      entityKind: "community",
      reasons: ["Community overlap", "Wishlist signal"],
      confidence: "medium",
      cta: "Explore communities",
    },
    {
      id: "product-rel-affiliate",
      title: "Affiliate opportunity: high EPC potential",
      subtitle: "This product category tends to earn above-average commission per click.",
      href: "/affiliates",
      entityKind: "affiliate",
      reasons: ["EPC leader", "High conversion"],
      confidence: "medium",
      cta: "Open affiliate program",
    },
    {
      id: "product-rel-campaign",
      title: "Campaign idea: feature in a live drop",
      subtitle: "This product fits well as a highlight item in a live commerce session.",
      href: "/ugc/campaign-center/create",
      entityKind: "campaign",
      reasons: ["Campaign timing", "Live commerce fit"],
      confidence: "emerging",
      cta: "Create campaign",
    },
    {
      id: "product-rel-similar",
      title: "Similar products your buyers browse",
      subtitle: "Buyers who view this product often browse these as well.",
      href: "/marketplace",
      entityKind: "product",
      reasons: ["Audience similarity", "Previous purchases"],
      confidence: "medium",
      cta: "See similar products",
    },
    {
      id: "product-rel-fbt",
      title: "Frequently bought together",
      subtitle: "These items are commonly purchased alongside this product.",
      href: "/marketplace/collections",
      entityKind: "product",
      reasons: ["High conversion", "Fast mover"],
      confidence: "high",
      cta: "View bundle",
    },
  ];
}
