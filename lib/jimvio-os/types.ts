export type OsNavId =
  | "home"
  | "marketplace"
  | "products"
  | "orders"
  | "customers"
  | "affiliate"
  | "ugc"
  | "communities"
  | "courses"
  | "campaigns"
  | "live"
  | "messages"
  | "inbox"
  | "payments"
  | "wallet"
  | "analytics"
  | "workspace"
  | "ai"
  | "settings";

export type OsWorkspaceMode =
  | "buyer"
  | "seller"
  | "creator"
  | "affiliate"
  | "community"
  | "brand"
  | "live"
  | "ai"
  /** @deprecated Use `brand` — kept for stored localStorage values */
  | "admin";

export type OsNotificationCategory =
  | "orders"
  | "payments"
  | "messages"
  | "affiliate"
  | "ugc"
  | "communities"
  | "security"
  | "system";

export type OsSearchCategory =
  | "products"
  | "orders"
  | "creators"
  | "communities"
  | "campaigns"
  | "messages"
  | "courses"
  | "analytics"
  | "ai";

export type OsQuickCreateId =
  | "product"
  | "community"
  | "campaign"
  | "course"
  | "live-event"
  | "coupon"
  | "affiliate-link"
  | "ugc-request"
  | "message"
  | "withdraw"
  | "deposit"
  | "space"
  | "event"
  | "creator-invite"
  | "brand-invite"
  | "automation"
  | "workflow"
  | "folder";

export type OsQuickCreateGroup = "commerce" | "creator" | "community" | "money" | "ai";

export type OsActivityKind =
  | "order"
  | "sale"
  | "affiliate"
  | "ugc"
  | "community"
  | "campaign"
  | "follower"
  | "review";

export type OsAiContext =
  | "marketplace"
  | "orders"
  | "analytics"
  | "communities"
  | "affiliate"
  | "default";

export type OsNavItem = {
  id: OsNavId;
  label: string;
  href: string;
  icon: string;
  shortcut?: string;
};

export type OsNotification = {
  id: string;
  category: OsNotificationCategory;
  title: string;
  body: string;
  time: string;
  href?: string;
  read: boolean;
  archived: boolean;
};

export type OsActivityItem = {
  id: string;
  kind: OsActivityKind;
  title: string;
  subtitle: string;
  time: string;
  href?: string;
  live?: boolean;
};

export type OsQuickCreateItem = {
  id: OsQuickCreateId;
  label: string;
  description: string;
  href?: string;
  actionId?: "open-ai";
  icon: string;
  accent: string;
  /** Visual grouping section within Quick Create — Commerce / Creator / Community / Money / AI. */
  group?: OsQuickCreateGroup;
};

export type OsAiEntry = {
  context: OsAiContext;
  label: string;
  placeholder: string;
};

export type OsRecentPage = {
  id: string;
  label: string;
  href: string;
  visitedAt: number;
};

export type JimvioOsData = {
  notifications: OsNotification[];
  activities: OsActivityItem[];
  unreadCount: number;
};
