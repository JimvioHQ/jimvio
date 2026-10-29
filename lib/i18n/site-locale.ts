/**
 * N-6: site language. English, Kinyarwanda, French and Swahili.
 * The choice lives in the same cookie the UGC and Media areas already use,
 * so one switch changes the whole site.
 */
export type SiteLocale = "en" | "rw" | "fr" | "sw";

export const SITE_LOCALES: readonly { code: SiteLocale; label: string; short: string }[] = [
  { code: "en", label: "English", short: "EN" },
  { code: "rw", label: "Kinyarwanda", short: "RW" },
  { code: "fr", label: "Français", short: "FR" },
  { code: "sw", label: "Kiswahili", short: "SW" },
];

export const SITE_LOCALE_COOKIE = "jimvio-ugc-locale";

export function normalizeSiteLocale(value: unknown): SiteLocale {
  const v = String(value ?? "en").trim().toLowerCase();
  if (v === "rw" || v === "kin" || v === "kinyarwanda" || v.startsWith("rw")) return "rw";
  if (v === "fr" || v.startsWith("fr")) return "fr";
  if (v === "sw" || v === "swahili" || v === "kiswahili" || v.startsWith("sw")) return "sw";
  return "en";
}
