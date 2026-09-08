/**
 * Canonical payout institution / provider catalog for Wallet withdrawals.
 *
 * Source of truth for country → bank / mobile-money institutions shown in
 * /wallet/withdrawals (maintain here; do not hardcode names in React).
 *
 * Maintainability rules:
 * - Add/remove banks or MM providers here — never scatter names in React UI.
 * - Only list institutions Jimvio can operationally pay (manual or automated).
 * - `logoSrc` = first-party asset under /public; `logoDomain` = optional favicon
 *   source with UI fallback (never required for the flow to work).
 * - Always include Custom / Other via CUSTOM_INSTITUTION_ID.
 *
 * Rwanda commercial banks: National Bank of Rwanda supervised list
 * (Wikipedia / BNR Q2 2026 commercial banks).
 */

export const CUSTOM_INSTITUTION_ID = "custom" as const;

export type PayoutInstitution = {
  id: string;
  name: string;
  shortCode?: string;
  /** Local asset under /public when available */
  logoSrc?: string;
  /** Public website domain for favicon fallback (optional) */
  logoDomain?: string;
  country: string;
  method: "bank" | "mobile_money";
};

/** Rwanda — licensed commercial banks (BNR-supervised commercial list). */
export const RWANDA_COMMERCIAL_BANKS: PayoutInstitution[] = [
  {
    id: "rw_bk",
    name: "Bank of Kigali",
    shortCode: "BK",
    logoDomain: "bk.rw",
    country: "RW",
    method: "bank",
  },
  {
    id: "rw_im",
    name: "I&M Bank Rwanda",
    shortCode: "I&M",
    logoDomain: "imbank.com",
    country: "RW",
    method: "bank",
  },
  {
    id: "rw_bpr",
    name: "BPR Bank Rwanda",
    shortCode: "BPR",
    logoDomain: "bpr.rw",
    country: "RW",
    method: "bank",
  },
  {
    id: "rw_gtb",
    name: "Guaranty Trust Bank Rwanda",
    shortCode: "GTBank",
    logoDomain: "gtbank.co.rw",
    country: "RW",
    method: "bank",
  },
  {
    id: "rw_eco",
    name: "Ecobank Rwanda",
    shortCode: "Ecobank",
    logoDomain: "ecobank.com",
    country: "RW",
    method: "bank",
  },
  {
    id: "rw_access",
    name: "Access Bank Rwanda",
    shortCode: "Access",
    logoDomain: "rwanda.accessbankplc.com",
    country: "RW",
    method: "bank",
  },
  {
    id: "rw_equity",
    name: "Equity Bank Rwanda",
    shortCode: "Equity",
    logoDomain: "equitybank.co.rw",
    country: "RW",
    method: "bank",
  },
  {
    id: "rw_boa",
    name: "Bank of Africa Rwanda",
    shortCode: "BOA",
    logoDomain: "bankofafrica.rw",
    country: "RW",
    method: "bank",
  },
  {
    id: "rw_ncba",
    name: "NCBA Bank Rwanda",
    shortCode: "NCBA",
    logoDomain: "ncbagroup.com",
    country: "RW",
    method: "bank",
  },
];

/** Kenya — major commercial banks Jimvio can route manually. */
export const KENYA_BANKS: PayoutInstitution[] = [
  { id: "ke_equity", name: "Equity Bank Kenya", shortCode: "Equity", logoDomain: "equitybank.co.ke", country: "KE", method: "bank" },
  { id: "ke_kcb", name: "KCB Bank Kenya", shortCode: "KCB", logoDomain: "kcbgroup.com", country: "KE", method: "bank" },
  { id: "ke_coop", name: "Co-operative Bank of Kenya", shortCode: "Co-op", logoDomain: "co-opbank.co.ke", country: "KE", method: "bank" },
  { id: "ke_absa", name: "Absa Bank Kenya", shortCode: "Absa", logoDomain: "absa.co.ke", country: "KE", method: "bank" },
  { id: "ke_ncba", name: "NCBA Bank Kenya", shortCode: "NCBA", logoDomain: "ncbagroup.com", country: "KE", method: "bank" },
  { id: "ke_stanbic", name: "Stanbic Bank Kenya", shortCode: "Stanbic", logoDomain: "stanbicbank.co.ke", country: "KE", method: "bank" },
  { id: "ke_im", name: "I&M Bank Kenya", shortCode: "I&M", logoDomain: "imbank.com", country: "KE", method: "bank" },
  { id: "ke_dtb", name: "Diamond Trust Bank Kenya", shortCode: "DTB", logoDomain: "dtbafrica.com", country: "KE", method: "bank" },
];

