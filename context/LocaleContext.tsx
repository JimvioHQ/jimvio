"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  normalizeUgcLocale,
  ugcMessage,
  type UgcLocale,
  type UgcMessageKey,
} from "@/lib/ugc/i18n/messages";

type LocaleContextValue = {
  locale: UgcLocale;
  t: (key: UgcMessageKey) => string;
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
      t: (key) => ugcMessage(locale, key),
    }),
    [locale],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    return {
      locale: "en" as UgcLocale,
      t: (key: UgcMessageKey) => ugcMessage("en", key),
    };
  }
  return ctx;
}
