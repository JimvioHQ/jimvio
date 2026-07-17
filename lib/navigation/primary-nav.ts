import type { LucideIcon } from "lucide-react";
import { Clapperboard, DollarSign, Home, ShoppingBag, Users } from "lucide-react";

export type PrimaryNavItem = {
  label: string;
  /** Shorter label for mobile bottom navigation */
  mobileLabel?: string;
  href: string;
  icon: LucideIcon;
  dropdown?: boolean;
};

export const PRIMARY_NAV_ITEMS: PrimaryNavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Marketplace", href: "/marketplace", icon: ShoppingBag, dropdown: true },
  { label: "Communities", href: "/communities", icon: Users },
  { label: "Affiliates", href: "/affiliates", icon: DollarSign },
  { label: "UGC & Clipping", mobileLabel: "UGC", href: "/ugc", icon: Clapperboard },
];

export const MOBILE_BOTTOM_NAV_ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Market", href: "/marketplace", icon: ShoppingBag },
  { label: "Communities", href: "/communities", icon: Users },
  { label: "UGC", href: "/ugc", icon: Clapperboard, ariaLabel: "UGC & Clipping" },
] as const;

export function isCommunitiesNavActive(pathname: string): boolean {
  return pathname === "/communities" || pathname.startsWith("/communities/");
}

export function isPrimaryNavActive(
  pathname: string,
  item: PrimaryNavItem,
  activeNav?: string
): boolean {
  if (activeNav && activeNav === item.label) return true;
  if (item.label === "Communities") return isCommunitiesNavActive(pathname);
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function isDashboardActive(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}
