/**
 * Canonical wallet withdrawal / payout method identifiers.
 * Flutterwave and PayPal are NOT selectable for new withdrawals.
 * Flutterwave remains fully supported for deposits/payments elsewhere.
 */

import {
  CUSTOM_INSTITUTION_ID,
  resolveBankDisplayName,
} from "@/lib/payments/payout-provider-catalog";

export const WALLET_WITHDRAWAL_METHODS = [
  "bank",
  "mobile_money",
  "binance_id",
  "crypto",
] as const;

export type WalletWithdrawalMethod = (typeof WALLET_WITHDRAWAL_METHODS)[number];

/** Values allowed on `creator_payout_methods.method` after migration. */
export const CREATOR_PAYOUT_DB_METHODS = [
  "flutterwave", // historical rows only — not selectable for new withdrawals
  "bank",
  "bank_transfer",
  "mobile_money",
  "crypto",
  "binance_id",
  "paypal", // historical / legacy rows only
] as const;

const ALIAS_TO_CANONICAL: Record<string, WalletWithdrawalMethod> = {
  bank: "bank",
  bank_transfer: "bank",
  mobile_money: "mobile_money",
  mobilemoney: "mobile_money",
  momo: "mobile_money",
  crypto: "crypto",
  cryptocurrency: "crypto",
  usdt: "crypto",
  usdc: "crypto",
  binance_id: "binance_id",
  binanceid: "binance_id",
  binance: "binance_id",
  // Do NOT map flutterwave / binancepay → selectable withdrawal methods
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
  if (
    key === "paypal" ||
    key === "pay_pal" ||
    key === "flutterwave" ||
    key === "flw"
  ) {
    return null;
  }
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
  const key = String(method ?? "").toLowerCase();
  const canonical = normalizeWalletWithdrawalMethod(method);
  switch (canonical ?? key) {
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

/** Customer-facing processing estimate — never exposes internal staff workflow. */
export function withdrawalSpeedLabel(method: WalletWithdrawalMethod): string {
  switch (method) {
    case "binance_id":
      return "Usually processed within 1 business day";
    case "mobile_money":
      return "Usually processed within 1 business day";
    case "crypto":
      return "Network processing required · typically 1–2 business days";
    case "bank":
      return "Usually processed within 2–5 business days";
    default:
      return "Processing time varies";
  }
}

export function withdrawalProcessingEstimate(
  method: WalletWithdrawalMethod,
): string {
  return withdrawalSpeedLabel(method);
}

/** Map DB payout status → customer-facing label (no internal ops language). */
export function customerFacingWithdrawalStatus(
  status: string | null | undefined,
): { key: string; label: string } {
  const s = String(status ?? "").toLowerCase();
  if (s === "paid" || s === "completed") {
    return { key: "completed", label: "Completed" };
  }
  if (s === "processing") {
    return { key: "processing", label: "Processing" };
  }
  if (s === "failed" || s === "rejected") {
    return { key: "failed", label: "Failed" };
  }
  if (s === "cancelled" || s === "canceled") {
    return { key: "cancelled", label: "Cancelled" };
  }
  if (s === "pending") {
    return { key: "pending", label: "Pending" };
  }
  return { key: s || "pending", label: s ? s.charAt(0).toUpperCase() + s.slice(1) : "Pending" };
}

/**
 * Payout methods available for a country.
 * Bank + global methods always; Mobile Money only where catalogued.
 */
export function payoutMethodsForCountry(countryCode: string): WalletWithdrawalMethod[] {
  const code = String(countryCode || "").toUpperCase();
  const methods: WalletWithdrawalMethod[] = ["bank", "binance_id", "crypto"];
  if (MOBILE_MONEY_BY_COUNTRY[code]) {
    methods.splice(1, 0, "mobile_money");
  }
  return methods;
}

// ─── Country / provider / crypto config ──────────────────────────────────────

export type MobileMoneyProvider = {
  id: string;
  label: string;
};

export const MOBILE_MONEY_BY_COUNTRY: Record<
  string,
  { label: string; dial: string; providers: MobileMoneyProvider[] }
> = {
  RW: {
    label: "Rwanda",
    dial: "+250",
    providers: [
      { id: "mtn_momo", label: "MTN Mobile Money" },
      { id: "airtel_money", label: "Airtel Money" },
    ],
  },
  UG: {
    label: "Uganda",
    dial: "+256",
    providers: [
      { id: "mtn_momo", label: "MTN Mobile Money" },
      { id: "airtel_money", label: "Airtel Money" },
    ],
  },
  KE: {
    label: "Kenya",
    dial: "+254",
    providers: [
      { id: "mpesa", label: "M-Pesa" },
      { id: "airtel_money", label: "Airtel Money" },
    ],
  },
  TZ: {
    label: "Tanzania",
    dial: "+255",
    providers: [
      { id: "mpesa", label: "M-Pesa" },
      { id: "tigo_pesa", label: "Tigo Pesa" },
      { id: "airtel_money", label: "Airtel Money" },
    ],
  },
  GH: {
    label: "Ghana",
    dial: "+233",
    providers: [
      { id: "mtn_momo", label: "MTN Mobile Money" },
      { id: "vodafone_cash", label: "Vodafone Cash" },
      { id: "airteltigo", label: "AirtelTigo Money" },
    ],
  },
  NG: {
    label: "Nigeria",
    dial: "+234",
    providers: [
      { id: "opay", label: "OPay" },
      { id: "palm_pay", label: "PalmPay" },
    ],
  },
  CM: {
    label: "Cameroon",
    dial: "+237",
    providers: [
      { id: "mtn_momo", label: "MTN Mobile Money" },
      { id: "orange_money", label: "Orange Money" },
    ],
  },
  CI: {
    label: "Côte d'Ivoire",
    dial: "+225",
    providers: [
      { id: "mtn_momo", label: "MTN Mobile Money" },
      { id: "orange_money", label: "Orange Money" },
      { id: "moov", label: "Moov Money" },
    ],
  },
  SN: {
    label: "Senegal",
    dial: "+221",
    providers: [
      { id: "orange_money", label: "Orange Money" },
      { id: "free_money", label: "Free Money" },
    ],
  },
  ZM: {
    label: "Zambia",
    dial: "+260",
    providers: [
      { id: "mtn_momo", label: "MTN Mobile Money" },
      { id: "airtel_money", label: "Airtel Money" },
    ],
  },
};

export type BankCountryConfig = {
  label: string;
  currency: string;
  fields: Array<
    | "accountNumber"
    | "routingNumber"
    | "sortCode"
    | "branchCode"
    | "iban"
    | "swift"
    | "bankAddress"
  >;
};

export const BANK_COUNTRY_CONFIG: Record<string, BankCountryConfig> = {
  US: {
    label: "United States",
    currency: "USD",
    fields: ["accountNumber", "routingNumber", "swift", "bankAddress"],
  },
  GB: {
    label: "United Kingdom",
    currency: "GBP",
    fields: ["accountNumber", "sortCode", "iban", "swift", "bankAddress"],
  },
  DE: {
    label: "Germany",
    currency: "EUR",
    fields: ["iban", "swift", "bankAddress"],
  },
  FR: {
    label: "France",
    currency: "EUR",
    fields: ["iban", "swift", "bankAddress"],
  },
  NL: {
    label: "Netherlands",
    currency: "EUR",
    fields: ["iban", "swift", "bankAddress"],
  },
  IE: {
    label: "Ireland",
    currency: "EUR",
    fields: ["iban", "swift", "bankAddress"],
  },
  CA: {
    label: "Canada",
    currency: "CAD",
    fields: ["accountNumber", "routingNumber", "swift", "bankAddress"],
  },
  NG: {
    label: "Nigeria",
    currency: "NGN",
    fields: ["accountNumber", "bankAddress"],
  },
  KE: {
    label: "Kenya",
    currency: "KES",
    fields: ["accountNumber", "branchCode", "swift", "bankAddress"],
  },
  GH: {
    label: "Ghana",
    currency: "GHS",
    fields: ["accountNumber", "branchCode", "swift", "bankAddress"],
  },
  RW: {
    label: "Rwanda",
    currency: "RWF",
    fields: ["accountNumber", "branchCode", "swift", "bankAddress"],
  },
  UG: {
    label: "Uganda",
    currency: "UGX",
    fields: ["accountNumber", "branchCode", "swift", "bankAddress"],
  },
  ZA: {
    label: "South Africa",
    currency: "ZAR",
    fields: ["accountNumber", "branchCode", "swift", "bankAddress"],
  },
  AE: {
    label: "United Arab Emirates",
    currency: "AED",
    fields: ["iban", "swift", "bankAddress"],
  },
  IN: {
    label: "India",
    currency: "INR",
    fields: ["accountNumber", "routingNumber", "swift", "bankAddress"],
  },
  OTHER: {
    label: "Other / International",
    currency: "USD",
    fields: ["accountNumber", "iban", "swift", "bankAddress"],
  },
};

/** Supported crypto assets + networks for manual admin payouts. */
export const CRYPTO_ASSETS = [
  { id: "USDT", label: "USDT" },
  { id: "USDC", label: "USDC" },
] as const;

export type CryptoAssetId = (typeof CRYPTO_ASSETS)[number]["id"];

export const CRYPTO_NETWORKS: Record<
  CryptoAssetId,
  Array<{ id: string; label: string; hint: string }>
> = {
  USDT: [
    { id: "TRC20", label: "TRON (TRC20)", hint: "Tron network" },
    { id: "ERC20", label: "Ethereum (ERC20)", hint: "Ethereum network" },
    { id: "BEP20", label: "BNB Smart Chain (BEP20)", hint: "BSC network" },
    { id: "POLYGON", label: "Polygon", hint: "Polygon PoS" },
  ],
  USDC: [
    { id: "ERC20", label: "Ethereum (ERC20)", hint: "Ethereum network" },
    { id: "BEP20", label: "BNB Smart Chain (BEP20)", hint: "BSC network" },
    { id: "POLYGON", label: "Polygon", hint: "Polygon PoS" },
    { id: "TRC20", label: "TRON (TRC20)", hint: "Tron network" },
  ],
};

export type WithdrawalDestinationDetails = {
  method: WalletWithdrawalMethod;
  // Bank
  country?: string;
  /** Catalog bank id, or `custom` for free-text institution */
  bankId?: string;
  bankName?: string;
  accountHolder?: string;
  accountNumber?: string;
  routingNumber?: string;
  sortCode?: string;
  branchCode?: string;
  iban?: string;
  swift?: string;
  bankAddress?: string;
  currency?: string;
  // Mobile money
  provider?: string;
  /** When provider === custom */
  customProviderName?: string;
  phone?: string;
  // Binance
  binanceId?: string;
  confirmBinanceId?: string;
  recipientName?: string;
  // Crypto
  asset?: string;
  network?: string;
  walletAddress?: string;
};

function maskTail(value: string, visible = 4): string {
  const v = value.trim();
  if (v.length <= visible) return "••••";
  return `••••${v.slice(-visible)}`;
}

export function maskDestinationDisplay(
  method: WalletWithdrawalMethod,
  details: WithdrawalDestinationDetails,
): string {
  switch (method) {
    case "bank":
      return `${details.bankName || "Bank"} ${maskTail(details.accountNumber || details.iban || "")}`;
    case "mobile_money": {
      const providerLabel =
        details.provider === CUSTOM_INSTITUTION_ID
          ? details.customProviderName || "Mobile Money"
          : details.provider || "Mobile Money";
      return `${providerLabel} ${maskTail(details.phone || "", 4)}`;
    }
    case "binance_id":
      return `Binance ID ${maskTail(details.binanceId || "", 4)}`;
    case "crypto":
      return `${details.asset || "Crypto"} · ${details.network || "?"} ${maskTail(details.walletAddress || "", 4)}`;
    default:
      return "Payout destination";
  }
}

function isValidIban(iban: string): boolean {
  const cleaned = iban.replace(/\s+/g, "").toUpperCase();
  return /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(cleaned);
}

function isPlausibleCryptoAddress(network: string, address: string): boolean {
  const a = address.trim();
  if (a.length < 20 || a.length > 128) return false;
  if (!/^[A-Za-z0-9:_-]+$/.test(a)) return false;
  switch (network) {
    case "TRC20":
      return /^T[1-9A-HJ-NP-Za-km-z]{25,48}$/.test(a);
    case "ERC20":
    case "BEP20":
    case "POLYGON":
      return /^0x[a-fA-F0-9]{40}$/.test(a);
    default:
      return true;
  }
}

/**
 * Validate structured destination and produce a storage payload + display mask.
 * `payout_account` stores JSON string for structured methods.
 */
export function validateWithdrawalDestinationDetails(
  method: WalletWithdrawalMethod,
  details: WithdrawalDestinationDetails,
):
  | {
      ok: true;
      account: string;
      display: string;
      details: WithdrawalDestinationDetails;
    }
  | { ok: false; error: string } {
  switch (method) {
    case "bank": {
      const country = String(details.country || "OTHER").toUpperCase();
      const cfg = BANK_COUNTRY_CONFIG[country] ?? BANK_COUNTRY_CONFIG.OTHER;
      const bankId = String(details.bankId ?? "").trim() || CUSTOM_INSTITUTION_ID;
      const bankName = resolveBankDisplayName(
        country,
        bankId,
        details.bankName,
      );
      const accountHolder = String(details.accountHolder ?? "").trim();
      if (bankName.length < 2) {
        return {
          ok: false,
          error:
            bankId === CUSTOM_INSTITUTION_ID
              ? "Enter the bank or institution name"
              : "Select your bank",
        };
      }
      if (accountHolder.length < 2) {
        return { ok: false, error: "Enter the account holder name" };
      }
      const needsAccount = cfg.fields.includes("accountNumber");
      const needsIban = cfg.fields.includes("iban");
      const accountNumber = String(details.accountNumber ?? "").trim();
      const iban = String(details.iban ?? "").trim();
      if (needsAccount && !needsIban && accountNumber.length < 4) {
        return { ok: false, error: "Enter a valid account number" };
      }
      if (needsIban && !accountNumber) {
        if (!iban || !isValidIban(iban)) {
          return { ok: false, error: "Enter a valid IBAN" };
        }
      }
      if (needsIban && iban && !isValidIban(iban)) {
        return { ok: false, error: "Enter a valid IBAN" };
      }
      if (cfg.fields.includes("routingNumber")) {
        const routing = String(details.routingNumber ?? "").trim();
        if (country === "US" && !/^\d{9}$/.test(routing)) {
          return { ok: false, error: "Enter a valid 9-digit routing number" };
        }
        if (country !== "US" && routing && routing.length < 3) {
          return { ok: false, error: "Enter a valid routing / transit number" };
        }
      }
      if (cfg.fields.includes("sortCode")) {
        const sort = String(details.sortCode ?? "").replace(/[\s-]/g, "");
        if (!/^\d{6}$/.test(sort)) {
          return { ok: false, error: "Enter a valid 6-digit sort code" };
        }
      }
      if (cfg.fields.includes("swift") && details.swift) {
        const swift = String(details.swift).replace(/\s+/g, "").toUpperCase();
        if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(swift)) {
          return { ok: false, error: "Enter a valid SWIFT/BIC code" };
        }
      }
      const normalized: WithdrawalDestinationDetails = {
        method: "bank",
        country,
        bankId,
        bankName,
        accountHolder,
        accountNumber: accountNumber || undefined,
        routingNumber: details.routingNumber?.trim() || undefined,
        sortCode: details.sortCode?.trim() || undefined,
        branchCode: details.branchCode?.trim() || undefined,
        iban: iban || undefined,
        swift: details.swift?.trim().toUpperCase() || undefined,
        bankAddress: details.bankAddress?.trim() || undefined,
        currency: cfg.currency,
      };
      return {
        ok: true,
        account: JSON.stringify(normalized),
        display: maskDestinationDisplay("bank", normalized),
        details: normalized,
      };
    }
    case "mobile_money": {
      const country = String(details.country ?? "").toUpperCase();
      const cfg = MOBILE_MONEY_BY_COUNTRY[country];
      if (!cfg) {
        return { ok: false, error: "Select a supported mobile money country" };
      }
      const provider = String(details.provider ?? "").trim();
      const isCustom = provider === CUSTOM_INSTITUTION_ID;
      if (!isCustom && !cfg.providers.some((p) => p.id === provider)) {
        return { ok: false, error: "Select a mobile money provider for this country" };
      }
      const customProviderName = String(details.customProviderName ?? "").trim();
      if (isCustom && customProviderName.length < 2) {
        return { ok: false, error: "Enter the mobile money provider name" };
      }
      const phoneRaw = String(details.phone ?? "").replace(/[\s()-]/g, "");
      if (!/^\+?\d{8,15}$/.test(phoneRaw)) {
        return { ok: false, error: "Enter a valid phone number with country code" };
      }
      // Rwanda: prefer +250 and 9-digit local after country code when provided with dial
      if (country === "RW") {
        const digits = phoneRaw.replace(/^\+/, "");
        const local =
          digits.startsWith("250") && digits.length >= 12
            ? digits.slice(3)
            : digits.replace(/^0+/, "");
        if (local.length !== 9 || !/^[7]\d{8}$/.test(local)) {
          // Soft check: only enforce when number is clearly Rwanda-formatted
          if (phoneRaw.includes("250") || phoneRaw.startsWith("+250") || phoneRaw.startsWith("07")) {
            return {
              ok: false,
              error: "Enter a valid Rwanda mobile number (+250 7XX XXX XXX)",
            };
          }
        }
      }
      const accountHolder = String(details.accountHolder ?? "").trim();
      let phone = phoneRaw;
      if (!phoneRaw.startsWith("+")) {
        phone = `${cfg.dial}${phoneRaw.replace(/^0+/, "")}`;
      }
      const normalized: WithdrawalDestinationDetails = {
        method: "mobile_money",
        country,
        provider: isCustom ? CUSTOM_INSTITUTION_ID : provider,
        customProviderName: isCustom ? customProviderName : undefined,
        phone,
        accountHolder: accountHolder || undefined,
      };
      return {
        ok: true,
        account: JSON.stringify(normalized),
        display: maskDestinationDisplay("mobile_money", normalized),
        details: normalized,
      };
    }
    case "binance_id": {
      const id = String(details.binanceId ?? "").replace(/\s+/g, "");
      const confirm = String(details.confirmBinanceId ?? "").replace(/\s+/g, "");
      if (!/^\d{6,20}$/.test(id)) {
        return {
          ok: false,
          error: "Enter a valid Binance ID (numbers only, 6–20 digits)",
        };
      }
      if (confirm && confirm !== id) {
        return { ok: false, error: "Binance ID confirmation does not match" };
      }
      if (!confirm) {
        return { ok: false, error: "Confirm your Binance ID" };
      }
      const normalized: WithdrawalDestinationDetails = {
        method: "binance_id",
        binanceId: id,
        recipientName: details.recipientName?.trim() || undefined,
      };
      return {
        ok: true,
        account: JSON.stringify(normalized),
        display: maskDestinationDisplay("binance_id", normalized),
        details: normalized,
      };
    }
    case "crypto": {
      const asset = String(details.asset ?? "").toUpperCase();
      const network = String(details.network ?? "").toUpperCase();
      const walletAddress = String(details.walletAddress ?? "").trim();
      if (!CRYPTO_ASSETS.some((a) => a.id === asset)) {
        return { ok: false, error: "Select a supported crypto asset" };
      }
      const networks = CRYPTO_NETWORKS[asset as CryptoAssetId] ?? [];
      if (!networks.some((n) => n.id === network)) {
        return { ok: false, error: "Select a supported network for this asset" };
      }
      if (!isPlausibleCryptoAddress(network, walletAddress)) {
        return {
          ok: false,
          error: "Wallet address does not match the selected network",
        };
      }
      const normalized: WithdrawalDestinationDetails = {
        method: "crypto",
        asset,
        network,
        walletAddress,
      };
      return {
        ok: true,
        account: JSON.stringify(normalized),
        display: maskDestinationDisplay("crypto", normalized),
        details: normalized,
      };
    }
    default:
      return { ok: false, error: "Unsupported payout method" };
  }
}

/**
 * Legacy free-text destination validator (saved methods / older clients).
 * Prefer validateWithdrawalDestinationDetails for new UI.
 */
export function validateWithdrawalDestination(
  method: WalletWithdrawalMethod,
  account: string,
): { ok: true; account: string } | { ok: false; error: string } {
  const trimmed = account.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter payout destination details" };
  }

  // Structured JSON from new UI
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as WithdrawalDestinationDetails;
      const result = validateWithdrawalDestinationDetails(method, {
        ...parsed,
        method,
      });
      if (!result.ok) return result;
      return { ok: true, account: result.account };
    } catch {
      return { ok: false, error: "Invalid payout destination" };
    }
  }

  switch (method) {
    case "binance_id": {
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
    case "bank": {
      if (trimmed.length < 3 || trimmed.length > 2000) {
        return { ok: false, error: "Enter valid account details" };
      }
      return { ok: true, account: trimmed };
    }
    default:
      return { ok: false, error: "Unsupported payout method" };
  }
}

/** Safe history display from stored payout_account (never logs full secrets). */
export function formatStoredPayoutAccount(
  method: string | null | undefined,
  payoutAccount: string | null | undefined,
): string {
  const raw = String(payoutAccount ?? "").trim();
  if (!raw) return "—";
  const canonical = normalizeWalletWithdrawalMethod(method);
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as WithdrawalDestinationDetails;
      if (canonical) return maskDestinationDisplay(canonical, parsed);
    } catch {
      /* fall through */
    }
  }
  return maskTail(raw, 4);
}
