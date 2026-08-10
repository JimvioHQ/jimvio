"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  Plus,
  Search,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import JimvioLogo from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useCartStore } from "@/lib/store/use-cart-store";
import { useCommandCenterStore } from "@/lib/store/use-command-center-store";
import { useJimvioOsStore } from "@/lib/store/use-jimvio-os-store";
import { OS_WORKSPACE_MODES } from "@/lib/jimvio-os/config";
import {
  isPrimaryNavActive,
  isWalletActive,
  PRIMARY_NAV_ITEMS,
  resolvePrimaryNavHref,
} from "@/lib/navigation/primary-nav";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";

type AppTopNavProps = {
  /** @deprecated Utility bar removed — prop kept for call-site compatibility */
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
  showUtilityBar: _showUtilityBar = false,
  activeNav,
  user,
  notificationCount = 3,
}: AppTopNavProps) {
  void _showUtilityBar;
  const pathname = usePathname();
  const { cartCount } = useCartStore();
  const walletActive = isWalletActive(pathname);
  const openCommandCenter = useCommandCenterStore((s) => s.openCommandCenter);
  const workspaceMode = useJimvioOsStore((s) => s.workspaceMode);
  const currentWorkspace = OS_WORKSPACE_MODES.find((m) => m.id === workspaceMode) ?? OS_WORKSPACE_MODES[1];
  const isAuthenticated = Boolean(user);

  return (
    <>
      <header className="z-30 grid h-14 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 border-b border-gray-200 bg-white px-3 sm:gap-x-3 sm:px-5 lg:px-6">
        <div className="flex shrink-0 items-center gap-2">
          <Link href={isAuthenticated ? "/dashboard" : "/"} aria-label="Jimvio home">
            <JimvioLogo href={undefined} size="md" />
          </Link>
          {user && (
            <span className="hidden rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-600 xl:inline-block">
              {currentWorkspace.label}
            </span>
          )}
        </div>

        <nav
          aria-label="Primary"
          className="hidden min-w-0 items-center justify-center gap-0.5 overflow-hidden min-[1060px]:flex min-[1060px]:flex-nowrap"
        >
          {PRIMARY_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const dropdown = item.dropdown ?? false;
            const href = resolvePrimaryNavHref(item, isAuthenticated);
            const active = isPrimaryNavActive(pathname, item, activeNav, isAuthenticated);
            return (
              <Link
                key={`${item.label}-${href}`}
                href={href}
                className={cn(
                  "relative inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 py-1.5 text-[12px] font-medium transition-colors xl:px-2.5 xl:text-[13px]",
                  active
                    ? "text-orange-500 after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-orange-500 xl:after:left-2.5 xl:after:right-2.5"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="whitespace-nowrap">{item.mobileLabel ?? item.label}</span>
                {dropdown && <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />}
              </Link>
            );
          })}
        </nav>

        <div className="col-start-3 flex shrink-0 items-center justify-end gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={() => openCommandCenter()}
            className="hidden h-9 w-[148px] items-center gap-1.5 rounded-full border border-gray-200/90 bg-gray-50/90 px-2.5 text-left shadow-[0_1px_2px_rgba(17,24,39,0.03)] backdrop-blur-sm transition-all hover:border-gray-300 hover:bg-white min-[1060px]:flex xl:w-[180px]"
            aria-label="Open command center search"
          >
            <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="min-w-0 flex-1 truncate text-[12px] text-gray-400">Search...</span>
            <kbd className="hidden shrink-0 rounded border border-gray-200 bg-white px-1 py-px text-[9px] font-medium text-gray-400 2xl:inline">
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg bg-orange-500 px-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-orange-600 sm:gap-1.5 sm:px-3"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden whitespace-nowrap sm:inline">Create</span>
            <ChevronDown className="hidden h-3 w-3 shrink-0 opacity-80 sm:block" />
          </button>

          <Link
            href="/identity/notifications"
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
              href="/wallet"
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-[11px] font-semibold shadow-[0_1px_2px_rgba(17,24,39,0.03)] transition-all duration-150 sm:px-3 sm:text-xs min-[1060px]:hidden",
                walletActive
                  ? "border-orange-500 bg-orange-50 text-orange-600 shadow-[0_1px_4px_rgba(255,90,31,0.15)]"
                  : "border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600",
              )}
            >
              <Wallet className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">Wallet</span>
            </Link>
          )}

          {user && (
            <Link href="/identity" aria-label="Profile" className="shrink-0">
              <UserAvatar name={user.name} avatarUrl={user.avatarUrl} isPremium={user.isPremium} />
            </Link>
          )}
        </div>
      </header>
    </>
  );
}
