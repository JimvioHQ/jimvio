/**
 * UI + defaults for PawaPay MMO providers (extend via NEXT_PUBLIC_PAWAPAY_PROVIDERS).
 * For **USD** orders/subscriptions, all providers are shown and amounts are converted server-side
 * (see `lib/pawapay-convert.ts`: USD→RWF via RWF_TO_USD_RATE, USD→ZMW via PAWAPAY_ZMW_PER_USD).
 * For non-USD orders, only providers whose `currency` matches the order are listed.
 * @see https://docs.pawapay.io/v2/docs/providers
 */

export type PawaPayProviderOption = {
  id: string;
  label: string;
  /** ISO 4217 — must match order currency when using this provider */
  currency: string;
};

const FALLBACK: PawaPayProviderOption[] = [
  { id: "MTN_MOMO_ZMB", label: "MTN Mobile Money (Zambia · ZMW)", currency: "ZMW" },
  { id: "AIRTEL_MONEY_ZMB", label: "Airtel Money (Zambia · ZMW)", currency: "ZMW" },
  { id: "MTN_MOMO_RWA", label: "MTN Mobile Money (Rwanda · RWF)", currency: "RWF" },
  { id: "AIRTEL_MONEY_RWA", label: "Airtel Money (Rwanda · RWF)", currency: "RWF" },
];

export function getPawaPayProviderOptions(): PawaPayProviderOption[] {
  const raw = process.env.NEXT_PUBLIC_PAWAPAY_PROVIDERS?.trim();
  if (!raw) return FALLBACK;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return FALLBACK;
    return parsed
      .filter(
        (x): x is PawaPayProviderOption =>
          typeof x === "object" &&
          x !== null &&
          typeof (x as PawaPayProviderOption).id === "string" &&
          typeof (x as PawaPayProviderOption).label === "string" &&
          typeof (x as PawaPayProviderOption).currency === "string"
      )
      .map((x) => ({ id: x.id, label: x.label, currency: x.currency.toUpperCase() }));
  } catch {
    return FALLBACK;
  }
}

/** ISO 3166-1 alpha-2 → country calling code (no +) for MSISDN normalization */
export function defaultCountryCallingCodeForShipping(countryCode?: string | null): string {
  const cc = (countryCode || "RW").toUpperCase();
  const map: Record<string, string> = {
    RW: "250",
    ZM: "260",
    UG: "256",
    KE: "254",
    TZ: "255",
    GH: "233",
    NG: "234",
  };
  return map[cc] || "250";
}
