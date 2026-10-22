"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ArrowLeftRight,
  BarChart3,
  CreditCard,
  Fingerprint,
  Gift,
  LandmarkIcon,
  LayoutGrid,
  Lock,
  Menu,
  Receipt,
  RefreshCcw,
  Settings,
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
  { href: "/wallet/deposits", label: "Deposits", icon: RefreshCcw },
  { href: "/wallet/withdrawals", label: "Withdrawals", icon: LandmarkIcon },
  { href: "/wallet/payout-methods", label: "Payout methods", icon: CreditCard },
  { href: "/wallet/escrow", label: "Reserved Funds", icon: Lock },
  { href: "/wallet/subscriptions", label: "Subscriptions", icon: Receipt },
  { href: "/wallet/rewards", label: "Rewards", icon: Gift },
  { href: "/wallet/invoices", label: "Invoices", icon: Fingerprint },
  { href: "/wallet/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/wallet/security", label: "Security", icon: ShieldCheck },
  { href: "/settings/profile", label: "Settings", icon: Settings },
];

function isNavActive(pathname: string, href: string) {
  if (href === "/wallet") return pathname === "/wallet";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function WordMark() {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#FF5A1F] text-white shadow-[0_6px_16px_-4px_rgba(255,90,31,0.45)]">
        <WalletIcon className="h-4 w-4" />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[14px] font-bold tracking-tight text-[#111827]">Jimvio</p>
        <p className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-[#9CA3AF]">
          Wallet
        </p>
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
              active
                ? "bg-[#FFF1EA] text-[#FF5A1F]"
                : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]",
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", active ? "text-[#FF5A1F]" : "text-[#9CA3AF]")} />
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
      <div className="flex min-h-screen bg-[#F8FAFC]">
        {/* Desktop sidebar — light Jimvio shell */}
        <aside className="hidden w-[240px] shrink-0 flex-col border-r border-[#E5E7EB] bg-white py-5 lg:flex">
          <div className="px-2.5">
            <WordMark />
          </div>
          <div className="mt-6 flex-1">
            <NavList pathname={pathname} />
          </div>
          <div className="mt-4 border-t border-[#E5E7EB] px-4 pt-4">
            <p className="text-[10px] font-medium tracking-wide text-[#9CA3AF]">
              Jimvio · Create. Sell. Grow.
            </p>
            <Link
              href="/orders"
              className="mt-3 flex items-center gap-2 text-[12px] font-medium text-[#6B7280] transition-colors hover:text-[#111827]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Orders
            </Link>
          </div>
        </aside>

        {/* Mobile drawer */}
        {mobileNav && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileNav(false)}
            />
            <aside className="relative flex h-full w-[min(280px,84vw)] flex-col border-r border-[#E5E7EB] bg-white py-5 shadow-2xl">
              <div className="flex items-center justify-between px-2.5">
                <WordMark />
                <button
                  type="button"
                  onClick={() => setMobileNav(false)}
                  aria-label="Close"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#6B7280] hover:bg-[#F3F4F6]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-6 flex-1">
                <NavList pathname={pathname} onNavigate={() => setMobileNav(false)} />
              </div>
            </aside>
          </div>
        )}

        {/* Main column */}
        <div className="min-w-0 flex-1">
          <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-[#E5E7EB] bg-white/90 px-4 py-3 backdrop-blur-md lg:hidden">
            <button
              type="button"
              onClick={() => setMobileNav(true)}
              aria-label="Open navigation"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#E5E7EB] bg-white shadow-sm"
            >
              <Menu className="h-4 w-4 text-[#111827]" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                Jimvio Wallet
              </p>
              <p className="truncate text-[14px] font-semibold text-[#111827]">
                {activeItem?.label ?? "Wallet"}
              </p>
            </div>
            <Link
              href="/wallet/transactions"
              className="shrink-0 rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#111827]"
            >
              Activity
            </Link>
          </div>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </WalletScope>
  );
}
