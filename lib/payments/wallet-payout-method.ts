/**
 * Canonical wallet withdrawal / payout method identifiers.
 * PayPal is intentionally excluded from selectable withdrawal methods.
 */

export const WALLET_WITHDRAWAL_METHODS = [
  "bank",
  "flutterwave",
  "mobile_money",
  "crypto",
  "binance_id",
] as const;

export type WalletWithdrawalMethod = (typeof WALLET_WITHDRAWAL_METHODS)[number];

/** Values allowed on `creator_payout_methods.method` after migration. */
export const CREATOR_PAYOUT_DB_METHODS = [
  "flutterwave",
  "bank",
  "bank_transfer",
  "mobile_money",
  "crypto",
  "binance_id",
  "paypal", // historical / legacy rows only — not selectable in UI
] as const;

const ALIAS_TO_CANONICAL: Record<string, WalletWithdrawalMethod> = {
  bank: "bank",
  bank_transfer: "bank",
  flutterwave: "flutterwave",
  flw: "flutterwave",
  mobile_money: "mobile_money",
  mobilemoney: "mobile_money",
  momo: "mobile_money",
  crypto: "crypto",
  cryptocurrency: "crypto",
  usdt: "crypto",
  binance_id: "binance_id",
  binanceid: "binance_id",
  binance: "binance_id",
  binancepay: "binance_id",
  binance_pay: "binance_id",
};

const SELECTABLE = new Set<string>(WALLET_WITHDRAWAL_METHODS);

export function normalizeWalletWithdrawalMethod(
  raw: string | null | undefined,
): WalletWithdrawalMethod | null {
  const key = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (!key) return null;
  // Explicitly reject PayPal for new withdrawals
  if (key === "paypal" || key === "pay_pal") return null;
  const mapped = ALIAS_TO_CANONICAL[key];
  if (mapped && SELECTABLE.has(mapped)) return mapped;
  if (SELECTABLE.has(key)) return key as WalletWithdrawalMethod;
  return null;
}

/** Map UI/API method to creator_payout_methods CHECK value. */
export function toCreatorPayoutDbMethod(
  method: WalletWithdrawalMethod,
): string {
  switch (method) {
    case "bank":
      return "bank";
    case "binance_id":
      return "binance_id";
    default:
      return method;
  }
}

export function walletWithdrawalMethodLabel(
  method: string | null | undefined,
): string {
  const canonical = normalizeWalletWithdrawalMethod(method);
  switch (canonical ?? String(method ?? "").toLowerCase()) {
    case "bank":
    case "bank_transfer":
      return "Bank transfer";
    case "flutterwave":
      return "Flutterwave";
    case "mobile_money":
      return "Mobile Money";
    case "crypto":
      return "Cryptocurrency";
    case "binance_id":
      return "Binance ID";
    case "paypal":
      return "PayPal";
    default:
      return String(method ?? "Payout");
  }
}

/** Validate recipient destination for a withdrawal method. */
export function validateWithdrawalDestination(
  method: WalletWithdrawalMethod,
  account: string,
): { ok: true; account: string } | { ok: false; error: string } {
  const trimmed = account.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter payout destination details" };
  }

  switch (method) {
    case "binance_id": {
      // Binance IDs are numeric strings, typically 6–12 digits
      const id = trimmed.replace(/\s+/g, "");
      if (!/^\d{6,20}$/.test(id)) {
        return {
          ok: false,
          error: "Enter a valid Binance ID (numbers only, 6–20 digits)",
        };
      }
      return { ok: true, account: id };
    }
    case "crypto": {
      if (trimmed.length < 20 || trimmed.length > 128) {
        return { ok: false, error: "Enter a valid crypto wallet address" };
      }
      if (!/^[A-Za-z0-9:_-]+$/.test(trimmed)) {
        return { ok: false, error: "Crypto address contains invalid characters" };
      }
      return { ok: true, account: trimmed };
    }
    case "mobile_money": {
      const phone = trimmed.replace(/[\s()-]/g, "");
      if (!/^\+?\d{8,15}$/.test(phone)) {
        return { ok: false, error: "Enter a valid mobile money phone number" };
      }
      return { ok: true, account: phone };
    }
    case "flutterwave":
    case "bank": {
      if (trimmed.length < 3 || trimmed.length > 500) {
        return { ok: false, error: "Enter valid account details" };
      }
      return { ok: true, account: trimmed };
    }
    default:
      return { ok: false, error: "Unsupported payout method" };
  }
}

export function withdrawalSpeedLabel(method: WalletWithdrawalMethod): string {
  switch (method) {
    case "binance_id":
      return "Processed after admin confirmation";
    case "mobile_money":
      return "Typically same day after approval";
    case "flutterwave":
      return "1–2 business days after approval";
    case "crypto":
      return "Processed after network confirmation";
    case "bank":
      return "2–3 business days after approval";
    default:
      return "Pending approval";
  }
}
