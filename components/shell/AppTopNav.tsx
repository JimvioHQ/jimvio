"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import JimvioLogo from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useCartStore } from "@/lib/store/use-cart-store";
import { useCommandCenterStore } from "@/lib/store/use-command-center-store";
import {
  isOrdersActive,
  isPrimaryNavActive,
  isWalletActive,
  PRIMARY_NAV_ITEMS,
  resolvePrimaryNavHref,
} from "@/lib/navigation/primary-nav";
import { ProfileAccountMenu } from "@/components/shell/ProfileAccountMenu";
import { cn, getInitials } from "@/lib/utils";

type AppTopNavProps = {
  /** @deprecated Utility bar removed — prop kept for call-site compatibility */
  showUtilityBar?: boolean;
  activeNav?: string;
  user?: {
    name: string;
    email?: string | null;
    avatarUrl?: string | null;
    isPremium?: boolean;
  };
  notificationCount?: number;
  messageCount?: number;
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
        isPremium && "ring-2 ring-orange-500 ring-offset-1",
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

function UtilityIconLink({
  href,
  label,
  active,
  className,
  children,
}: {
  href: string;
  label: string;
  active?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={cn(
        "relative grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors",
        active
          ? "bg-[var(--color-accent-light)] text-[#FF5A1F]"
          : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function AppTopNav({
  showUtilityBar: _showUtilityBar = false,
  activeNav,
  user,
  notificationCount = 0,
  messageCount = 0,
}: AppTopNavProps) {
  void _showUtilityBar;
  const pathname = usePathname();
  const { cartCount } = useCartStore();
  const openCommandCenter = useCommandCenterStore((s) => s.openCommandCenter);
  const isAuthenticated = Boolean(user);

  return (
    <header className="z-30 grid h-14 max-w-[100vw] shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 overflow-x-clip border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 sm:gap-x-4 sm:px-5 lg:px-6">
      <div className="flex shrink-0 items-center">
        <Link href="/" aria-label="Jimvio home">
          <JimvioLogo href={undefined} size="md" />
        </Link>
      </div>

      <nav
        aria-label="Primary"
        className="hidden min-w-0 items-center justify-center gap-3 overflow-hidden pl-4 min-[1060px]:flex min-[1060px]:flex-nowrap xl:gap-4 xl:pl-6"
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
                "relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                active
                  ? "text-[#FF5A1F] after:absolute after:bottom-0 after:left-2.5 after:right-2.5 after:h-0.5 after:rounded-full after:bg-[#FF5A1F]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">{item.mobileLabel ?? item.label}</span>
              {dropdown && <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />}
            </Link>
          );
        })}
      </nav>

      <div className="col-start-3 flex min-w-0 max-w-full items-center justify-end gap-0.5 overflow-x-clip sm:gap-1.5">
        <button
          type="button"
          onClick={() => openCommandCenter()}
          className="hidden h-9 w-[148px] items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-2.5 text-left shadow-[0_1px_2px_rgba(17,24,39,0.03)] backdrop-blur-sm transition-all hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface)] min-[1060px]:flex xl:w-[180px]"
          aria-label="Search everything or run a command"
        >
          <Search className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
          <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--color-text-muted)]">Search...</span>
          <kbd className="hidden shrink-0 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1 py-px text-[9px] font-medium text-[var(--color-text-muted)] 2xl:inline">
            ⌘K
          </kbd>
        </button>

        <button
          type="button"
          onClick={() => openCommandCenter()}
          aria-label="Search"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] min-[1060px]:hidden"
        >
          <Search className="h-[17px] w-[17px]" />
        </button>

        <button
          type="button"
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg bg-[#FF5A1F] px-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#e64e18] sm:gap-1.5 sm:px-3"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden whitespace-nowrap sm:inline">Create</span>
          <ChevronDown className="hidden h-3 w-3 shrink-0 opacity-80 sm:block" />
        </button>

        <Link
          href="/settings/notifications"
          aria-label="Notifications"
          className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
        >
          <Bell className="h-[17px] w-[17px]" />
          {notificationCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-red-500 px-1 text-[9px] font-semibold text-white">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </Link>

        {user ? (
          <>
            <UtilityIconLink
              href="/orders"
              label="Orders"
              active={isOrdersActive(pathname)}
              className="hidden sm:grid"
            >
              <Package className="h-[17px] w-[17px]" />
            </UtilityIconLink>
            <UtilityIconLink
              href="/wallet"
              label="Wallet"
              active={isWalletActive(pathname)}
              className="hidden sm:grid"
            >
              <Wallet className="h-[17px] w-[17px]" />
            </UtilityIconLink>
          </>
        ) : null}

        <Link
          href="/cart"
          aria-label="Cart"
          className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
        >
          <ShoppingCart className="h-[17px] w-[17px]" />
          {cartCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-[#FF5A1F] px-1 text-[9px] font-semibold text-white">
              {cartCount > 9 ? "9+" : cartCount}
            </span>
          )}
        </Link>

        <ThemeToggle />

        {user ? (
          <ProfileAccountMenu
            user={{
              name: user.name,
              email: user.email,
              avatarUrl: user.avatarUrl,
            }}
            messageCount={messageCount}
            inboxCount={notificationCount}
            trigger={
              <button
                type="button"
                aria-label="Open profile menu"
                className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
              >
                <UserAvatar name={user.name} avatarUrl={user.avatarUrl} isPremium={user.isPremium} />
              </button>
            }
          />
        ) : null}
      </div>
    </header>
  );
}
