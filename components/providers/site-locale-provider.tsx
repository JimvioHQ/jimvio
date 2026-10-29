"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { SITE_LOCALE_COOKIE, type SiteLocale } from "@/lib/i18n/site-locale";
import { siteT } from "@/lib/i18n/site-messages";

const SiteLocaleContext = createContext<SiteLocale>("en");

export function SiteLocaleProvider({ locale, children }: { locale: SiteLocale; children: ReactNode }) {
  return <SiteLocaleContext.Provider value={locale}>{children}</SiteLocaleContext.Provider>;
}

export function useSiteLocale(): SiteLocale {
  return useContext(SiteLocaleContext);
}

/** Translate site chrome text; falls back to the English text. */
export function useSiteT(): (text: string) => string {
  const locale = useSiteLocale();
  return useCallback((text: string) => siteT(locale, text), [locale]);
}

/** Saves the language for a year and re-renders the page in it. */
export function useSetSiteLocale(): (code: SiteLocale) => void {
  const router = useRouter();
  return useCallback(
    (code: SiteLocale) => {
      document.cookie = `${SITE_LOCALE_COOKIE}=${code}; Path=/; Max-Age=31536000; SameSite=Lax`;
      document.documentElement.lang = code;
      router.refresh();
    },
    [router],
  );
}
