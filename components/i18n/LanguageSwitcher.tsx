"use client";

import CustomSelect from "@/components/ui/select-2";
import { useLocale } from "@/context/LocaleContext";
import { LOCALE_CODES, SUPPORTED_LOCALES, type LocaleCode } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

/**
 * Global UI language switcher. Persists to cookie/localStorage and (for
 * signed-in users) write-through to `profiles.language` via LocaleContext.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, ready } = useLocale();
  const value = ready ? locale : "en";

  return (
    <CustomSelect
      className={cn(
        "rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)]",
        className,
      )}
      options={LOCALE_CODES.map((code) => ({
        label: SUPPORTED_LOCALES[code].nativeLabel,
        value: code,
      }))}
      textSize="xs"
      value={value}
      onChange={(v) => setLocale(v as LocaleCode)}
    />
  );
}
