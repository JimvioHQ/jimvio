"use client";

/**
 * LocaleContext — additive i18n runtime foundation.
 *
 * Resolves the active UI locale (persisted cookie/localStorage → browser →
 * default), keeps `<html lang/dir>` in sync, and exposes locale-aware Intl
 * formatters plus the resolved region + time zone. It complements (does not
 * replace) `CurrencyContext`, and integrates with the existing
 * `profiles.language` preference set in account settings.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  SUPPORTED_LOCALES,
  isLocaleCode,
  localeMeta,
  normalizeLocale,
  type LocaleCode,
  type LocaleMeta,
} from "@/lib/i18n/config";
import { detectBrowserCountry } from "@/lib/geo/buyer-country";

type LocaleContextValue = {
  locale: LocaleCode;
  meta: LocaleMeta;
  /** BCP-47 tag for Intl APIs. */
  bcp47: string;
  dir: "ltr" | "rtl";
  /** ISO country resolved from the browser (best-effort). */
  region: string | null;
  /** IANA time zone resolved from the browser. */
  timeZone: string;
  ready: boolean;
  setLocale: (code: LocaleCode) => void;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatRelativeTime: (value: Date | string | number) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readInitialLocale(): LocaleCode {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const stored = window.localStorage.getItem(LOCALE_COOKIE);
    if (stored && isLocaleCode(stored)) return stored;
  } catch {
    /* ignore */
  }
  try {
    const match = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${LOCALE_COOKIE}=`));
    if (match) {
      const value = decodeURIComponent(match.split("=")[1] ?? "");
      if (isLocaleCode(value)) return value;
    }
  } catch {
    /* ignore */
  }
  if (typeof navigator !== "undefined") {
    return normalizeLocale(navigator.language);
  }
  return DEFAULT_LOCALE;
}

function resolveTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(DEFAULT_LOCALE);
  const [region, setRegion] = useState<string | null>(null);
  const [timeZone, setTimeZone] = useState<string>("UTC");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const resolved = readInitialLocale();
    setLocaleState(resolved);
    setRegion(detectBrowserCountry("") || null);
    setTimeZone(resolveTimeZone());
    setReady(true);
  }, []);

  // Keep <html lang/dir> in sync so a11y/SEO reflect the active locale.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const meta = localeMeta(locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = meta.dir;
  }, [locale]);

  const setLocale = useCallback((code: LocaleCode) => {
    if (!isLocaleCode(code)) return;
    setLocaleState(code);
    try {
      window.localStorage.setItem(LOCALE_COOKIE, code);
    } catch {
      /* ignore */
    }
    try {
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      const oneYear = 60 * 60 * 24 * 365;
      document.cookie = `${LOCALE_COOKIE}=${code}; Path=/; Max-Age=${oneYear}; SameSite=Lax${secure}`;
    } catch {
      /* ignore */
    }
    // Best-effort write-through to the signed-in user's stored `profiles.language`.
    // Anonymous visitors 401 harmlessly; the cookie/localStorage value still persists.
    try {
      void fetch("/api/identity/update", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ language: code }),
      }).catch(() => undefined);
    } catch {
      /* ignore */
    }
  }, []);

  const bcp47 = SUPPORTED_LOCALES[locale]?.bcp47 ?? "en";

  const formatDate = useCallback(
    (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => {
      const date = value instanceof Date ? value : new Date(value);
      const opts: Intl.DateTimeFormatOptions = options ?? {
        year: "numeric",
        month: "short",
        day: "numeric",
      };
      try {
        return new Intl.DateTimeFormat(bcp47, { timeZone, ...opts }).format(date);
      } catch {
        return new Intl.DateTimeFormat("en", opts).format(date);
      }
    },
    [bcp47, timeZone],
  );

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) => {
      try {
        return new Intl.NumberFormat(bcp47, options).format(value);
      } catch {
        return new Intl.NumberFormat("en", options).format(value);
      }
    },
    [bcp47],
  );

  const formatRelativeTime = useCallback(
    (value: Date | string | number) => {
      const date = value instanceof Date ? value : new Date(value);
      const diffMs = date.getTime() - Date.now();
      const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
        ["year", 1000 * 60 * 60 * 24 * 365],
        ["month", 1000 * 60 * 60 * 24 * 30],
        ["week", 1000 * 60 * 60 * 24 * 7],
        ["day", 1000 * 60 * 60 * 24],
        ["hour", 1000 * 60 * 60],
        ["minute", 1000 * 60],
        ["second", 1000],
      ];
      try {
        const rtf = new Intl.RelativeTimeFormat(bcp47, { numeric: "auto" });
        for (const [unit, ms] of units) {
          if (Math.abs(diffMs) >= ms || unit === "second") {
            return rtf.format(Math.round(diffMs / ms), unit);
          }
        }
        return rtf.format(0, "second");
      } catch {
        return date.toLocaleString("en");
      }
    },
    [bcp47],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      meta: localeMeta(locale),
      bcp47,
      dir: SUPPORTED_LOCALES[locale]?.dir ?? "ltr",
      region,
      timeZone,
      ready,
      setLocale,
      formatDate,
      formatNumber,
      formatRelativeTime,
    }),
    [locale, bcp47, region, timeZone, ready, setLocale, formatDate, formatNumber, formatRelativeTime],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** Safe outside a provider: returns default-locale (English) formatters. */
export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    return {
      locale: DEFAULT_LOCALE,
      meta: localeMeta(DEFAULT_LOCALE),
      bcp47: "en",
      dir: "ltr",
      region: null,
      timeZone: "UTC",
      ready: false,
      setLocale: () => {},
      formatDate: (v, o) => new Intl.DateTimeFormat("en", o).format(v instanceof Date ? v : new Date(v)),
      formatNumber: (v, o) => new Intl.NumberFormat("en", o).format(v),
      formatRelativeTime: (v) => (v instanceof Date ? v : new Date(v)).toLocaleString("en"),
    };
  }
  return ctx;
}
