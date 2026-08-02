/**
 * Jimvio Wallet OS — shared types.
 *
 * Additive module: does not alter the shape of `wallets` / `transactions` /
 * `payouts`, which remain the source of truth. These types describe the
 * unified read/write contracts layered on top of them.
 */

export type WalletSurface =
  | "marketplace"
  | "ugc"
  | "affiliate"
  | "community"
  | "orders"
  | "escrow"
  | "rewards"
  | "refunds"
  | "fees"
  | "withdrawals"
  | "deposits"
  | "subscriptions"
  | "other";

export interface WalletSurfaceFilter {
  value: WalletSurface;
  label: string;
}

export interface WalletOsOverview {
  userId: string;
  currency: string;
  /** Mirrors `wallets.available_balance`. */
  available: number;
  /** Mirrors `wallets.pending_balance`. */
  pending: number;
  /** Mirrors `wallets.locked_balance` (migration 124). */
  locked: number;
  /** `wallets.escrow_balance` + live UGC brand escrow projection. */
  escrow: number;
  /** Portion of `escrow` sourced from `ugc_campaign_escrow` (not persisted). */
  escrowFromUgc: number;
  /** Mirrors `wallets.rewards_balance` (migration 124). */
  rewards: number;
  totalEarned: number;
  totalPaid: number;
  /** available + pending + locked + rewards, rounded to 2dp. */
  netWorth: number;
  period: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  updatedAt: string | null;
}

export type LedgerEntrySource =
  | "transaction"
  | "payout"
  | "ugc_payout"
  | "deposit"
  | "reward"
  | "subscription_event";

export interface LedgerEntry {
  id: string;
  source: LedgerEntrySource;
  surface: WalletSurface;
  type: string;
  title: string;
  amount: number;
  direction: "credit" | "debit";
  currency: string;
  status: string;
  reference: string | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface LedgerQuery {
  surface?: WalletSurface | null;
  q?: string | null;
  cursor?: string | null;
  limit?: number;
}

export interface LedgerPage {
  entries: LedgerEntry[];
  nextCursor: string | null;
}

export interface WithdrawalRow {
  id: string;
  amount: number;
  fee: number;
  netAmount: number;
  currency: string;
  status: string;
  payoutMethod: string | null;
  payoutAccount: string | null;
  providerReference: string | null;
  notes: string | null;
  createdAt: string;
  processedAt: string | null;
  releaseDate: string | null;
}

export interface DepositRow {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  reference: string | null;
  invoiceUrl: string | null;
  receiptUrl: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface EscrowCampaignRow {
  campaignId: string;
  title: string;
  amount: number;
  currency: string;
  status: string;
  depositedAt: string | null;
}

export interface EscrowSnapshot {
  /** `wallets.escrow_balance`. */
  walletEscrowBalance: number;
  /** Live sum of `ugc_campaign_escrow` held funds for campaigns owned by this brand. */
  ugcEscrowHeld: number;
  totalEscrow: number;
  currency: string;
  campaigns: EscrowCampaignRow[];
}

export interface RewardRow {
  id: string;
  amount: number;
  currency: string;
  rewardType: string;
  title: string;
  description: string | null;
  status: string;
  refType: string | null;
  refId: string | null;
  createdAt: string;
}

export interface SubscriptionRow {
  id: string;
  communityId: string;
  eventType: string;
  fromPlan: string | null;
  toPlan: string | null;
  amount: number | null;
  currency: string | null;
  createdAt: string;
}

export interface WalletAnalyticsModule {
  surface: WalletSurface;
  total: number;
  /** Percentage share of tracked revenue, 0-100. */
  share: number;
}

export interface WalletAnalyticsSeriesPoint {
  weekStart: string;
  income: number;
  expense: number;
  net: number;
}

export interface WalletAnalyticsWithdrawals {
  totalRequested: number;
  totalPaid: number;
  totalPending: number;
  count: number;
}

export interface WalletAnalytics {
  currency: string;
  revenueByModule: WalletAnalyticsModule[];
  topModules: WalletAnalyticsModule[];
  /** Last 12 weeks, oldest first. */
  series: WalletAnalyticsSeriesPoint[];
  withdrawals: WalletAnalyticsWithdrawals;
}

export interface WalletAiInsights {
  revenueInsights: string[];
  savingsRecommendations: string[];
  earningOpportunities: string[];
  upcomingPayouts: string[];
  fundingReminders: string[];
  financialSummary: string;
  computedAt: string;
}
