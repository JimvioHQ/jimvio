"use client";

import { Globe } from "lucide-react";
import { SITE_LOCALES, type SiteLocale } from "@/lib/i18n/site-locale";
import { useSetSiteLocale, useSiteLocale, useSiteT } from "@/components/providers/site-locale-provider";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useSiteLocale();
  const setLocale = useSetSiteLocale();
  const t = useSiteT();
  return (
    <label className={cn("inline-flex items-center gap-1.5 text-xs text-text-muted", className)}>
      <Globe size={13} aria-hidden />
      <span className="sr-only">{t("Language")}</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as SiteLocale)}
        className="cursor-pointer rounded-md border border-border bg-surface px-1.5 py-1 text-xs text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
      >
        {SITE_LOCALES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