/** Uganda — major commercial banks. */
export const UGANDA_BANKS: PayoutInstitution[] = [
  { id: "ug_stanbic", name: "Stanbic Bank Uganda", shortCode: "Stanbic", logoDomain: "stanbicbank.co.ug", country: "UG", method: "bank" },
  { id: "ug_centenary", name: "Centenary Bank", shortCode: "Centenary", logoDomain: "centenarybank.co.ug", country: "UG", method: "bank" },
  { id: "ug_equity", name: "Equity Bank Uganda", shortCode: "Equity", logoDomain: "equitybank.co.ug", country: "UG", method: "bank" },
  { id: "ug_absa", name: "Absa Bank Uganda", shortCode: "Absa", logoDomain: "absa.co.ug", country: "UG", method: "bank" },
  { id: "ug_dtb", name: "Diamond Trust Bank Uganda", shortCode: "DTB", logoDomain: "dtbafrica.com", country: "UG", method: "bank" },
  { id: "ug_housing", name: "Housing Finance Bank", shortCode: "HFB", logoDomain: "housingfinance.co.ug", country: "UG", method: "bank" },
];

/** Nigeria — major commercial banks. */
export const NIGERIA_BANKS: PayoutInstitution[] = [
  { id: "ng_access", name: "Access Bank", shortCode: "Access", logoDomain: "accessbankplc.com", country: "NG", method: "bank" },
  { id: "ng_gtb", name: "Guaranty Trust Bank", shortCode: "GTBank", logoDomain: "gtbank.com", country: "NG", method: "bank" },
  { id: "ng_zenith", name: "Zenith Bank", shortCode: "Zenith", logoDomain: "zenithbank.com", country: "NG", method: "bank" },
  { id: "ng_uba", name: "United Bank for Africa", shortCode: "UBA", logoDomain: "ubagroup.com", country: "NG", method: "bank" },
  { id: "ng_first", name: "First Bank of Nigeria", shortCode: "FirstBank", logoDomain: "firstbanknigeria.com", country: "NG", method: "bank" },
  { id: "ng_eco", name: "Ecobank Nigeria", shortCode: "Ecobank", logoDomain: "ecobank.com", country: "NG", method: "bank" },
  { id: "ng_fidelity", name: "Fidelity Bank", shortCode: "Fidelity", logoDomain: "fidelitybank.ng", country: "NG", method: "bank" },
];

/** Ghana — major commercial banks. */
export const GHANA_BANKS: PayoutInstitution[] = [
  { id: "gh_gcb", name: "GCB Bank", shortCode: "GCB", logoDomain: "gcbbank.com.gh", country: "GH", method: "bank" },
  { id: "gh_eco", name: "Ecobank Ghana", shortCode: "Ecobank", logoDomain: "ecobank.com", country: "GH", method: "bank" },
  { id: "gh_absa", name: "Absa Bank Ghana", shortCode: "Absa", logoDomain: "absa.com.gh", country: "GH", method: "bank" },
  { id: "gh_stanbic", name: "Stanbic Bank Ghana", shortCode: "Stanbic", logoDomain: "stanbicbank.com.gh", country: "GH", method: "bank" },
  { id: "gh_fidelity", name: "Fidelity Bank Ghana", shortCode: "Fidelity", logoDomain: "fidelitybank.com.gh", country: "GH", method: "bank" },
  { id: "gh_cal", name: "CalBank", shortCode: "CalBank", logoDomain: "calbank.net", country: "GH", method: "bank" },
];

/**
 * US — curated ACH-capable institutions + Custom (no claim of exhaustive FDIC list).
 * Full US bank directories are not operationally maintained here.
 */
export const US_BANKS: PayoutInstitution[] = [
  { id: "us_chase", name: "JPMorgan Chase", shortCode: "Chase", logoDomain: "chase.com", country: "US", method: "bank" },
  { id: "us_bofa", name: "Bank of America", shortCode: "BofA", logoDomain: "bankofamerica.com", country: "US", method: "bank" },
  { id: "us_wells", name: "Wells Fargo", shortCode: "Wells", logoDomain: "wellsfargo.com", country: "US", method: "bank" },
  { id: "us_citi", name: "Citibank", shortCode: "Citi", logoDomain: "citi.com", country: "US", method: "bank" },
  { id: "us_capital_one", name: "Capital One", shortCode: "Capital One", logoDomain: "capitalone.com", country: "US", method: "bank" },
];

/** Banks keyed by ISO country. Empty = free-text / Custom only. */
export const BANKS_BY_COUNTRY: Record<string, PayoutInstitution[]> = {
  RW: RWANDA_COMMERCIAL_BANKS,
  KE: KENYA_BANKS,
  UG: UGANDA_BANKS,
  NG: NIGERIA_BANKS,
  GH: GHANA_BANKS,
  US: US_BANKS,
};

