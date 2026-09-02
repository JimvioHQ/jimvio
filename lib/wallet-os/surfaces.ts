import type { WalletSurface, WalletSurfaceFilter } from "@/lib/wallet-os/types";

/** The 12 filterable Wallet OS surfaces (matches `wallet_activity_log`'s CHECK constraint, minus security/system). */
export const WALLET_SURFACES: WalletSurface[] = [
  "marketplace",
  "ugc",
  "affiliate",
  "community",
  "orders",
  "escrow",
  "rewards",
  "refunds",
  "fees",
  "withdrawals",
  "deposits",
  "subscriptions",
];

export const WALLET_SURFACE_FILTERS: WalletSurfaceFilter[] = [
  { value: "marketplace", label: "Marketplace" },
  { value: "ugc", label: "UGC Campaigns" },
  { value: "affiliate", label: "Affiliate" },
  { value: "community", label: "Community" },
  { value: "orders", label: "Orders" },
  { value: "escrow", label: "Reserved" },
  { value: "rewards", label: "Rewards" },
  { value: "refunds", label: "Refunds" },
  { value: "fees", label: "Fees" },
  { value: "withdrawals", label: "Withdrawals" },
  { value: "deposits", label: "Deposits" },
  { value: "subscriptions", label: "Subscriptions" },
];

/**
 * Known `transactions.type` / `payouts.type` values seen across the codebase,
 * mapped to their Wallet OS surface. Anything not listed falls back to the
 * heuristic matcher below.
 */
const TRANSACTION_TYPE_SURFACE: Record<string, WalletSurface> = {
  vendor_earning: "marketplace",
  vendor_withdrawal: "withdrawals",
  vendor_payout: "withdrawals",
  payout_request: "withdrawals",
  wallet_withdrawal: "withdrawals",
  affiliate_commission: "affiliate",
  affiliate_earning: "affiliate",
  affiliate_payout: "withdrawals",
  community_earning: "community",
  community_commission: "fees",
  community_payment: "community",
  community_subscription: "subscriptions",
  ugc_earning: "ugc",
  ugc_earnings: "ugc",
  ugc_payout: "ugc",
  order_payment: "orders",
  order_refund: "refunds",
  refund: "refunds",
  platform_fee: "fees",
  fee: "fees",
  escrow_lock: "escrow",
  escrow_release: "escrow",
  escrow_refund: "escrow",
  deposit: "deposits",
  wallet_deposit: "deposits",
  reward: "rewards",
  cashback: "rewards",
  referral_bonus: "rewards",
  subscription_payment: "subscriptions",
};

/** Maps any `transactions`/`payouts` `type` string to a Wallet OS surface. */
export function surfaceForTransactionType(type: string | null | undefined): WalletSurface {
  const key = String(type ?? "").trim().toLowerCase();
  if (!key) return "other";

  const known = TRANSACTION_TYPE_SURFACE[key];
  if (known) return known;

  if (key.includes("withdraw") || key.includes("payout")) return "withdrawals";
  if (key.includes("deposit")) return "deposits";
  if (key.includes("refund")) return "refunds";
  if (key.includes("reward") || key.includes("cashback") || key.includes("bonus")) return "rewards";
  if (key.includes("escrow")) return "escrow";
  if (key.includes("subscription") || key.includes("subscr")) return "subscriptions";
  if (key.includes("affiliate")) return "affiliate";
  if (key.includes("ugc")) return "ugc";
  if (key.includes("community")) return "community";
  if (key.includes("fee") || key.includes("commission")) return "fees";
  if (key.includes("vendor") || key.includes("marketplace") || key.includes("product")) return "marketplace";
  if (key.includes("order")) return "orders";
  return "other";
}

export function isKnownWalletSurface(value: string | null | undefined): value is WalletSurface {
  return typeof value === "string" && WALLET_SURFACES.includes(value as WalletSurface);
}

export function surfaceLabel(surface: WalletSurface): string {
  return WALLET_SURFACE_FILTERS.find((filter) => filter.value === surface)?.label ?? "Other";
}
