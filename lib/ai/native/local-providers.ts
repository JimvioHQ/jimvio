/**
 * Local AI Native providers — deterministic intelligence until LLMs connect.
 */

import type {
  AiAnalyticsInsight,
  AiAnalyticsProvider,
  AiContentDraft,
  AiContentKind,
  AiContentProvider,
  AiKnowledgeHit,
  AiKnowledgeProvider,
  AiModerationProvider,
  AiModerationSignal,
  AiNativeContext,
  AiPersonalizationItem,
  AiPersonalizationProvider,
} from "./types";

const CONTENT_TITLES: Record<AiContentKind, string> = {
  post: "Community post",
  article: "Long-form article",
  product_description: "Product description",
  campaign_brief: "Campaign brief",
  course_outline: "Course outline",
  community_rules: "Community rules",
  welcome_message: "Welcome message",
  email_campaign: "Email campaign",
  affiliate_promo: "Affiliate promotion",
  social_caption: "Social caption",
  announcement: "Announcement",
  reply: "Reply draft",
  marketing_copy: "Marketing copy",
};

function nameOf(ctx: AiNativeContext) {
  return ctx.communityName?.trim() || "your community";
}

export const localContentProvider: AiContentProvider = {
  id: "local",
  generate(kind, context) {
    const name = nameOf(context);
    const bodies: Record<AiContentKind, string> = {
      post: `Quick update from ${name}: what's one win you're celebrating this week? Drop it below — let's amplify each other.`,
      article: `# Building momentum in ${name}\n\n1. Start with a clear weekly ritual\n2. Spotlight member wins\n3. Pair community with a simple product offer\n\nAI draft — refine before publishing.`,
      product_description: `Designed for creators in ${name}. Clear value, fast onboarding, and outcomes you can measure. Perfect for members ready to level up.`,
      campaign_brief: `Objective: Grow trust and conversions for ${name}.\nDeliverables: 3 short videos + 1 carousel.\nCTA: Join / purchase within 7 days.\nTone: Premium, helpful, never hypey.`,
      course_outline: `Module 1 — Foundations\nModule 2 — Practice systems\nModule 3 — Monetization\nModule 4 — Growth loops\nCapstone — Launch inside ${name}`,
      community_rules: `1. Be respectful\n2. No spam or unsafe links\n3. Credit creators\n4. Keep feedback constructive\n5. Protect member privacy`,
      welcome_message: `Welcome to ${name} 👋\nStart in Feed, say hello, and pick one course or live to join this week. We're glad you're here.`,
      email_campaign: `Subject: Your next step inside ${name}\n\nHi {{first_name}},\nHere's what's live this week — plus one offer we think fits you.\n\n[CTA]`,
      affiliate_promo: `If you love ${name}, share this offer with your audience. Transparent disclosure + tracked links. Earn while you educate.`,
      social_caption: `Building in public with ${name}. Creators who ship together win together. Link in bio.`,
      announcement: `Heads up, ${name}: new resources just dropped. Check Feed for details and RSVP to the next live.`,
      reply: `Thanks for sharing — that's a sharp question. Here's a practical next step you can try today inside ${name}.`,
      marketing_copy: `${name} helps creators learn, sell, and grow in one place. Join members who ship weekly and monetize with clarity.`,
    };

    const draft: AiContentDraft = {
      id: `draft-${kind}-${Date.now().toString(36)}`,
      kind,
      title: CONTENT_TITLES[kind],
      body: bodies[kind],
      tone: "premium · clear · creator-first",
    };
    return draft;
  },
};

export const localAnalyticsProvider: AiAnalyticsProvider = {
  id: "local",
  explain(context) {
    const o = context.overview;
    const earned = o?.totalEarned ?? 0;
    const msgs = o?.messagesThisWeek ?? 0;
    const joined = o?.membersJoinedThisWeek ?? 0;
    const health = o?.healthScore?.score ?? 50;
    const insights: AiAnalyticsInsight[] = [
      {
        id: "rev",
        topic: "revenue",
        title: "Why revenue changed",
        explanation:
          earned > 0
            ? `Wallet signals show $${Math.round(earned).toLocaleString("en-US")} lifetime — period movement tracks offers, courses, and affiliate conversions.`
            : "Revenue is quiet — feature one product and one course to create the first conversion loop.",
        href: context.base ? `${context.base}/billing` : "/dashboard/analytics",
      },
      {
        id: "eng",
        topic: "engagement",
        title: "Why engagement changed",
        explanation:
          msgs > 40
            ? `${msgs} messages this week — chat heat is high; convert it with a live or challenge.`
            : "Conversation density is soft — a daily prompt or announcement usually lifts replies within 48h.",
        href: context.base ? `${context.base}/feed` : undefined,
      },
      {
        id: "growth",
        topic: "growth",
        title: "Growth opportunities",
        explanation:
          joined > 0
            ? `+${joined} joins this week. Onboard them with a welcome path + first course.`
            : "Invite quiet members and run a referral live to restart growth.",
        href: context.base ? `${context.base}/members` : "/communities",
      },
      {
        id: "risk",
        topic: "risk",
        title: "Risk detection",
        explanation:
          health < 55
            ? "Health is soft — watch churn, spam, and unanswered questions in Feed."
            : "Risk looks contained. Keep moderating unsafe links and duplicate promo spam.",
        href: context.base ? `${context.base}/members` : undefined,
      },
      {
        id: "forecast",
        topic: "forecast",
        title: "Forecast",
        explanation: `Near-term forecast leans ${health >= 62 ? "positive" : "cautious"} based on health ${health}/100 and message volume ${msgs}.`,
        href: "/dashboard/analytics",
      },
      {
        id: "rec",
        topic: "recommendation",
        title: "Recommendations",
        explanation:
          "Ship one announcement, one offer, and one live this week — the AI Native loop compounds fastest that way.",
        href: context.base ?? "/dashboard",
      },
    ];
    return insights;
  },
};

