"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  Clapperboard,
  DollarSign,
  Globe,
  Home,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Users,
} from "lucide-react";
import JimvioLogo from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { CurrencySelector } from "@/context/CurrencyContext";
import { useCartStore } from "@/lib/store/use-cart-store";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";

const PRIMARY_NAV = [
  { label: "Home", href: "/c", icon: Home },
  { label: "Marketplace", href: "/marketplace", icon: ShoppingBag, dropdown: true },
  { label: "Communities", href: "/communities", icon: Users },
  { label: "Affiliates", href: "/affiliates", icon: DollarSign },
  { label: "UGC & Clipping", href: "/ugc", icon: Clapperboard },
] as const;

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
        <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-500 to-orange-400 text-xs font-semibold text-white">
          {getInitials(name)}
        </span>
      )}
    </div>
  );
}

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/c") return pathname === "/c" || pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppTopNav({
  showUtilityBar = false,
  activeNav,
  user,
  notificationCount = 3,
}: AppTopNavProps) {
  const pathname = usePathname();
  const { cartCount } = useCartStore();

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

      <header className="z-30 flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 sm:px-6">
        <Link href="/c" className="shrink-0" aria-label="Jimvio home">
          <JimvioLogo href={undefined} size="md" />
        </Link>

        <nav className="ml-4 hidden items-center gap-1 min-[1150px]:flex">
          {PRIMARY_NAV.map((item) => {
            const { label, href, icon: Icon } = item;
            const dropdown = "dropdown" in item ? item.dropdown : false;
            const active = activeNav === label || isNavActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "text-orange-500 after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:rounded-full after:bg-orange-500"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {dropdown && <ChevronDown className="h-3 w-3 opacity-50" />}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 min-[1100px]:flex lg:w-56 xl:w-64">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              placeholder="Search..."
              aria-label="Search"
              className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
            <kbd className="hidden shrink-0 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-400 xl:block">
              ⌘K
            </kbd>
          </div>

          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-orange-500 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-80" />
          </button>

          <Link
            href="/notifications"
            aria-label="Notifications"
            className="relative grid h-9 w-9 place-items-center rounded-lg text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            <Bell className="h-[18px] w-[18px]" />
            {notificationCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-red-500 px-1 text-[9px] font-semibold text-white">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </Link>

          <Link
            href="/cart"
            aria-label="Cart"
            className="relative grid h-9 w-9 place-items-center rounded-lg text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            <ShoppingCart className="h-[18px] w-[18px]" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-orange-500 px-1 text-[9px] font-semibold text-white">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </Link>

          <ThemeToggle />

          {user && (
            <Link href="/c/profile" aria-label="Profile">
              <UserAvatar name={user.name} avatarUrl={user.avatarUrl} isPremium={user.isPremium} />
            </Link>
          )}
        </div>
      </header>
    </>
  );
}
