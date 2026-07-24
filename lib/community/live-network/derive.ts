/**
 * Live Commerce Network — derivation helpers (no new fetches).
 */

import type { AffiliateStats, CommunityStoreItem } from "@/lib/community/commerce/types";
import type {
  LiveAiAssistItem,
  LiveAnalyticsSnapshot,
  LiveClipDraft,
  LiveCommunitySignal,
  LiveCourseSession,
  LiveHostSeat,
  LiveNetworkContext,
  LivePinnedOffer,
} from "./types";
import { getLiveMediaProvider } from "./providers";

export function deriveHostSeats(ctx: LiveNetworkContext): LiveHostSeat[] {
  const max = getLiveMediaProvider().maxHosts();
  const live = ctx.overview?.liveNow ?? 0;
  const baseNames = [
    "You (Host)",
    "Co-host",
    "Guest speaker",
    "Moderator",
    "Creator ally",
    "Special guest",
  ];
  const count = Math.min(max, Math.max(1, live + 2));
  return Array.from({ length: count }, (_, i) => ({
    id: `seat-${i}`,
    name: baseNames[i] ?? `Speaker ${i + 1}`,
    role:
      i === 0
        ? "host"
        : i === 1
          ? "cohost"
          : i === 3
            ? "moderator"
            : "speaker",
    micOn: i < 4,
    camOn: i < 3,
    sharing: i === 2,
    onStage: i < Math.min(6, count),
  }));
}

export function derivePinnedOffers(args: {
  base: string;
  storeItems: CommunityStoreItem[];
  affiliateStats: AffiliateStats[];
}): LivePinnedOffer[] {
  const { base, storeItems, affiliateStats } = args;
  const offers: LivePinnedOffer[] = storeItems.slice(0, 6).map((item, idx) => ({
    id: item.id,
    title: item.title,
    priceLabel:
      item.price != null
        ? `$${item.price}`
        : item.discountLabel || item.kind,
    kind:
      item.kind === "affiliate"
        ? "affiliate"
        : item.kind === "coupon"
          ? "coupon"
          : idx === 0
            ? "flash"
            : "product",
    inventory: item.inventory ?? (idx === 0 ? 12 : null),
    href: item.href || `${base}/shop`,
    pinned: idx < 2,
  }));

  for (const a of affiliateStats.slice(0, 2)) {
    offers.push({
      id: `aff-${a.code}`,
      title: `Affiliate ${a.code}`,
      priceLabel: `${a.conversions} conv`,
      kind: "affiliate",
      inventory: null,
      href: `${base}/shop`,
      pinned: false,
    });
  }

  if (offers.length === 0) {
    offers.push(
      {
        id: "demo-flash",
        title: "Flash offer — Live exclusive",
        priceLabel: "$29",
        kind: "flash",
        inventory: 25,
        href: `${base}/shop`,
        pinned: true,
      },
      {
        id: "demo-bundle",
        title: "Creator starter bundle",
        priceLabel: "$79",
        kind: "bundle",
        inventory: 40,
        href: `${base}/shop`,
        pinned: false,
      }
    );
  }

  return offers;
}

export function deriveLiveCommunity(ctx: LiveNetworkContext): LiveCommunitySignal {
  const msgs = ctx.overview?.messagesThisWeek ?? 0;
  return {
    chatRate: Math.max(4, Math.round(msgs / 20) || 8),
    pollActive: true,
    qaOpen: Math.max(2, Math.min(18, Math.round((msgs || 12) / 15))),
    reactionsPerMin: 14,
    pinnedMessage: "Drop your questions with #ask — hosts will pull top ones on stage.",
    announcement: ctx.overview?.activeLiveSession?.title
      ? `Live now: ${ctx.overview.activeLiveSession.title}`
      : "Welcome to the live — shop, learn, and ask in real time.",
  };
}

export function deriveLiveCourse(ctx: LiveNetworkContext): LiveCourseSession {
  const course =
    ctx.overview?.featuredCourse?.title ||
    ctx.overview?.courses?.[0]?.title ||
    "Live masterclass";
  return {
    title: course,
    slidesShared: true,
    whiteboardOpen: true,
    quizActive: false,
    attendance: Math.max(
      8,
      Math.round((ctx.overview?.memberCount ?? 40) * 0.08)
    ),
    certificateEligible: true,
    recordingUrl: null,
  };
}

export function deriveLiveAnalytics(ctx: LiveNetworkContext): LiveAnalyticsSnapshot {
  const members = ctx.overview?.memberCount ?? 0;
  const live = ctx.overview?.liveNow ?? 1;
  const earned = ctx.overview?.totalEarned ?? 0;
  const concurrent = Math.max(12, live * 18 + Math.round(members * 0.04));
  return {
    concurrent,
    peak: Math.round(concurrent * 1.35),
    watchMinutes: Math.round(concurrent * 7.4),
    revenue: Math.round(earned * 0.04) || Math.round(concurrent * 2.2),
    orders: Math.max(1, Math.round(concurrent * 0.08)),
    conversions: Math.max(1, Math.round(concurrent * 0.05)),
    chatMessages: Math.max(20, Math.round((ctx.overview?.messagesThisWeek ?? 40) / 3)),
    followerDelta: Math.max(2, ctx.overview?.membersJoinedThisWeek ?? 3),
    communityJoins: ctx.overview?.membersJoinedThisWeek ?? 0,
  };
}

export function deriveLiveAiAssist(ctx: LiveNetworkContext): LiveAiAssistItem[] {
  const name = ctx.communityName ?? "the community";
  return [
    {
      id: "tp1",
      kind: "talking_point",
      title: "Talking points",
      body: `Open with a member win, pin the flash offer, then invite questions for ${name}.`,
    },
    {
      id: "sum",
      kind: "chat_summary",
      title: "Chat summary",
      body: "Viewers are asking about pricing, shipping, and whether the bundle includes the course.",
    },
    {
      id: "q1",
      kind: "question",
      title: "Highlight question",
      body: "“Does the flash price include community access?” — answer on stage.",
    },
    {
      id: "spam",
      kind: "spam",
      title: "Spam detected",
      body: "Two repeated promo links — recommend mute + warn.",
    },
    {
      id: "prod",
      kind: "product",
      title: "Suggest product",
      body: "Pin the starter bundle during the next demo segment.",
    },
    {
      id: "poll",
      kind: "poll",
      title: "Suggest poll",
      body: "Ask: “Which module should we deep-dive next?”",
    },
    {
      id: "cap",
      kind: "caption",
      title: "Live captions",
      body: "Auto-captions ready — tone: clear, premium, creator-first.",
    },
    {
      id: "recap",
      kind: "recap",
      title: "Post-live recap",
      body: "Draft: highlights, top Q&A, pinned offer, and next live time.",
    },
  ];
}

export function deriveLiveClips(ctx: LiveNetworkContext): LiveClipDraft[] {
  const title = ctx.overview?.activeLiveSession?.title ?? "Live session";
  return [
    {
      id: "clip-1",
      title: `${title} — key insight`,
      caption: "The moment everything clicked for creators.",
      kind: "highlight",
      durationSec: 42,
      status: "detected",
    },
    {
      id: "clip-2",
      title: "Flash sale reaction",
      caption: "When the limited offer went live.",
      kind: "short",
      durationSec: 28,
      status: "draft",
    },
    {
      id: "clip-3",
      title: "Q&A gold",
      caption: "Best audience question of the night.",
      kind: "clip",
      durationSec: 55,
      status: "ready",
    },
  ];
}
