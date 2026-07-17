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
        <div className="hidden border-b border-gray-200 bg-white lg:block">
          <div className="mx-auto flex h-7 max-w-[1600px] items-center justify-between px-6">
            <div className="flex items-center gap-5">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                <Globe className="h-3 w-3 text-orange-500" />
                Global Sourcing Network
              </span>
              <CurrencySelector className="h-5 border-0 bg-transparent px-1 text-[10px] font-semibold text-gray-400 ring-0 hover:text-gray-900 focus:ring-0" />
            </div>
            <div className="flex items-center gap-5">
              <Link href="/help" className="text-[10px] font-semibold uppercase text-gray-400 hover:text-orange-500">
                Support
              </Link>
              <span className="h-3 w-px bg-gray-200" />
              <Link href="/vendors" className="text-[10px] font-semibold uppercase text-gray-400 hover:text-gray-900">
                Sell on Jimvio
              </Link>
            </div>
          </div>
        </div>
      )}

      <header className="z-30 grid h-14 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 border-b border-gray-200 bg-white px-3 sm:gap-x-3 sm:px-5 lg:px-6">
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
                    ? "text-orange-500 after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-orange-500 xl:after:left-2.5 xl:after:right-2.5"
                    : "text-gray-600 hover:text-gray-900"
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
          <div className="hidden h-9 w-[132px] items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 min-[1060px]:flex xl:w-[152px]">
            <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <input
              placeholder="Search..."
              aria-label="Search"
              className="min-w-0 flex-1 bg-transparent text-[12px] text-gray-900 outline-none placeholder:text-gray-400"
            />
            <kbd className="hidden shrink-0 rounded border border-gray-200 bg-white px-1 py-px text-[9px] font-medium text-gray-400 2xl:inline">
              ⌘K
            </kbd>
          </div>

          <button
            type="button"
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg bg-orange-500 px-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-orange-600 sm:gap-1.5 sm:px-3"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden whitespace-nowrap sm:inline">Create</span>
            <ChevronDown className="hidden h-3 w-3 shrink-0 opacity-80 sm:block" />
          </button>

          <Link
            href="/notifications"
            aria-label="Notifications"
            className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            <Bell className="h-[17px] w-[17px]" />
            {notificationCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-red-500 px-1 text-[9px] font-semibold text-white">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </Link>

          <Link
            href="/cart"
            aria-label="Cart"
            className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            <ShoppingCart className="h-[17px] w-[17px]" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-orange-500 px-1 text-[9px] font-semibold text-white">
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
                  ? "border-orange-500 bg-orange-50 text-orange-600"
                  : "border-gray-200 text-gray-700 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600"
              )}
            >
              <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">Dashboard</span>
            </Link>
          )}

          {user && (
            <Link href="/communities/profile" aria-label="Profile" className="shrink-0">
              <UserAvatar name={user.name} avatarUrl={user.avatarUrl} isPremium={user.isPremium} />
            </Link>
          )}
        </div>
      </header>
    </>
  );
}
