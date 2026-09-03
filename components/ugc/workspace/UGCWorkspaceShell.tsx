"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppTopNav } from "@/components/shell/AppTopNav";
import { UGCWorkspaceSidebar, UGC_MOBILE_TABS } from "./UGCWorkspaceSidebar";
import { useLocale } from "@/context/LocaleContext";
import { cn } from "@/lib/utils";

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
  const pathname = usePathname();

  useEffect(() => {
    if (!mobileNav) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNav(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNav]);

  return (
    <div className="flex min-h-dvh flex-col bg-[#F8FAFC]">
      <AppTopNav showUtilityBar activeNav="UGC & Clipping" user={user} />

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden shrink-0 lg:block">
          <Suspense fallback={<div className="h-full w-[228px] animate-pulse bg-white" />}>
            <UGCWorkspaceSidebar />
          </Suspense>
        </aside>

        {mobileNav ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label={t("closeNav")}
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileNav(false)}
            />
            <aside
              id="ugc-mobile-nav"
              className="relative h-full w-[min(280px,88vw)] bg-white shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label={t("ugcClipping")}
            >
              <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3">
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
              <Suspense fallback={null}>
                <UGCWorkspaceSidebar onNavigate={() => setMobileNav(false)} />
              </Suspense>
            </aside>
          </div>
        ) : null}

        <main className="min-w-0 flex-1 overflow-y-auto bg-[#F8FAFC] pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
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

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E5E7EB] bg-white px-1 pb-[env(safe-area-inset-bottom)] pt-1 lg:hidden"
        aria-label="UGC work navigation"
      >
        <ul className="grid grid-cols-4">
          {UGC_MOBILE_TABS.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/ugc"
                ? pathname === "/ugc" || pathname === "/ugc/"
                : pathname.startsWith(item.href);
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex min-h-12 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium",
                    active ? "text-[#FF5A1F]" : "text-[#64748B]",
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={active ? 2.2 : 1.8} />
                  <span className="truncate">{item.label.replace(" Campaigns", "")}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
