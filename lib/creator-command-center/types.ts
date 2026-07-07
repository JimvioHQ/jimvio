export type CommandCenterMetric = {
  id: string;
  label: string;
  value: string | number;
  delta?: string;
  trend?: "up" | "down" | "neutral";
};

export type CommandCenterOverview = {
  todayEarnings: CommandCenterMetric;
  monthlyEarnings: CommandCenterMetric;
  pendingEarnings: CommandCenterMetric;
  totalProducts: CommandCenterMetric;
  communities: CommandCenterMetric;
  courses: CommandCenterMetric;
  affiliateRevenue: CommandCenterMetric;
  ugcRevenue: CommandCenterMetric;
  orders: CommandCenterMetric;
  messages: CommandCenterMetric;
  notifications: CommandCenterMetric;
};

export type CommandCenterQuickAction = {
  id: string;
  label: string;
  description: string;
  href?: string;
  actionId?: string;
  icon: string;
  accent: string;
};

export type CommandCenterActivityKind =
  | "order"
  | "sale"
  | "affiliate"
  | "ugc"
  | "community"
  | "message";

export type CommandCenterActivity = {
  id: string;
  kind: CommandCenterActivityKind;
  title: string;
  subtitle: string;
  time: string;
  amount?: string | null;
  href?: string;
};

export type CommandCenterAnalyticsCard = {
  id: string;
  label: string;
  value: number;
  displayValue: string;
  delta?: string;
  trend?: "up" | "down" | "neutral";
  sparkline: number[];
  color: string;
};

export type CommandCenterCalendarEvent = {
  id: string;
  title: string;
  date: string;
  kind: "campaign" | "live" | "community" | "course";
  href?: string;
};

export type CommandCenterAIPrompt = {
  id: string;
  label: string;
  prompt: string;
  icon: string;
};

export type CreatorCommandCenterData = {
  overview: CommandCenterOverview;
  quickActions: CommandCenterQuickAction[];
  liveActivity: CommandCenterActivity[];
  analytics: CommandCenterAnalyticsCard[];
  calendarEvents: CommandCenterCalendarEvent[];
  aiPrompts: CommandCenterAIPrompt[];
};
