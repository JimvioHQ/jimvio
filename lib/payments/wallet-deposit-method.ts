/**
 * Canonical wallet-deposit payment method identifiers.
 *
 * UI / checkout MethodIds (flutterwave, nowpayments, binancepay, …) must map
 * to a single DB-safe value before inserting into `wallet_deposits.method`.
 * Do not scatter aliases — all deposit writers go through this module.
 */

/** Values allowed by `wallet_deposits_method_check` after migration. */
export const WALLET_DEPOSIT_DB_METHODS = [
  "manual",
  "bank",
  "flutterwave",
  "mobile_money",
  "paypal",
  "crypto",
  "nowpayments",
  "binancepay",
  "pesapal",
  "pawapay",
  "other",
] as const;

export type WalletDepositDbMethod = (typeof WALLET_DEPOSIT_DB_METHODS)[number];

/**
 * Providers that can initiate + verify a wallet deposit end-to-end.
 * PayPal / PesaPal / PawaPay are checkout providers but not wired for wallet top-up.
 */
export const WALLET_DEPOSIT_INITIABLE_METHODS = [
  "flutterwave",
  "mobile_money",
  "nowpayments",
  "binancepay",
] as const;

export type WalletDepositInitiableMethod =
  (typeof WALLET_DEPOSIT_INITIABLE_METHODS)[number];

const ALIAS_TO_CANONICAL: Record<string, WalletDepositDbMethod> = {
  manual: "manual",
  bank: "bank",
  bank_transfer: "bank",
  flutterwave: "flutterwave",
  flw: "flutterwave",
  mobile_money: "mobile_money",
  mobilemoney: "mobile_money",
  momo: "mobile_money",
  paypal: "paypal",
  crypto: "nowpayments",
  cryptocurrency: "nowpayments",
  nowpayments: "nowpayments",
  nowpayment: "nowpayments",
  nowp: "nowpayments",
  binancepay: "binancepay",
  binance_pay: "binancepay",
  "binance-pay": "binancepay",
  binance: "binancepay",
  pesapal: "pesapal",
  pawapay: "pawapay",
  other: "other",
};

const DB_SET = new Set<string>(WALLET_DEPOSIT_DB_METHODS);
const INITIABLE_SET = new Set<string>(WALLET_DEPOSIT_INITIABLE_METHODS);

/** Normalize any UI / API / webhook alias to the canonical DB method, or null. */
export function normalizeWalletDepositMethod(
  raw: string | null | undefined,
): WalletDepositDbMethod | null {
  const key = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (!key) return null;
  const mapped = ALIAS_TO_CANONICAL[key];
  if (mapped && DB_SET.has(mapped)) return mapped;
  if (DB_SET.has(key)) return key as WalletDepositDbMethod;
  return null;
}

export function isWalletDepositInitiable(
  method: string | null | undefined,
): method is WalletDepositInitiableMethod {
  const canonical = normalizeWalletDepositMethod(method);
  return canonical != null && INITIABLE_SET.has(canonical);
}

/** Human-readable label for deposit history / errors. */
export function walletDepositMethodLabel(method: string | null | undefined): string {
  const canonical = normalizeWalletDepositMethod(method) ?? String(method ?? "");
  switch (canonical) {
    case "flutterwave":
      return "Flutterwave";
    case "mobile_money":
      return "Mobile Money";
    case "nowpayments":
    case "crypto":
      return "Cryptocurrency";
    case "binancepay":
      return "Binance Pay";
    case "paypal":
      return "PayPal (retired)";
    case "pesapal":
      return "PesaPal (retired)";
    case "pawapay":
      return "PawaPay";
    case "bank":
      return "Bank transfer";
    case "manual":
      return "Manual";
    default:
      return canonical || "Payment";
  }
}

/** Provider id stored on transactions / used in webhooks. */
export function walletDepositProviderId(
  method: WalletDepositDbMethod | string,
): string {
  const canonical = normalizeWalletDepositMethod(method) ?? method;
  switch (canonical) {
    case "nowpayments":
    case "crypto":
      return "nowpayments";
    case "binancepay":
      return "binancepay";
    case "flutterwave":
    case "mobile_money":
      return "flutterwave";
    default:
      return String(canonical);
  }
}
