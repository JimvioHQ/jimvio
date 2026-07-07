export type WorkspaceWidgetId =
  | "earnings"
  | "sales"
  | "orders"
  | "communities"
  | "affiliate-revenue"
  | "ugc-campaigns"
  | "creator-score"
  | "notifications"
  | "messages"
  | "tasks"
  | "upcoming-events"
  | "ai-suggestions"
  | "quick-actions"
  | "module-nav";

export type WorkspaceModuleId =
  | "marketplace"
  | "products"
  | "orders"
  | "affiliate"
  | "ugc"
  | "communities"
  | "courses"
  | "analytics"
  | "payments"
  | "messages"
  | "creator-hub"
  | "seller-hub"
  | "ai-hub";

export type WorkspaceNotificationType =
  | "orders"
  | "messages"
  | "affiliate"
  | "ugc"
  | "community"
  | "course"
  | "payout"
  | "system";

export type WorkspaceWidgetSize = 3 | 4 | 6 | 12;

export type WorkspaceWidgetLayout = {
  instanceId: string;
  widgetId: WorkspaceWidgetId;
  col: number;
  row: number;
  colSpan: WorkspaceWidgetSize;
  rowSpan: 1 | 2;
  pinned: boolean;
  hidden: boolean;
};

export type WorkspaceMetric = {
  id: string;
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "neutral";
};

export type WorkspaceNotification = {
  id: string;
  type: WorkspaceNotificationType;
  title: string;
  body: string;
  time: string;
  href?: string;
  unread?: boolean;
};

export type WorkspaceTask = {
  id: string;
  title: string;
  dueLabel?: string;
  href?: string;
  done?: boolean;
};

export type WorkspaceEvent = {
  id: string;
  title: string;
  timeLabel: string;
  href?: string;
};

export type WorkspaceQuickAction = {
  id: string;
  label: string;
  description?: string;
  href?: string;
  actionId?: "open-ai" | "open-command-center";
  icon: string;
  accent: string;
};

export type WorkspaceModule = {
  id: WorkspaceModuleId;
  label: string;
  description: string;
  href: string;
  badge?: string;
};

export type WorkspaceAiCard = {
  id: string;
  title: string;
  description: string;
  href?: string;
  confidence?: number;
};

export type JimvioWorkspaceData = {
  displayName: string;
  greeting: string;
  metrics: Record<string, WorkspaceMetric>;
  notifications: WorkspaceNotification[];
  messages: WorkspaceNotification[];
  tasks: WorkspaceTask[];
  events: WorkspaceEvent[];
  quickActions: WorkspaceQuickAction[];
  modules: WorkspaceModule[];
  aiCards: WorkspaceAiCard[];
  creatorScore: number;
  creatorScoreLevel: "rising" | "established" | "elite";
};