export type MobileMoneyCatalogProvider = PayoutInstitution & {
  method: "mobile_money";
};

/** Mobile money providers with first-party logos where Jimvio has assets. */
export const MOBILE_MONEY_PROVIDERS: Record<string, MobileMoneyCatalogProvider> = {
  mtn_momo: {
    id: "mtn_momo",
    name: "MTN Mobile Money",
    shortCode: "MTN",
    logoSrc: "/logos/mtn.jpeg",
    country: "*",
    method: "mobile_money",
  },
  airtel_money: {
    id: "airtel_money",
    name: "Airtel Money",
    shortCode: "Airtel",
    logoDomain: "airtel.africa",
    country: "*",
    method: "mobile_money",
  },
  mpesa: {
    id: "mpesa",
    name: "M-Pesa",
    shortCode: "M-Pesa",
    logoDomain: "safaricom.co.ke",
    country: "*",
    method: "mobile_money",
  },
  tigo_pesa: {
    id: "tigo_pesa",
    name: "Tigo Pesa",
    shortCode: "Tigo",
    logoDomain: "tigo.co.tz",
    country: "*",
    method: "mobile_money",
  },
  vodafone_cash: {
    id: "vodafone_cash",
    name: "Vodafone Cash",
    shortCode: "Vodafone",
    logoDomain: "vodafone.com.gh",
    country: "*",
    method: "mobile_money",
  },
  airteltigo: {
    id: "airteltigo",
    name: "AirtelTigo Money",
    shortCode: "AirtelTigo",
    logoDomain: "airteltigo.com.gh",
    country: "*",
    method: "mobile_money",
  },
  opay: {
    id: "opay",
    name: "OPay",
    shortCode: "OPay",
    logoDomain: "opayweb.com",
    country: "*",
    method: "mobile_money",
  },
  palm_pay: {
    id: "palm_pay",
    name: "PalmPay",
    shortCode: "PalmPay",
    logoDomain: "palmpay.com",
    country: "*",
    method: "mobile_money",
  },
  orange_money: {
    id: "orange_money",
    name: "Orange Money",
    shortCode: "Orange",
    logoDomain: "orange.com",
    country: "*",
    method: "mobile_money",
  },
  moov: {
    id: "moov",
    name: "Moov Money",
    shortCode: "Moov",
    logoDomain: "moov-africa.com",
    country: "*",
    method: "mobile_money",
  },
  free_money: {
    id: "free_money",
    name: "Free Money",
    shortCode: "Free",
    logoDomain: "free.sn",
    country: "*",
    method: "mobile_money",
  },
};

export const CUSTOM_INSTITUTION: PayoutInstitution = {
  id: CUSTOM_INSTITUTION_ID,
  name: "Custom / Other",
  shortCode: "Other",
  country: "*",
  method: "bank",
};

export function banksForCountry(countryCode: string): PayoutInstitution[] {
  const code = String(countryCode || "").toUpperCase();
  const list = BANKS_BY_COUNTRY[code] ?? [];
  return [...list, { ...CUSTOM_INSTITUTION, country: code, method: "bank" }];
}

export function findBank(countryCode: string, bankId: string): PayoutInstitution | null {
  if (bankId === CUSTOM_INSTITUTION_ID) {
    return { ...CUSTOM_INSTITUTION, country: String(countryCode || "").toUpperCase(), method: "bank" };
  }
  return banksForCountry(countryCode).find((b) => b.id === bankId) ?? null;
}

export function resolveBankDisplayName(
  countryCode: string,
  bankId: string | undefined,
  customName: string | undefined,
): string {
  if (!bankId || bankId === CUSTOM_INSTITUTION_ID) {
    return String(customName ?? "").trim();
  }
  return findBank(countryCode, bankId)?.name ?? String(customName ?? "").trim();
}

export function enrichMobileMoneyProvider(
  id: string,
  fallbackLabel: string,
  country: string,
): PayoutInstitution {
  if (id === CUSTOM_INSTITUTION_ID) {
    return {
      id: CUSTOM_INSTITUTION_ID,
      name: "Custom / Other",
      shortCode: "Other",
      country,
      method: "mobile_money",
    };
  }
  const known = MOBILE_MONEY_PROVIDERS[id];
  if (known) {
    return { ...known, country, name: fallbackLabel || known.name };
  }
  return {
    id,
    name: fallbackLabel || id,
    country,
    method: "mobile_money",
  };
}

/** Favicon URL for optional branding (UI must fall back on error). */
export function institutionFaviconUrl(domain?: string): string | null {
  if (!domain) return null;
  const clean = domain.replace(/^https?:\/\//, "").split("/")[0];
  if (!clean || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(clean)) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(clean)}&sz=128`;
}
