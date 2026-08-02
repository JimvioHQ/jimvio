"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ArrowLeftRight,
  BarChart3,
  Bot,
  Fingerprint,
  Gift,
  LandmarkIcon,
  LayoutGrid,
  Lock,
  Menu,
  Receipt,
  RefreshCcw,
  ShieldCheck,
  Wallet as WalletIcon,
  X,
} from "lucide-react";
import { cn, WalletScope } from "./wallet-ui";

type WalletNavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const WALLET_OS_NAV: WalletNavItem[] = [
  { href: "/wallet", label: "Overview", icon: LayoutGrid },
  { href: "/wallet/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/wallet/withdrawals", label: "Withdrawals", icon: LandmarkIcon },
  { href: "/wallet/deposits", label: "Deposits", icon: RefreshCcw },
  { href: "/wallet/escrow", label: "Escrow", icon: Lock },
  { href: "/wallet/subscriptions", label: "Subscriptions", icon: Receipt },
  { href: "/wallet/rewards", label: "Rewards", icon: Gift },
  { href: "/wallet/invoices", label: "Invoices", icon: Fingerprint },
  { href: "/wallet/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/wallet/security", label: "Security", icon: ShieldCheck },
  { href: "/wallet/ai", label: "AI Assistant", icon: Bot },
];

function isNavActive(pathname: string, href: string) {
  if (href === "/wallet") return pathname === "/wallet";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function WordMark() {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#FF5A1F] text-white shadow-[0_6px_16px_-4px_rgba(255,90,31,0.6)]">
        <WalletIcon className="h-4 w-4" />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[13.5px] font-semibold text-white">Wallet OS</p>
        <p className="truncate text-[10.5px] font-medium uppercase tracking-[0.14em] text-white/40">Jimvio</p>
      </div>
    </div>
  );
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2.5">
      {WALLET_OS_NAV.map((item) => {
        const Icon = item.icon;
        const active = isNavActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors",
              active ? "bg-white/[0.08] text-white" : "text-white/55 hover:bg-white/[0.05] hover:text-white/90",
            )}
          >
            {active && <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-[#FF5A1F]" />}
            <Icon className={cn("h-4 w-4 shrink-0", active && "text-[#FF7A45]")} />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function WalletOsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/wallet";
  const [mobileNav, setMobileNav] = useState(false);
  const activeItem = WALLET_OS_NAV.find((item) => isNavActive(pathname, item.href));

  return (
    <WalletScope>
      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="hidden w-[240px] shrink-0 flex-col bg-[#0E0E10] py-5 lg:flex">
          <WordMark />
          <div className="mt-6 flex-1">
            <NavList pathname={pathname} />
          </div>
          <div className="mt-4 flex flex-col gap-1 border-t border-white/[0.06] px-2.5 pt-4">
            <Link
              href="/dashboard/wallet"
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12.5px] font-medium text-white/45 transition-colors hover:bg-white/[0.05] hover:text-white/80"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Classic wallet
            </Link>
            <Link
              href="/identity/wallet"
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12.5px] font-medium text-white/45 transition-colors hover:bg-white/[0.05] hover:text-white/80"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Identity wallet
            </Link>
          </div>
        </aside>

        {/* Mobile drawer */}
        {mobileNav && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileNav(false)}
            />
            <aside className="relative flex h-full w-[min(280px,84vw)] flex-col bg-[#0E0E10] py-5 shadow-2xl">
              <div className="flex items-center justify-between px-2.5">
                <WordMark />
                <button
                  type="button"
                  onClick={() => setMobileNav(false)}
                  aria-label="Close"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/60 hover:bg-white/[0.06]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-6 flex-1">
                <NavList pathname={pathname} onNavigate={() => setMobileNav(false)} />
              </div>
              <div className="mt-4 flex flex-col gap-1 border-t border-white/[0.06] px-2.5 pt-4">
                <Link
                  href="/dashboard/wallet"
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12.5px] font-medium text-white/45 hover:bg-white/[0.05] hover:text-white/80"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Classic wallet
                </Link>
              </div>
            </aside>
          </div>
        )}

        {/* Main column */}
        <div className="min-w-0 flex-1">
          <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-black/[0.06] bg-[#F5F5F4]/90 px-4 py-3 backdrop-blur-md lg:hidden">
            <button
              type="button"
              onClick={() => setMobileNav(true)}
              aria-label="Open navigation"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(16,15,14,0.05)]"
            >
              <Menu className="h-4 w-4 text-[#121113]" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9B968D]">
                Jimvio Wallet OS
              </p>
              <p className="truncate text-[14px] font-semibold text-[#121113]">{activeItem?.label ?? "Wallet"}</p>
            </div>
            <Link
              href="/dashboard/wallet"
              className="shrink-0 rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#121113]"
            >
              Classic
            </Link>
          </div>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </WalletScope>
  );
}
