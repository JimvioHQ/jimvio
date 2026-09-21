/**
 * Flutterwave Mobile Money capability catalog (collection / direct charge).
 *
 * Source of truth for checkout: Flutterwave v3 *charge* (collection) docs.
 * Do NOT confuse with Mobile Money *transfer* (payout) documentation.
 *
 * Account enablement: optional FLW_MOMO_COUNTRIES (comma-separated ISO2)
 * restricts which catalog markets are offered. Initiate still fails safely
 * if Flutterwave rejects an unprovisioned method.
 *
 * Adding a market: extend FLUTTERWAVE_MOMO_CATALOG only — checkout UI reads
 * capabilities from the API and must not hardcode operators.
 */

export type FlutterwaveMoMoNetwork = {
  /** Value sent to Flutterwave `network` (when required). */
  id: string;
  label: string;
};

/** How the customer typically completes authorization after charge init. */
export type MoMoAuthorizationMode = "redirect" | "push" | "redirect_or_push";

export type FlutterwaveMoMoMarket = {
  countryCode: string;
  countryName: string;
  flag: string;
  currency: string;
  /** Dial digits without "+" (e.g. "250"). */
  dialCode: string;
  /** Flutterwave `/charges?type=` value. */
  chargeType: string;
  /** Hosted `payment_options` token (reference only — we use direct charge). */
  paymentOption: string;
  networks: FlutterwaveMoMoNetwork[];
  /** When true, `network` must be sent on charge. */
  requiresNetwork: boolean;
  /** Francophone franco charge requires `country` in body. */
  requiresCountryInPayload: boolean;
  requiresPhone: boolean;
  authorizationMode: MoMoAuthorizationMode;
  /** Expected national significant number length(s) after dial code. */
  localLengths: number[];
  /** Optional leading digit(s) of local mobile numbers (after stripping leading 0). */
  localPrefixPattern?: RegExp;
  /** Integer amounts vs 2dp. Most MoMo markets are whole units. */
  amountDecimals: 0 | 2;
};

/**
 * Documented Flutterwave Mobile Money *collection* markets (direct charge).
 * Not permanently complete — extend when Flutterwave documents new charge types.
 * Malawi (`mobilemoneymalawi`) appears in payment_options docs but has no
 * published v3 direct-charge collection endpoint in current API reference —
 * therefore it is intentionally omitted until a charge type exists.
 */
