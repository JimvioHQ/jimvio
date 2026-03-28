import type { CurrencyCode } from "./config";

const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
  RW: "RWF",
  KE: "KES",
  UG: "UGX",
  TZ: "TZS",
  NG: "NGN",
  GH: "GHS",
  US: "USD",
};

export function detectCurrencyFromCountry(countryCode: string): CurrencyCode {
  const cc = countryCode.trim().toUpperCase();
  return COUNTRY_TO_CURRENCY[cc] ?? "USD";
}

export function getUserCurrency(profile: { country?: string | null }): CurrencyCode {
  const c = profile.country?.trim();
  if (c) return detectCurrencyFromCountry(c);
  return "USD";
}
