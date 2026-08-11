import type { LucideIcon } from "lucide-react";
import {
  Clapperboard,
  DollarSign,
  Home,
  Inbox,
  MessageSquare,
  Package,
  Settings,
  ShoppingBag,
  Users,
  Video,
  Wallet,
} from "lucide-react";

export type PrimaryNavItem = {
  label: string;
  /** Shorter label for mobile bottom navigation */
  mobileLabel?: string;
  href: string;
  icon: LucideIcon;
  dropdown?: boolean;
};

export type ProfileMenuItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Optional badge key handled by the menu surface */
  badge?: "messages" | "inbox";
};

/**
 * Global primary navigation — discovery destinations only.
 * Wallet / Orders / Messages / Inbox live in the profile menu.
 */
export const PRIMARY_NAV_ITEMS: PrimaryNavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Marketplace", href: "/marketplace", icon: ShoppingBag, dropdown: true },
  { label: "Communities", href: "/communities", icon: Users },
  { label: "Affiliates", href: "/affiliates", icon: DollarSign },
  { label: "UGC & Clipping", mobileLabel: "UGC", href: "/ugc", icon: Clapperboard },
];

/** Compact mobile bottom bar — discovery destinations (Affiliates replaces Menu). */
export const MOBILE_BOTTOM_NAV_ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Market", href: "/marketplace", icon: ShoppingBag },
  { label: "Communities", href: "/communities", icon: Users },
  { label: "UGC", href: "/ugc", icon: Clapperboard },
  { label: "Affiliates", href: "/affiliates", icon: DollarSign },
] as const;

/** Canonical personal commerce / communication tools (profile menu). */
export const PROFILE_QUICK_ACCESS_ITEMS: ProfileMenuItem[] = [
  { label: "Wallet", href: "/wallet", icon: Wallet },
  { label: "Orders", href: "/orders", icon: Package },
  { label: "Messages", href: "/dashboard/messages", icon: MessageSquare, badge: "messages" },
  { label: "Inbox", href: "/dashboard/notifications", icon: Inbox, badge: "inbox" },
];

/** Account section under profile — keep existing useful destinations. */
export const PROFILE_ACCOUNT_ITEMS: ProfileMenuItem[] = [
  { label: "My Account", href: "/dashboard/settings", icon: Settings },
  { label: "Digital Library", href: "/dashboard/library", icon: Video },
];

/** Canonical Orders URL (user-facing). */
export const ORDERS_HREF = "/orders";

/** Canonical Messages / Inbox routes. */
export const MESSAGES_HREF = "/dashboard/messages";
export const INBOX_HREF = "/dashboard/notifications";
export const WALLET_HREF = "/wallet";
export const HOME_HREF = "/";

export function resolvePrimaryNavHref(
  item: Pick<PrimaryNavItem, "href">,
  _isAuthenticated?: boolean,
): string {
  void _isAuthenticated;
  return item.href;
}

export function isCommunitiesNavActive(pathname: string): boolean {
  return pathname === "/communities" || pathname.startsWith("/communities/");
}

export function isPrimaryNavActive(
  pathname: string,
  item: PrimaryNavItem,
  activeNav?: string,
  _isAuthenticated = false,
): boolean {
  void _isAuthenticated;
  if (activeNav && activeNav === item.label) return true;
  if (item.label === "Communities") return isCommunitiesNavActive(pathname);
  if (item.label === "Home" || item.href === "/") {
    return pathname === "/" || pathname === "";
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function isDashboardActive(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

export function isHomeActive(pathname: string): boolean {
  return pathname === "/" || pathname === "";
}

export function isWalletActive(pathname: string): boolean {
  return pathname === "/wallet" || pathname.startsWith("/wallet/");
}

export function isOrdersActive(pathname: string): boolean {
  return (
    pathname === "/orders" ||
    pathname.startsWith("/orders/") ||
    pathname === "/dashboard/orders" ||
    pathname.startsWith("/dashboard/orders/")
  );
}
