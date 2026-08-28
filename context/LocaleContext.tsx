"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import {
  normalizeUgcLocale,
  ugcMessage,
  UGC_LOCALE_COOKIE,
  type UgcLocale,
  type UgcMessageKey,
} from "@/lib/ugc/i18n/messages";

type LocaleContextValue = {
  locale: UgcLocale;
  t: (key: UgcMessageKey, vars?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  language,
}: {
  children: ReactNode;
  language?: string | null;
}) {
  const locale = normalizeUgcLocale(language);
  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      t: (key, vars) => ugcMessage(locale, key, vars),
    }),
    [locale],
  );

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.lang;
    root.lang = locale;
    document.cookie = `${UGC_LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    return () => {
      root.lang = previous || "en";
    };
  }, [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    return {
      locale: "en" as UgcLocale,
      t: (key: UgcMessageKey, vars?: Record<string, string | number>) => ugcMessage("en", key, vars),
    };
  }
  return ctx;
}
