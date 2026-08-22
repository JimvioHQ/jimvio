/**
 * Compliance region + consent model (framework-agnostic, no React).
 *
 * Jimvio operates globally, so cookie/consent behaviour is region-aware:
 *  - GDPR (EEA + UK + Switzerland) and LGPD (Brazil): prior opt-in required —
 *    non-essential storage stays OFF until the user explicitly accepts.
 *  - CCPA/CPRA (US): opt-out model — allowed by default, with a
 *    "Do Not Sell or Share My Personal Information" control.
 *  - Everywhere else: informational — allowed by default, dismissible notice.
 *
 * Essential/functional cookies (auth session, security, currency, theme,
 * affiliate attribution) are always permitted; only analytics, personalization
 * and marketing are gated here.
 */

/** Bump when the cookie/privacy policy materially changes. Recorded with every consent. */
export const CONSENT_POLICY_VERSION = "2026-08-22";

/** Cookie + localStorage key holding the persisted consent decision. */
export const CONSENT_STORAGE_KEY = "jimvio_consent";

export type ConsentCategory = "essential" | "analytics" | "personalization" | "marketing";

/** Non-essential categories the user can toggle. `essential` is implicit + always true. */
export type ConsentState = {
  analytics: boolean;
  personalization: boolean;
  marketing: boolean;
};

export type ConsentRegime = "gdpr" | "lgpd" | "ccpa" | "default";

export type ConsentAction =
  | "accept_all"
  | "reject_all"
  | "save"
  | "withdraw"
  | "do_not_sell";

/** Persisted consent record shape (cookie/localStorage payload). */
export type StoredConsent = ConsentState & {
  v: string;
  regime: ConsentRegime;
  region: string | null;
  decidedAt: string;
};

// EU-27 + EEA EFTA (IS, LI, NO) + UK + Switzerland (FADP mirrors GDPR).
const GDPR_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE", "IS", "LI", "NO", "GB", "CH",
]);

const LGPD_COUNTRIES = new Set(["BR"]);

// Country-level geo only resolves to "US"; treat the US as CCPA/CPRA opt-out.
const CCPA_COUNTRIES = new Set(["US"]);

/** Classify a 2-letter ISO country code into a consent regime. */
export function regimeForCountry(country: string | null | undefined): ConsentRegime {
  const c = (country ?? "").trim().toUpperCase();
  if (GDPR_COUNTRIES.has(c)) return "gdpr";
  if (LGPD_COUNTRIES.has(c)) return "lgpd";
  if (CCPA_COUNTRIES.has(c)) return "ccpa";
  return "default";
}

/** Opt-in regimes must default every non-essential category to OFF. */
export function requiresPriorConsent(regime: ConsentRegime): boolean {
  return regime === "gdpr" || regime === "lgpd";
}

/** Default consent state before the user decides, per regime. */
export function defaultConsentForRegime(regime: ConsentRegime): ConsentState {
  if (requiresPriorConsent(regime)) {
    return { analytics: false, personalization: false, marketing: false };
  }
  // CCPA + default: opt-out model — enabled until the user opts out.
  return { analytics: true, personalization: true, marketing: true };
}

export const ALL_GRANTED: ConsentState = {
  analytics: true,
  personalization: true,
  marketing: true,
};

export const NONE_GRANTED: ConsentState = {
  analytics: false,
  personalization: false,
  marketing: false,
};

/** Whether a persisted decision is still valid for the current policy version. */
export function isStoredConsentCurrent(
  stored: StoredConsent | null | undefined,
): stored is StoredConsent {
  return Boolean(stored && stored.v === CONSENT_POLICY_VERSION);
}
