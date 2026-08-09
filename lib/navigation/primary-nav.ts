import type { LucideIcon } from "lucide-react";
import {
  Clapperboard,
  DollarSign,
  Home,
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
  /** When true, logged-in users should prefer the authenticated home URL */
  authHome?: boolean;
};

/**
 * Product-based primary navigation — no "Dashboard" product surface.
 * Authenticated Home resolves to /dashboard (Mission Control URL kept for deep links).
 */
export const PRIMARY_NAV_ITEMS: PrimaryNavItem[] = [
  { label: "Home", href: "/", icon: Home, authHome: true },
  { label: "Marketplace", href: "/marketplace", icon: ShoppingBag, dropdown: true },
  { label: "Orders", href: "/dashboard/orders", icon: Package },
  { label: "Wallet", href: "/wallet", icon: Wallet },
  { label: "Communities", href: "/communities", icon: Users },
  { label: "Affiliates", href: "/affiliates", icon: DollarSign },
  { label: "UGC & Clipping", mobileLabel: "UGC", href: "/ugc", icon: Clapperboard },
  { label: "Messages", mobileLabel: "Inbox", href: "/dashboard/messages", icon: MessageSquare },
];

/** Compact mobile bottom bar — keep only essentials; rest via ⌘K / sidebar. */
export const MOBILE_BOTTOM_NAV_ITEMS = [
  { label: "Home", href: "/", icon: Home, authHome: true as const },
  { label: "Market", href: "/marketplace", icon: ShoppingBag },
  { label: "Orders", href: "/dashboard/orders", icon: Package },
  { label: "Wallet", href: "/wallet", icon: Wallet },
] as const;

export function resolvePrimaryNavHref(
  item: Pick<PrimaryNavItem, "href" | "authHome">,
  isAuthenticated: boolean,
): string {
  if (item.authHome && isAuthenticated) return "/dashboard";
  return item.href;
}

export function isCommunitiesNavActive(pathname: string): boolean {
  return pathname === "/communities" || pathname.startsWith("/communities/");
}

export function isPrimaryNavActive(
  pathname: string,
  item: PrimaryNavItem,
  activeNav?: string,
  isAuthenticated = false,
): boolean {
  if (activeNav && activeNav === item.label) return true;
  if (item.label === "Communities") return isCommunitiesNavActive(pathname);
  const href = resolvePrimaryNavHref(item, isAuthenticated);
  if (href === "/") return pathname === "/";
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** @deprecated Prefer isHomeActive — kept for call sites during transition */
export function isDashboardActive(pathname: string): boolean {
  return isHomeActive(pathname);
}

export function isHomeActive(pathname: string): boolean {
  return pathname === "/dashboard" || pathname === "/";
}
