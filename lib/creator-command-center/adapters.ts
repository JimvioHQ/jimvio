import type { ActivityItem } from "@/types/dashboard";
import type { DashboardMessagePreview } from "@/components/dashboard/DashboardMessagesPanel";
import type { EarningsDataset } from "@/components/dashboard/EarningsOverview";
import {
  CREATOR_COMMAND_ACTIONS,
  CREATOR_COMMAND_AI_PROMPTS,
  DEFAULT_CALENDAR_EVENTS,
} from "./config";
import type {
  CommandCenterActivity,
  CommandCenterActivityKind,
  CreatorCommandCenterData,
} from "./types";

export type DashboardCommandCenterInput = {
  earnedToday: number;
  monthlyEarnings: number;
  pendingBalance: number;
  productsCount: number;
  communitiesCount: number;
  coursesCount?: number;
  ordersCount?: number;
  messagesCount: number;
  notificationsCount: number;
  affiliateRevenue: number;
  ugcRevenue: number;
  earnedTrend?: string;
  activityItems: ActivityItem[];
  messages: DashboardMessagePreview[];
  earningsDatasets?: EarningsDataset[];
  formatMoney: (amount: number, currency?: string) => string;
};

function metric(
  id: string,
  label: string,
  value: string | number,
  delta?: string,
  trend?: "up" | "down" | "neutral",
) {
  return { id, label, value, delta, trend };
}

function mapActivityKind(icon: string): CommandCenterActivityKind {
  if (icon === "sale" || icon === "payout") return "sale";
  if (icon === "check") return "ugc";
  if (icon === "member") return "community";
  return "order";
}

function mapActivityItems(items: ActivityItem[]): CommandCenterActivity[] {
  return items.slice(0, 8).map((item, index) => ({
    id: `activity-${index}`,
    kind: mapActivityKind(item.icon),
    title: item.title,
    subtitle: item.sub,
    time: item.time,
    amount: item.amount,
  }));
}

function mapMessages(messages: DashboardMessagePreview[]): CommandCenterActivity[] {
  return messages.slice(0, 4).map((m) => ({
    id: `msg-${m.id}`,
    kind: "message" as const,
    title: m.name,
    subtitle: m.preview,
    time: m.time,
    href: m.href ?? "/dashboard/messages",
  }));
}

export function mapDashboardToCommandCenter(
  input: DashboardCommandCenterInput,
): CreatorCommandCenterData {
  const fmt = input.formatMoney;
  const trend = input.earnedTrend?.includes("↑") ? "up" : input.earnedTrend?.includes("↓") ? "down" : "neutral";

  const affiliateSeries =
    input.earningsDatasets?.find((d) => d.label.toLowerCase().includes("affiliate"))?.data ?? [
      12, 18, 15, 22, 28, 24, 32,
    ];
  const ugcSeries =
    input.earningsDatasets?.find((d) => d.label.toLowerCase().includes("ugc"))?.data ?? [
      8, 10, 14, 12, 18, 20, 24,
    ];
  const revenueSeries = affiliateSeries.map((v, i) => v + (ugcSeries[i] ?? 0));

  return {
    overview: {
      todayEarnings: metric("today", "Today's Earnings", fmt(input.earnedToday, "USD"), input.earnedTrend, trend),
      monthlyEarnings: metric("monthly", "Monthly Earnings", fmt(input.monthlyEarnings, "USD"), "This month", "up"),
      pendingEarnings: metric("pending", "Pending Earnings", fmt(input.pendingBalance, "USD"), "Awaiting payout", "neutral"),
      totalProducts: metric("products", "Total Products", input.productsCount, "Active listings", "neutral"),
      communities: metric("communities", "Communities", input.communitiesCount, "Owned hubs", "neutral"),
      courses: metric("courses", "Courses", input.coursesCount ?? 0, "Published", "neutral"),
      affiliateRevenue: metric("affiliate", "Affiliate Revenue", fmt(input.affiliateRevenue, "USD"), "30-day", "up"),
      ugcRevenue: metric("ugc", "UGC Revenue", fmt(input.ugcRevenue, "USD"), "30-day", "up"),
      orders: metric("orders", "Orders", input.ordersCount ?? 0, "Recent", "neutral"),
      messages: metric("messages", "Messages", input.messagesCount, "Inbox", "neutral"),
      notifications: metric("notifications", "Notifications", input.notificationsCount, "Unread", "neutral"),
    },
    quickActions: CREATOR_COMMAND_ACTIONS,
    liveActivity: [...mapActivityItems(input.activityItems), ...mapMessages(input.messages)].slice(0, 10),
    analytics: [
      {
        id: "revenue",
        label: "Revenue",
        value: input.monthlyEarnings,
        displayValue: fmt(input.monthlyEarnings, "USD"),
        delta: input.earnedTrend,
        trend,
        sparkline: revenueSeries,
        color: "#fd5000",
      },
      {
        id: "visitors",
        label: "Visitors",
        value: 12840,
        displayValue: "12.8K",
        delta: "+8.2%",
        trend: "up",
        sparkline: [8, 9, 10, 11, 12, 13, 14],
        color: "#2563eb",
      },
      {
        id: "conversion",
        label: "Conversion",
        value: 3.8,
        displayValue: "3.8%",
        delta: "+0.4%",
        trend: "up",
        sparkline: [2.8, 3.0, 3.1, 3.2, 3.5, 3.6, 3.8],
        color: "#16a34a",
      },
      {
        id: "ctr",
        label: "CTR",
        value: 5.2,
        displayValue: "5.2%",
        delta: "+0.6%",
        trend: "up",
        sparkline: [4.1, 4.3, 4.5, 4.8, 5.0, 5.1, 5.2],
        color: "#7c3aed",
      },
      {
        id: "orders",
        label: "Orders",
        value: input.ordersCount ?? 0,
        displayValue: String(input.ordersCount ?? 0),
        delta: "Recent",
        trend: "neutral",
        sparkline: [3, 4, 3, 5, 6, 5, 7],
        color: "#0891b2",
      },
      {
        id: "followers",
        label: "Followers",
        value: 2400,
        displayValue: "2.4K",
        delta: "+120",
        trend: "up",
        sparkline: [1.8, 1.9, 2.0, 2.1, 2.2, 2.3, 2.4],
        color: "#ea580c",
      },
      {
        id: "members",
        label: "Members",
        value: input.communitiesCount * 120,
        displayValue: String(input.communitiesCount * 120),
        delta: "Communities",
        trend: "up",
        sparkline: [40, 52, 60, 72, 80, 96, 110],
        color: "#0d9488",
      },
      {
        id: "growth",
        label: "Sales Growth",
        value: 18,
        displayValue: "18%",
        delta: input.earnedTrend ?? "vs prior",
        trend,
        sparkline: revenueSeries,
        color: "#fd5000",
      },
    ],
    calendarEvents: DEFAULT_CALENDAR_EVENTS,
    aiPrompts: CREATOR_COMMAND_AI_PROMPTS,
  };
}

export function createScaffoldCommandCenter(
  formatMoney: (amount: number, currency?: string) => string,
): CreatorCommandCenterData {
  return mapDashboardToCommandCenter({
    earnedToday: 0,
    monthlyEarnings: 0,
    pendingBalance: 0,
    productsCount: 0,
    communitiesCount: 0,
    coursesCount: 0,
    ordersCount: 0,
    messagesCount: 0,
    notificationsCount: 0,
    affiliateRevenue: 0,
    ugcRevenue: 0,
    activityItems: [],
    messages: [],
    formatMoney,
  });
}
