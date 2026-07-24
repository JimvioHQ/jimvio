/**
 * AI Action Center — suggestions derived from overview + store signals.
 */

import type { CommandCenterOverviewInput } from "./derive-metrics";
import type { CommunityStoreItem } from "@/lib/community/commerce/types";

export type AiActionSuggestion = {
  id: string;
  kind:
    | "daily"
    | "weekly"
    | "trending"
    | "members"
    | "announcement"
    | "event"
    | "product"
    | "course"
    | "health";
  title: string;
  body: string;
  href?: string;
};

export type CreatorQuickAction = {
  id: string;
  label: string;
  href: string;
  shortcut?: string;
};

export type AiCtaAction = {
  id: string;
  label: string;
  href: string;
};

export function deriveAiSuggestions(args: {
  base: string;
  overview: CommandCenterOverviewInput | null | undefined;
  storeItems?: CommunityStoreItem[];
  openTaskCount?: number;
}): AiActionSuggestion[] {
  const { base, overview, storeItems = [], openTaskCount = 0 } = args;
  if (!overview) return [];

  const out: AiActionSuggestion[] = [];
  const msgs = overview.messagesThisWeek ?? 0;
  const joined = overview.membersJoinedThisWeek ?? 0;
  const health = overview.healthScore;

  out.push({
    id: "daily",
    kind: "daily",
    title: "Daily summary",
    body:
      msgs > 0
        ? `${msgs.toLocaleString("en-US")} messages this week · ${joined} new members · health ${health?.score ?? "—"}.`
        : "Quiet day so far — a short announcement or live can spark activity.",
    href: `${base}/feed`,
  });

  if (overview.aiWeeklySummary?.headline) {
    out.push({
      id: "weekly",
      kind: "weekly",
      title: "Weekly recap",
      body: overview.aiWeeklySummary.headline,
      href: base,
    });
  } else {
    out.push({
      id: "weekly",
      kind: "weekly",
      title: "Weekly recap",
      body: "AI is warming your weekly digest from posts, live, and growth.",
      href: base,
    });
  }

  const topPost = (overview as { featuredPosts?: Array<{ title?: string | null; body?: string; href?: string }> })
    .featuredPosts?.[0];
  if (topPost) {
    out.push({
      id: "trending",
      kind: "trending",
      title: "Trending discussion",
      body: topPost.title || (topPost.body ?? "").slice(0, 120) || "Hot thread in the feed",
      href: topPost.href || `${base}/feed`,
    });
  }

  if (openTaskCount > 0 || joined === 0) {
    out.push({
      id: "members-attention",
      kind: "members",
      title: "Members needing attention",
      body:
        openTaskCount > 0
          ? `${openTaskCount} open collaboration task${openTaskCount === 1 ? "" : "s"} — follow up with assignees.`
          : "No new joins this week — invite quiet members back with a live or challenge.",
      href: `${base}/members`,
    });
  }

  out.push({
    id: "announce",
    kind: "announcement",
    title: "Suggested announcement",
    body:
      (overview.liveNow ?? 0) > 0
        ? "Announce the live session in Feed so members jump in while energy is high."
        : "Share a weekly wins post — highlight top contributors and upcoming events.",
    href: `${base}/feed`,
  });

  const events = overview.upcomingEvents?.length ?? 0;
  out.push({
    id: "event",
    kind: "event",
    title: "Suggested event",
    body:
      events > 0
        ? `Promote your next event — ${events} already on the calendar.`
        : "Schedule an AMA or workshop this week to lift engagement.",
    href: `${base}/events`,
  });

  const product = storeItems.find(
    (i) => i.kind === "product" || i.kind === "marketplace_item" || i.kind === "affiliate"
  );
  out.push({
    id: "product",
    kind: "product",
    title: "Suggested product to promote",
    body: product
      ? `Feature “${product.title}” in chat and on the storefront.`
      : "Attach a marketplace offer in chat to start in-community sales.",
    href: product?.href || `${base}/shop`,
  });

  const courseTitle =
    (overview as { featuredCourse?: { title?: string; href?: string } | null })
      .featuredCourse?.title ||
    (overview as { courses?: Array<{ title?: string }> }).courses?.[0]?.title;
  out.push({
    id: "course",
    kind: "course",
    title: "Suggested course",
    body: courseTitle
      ? `Push “${courseTitle}” to new members as an onboarding path.`
      : "Publish or feature a course to deepen member retention.",
    href: `${base}/courses`,
  });

  if (health) {
    out.push({
      id: "health",
      kind: "health",
      title: "Community health explanation",
      body:
        health.summary ||
        `${health.label ?? "Health"} (${health.score}/100) — balance live activity, posts, and member growth.`,
      href: base,
    });
  }

  return out;
}

export function deriveAiCtas(base: string): AiCtaAction[] {
  return [
    { id: "announce", label: "Create announcement", href: `${base}/feed` },
    { id: "event", label: "Schedule event", href: `${base}/events` },
    { id: "live", label: "Start live", href: `${base}/live` },
    { id: "message", label: "Message members", href: `${base}/members` },
    { id: "campaign", label: "Create campaign", href: "/dashboard/vendor/campaigns/new" },
  ];
}

export function deriveProductivityActions(base: string): CreatorQuickAction[] {
  return [
    { id: "product", label: "Create Product", href: "/dashboard/products/new", shortcut: "⇧⌘P" },
    { id: "course", label: "Create Course", href: `${base}/courses`, shortcut: "⇧⌘C" },
    { id: "community", label: "Create Community", href: "/dashboard/communities", shortcut: "⇧⌘N" },
    { id: "live", label: "Start Live", href: `${base}/live`, shortcut: "⇧⌘L" },
    { id: "event", label: "Create Event", href: `${base}/events`, shortcut: "⇧⌘E" },
    { id: "invite", label: "Invite Members", href: `${base}/members`, shortcut: "⇧⌘I" },
    { id: "campaign", label: "Launch Campaign", href: "/dashboard/vendor/campaigns/new", shortcut: "⇧⌘M" },
    { id: "ai-post", label: "Generate AI Post", href: `${base}/feed`, shortcut: "⇧⌘A" },
  ];
}
