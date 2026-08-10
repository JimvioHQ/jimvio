import type { LucideIcon } from "lucide-react";
import {
  Clapperboard,
  DollarSign,
  MessageSquare,
  Package,
  ShoppingBag,
  Users,
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

/**
 * Global primary navigation — no Dashboard / Home product tab.
 * Wallet occupies the former Home/Dashboard slot. Home page remains at `/` and `/dashboard`.
 */
export const PRIMARY_NAV_ITEMS: PrimaryNavItem[] = [
  { label: "Wallet", href: "/wallet", icon: Wallet },
  { label: "Marketplace", href: "/marketplace", icon: ShoppingBag, dropdown: true },
  { label: "Orders", href: "/dashboard/orders", icon: Package },
  { label: "Communities", href: "/communities", icon: Users },
  { label: "Affiliates", href: "/affiliates", icon: DollarSign },
  { label: "UGC & Clipping", mobileLabel: "UGC", href: "/ugc", icon: Clapperboard },
  { label: "Messages", mobileLabel: "Inbox", href: "/dashboard/messages", icon: MessageSquare },
];

/** Compact mobile bottom bar — essentials only; no Dashboard/Home tab. */
export const MOBILE_BOTTOM_NAV_ITEMS = [
  { label: "Wallet", href: "/wallet", icon: Wallet },
  { label: "Market", href: "/marketplace", icon: ShoppingBag },
  { label: "Orders", href: "/dashboard/orders", icon: Package },
  { label: "Communities", href: "/communities", icon: Users },
] as const;

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
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Active state helper for legacy Dashboard/Home CTAs (kept for non-primary call sites). */
export function isDashboardActive(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

export function isHomeActive(pathname: string): boolean {
  return pathname === "/dashboard" || pathname === "/";
}

export function isWalletActive(pathname: string): boolean {
  return pathname === "/wallet" || pathname.startsWith("/wallet/");
}
