import type { LucideIcon } from "lucide-react";
import {
  CircleHelp,
  Clapperboard,
  DollarSign,
  Heart,
  Home,
  MessageSquare,
  Package,
  ShoppingBag,
  User,
  Users,
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
  description?: string;
  /** Optional badge key handled by the menu surface */
  badge?: "messages";
};

/**
 * Global primary navigation — discovery destinations only.
 * Personal tools live in the header utilities + profile menu.
 */
export const PRIMARY_NAV_ITEMS: PrimaryNavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Marketplace", href: "/marketplace", icon: ShoppingBag, dropdown: true },
  { label: "Communities", href: "/communities", icon: Users },
  { label: "Affiliates", href: "/affiliates", icon: DollarSign },
  /** Full label everywhere in desktop primary nav; bottom nav uses MOBILE_BOTTOM_NAV_ITEMS. */
  { label: "UGC & Clipping", href: "/ugc", icon: Clapperboard },
];

/** Compact mobile bottom bar — discovery destinations (Affiliates replaces Menu). */
export const MOBILE_BOTTOM_NAV_ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Market", href: "/marketplace", icon: ShoppingBag },
  { label: "Communities", href: "/communities", icon: Users },
  { label: "UGC", href: "/ugc", icon: Clapperboard },
  { label: "Affiliates", href: "/affiliates", icon: DollarSign },
] as const;

/**
 * Creator / account tools in the profile dropdown.
 * Destinations must be real, working routes.
 * Earnings intentionally omitted — lives inside Affiliates / UGC product areas.
 */
export const PROFILE_TOOL_ITEMS: ProfileMenuItem[] = [
  {
    label: "My Account",
    href: "/identity/settings",
    icon: User,
    description: "Profile, security, settings",
  },
  {
    label: "Messages",
    href: "/communities/messages",
    icon: MessageSquare,
    description: "Chat with communities & members",
    badge: "messages",
  },
  {
    label: "My Products",
    href: "/seller/products",
    icon: Package,
    description: "Manage and upload your listings",
  },
  {
    label: "Saved Items",
    href: "/saved",
    icon: Heart,
    description: "Products, posts and campaigns",
  },
];

export const PROFILE_SUPPORT_ITEMS: ProfileMenuItem[] = [
  {
    label: "Help Center",
    href: "/help",
    icon: CircleHelp,
    description: "Get support and guides",
  },
];

/** @deprecated Use PROFILE_TOOL_ITEMS — kept for gradual call-site migration. */
export const PROFILE_QUICK_ACCESS_ITEMS: ProfileMenuItem[] = PROFILE_TOOL_ITEMS;

/** @deprecated Use PROFILE_TOOL_ITEMS. */
export const PROFILE_ACCOUNT_ITEMS: ProfileMenuItem[] = PROFILE_TOOL_ITEMS;

/** Canonical routes */
export const ORDERS_HREF = "/orders";
/** Profile menu Messages → communities hub (canonical global messages). */
export const MESSAGES_HREF = "/communities/messages";
/** Commerce buyer↔seller chat remains at /messages for deep links / orders. */
export const COMMERCE_MESSAGES_HREF = "/messages";
export const INBOX_HREF = "/notifications";
export const WALLET_HREF = "/wallet";
/** Canonical notification center (not preferences). */
export const NOTIFICATIONS_HREF = "/notifications";
/** Notification preferences / email settings. */
export const NOTIFICATION_PREFERENCES_HREF = "/settings/notifications";
export const CART_HREF = "/cart";
export const MY_PRODUCTS_HREF = "/seller/products";
export const SAVED_HREF = "/saved";
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

export function isDashboardActive(_pathname: string): boolean {
  return false;
}

export function isHomeActive(pathname: string): boolean {
  return pathname === "/" || pathname === "";
}

export function isWalletActive(pathname: string): boolean {
  return pathname === "/wallet" || pathname.startsWith("/wallet/");
}

export function isOrdersActive(pathname: string): boolean {
  return pathname === "/orders" || pathname.startsWith("/orders/");
}

export function isNotificationsActive(pathname: string): boolean {
  return (
    pathname === "/notifications" ||
    pathname.startsWith("/notifications/") ||
    pathname === "/inbox" ||
    pathname.startsWith("/inbox/")
  );
}

export function isMyProductsActive(pathname: string): boolean {
  return (
    pathname === MY_PRODUCTS_HREF ||
    pathname.startsWith(`${MY_PRODUCTS_HREF}/`) ||
    pathname === "/ugc/campaign-center/store" ||
    pathname.startsWith("/ugc/campaign-center/store/")
  );
}

export function isSavedActive(pathname: string): boolean {
  return pathname === "/saved" || pathname.startsWith("/saved/");
}