export const localModerationProvider: AiModerationProvider = {
  id: "local",
  scan(context) {
    const signals: AiModerationSignal[] = [
      {
        id: "spam",
        kind: "spam",
        severity: "medium",
        sample: "Repeated promo links across channels",
        recommendation: "Limit link posts for new members; warn once, then mute.",
      },
      {
        id: "abuse",
        kind: "abuse",
        severity: "high",
        sample: "Hostile replies targeting individuals",
        recommendation: "Remove message, apply timeout, document in mod log.",
      },
      {
        id: "scam",
        kind: "scam",
        severity: "high",
        sample: "DM requests for wallet seed phrases",
        recommendation: "Ban + announce safety reminder in Feed.",
      },
      {
        id: "dup",
        kind: "duplicate",
        severity: "low",
        sample: "Same announcement posted 3×",
        recommendation: "Collapse duplicates; keep the highest-engagement copy.",
      },
      {
        id: "tox",
        kind: "toxicity",
        severity: "medium",
        sample: "Sarcastic pile-ons in threads",
        recommendation: "Nudge tone; escalate if pattern continues.",
      },
      {
        id: "link",
        kind: "unsafe_link",
        severity: "high",
        sample: "Shortened unknown domains",
        recommendation: "Auto-flag shortened links; require staff approve.",
      },
    ];
    const health = context.overview?.healthScore?.score ?? 60;
    return health >= 75 ? signals.filter((s) => s.severity !== "high").slice(0, 3) : signals;
  },
};

export const localKnowledgeProvider: AiKnowledgeProvider = {
  id: "local",
  search(query, context) {
    const q = query.toLowerCase().trim();
    const base = context.base ?? "/communities";
    const catalog: AiKnowledgeHit[] = [
      {
        id: "k-community",
        source: "community",
        title: context.communityName ?? "Community overview",
        snippet: "Members, health, live sessions, and creator workspace.",
        href: base,
        score: 88,
      },
      {
        id: "k-market",
        source: "marketplace",
        title: "Marketplace",
        snippet: "Discover products and creator offers.",
        href: "/marketplace",
        score: 80,
      },
      {
        id: "k-shop",
        source: "product",
        title: "Community shop",
        snippet: "Featured products and memberships.",
        href: `${base}/shop`,
        score: 78,
      },
      {
        id: "k-courses",
        source: "course",
        title: "Courses",
        snippet: "Learning catalog for members.",
        href: `${base}/courses`,
        score: 76,
      },
      {
        id: "k-campaigns",
        source: "campaign",
        title: "UGC & campaigns",
        snippet: "Brand deals, clipping, and creator opportunities.",
        href: "/ugc",
        score: 82,
      },
      {
        id: "k-events",
        source: "event",
        title: "Events",
        snippet: "Upcoming community events and RSVPs.",
        href: `${base}/events`,
        score: 74,
      },
      {
        id: "k-creators",
        source: "creator",
        title: "Creators & members",
        snippet: "Top contributors and member directory.",
        href: `${base}/members`,
        score: 77,
      },
      {
        id: "k-help",
        source: "help",
        title: "Help center",
        snippet: "Platform questions, billing, and account help.",
        href: "/help",
        score: 70,
      },
      {
        id: "k-knowledge",
        source: "knowledge",
        title: "Knowledge base",
        snippet: "Guides, FAQs, and channel resources.",
        href: `${base}?section=spaces`,
        score: 72,
      },
    ];

    if (!q) return catalog.slice(0, 6);
    return catalog
      .map((hit) => ({
        ...hit,
        score:
          hit.title.toLowerCase().includes(q) ||
          hit.snippet.toLowerCase().includes(q) ||
          hit.source.includes(q)
            ? hit.score + 10
            : hit.score - 20,
      }))
      .filter((h) => h.score > 55)
      .sort((a, b) => b.score - a.score);
  },
};

export const localPersonalizationProvider: AiPersonalizationProvider = {
  id: "local",
  personalize(context) {
    const base = context.base ?? "/communities";
    const o = context.overview;
    const items: AiPersonalizationItem[] = [];

    for (const c of o?.topContributors?.slice(0, 2) ?? []) {
      items.push({
        id: `p-creator-${c.id}`,
        kind: "creator",
        title: c.name,
        reason: "High community reputation near you",
        href: `${base}/members`,
        score: Math.min(99, 55 + c.points / 40),
      });
    }

    items.push({
      id: "p-community",
      kind: "community",
      title: context.communityName ?? "Your community",
      reason: "Personalized home for your creator stack",
      href: base,
      score: 90,
    });

    items.push({
      id: "p-product",
      kind: "product",
      title: "Featured marketplace picks",
      reason: "Aligned with your commerce activity",
      href: "/marketplace",
      score: 78,
    });

    for (const e of o?.upcomingEvents?.slice(0, 2) ?? []) {
      items.push({
        id: `p-event-${e.id}`,
        kind: "event",
        title: e.title,
        reason: "Fits your engagement pattern",
        href: e.href ?? `${base}/events`,
        score: 74,
      });
    }

    for (const c of o?.courses?.slice(0, 2) ?? []) {
      items.push({
        id: `p-course-${c.id}`,
        kind: "course",
        title: c.title,
        reason: "Recommended learning path",
        href: c.href,
        score: 76,
      });
    }

    items.push({
      id: "p-campaign",
      kind: "campaign",
      title: "Matched creator campaigns",
      reason: "Based on your AI creator score signals",
      href: "/ugc",
      score: 81,
    });

    return items.sort((a, b) => b.score - a.score);
  },
};
