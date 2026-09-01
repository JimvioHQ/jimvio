"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { AppTopNav } from "@/components/shell/AppTopNav";
import { UGCWorkspaceSidebar } from "./UGCWorkspaceSidebar";
import { useLocale } from "@/context/LocaleContext";

type UGCWorkspaceShellProps = {
  children: React.ReactNode;
  user?: {
    name: string;
    avatarUrl?: string | null;
    isPremium?: boolean;
    username?: string | null;
    identityHref?: string;
  };
};

export function UGCWorkspaceShell({ children, user }: UGCWorkspaceShellProps) {
  const [mobileNav, setMobileNav] = useState(false);
  const { t } = useLocale();

  useEffect(() => {
    if (!mobileNav) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNav(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNav]);

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-bg)]">
      <AppTopNav showUtilityBar activeNav="UGC & Clipping" user={user} />

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] lg:block">
          <Suspense fallback={<div className="h-full w-[220px] animate-pulse bg-[var(--color-surface-secondary)]" />}>
            <UGCWorkspaceSidebar />
          </Suspense>
        </aside>

        {mobileNav && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label={t("closeNav")}
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileNav(false)}
            />
            <aside
              id="ugc-mobile-nav"
              className="relative h-full w-[min(280px,88vw)] bg-[var(--color-surface)] shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label={t("ugcClipping")}
            >
              <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">{t("ugcClipping")}</span>
                <button
                  type="button"
                  onClick={() => setMobileNav(false)}
                  aria-label={t("closeNav")}
                  className="grid h-11 w-11 place-items-center rounded-xl"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <Suspense fallback={null}>
                <UGCWorkspaceSidebar onNavigate={() => setMobileNav(false)} />
              </Suspense>
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 overflow-y-auto bg-[var(--color-bg)]">
          <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg)_92%,transparent)] px-4 py-2.5 backdrop-blur-md lg:hidden">
            <button
              type="button"
              onClick={() => setMobileNav(true)}
              className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_1px_2px_rgba(17,24,39,0.04)]"
              aria-label={t("openNav")}
              aria-expanded={mobileNav}
              aria-controls="ugc-mobile-nav"
            >
              <Menu className="h-4 w-4" />
            </button>
            <span className="min-w-0 truncate text-sm font-semibold text-[var(--color-text-primary)]">{t("ugcClipping")}</span>
            <Link href="/" className="ml-auto inline-flex min-h-11 items-center text-xs font-semibold text-[#FF5A1F]">
              {t("openCreatorOs")}
            </Link>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
