import type { ActivityItem } from "@/types/dashboard";
import type { DashboardMessagePreview } from "@/components/dashboard/DashboardMessagesPanel";
import type { DashboardCommandCenterInput } from "@/lib/creator-command-center/adapters";
import {
  DEFAULT_WORKSPACE_LAYOUT,
  WORKSPACE_AI_CARDS,
  WORKSPACE_MODULES,
  WORKSPACE_QUICK_ACTIONS,
} from "./config";
import type {
  JimvioWorkspaceData,
  WorkspaceNotification,
  WorkspaceNotificationType,
  WorkspaceWidgetLayout,
} from "./types";

export type DashboardWorkspaceInput = DashboardCommandCenterInput & {
  displayName: string;
  campaignsCount?: number;
  activeLinks?: number;
  productsCount?: number;
  communitiesCount?: number;
};

function pseudoScore(seed: string, min = 62, max = 96): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i) * (i + 1)) % 997;
  return min + (hash % (max - min + 1));
}

function mapActivityToNotification(item: ActivityItem, index: number): WorkspaceNotification {
  let type: WorkspaceNotificationType = "system";
  if (item.icon === "sale" || item.icon === "check") type = "orders";
  else if (item.icon === "member") type = "community";
  else if (item.title.toLowerCase().includes("affiliate")) type = "affiliate";
  else if (item.title.toLowerCase().includes("ugc") || item.title.toLowerCase().includes("campaign")) type = "ugc";
  else if (item.title.toLowerCase().includes("payout") || item.title.toLowerCase().includes("withdraw")) type = "payout";

  return {
    id: `notif-${index}`,
    type,
    title: item.title,
    body: item.sub,
    time: item.time,
    unread: true,
  };
}

function mapMessageToNotification(m: DashboardMessagePreview): WorkspaceNotification {
  return {
    id: `msg-${m.id}`,
    type: "messages",
    title: m.name,
    body: m.preview,
    time: m.time,
    href: m.href ?? "/dashboard/messages",
    unread: true,
  };
}

function creatorScoreLevel(score: number): JimvioWorkspaceData["creatorScoreLevel"] {
  if (score >= 85) return "elite";
  if (score >= 65) return "established";
  return "rising";
}

export function mapDashboardToWorkspace(input: DashboardWorkspaceInput): JimvioWorkspaceData {
  const fmt = input.formatMoney;
  const trend = input.earnedTrend?.includes("↑") ? "up" : input.earnedTrend?.includes("↓") ? "down" : "neutral";
  const score = pseudoScore(input.displayName, 58, 94);

  return {
    displayName: input.displayName,
    greeting: new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening",
    creatorScore: score,
    creatorScoreLevel: creatorScoreLevel(score),
    metrics: {
      earnings: {
        id: "earnings",
        label: "Earnings",
        value: fmt(input.earnedToday, "USD"),
        delta: input.earnedTrend,
        trend,
      },
      sales: {
        id: "sales",
        label: "Sales",
        value: String(input.ordersCount ?? 0),
        delta: "Today",
        trend: "neutral",
      },
      orders: {
        id: "orders",
        label: "Orders",
        value: String(input.ordersCount ?? 0),
        delta: "Active",
        trend: "neutral",
      },
      communities: {
        id: "communities",
        label: "Communities",
        value: String(input.communitiesCount),
        trend: "neutral",
      },
      affiliateRevenue: {
        id: "affiliate-revenue",
        label: "Affiliate Revenue",
        value: fmt(input.affiliateRevenue, "USD"),
        trend: "up",
      },
      ugcCampaigns: {
        id: "ugc-campaigns",
        label: "UGC Campaigns",
        value: String(input.campaignsCount ?? 0),
        trend: "neutral",
      },
    },
    notifications: input.activityItems.map(mapActivityToNotification),
    messages: input.messages.map(mapMessageToNotification),
    tasks: [
      { id: "task-1", title: "Review pending orders", dueLabel: "Today", href: "/dashboard/orders" },
      { id: "task-2", title: "Reply to buyer messages", dueLabel: "Soon", href: "/dashboard/messages" },
      { id: "task-3", title: "Check affiliate performance", dueLabel: "This week", href: "/dashboard/affiliate" },
    ],
    events: [
      { id: "event-1", title: "Creator live session", timeLabel: "Tomorrow 3:00 PM", href: "/dashboard/influencer/videos" },
      { id: "event-2", title: "Community office hours", timeLabel: "Friday", href: "/dashboard/communities" },
    ],
    quickActions: WORKSPACE_QUICK_ACTIONS,
    modules: WORKSPACE_MODULES,
    aiCards: WORKSPACE_AI_CARDS.map((card, i) => ({
      ...card,
      confidence: pseudoScore(card.id, 72, 96),
      href: i === 0 ? "/dashboard" : undefined,
    })),
  };
}

export function getDefaultWorkspaceLayout(): WorkspaceWidgetLayout[] {
  return DEFAULT_WORKSPACE_LAYOUT.map((item) => ({ ...item }));
}