export const FLUTTERWAVE_MOMO_CATALOG: readonly FlutterwaveMoMoMarket[] = [
  {
    countryCode: "RW",
    countryName: "Rwanda",
    flag: "🇷🇼",
    currency: "RWF",
    dialCode: "250",
    chargeType: "mobile_money_rwanda",
    paymentOption: "mobilemoneyrwanda",
    networks: [
      { id: "MTN", label: "MTN" },
      { id: "AIRTEL", label: "Airtel" },
    ],
    requiresNetwork: true,
    requiresCountryInPayload: false,
    requiresPhone: true,
    authorizationMode: "redirect",
    localLengths: [9],
    localPrefixPattern: /^7/,
    amountDecimals: 0,
  },
  {
    countryCode: "KE",
    countryName: "Kenya",
    flag: "🇰🇪",
    currency: "KES",
    dialCode: "254",
    chargeType: "mpesa",
    paymentOption: "mpesa",
    networks: [{ id: "MPESA", label: "M-Pesa" }],
    requiresNetwork: false,
    requiresCountryInPayload: false,
    requiresPhone: true,
    authorizationMode: "push",
    localLengths: [9],
    localPrefixPattern: /^[17]/,
    amountDecimals: 0,
  },
  {
    countryCode: "UG",
    countryName: "Uganda",
    flag: "🇺🇬",
    currency: "UGX",
    dialCode: "256",
    chargeType: "mobile_money_uganda",
    paymentOption: "mobilemoneyuganda",
    networks: [
      { id: "MTN", label: "MTN" },
      { id: "AIRTEL", label: "Airtel" },
    ],
    requiresNetwork: true,
    requiresCountryInPayload: false,
    requiresPhone: true,
    authorizationMode: "redirect",
    localLengths: [9],
    localPrefixPattern: /^7/,
    amountDecimals: 0,
  },
  {
    countryCode: "GH",
    countryName: "Ghana",
    flag: "🇬🇭",
    currency: "GHS",
    dialCode: "233",
    chargeType: "mobile_money_ghana",
    paymentOption: "mobilemoneyghana",
    networks: [
      { id: "MTN", label: "MTN" },
      { id: "VODAFONE", label: "Telecel (Vodafone)" },
      { id: "AIRTELTIGO", label: "AirtelTigo" },
    ],
    requiresNetwork: true,
    requiresCountryInPayload: false,
    requiresPhone: true,
    authorizationMode: "redirect",
    localLengths: [9],
    localPrefixPattern: /^[235]/,
    amountDecimals: 2,
  },
  {
    countryCode: "TZ",
    countryName: "Tanzania",
    flag: "🇹🇿",
    currency: "TZS",
    dialCode: "255",
    chargeType: "mobile_money_tanzania",
    paymentOption: "mobilemoneytanzania",
    networks: [
      { id: "AIRTEL", label: "Airtel" },
      { id: "HALOPESA", label: "HaloPesa" },
      { id: "TIGO", label: "Tigo" },
      { id: "VODACOM", label: "Vodacom" },
    ],
    requiresNetwork: true,
    requiresCountryInPayload: false,
    requiresPhone: true,
    authorizationMode: "push",
    localLengths: [9],
    localPrefixPattern: /^[67]/,
    amountDecimals: 0,
  },
  {
    countryCode: "ZM",
    countryName: "Zambia",
    flag: "🇿🇲",
    currency: "ZMW",
    dialCode: "260",
    chargeType: "mobile_money_zambia",
    paymentOption: "mobilemoneyzambia",
    networks: [
      { id: "MTN", label: "MTN" },
      { id: "AIRTEL", label: "Airtel" },
      { id: "ZAMTEL", label: "Zamtel" },
    ],
    requiresNetwork: true,
    requiresCountryInPayload: false,
    requiresPhone: true,
    authorizationMode: "redirect",
    localLengths: [9],
    localPrefixPattern: /^[97]/,
    amountDecimals: 2,
  },
  {
    countryCode: "CM",
    countryName: "Cameroon",
    flag: "🇨🇲",
    currency: "XAF",
    dialCode: "237",
    chargeType: "mobile_money_franco",
    paymentOption: "mobilemoneyxaf",
    networks: [
      { id: "MTN", label: "MTN" },
      { id: "ORANGEMONEY", label: "Orange Money" },
    ],
    requiresNetwork: true,
    requiresCountryInPayload: true,
    requiresPhone: true,
    authorizationMode: "redirect_or_push",
    localLengths: [8, 9],
    amountDecimals: 0,
  },
  {
    countryCode: "CI",
    countryName: "Côte d'Ivoire",
    flag: "🇨🇮",
    currency: "XOF",
    dialCode: "225",
    chargeType: "mobile_money_franco",
    paymentOption: "mobilemoneyxof",
    networks: [
      { id: "MTN", label: "MTN" },
      { id: "ORANGE", label: "Orange" },
      { id: "MOOV", label: "Moov" },
      { id: "WAVE", label: "Wave" },
    ],
    requiresNetwork: true,
    requiresCountryInPayload: true,
    requiresPhone: true,
    authorizationMode: "redirect_or_push",
    localLengths: [8, 10],
    amountDecimals: 0,
  },
  {
    countryCode: "SN",
    countryName: "Senegal",
    flag: "🇸🇳",
    currency: "XOF",
    dialCode: "221",
    chargeType: "mobile_money_franco",
    paymentOption: "mobilemoneyxof",
    networks: [
      { id: "ORANGEMONEY", label: "Orange Money" },
      { id: "WAVE", label: "Wave" },
    ],
    requiresNetwork: true,
    requiresCountryInPayload: true,
    requiresPhone: true,
    authorizationMode: "redirect_or_push",
    localLengths: [9],
    amountDecimals: 0,
  },
  {
    countryCode: "BF",
    countryName: "Burkina Faso",
    flag: "🇧🇫",
    currency: "XOF",
    dialCode: "226",
    chargeType: "mobile_money_franco",
    paymentOption: "mobilemoneyxof",
    networks: [
      { id: "ORANGEMONEY", label: "Orange Money" },
      { id: "MOBICASH", label: "Moov (MobiCash)" },
    ],
    requiresNetwork: true,
    requiresCountryInPayload: true,
    requiresPhone: true,
    authorizationMode: "redirect_or_push",
    localLengths: [8],
    amountDecimals: 0,
  },
] as const;

function parseEnabledCountryAllowlist(): Set<string> | null {
  const raw = process.env.FLW_MOMO_COUNTRIES?.trim();
  if (!raw) return null;
  const codes = raw
    .split(/[,;\s]+/)
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
  if (codes.length === 0) return null;
  return new Set(codes);
}

