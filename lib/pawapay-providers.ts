/**
 * UI + defaults for PawaPay MMO providers (extend via NEXT_PUBLIC_PAWAPAY_PROVIDERS).
 * For **USD** orders/subscriptions, all providers are shown and amounts are converted server-side
 * (see `lib/pawapay-convert.ts`: USD→RWF via RWF_TO_USD_RATE, USD→ZMW via PAWAPAY_ZMW_PER_USD).
 * For non-USD orders, only providers whose `currency` matches the order are listed.
 * @see https://docs.pawapay.io/v2/docs/providers
 */

/** Mobile network brand for checkout UI (MTN / Airtel / other). */
export type PawaPayProviderBrand = "mtn" | "airtel" | "other";

export type PawaPayProviderOption = {
  id: string;
  label: string;
  /** ISO 4217 — must match order currency when using this provider */
  currency: string;
  /** ISO 3166-1 alpha-2 — optional; inferred from provider id when omitted */
  countryCode?: string;
  /** Optional; inferred from provider id when omitted */
  brand?: PawaPayProviderBrand;
};

const COUNTRY_LABEL: Record<string, string> = {
  RW: "Rwanda",
  ZM: "Zambia",
  UG: "Uganda",
  KE: "Kenya",
  TZ: "Tanzania",
  GH: "Ghana",
  NG: "Nigeria",
};

/** Flag image URL (square crop, good for cards). */
export function pawaPayCountryFlagUrl(countryCode: string): string {
  const cc = countryCode.trim().toLowerCase();
  return `https://flagcdn.com/w80/${cc}.png`;
}

function inferCountryCodeFromProviderId(id: string): string {
  const u = id.toUpperCase();
  const suffixes: [RegExp, string][] = [
    [/_RWA\b/, "RW"],
    [/_RW\b/, "RW"],
    [/_ZMB\b/, "ZM"],
    [/_ZM\b/, "ZM"],
    [/_UGA\b/, "UG"],
    [/_UG\b/, "UG"],
    [/_KEN\b/, "KE"],
    [/_KE\b/, "KE"],
    [/_TZA\b/, "TZ"],
    [/_TZ\b/, "TZ"],
    [/_GHA\b/, "GH"],
    [/_GH\b/, "GH"],
    [/_NGA\b/, "NG"],
    [/_NG\b/, "NG"],
  ];
  for (const [re, code] of suffixes) {
    if (re.test(u)) return code;
  }
  return "RW";
}

function inferBrandFromProviderId(id: string): PawaPayProviderBrand {
  const u = id.toUpperCase();
  if (u.includes("MTN")) return "mtn";
  if (u.includes("AIRTEL")) return "airtel";
  return "other";
}

/** Visual metadata for network cards (flags + MTN/Airtel). */
export function getPawaPayProviderVisual(p: PawaPayProviderOption): {
  countryCode: string;
  countryName: string;
  brand: PawaPayProviderBrand;
  brandLabel: string;
} {
  const countryCode = (p.countryCode || inferCountryCodeFromProviderId(p.id)).toUpperCase();
  const brand = p.brand ?? inferBrandFromProviderId(p.id);
  const countryName = COUNTRY_LABEL[countryCode] ?? countryCode;
  const brandLabel =
    brand === "mtn" ? "MTN" : brand === "airtel" ? "Airtel" : "Mobile money";
  return { countryCode, countryName, brand, brandLabel };
}

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
      .map((x) => {
        const opt: PawaPayProviderOption = {
          id: x.id,
          label: x.label,
          currency: x.currency.toUpperCase(),
        };
        const rawCc = (x as PawaPayProviderOption).countryCode;
        if (typeof rawCc === "string" && /^[a-zA-Z]{2}$/.test(rawCc)) {
          opt.countryCode = rawCc.toUpperCase();
        }
        const rawBrand = (x as PawaPayProviderOption).brand;
        if (rawBrand === "mtn" || rawBrand === "airtel" || rawBrand === "other") {
          opt.brand = rawBrand;
        }
        return opt;
      });
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
