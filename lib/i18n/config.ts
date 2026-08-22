/**
 * Locale configuration (framework-agnostic, no React).
 *
 * Additive i18n foundation: provides the supported-locale registry and
 * normalization used by `LocaleContext`. Copy is still English today; this
 * wires locale-aware formatting + a persisted user language preference on top
 * of the existing `profiles.language` field without rewriting existing strings.
 */

export type LocaleCode = "en" | "fr" | "rw" | "es" | "de" | "pt" | "ar";

export const DEFAULT_LOCALE: LocaleCode = "en";

/** Cookie + localStorage key holding the user's chosen UI locale. */
export const LOCALE_COOKIE = "jimvio_locale";

export type LocaleMeta = {
  code: LocaleCode;
  /** English name. */
  label: string;
  /** Endonym (name in its own language). */
  nativeLabel: string;
  /** BCP-47 tag passed to the Intl APIs. */
  bcp47: string;
  dir: "ltr" | "rtl";
};

export const SUPPORTED_LOCALES: Record<LocaleCode, LocaleMeta> = {
  en: { code: "en", label: "English", nativeLabel: "English", bcp47: "en", dir: "ltr" },
  fr: { code: "fr", label: "French", nativeLabel: "Français", bcp47: "fr", dir: "ltr" },
  rw: { code: "rw", label: "Kinyarwanda", nativeLabel: "Kinyarwanda", bcp47: "rw", dir: "ltr" },
  es: { code: "es", label: "Spanish", nativeLabel: "Español", bcp47: "es", dir: "ltr" },
  de: { code: "de", label: "German", nativeLabel: "Deutsch", bcp47: "de", dir: "ltr" },
  pt: { code: "pt", label: "Portuguese", nativeLabel: "Português", bcp47: "pt", dir: "ltr" },
  ar: { code: "ar", label: "Arabic", nativeLabel: "العربية", bcp47: "ar", dir: "rtl" },
};

export const LOCALE_CODES = Object.keys(SUPPORTED_LOCALES) as LocaleCode[];

export function isLocaleCode(value: string): value is LocaleCode {
  return value in SUPPORTED_LOCALES;
}

/** Coerce any browser/profile locale string (e.g. "fr-FR", "en_US") to a supported code. */
export function normalizeLocale(input: string | null | undefined): LocaleCode {
  if (!input) return DEFAULT_LOCALE;
  const base = input.trim().toLowerCase().split(/[-_]/)[0];
  return isLocaleCode(base) ? base : DEFAULT_LOCALE;
}

export function localeMeta(code: LocaleCode): LocaleMeta {
  return SUPPORTED_LOCALES[code] ?? SUPPORTED_LOCALES[DEFAULT_LOCALE];
}
