export type SuperAppModuleId =
  | "marketplace"
  | "communities"
  | "affiliate"
  | "ugc"
  | "courses"
  | "creator-hub"
  | "seller-hub"
  | "orders"
  | "wallet"
  | "analytics"
  | "ai"
  | "messages"
  | "live"
  | "settings";

export type SuperAppWorkspaceMode =
  | "buyer"
  | "seller"
  | "creator"
  | "affiliate"
  | "community-owner"
  | "admin";

export type SuperAppContext =
  | "marketplace"
  | "community"
  | "affiliate"
  | "ugc"
  | "courses"
  | "creator-hub"
  | "seller-hub"
  | "orders"
  | "wallet"
  | "analytics"
  | "messages"
  | "live"
  | "settings"
  | "dashboard"
  | "default";

export type SuperAppPanel = "none" | "modules" | "wallet" | "messages" | "workspace" | "notifications";

export type SuperAppModule = {
  id: SuperAppModuleId;
  label: string;
  description: string;
  href: string;
  icon: string;
  accent: string;
  connectedTo: SuperAppModuleId[];
};

export type SuperAppAiEntry = {
  context: SuperAppContext;
  label: string;
  placeholder: string;
};

export type SuperAppWalletData = {
  availableBalance: string;
  pendingBalance: string;
  affiliateEarnings: string;
  creatorEarnings: string;
  refunds: string;
  currency: string;
};

export type SuperAppTransaction = {
  id: string;
  label: string;
  amount: string;
  time: string;
  type: "credit" | "debit" | "pending";
};

export type SuperAppMessageChannel = {
  id: string;
  kind: "customer" | "creator" | "community" | "brand" | "affiliate" | "support";
  name: string;
  preview: string;
  time: string;
  unread?: boolean;
  href?: string;
};

export type JimvioSuperAppData = {
  wallet: SuperAppWalletData;
  transactions: SuperAppTransaction[];
  payouts: SuperAppTransaction[];
  messageChannels: SuperAppMessageChannel[];
  unreadMessages: number;
  unreadNotifications: number;
};
