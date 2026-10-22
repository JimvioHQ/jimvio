import { normalizeUgcLocale, type UgcLocale } from "@/lib/ugc/i18n/messages";

export const SETTINGS_LANGUAGES = [
  { value: "en", label: "English", note: "Used across Jimvio, including UGC." },
  { value: "fr", label: "Français", note: "Applied on UGC surfaces that are translated." },
  { value: "rw", label: "Kinyarwanda", note: "Applied on UGC surfaces that are translated." },
] as const;

export type SettingsLanguage = (typeof SETTINGS_LANGUAGES)[number]["value"];

export const SETTINGS_CURRENCIES = ["USD"] as const;

export const COMMON_TIMEZONES = [
  "UTC",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Kigali",
  "Africa/Lagos",
  "Africa/Nairobi",
  "America/Chicago",
  "America/Los_Angeles",
  "America/New_York",
  "America/Sao_Paulo",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/Berlin",
  "Europe/London",
  "Europe/Paris",
] as const;

export function isSettingsLanguage(value: string): value is SettingsLanguage {
  return SETTINGS_LANGUAGES.some((item) => item.value === value);
}

export function toUgcLocale(language: string): UgcLocale {
  return normalizeUgcLocale(language);
}

export function isValidTimeZone(value: string): boolean {
  const zone = value.trim();
  if (!zone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}