/** Markets offered for the current Jimvio / Flutterwave configuration. */
export function getFlutterwaveMobileMoneyCapabilities(): FlutterwaveMoMoMarket[] {
  const allow = parseEnabledCountryAllowlist();
  if (!allow) return [...FLUTTERWAVE_MOMO_CATALOG];
  return FLUTTERWAVE_MOMO_CATALOG.filter((m) => allow.has(m.countryCode));
}

export function getMoMoMarketByCountry(
  countryCode: string | null | undefined,
): FlutterwaveMoMoMarket | null {
  const code = String(countryCode ?? "")
    .trim()
    .toUpperCase();
  if (!code) return null;
  return (
    getFlutterwaveMobileMoneyCapabilities().find((m) => m.countryCode === code) ??
    null
  );
}

export function isMoMoCountrySupported(countryCode: string | null | undefined): boolean {
  return getMoMoMarketByCountry(countryCode) != null;
}

export function isMoMoNetworkSupported(
  market: FlutterwaveMoMoMarket,
  networkId: string | null | undefined,
): boolean {
  if (!market.requiresNetwork) return true;
  const id = String(networkId ?? "")
    .trim()
    .toUpperCase();
  if (!id) return false;
  return market.networks.some((n) => n.id.toUpperCase() === id);
}

export function resolveMoMoNetwork(
  market: FlutterwaveMoMoMarket,
  networkId: string | null | undefined,
): string | null {
  if (!market.requiresNetwork) {
    return market.networks[0]?.id ?? null;
  }
  const id = String(networkId ?? "")
    .trim()
    .toUpperCase();
  const match = market.networks.find((n) => n.id.toUpperCase() === id);
  return match?.id ?? null;
}

export type MoMoPhoneValidation =
  | { ok: true; e164Digits: string; masked: string }
  | { ok: false; error: string };

/** Normalize + validate phone for a MoMo market. Never trust client formatting. */
export function normalizeMoMoPhone(
  market: FlutterwaveMoMoMarket,
  rawPhone: string,
): MoMoPhoneValidation {
  const digits = String(rawPhone ?? "").replace(/[^\d]/g, "");
  if (!digits) {
    return { ok: false, error: "Please enter a valid Mobile Money number." };
  }

  let national = digits;
  if (national.startsWith(market.dialCode)) {
    national = national.slice(market.dialCode.length);
  } else if (national.startsWith("0")) {
    national = national.replace(/^0+/, "");
  }

  if (!market.localLengths.includes(national.length)) {
    return {
      ok: false,
      error: `Please enter a valid ${market.countryName} Mobile Money number.`,
    };
  }

  if (market.localPrefixPattern && !market.localPrefixPattern.test(national)) {
    return {
      ok: false,
      error: `Please enter a valid ${market.countryName} Mobile Money number.`,
    };
  }

  const e164Digits = `${market.dialCode}${national}`;
  if (e164Digits.length < 10 || e164Digits.length > 15) {
    return { ok: false, error: "Please enter a valid Mobile Money number." };
  }

  return {
    ok: true,
    e164Digits,
    masked: maskPhone(e164Digits),
  };
}

export function maskPhone(e164Digits: string): string {
  const d = e164Digits.replace(/[^\d]/g, "");
  if (d.length < 6) return "***";
  return `${d.slice(0, 3)}***${d.slice(-3)}`;
}

/** Public capability payload for checkout UI (no secrets). */
export function serializeMoMoCapabilitiesForClient() {
  return getFlutterwaveMobileMoneyCapabilities().map((m) => ({
    countryCode: m.countryCode,
    countryName: m.countryName,
    flag: m.flag,
    currency: m.currency,
    dialCode: `+${m.dialCode}`,
    requiresNetwork: m.requiresNetwork,
    requiresPhone: m.requiresPhone,
    authorizationMode: m.authorizationMode,
    networks: m.networks.map((n) => ({ id: n.id, label: n.label })),
  }));
}

/** Unique provider labels across all offered markets — for generic card hint only. */
export function uniqueMoMoProviderLabels(limit = 6): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of getFlutterwaveMobileMoneyCapabilities()) {
    for (const n of m.networks) {
      if (seen.has(n.label)) continue;
      seen.add(n.label);
      out.push(n.label);
      if (out.length >= limit) return out;
    }
  }
  return out;
}
