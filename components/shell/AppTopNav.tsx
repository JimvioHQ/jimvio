"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Search,
} from "lucide-react";
import JimvioLogo from "@/components/ui/logo";
import { useCartStore } from "@/lib/store/use-cart-store";
import { useHeaderAccountStore } from "@/lib/store/use-header-account-store";
import { useCommandCenterStore } from "@/lib/store/use-command-center-store";
import {
  isCommunitiesNavActive,
  isPrimaryNavActive,
  PRIMARY_NAV_ITEMS,
  resolvePrimaryNavHref,
} from "@/lib/navigation/primary-nav";
import type { CreateMenuContext } from "@/lib/navigation/create-menu";
import { ProfileAccountMenu } from "@/components/shell/ProfileAccountMenu";
import { HeaderUtilityActions } from "@/components/shell/HeaderUtilityActions";
import { CreateMenuDropdown } from "@/components/feed/CreateQuickLaunch";
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
  createContext?: CreateMenuContext;
  /** Optional leading control (e.g. community/hub hamburger). */
  leadingAction?: ReactNode;
  /** Optional actions rendered before canonical utilities (e.g. community AI). */
  extraActions?: ReactNode;
  /** Extra profile-menu account links (deduped by href in ProfileAccountMenu). */
  extraAccountItems?: Array<{
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    description?: string;
  }>;
  /** When set and user is absent, show a Sign in control. */
  signInHref?: string;
  className?: string;
};

function resolveCreateContext(
  pathname: string,
  explicit?: CreateMenuContext,
  activeNav?: string,
): CreateMenuContext {
  if (explicit) return explicit;
  if (activeNav === "UGC & Clipping" || pathname.startsWith("/ugc")) return "ugc";
  if (pathname.startsWith("/affiliates")) return "affiliates";
  if (pathname.startsWith("/marketplace")) return "marketplace";
  if (pathname.startsWith("/communities")) return "communities";
  return "global";
}

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

export function AppTopNav({
  showUtilityBar: _showUtilityBar = false,
  activeNav,
  user,
  notificationCount: notificationCountProp,
  messageCount = 0,
  createContext,
  leadingAction,
  extraActions,
  extraAccountItems,
  signInHref,
  className,
}: AppTopNavProps) {
  void _showUtilityBar;
  const pathname = usePathname() ?? "/";
  const { cartCount, refreshCounts } = useCartStore();
  const {
    walletBalance,
    rewardsBalance,
    notificationCount: notificationCountStore,
    currency: walletCurrency,
  } = useHeaderAccountStore();
  const openCommandCenter = useCommandCenterStore((s) => s.openCommandCenter);
  const isAuthenticated = Boolean(user);
  const notificationCount =
    typeof notificationCountProp === "number" && notificationCountProp > 0
      ? notificationCountProp
      : notificationCountStore;
  const menuContext = resolveCreateContext(pathname, createContext, activeNav);

  useEffect(() => {
    if (user) refreshCounts();
  }, [user, refreshCounts]);

  return (
    <header
      className={cn(
        "relative z-50 grid h-14 max-w-[100vw] shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 sm:gap-x-4 sm:px-5 lg:px-6",
        "supports-[padding:max(0px)]:pt-[max(0px,env(safe-area-inset-top))]",
        className,
      )}
    >
      <div className="flex min-w-0 shrink-0 items-center gap-0.5 sm:gap-1.5">
        {leadingAction}
        <Link href="/" aria-label="Jimvio home" className="flex min-w-0 items-center">
          <JimvioLogo
            href={undefined}
            size="md"
            presentation="header"
            variant="full"
            className="min-w-0"
          />
        </Link>
      </div>

      <nav
        aria-label="Primary"
        className="hidden min-w-0 items-center justify-center gap-1.5 overflow-hidden pl-3 min-[1060px]:flex min-[1060px]:flex-nowrap xl:gap-2.5 xl:pl-5 2xl:gap-3"
      >
        {PRIMARY_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const dropdown = item.dropdown ?? false;
          const href = resolvePrimaryNavHref(item, isAuthenticated);
          const active =
            item.label === "Communities"
              ? isCommunitiesNavActive(pathname) ||
                isPrimaryNavActive(pathname, item, activeNav, isAuthenticated)
              : isPrimaryNavActive(pathname, item, activeNav, isAuthenticated);
          return (
            <Link
              key={`${item.label}-${href}`}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-1.5 text-[12px] font-medium transition-colors xl:gap-1.5 xl:px-2 xl:text-[13px] 2xl:px-2.5",
                active
                  ? "text-[#FF5A1F] after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-[#FF5A1F]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">{item.label}</span>
              {dropdown && <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />}
            </Link>
          );
        })}
      </nav>

      <div className="relative z-10 col-start-3 flex min-w-0 max-w-full items-center justify-end gap-0.5 sm:gap-1.5">
        <button
          type="button"
          onClick={() => openCommandCenter()}
          className="hidden h-9 w-[min(100%,120px)] items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-2.5 text-left shadow-[0_1px_2px_rgba(17,24,39,0.03)] backdrop-blur-sm transition-all hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface)] min-[1060px]:flex xl:w-[140px] 2xl:w-[168px]"
          aria-label="Search everything or run a command"
        >
          <Search className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
          <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--color-text-muted)]">
            Search globally…
          </span>
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

        <CreateMenuDropdown variant="header" context={menuContext} />

        {extraActions}

        <HeaderUtilityActions
          isAuthenticated={isAuthenticated}
          cartCount={cartCount}
          notificationCount={notificationCount}
          walletBalance={walletBalance}
          walletCurrency={walletCurrency}
          showProducts={isAuthenticated}
        />

        {user ? (
          <ProfileAccountMenu
            user={{
              name: user.name,
              avatarUrl: user.avatarUrl,
            }}
            messageCount={messageCount}
            walletBalance={walletBalance}
            rewardsBalance={rewardsBalance}
            walletCurrency={walletCurrency}
            extraAccountItems={extraAccountItems}
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
        ) : signInHref ? (
          <Link
            href={signInHref}
            className="ml-0.5 shrink-0 rounded-full border border-[#fd5000]/30 bg-[#fd5000]/10 px-3 py-1.5 text-[12px] font-bold text-[#fd5000] transition-colors hover:bg-[#fd5000]/15"
          >
            Sign in
          </Link>
        ) : null}
      </div>
    </header>
  );
}
