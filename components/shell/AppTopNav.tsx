"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  Globe,
  LayoutDashboard,
  Plus,
  Search,
  ShoppingCart,
} from "lucide-react";
import JimvioLogo from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { CurrencySelector } from "@/context/CurrencyContext";
import { useCartStore } from "@/lib/store/use-cart-store";
import {
  isDashboardActive,
  isPrimaryNavActive,
  PRIMARY_NAV_ITEMS,
} from "@/lib/navigation/primary-nav";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";

type AppTopNavProps = {
  showUtilityBar?: boolean;
  activeNav?: string;
  user?: {
    name: string;
    avatarUrl?: string | null;
    isPremium?: boolean;
  };
  notificationCount?: number;
};

function UserAvatar({
  name,
  avatarUrl,
  isPremium,
}: {
  name: string;
  avatarUrl?: string | null;
  isPremium?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative h-9 w-9 shrink-0 overflow-hidden rounded-full",
        isPremium && "ring-2 ring-orange-500 ring-offset-1"
      )}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- user avatar from auth provider
        <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-500 to-orange-400 text-xs font-semibold text-white">
          {getInitials(name)}
        </span>
      )}
    </div>
  );
}

export function AppTopNav({
  showUtilityBar = false,
  activeNav,
  user,
  notificationCount = 3,
}: AppTopNavProps) {
  const pathname = usePathname();
  const { cartCount } = useCartStore();
  const dashboardActive = isDashboardActive(pathname);

  return (
    <>
      {showUtilityBar && (
        <div className="hidden border-b border-[var(--color-border)] bg-[var(--color-bg)] lg:block">
          <div className="mx-auto flex h-7 max-w-[1600px] items-center justify-between px-6">
            <div className="flex items-center gap-5">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                <Globe className="h-3 w-3 text-[var(--color-accent)]" />
                Global Sourcing Network
              </span>
              <CurrencySelector className="h-5 border-0 bg-transparent px-1 text-[10px] font-semibold text-[var(--color-text-muted)] ring-0 hover:text-[var(--color-text-primary)] focus:ring-0" />
            </div>
            <div className="flex items-center gap-5">
              <Link href="/help" className="text-[10px] font-semibold uppercase text-[var(--color-text-muted)] hover:text-[var(--color-accent)]">
                Support
              </Link>
              <span className="h-3 w-px bg-[var(--color-border)]" />
              <Link href="/vendors" className="text-[10px] font-semibold uppercase text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                Sell on Jimvio
              </Link>
            </div>
          </div>
        </div>
      )}

      <header className="z-30 grid h-14 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-3 sm:gap-x-3 sm:px-5 lg:px-6">
        <Link href="/" className="shrink-0" aria-label="Jimvio home">
          <JimvioLogo href={undefined} size="md" />
        </Link>

        <nav
          aria-label="Primary"
          className="hidden min-w-0 items-center justify-center gap-0.5 overflow-hidden min-[1060px]:flex min-[1060px]:flex-nowrap"
        >
          {PRIMARY_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const dropdown = item.dropdown ?? false;
            const active = isPrimaryNavActive(pathname, item, activeNav);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 py-1.5 text-[12px] font-medium transition-colors xl:px-2.5 xl:text-[13px]",
                  active
                    ? "text-[var(--color-accent)] after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-[var(--color-accent)] xl:after:left-2.5 xl:after:right-2.5"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="whitespace-nowrap">{item.label}</span>
                {dropdown && <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />}
              </Link>
            );
          })}
        </nav>

        <div className="col-start-3 flex shrink-0 items-center justify-end gap-1 sm:gap-1.5">
          <div className="hidden h-9 w-[132px] items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-2.5 min-[1060px]:flex xl:w-[152px]">
            <Search className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
            <input
              placeholder="Search..."
              aria-label="Search"
              className="min-w-0 flex-1 bg-transparent text-[12px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
            />
            <kbd className="hidden shrink-0 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1 py-px text-[9px] font-medium text-[var(--color-text-muted)] 2xl:inline">
              ⌘K
            </kbd>
          </div>

          <button
            type="button"
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg bg-[var(--color-accent)] px-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] sm:gap-1.5 sm:px-3"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden whitespace-nowrap sm:inline">Create</span>
            <ChevronDown className="hidden h-3 w-3 shrink-0 opacity-80 sm:block" />
          </button>

          <Link
            href="/notifications"
            aria-label="Notifications"
            className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
          >
            <Bell className="h-[17px] w-[17px]" />
            {notificationCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-[var(--color-danger)] px-1 text-[9px] font-semibold text-white">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </Link>

          <Link
            href="/cart"
            aria-label="Cart"
            className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
          >
            <ShoppingCart className="h-[17px] w-[17px]" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-[var(--color-accent)] px-1 text-[9px] font-semibold text-white">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </Link>

          <ThemeToggle />

          {user && (
            <Link
              href="/dashboard"
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border px-2.5 text-[11px] font-semibold transition-colors sm:px-3 sm:text-xs",
                dashboardActive
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                  : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-accent)]"
              )}
            >
              <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">Dashboard</span>
            </Link>
          )}

          {user && (
            <Link href="/c/profile" aria-label="Profile" className="shrink-0">
              <UserAvatar name={user.name} avatarUrl={user.avatarUrl} isPremium={user.isPremium} />
            </Link>
          )}
        </div>
      </header>
    </>
  );
}
