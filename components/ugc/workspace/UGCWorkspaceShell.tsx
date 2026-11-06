"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { AppTopNav } from "@/components/shell/AppTopNav";
import { UGCWorkspaceSidebar } from "./UGCWorkspaceSidebar";
import { useLocale } from "@/context/LocaleContext";
import { cn } from "@/lib/utils";
import {
  MobilePrimaryBottomNav,
  MOBILE_PRIMARY_BOTTOM_NAV_PAD,
} from "@/components/layout/mobile-primary-bottom-nav";

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
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileNav]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#F8FAFC]">
      <AppTopNav showUtilityBar activeNav="UGC & Clipping" user={user} />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden h-full shrink-0 self-stretch overflow-hidden lg:block">
          <Suspense fallback={<div className="h-full w-[228px] animate-pulse bg-white" />}>
            <UGCWorkspaceSidebar />
          </Suspense>
        </aside>

        {/* Always-mounted drawer — above bottom nav (z-100); CSS open only */}
        <div
          className={cn(
            "fixed inset-0 z-[110] lg:hidden",
            mobileNav ? "pointer-events-auto" : "pointer-events-none",
          )}
          aria-hidden={!mobileNav}
        >
          <button
            type="button"
            aria-label={t("closeNav")}
            tabIndex={mobileNav ? 0 : -1}
            className={cn(
              "absolute inset-0 bg-black/40 transition-opacity duration-150",
              mobileNav ? "opacity-100" : "opacity-0",
            )}
            onClick={() => setMobileNav(false)}
          />
          <aside
            id="ugc-mobile-nav"
            className={cn(
              "relative flex h-full w-[min(300px,88vw)] flex-col bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl transition-transform duration-150 ease-out",
              mobileNav ? "translate-x-0" : "-translate-x-full",
            )}
            role="dialog"
            aria-modal={mobileNav}
            aria-label={t("ugcClipping")}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[#E5E7EB] px-4 py-3">
              <span className="text-sm font-semibold text-[#111827]">{t("ugcClipping")}</span>
              <button
                type="button"
                onClick={() => setMobileNav(false)}
                aria-label={t("closeNav")}
                className="grid h-11 w-11 place-items-center rounded-xl"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <Suspense fallback={null}>
                <UGCWorkspaceSidebar variant="drawer" onNavigate={() => setMobileNav(false)} />
              </Suspense>
            </div>
          </aside>
        </div>

        <main className={`min-w-0 flex-1 overflow-y-auto bg-[#F8FAFC] ${MOBILE_PRIMARY_BOTTOM_NAV_PAD}`}>
          <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-[#E5E7EB] bg-[#F8FAFC]/92 px-4 py-2.5 backdrop-blur-md lg:hidden">
            <button
              type="button"
              onClick={() => setMobileNav(true)}
              className="grid h-11 w-11 place-items-center rounded-xl border border-[#E5E7EB] bg-white"
              aria-label={t("openNav")}
              aria-expanded={mobileNav}
              aria-controls="ugc-mobile-nav"
            >
              <Menu className="h-4 w-4" />
            </button>
            <span className="min-w-0 truncate text-sm font-semibold text-[#111827]">
              {t("ugcClipping")}
            </span>
            <Link
              href="/"
              className="ml-auto inline-flex min-h-11 items-center text-xs font-semibold text-[#FF5A1F]"
            >
              {t("openCreatorOs")}
            </Link>
          </div>
          {children}
        </main>
      </div>

      <MobilePrimaryBottomNav isAuthenticated={Boolean(user)} />
    </div>
  );
}
