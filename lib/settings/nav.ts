import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Bell,
  CircleHelp,
  Database,
  Languages,
  Link2,
  Lock,
  Palette,
  Settings2,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";

export const SETTINGS_HELP_HREF = "/help";
export const SETTINGS_SUPPORT_HREF = "/help/tickets/new";
export const SETTINGS_DEFAULT_HREF = "/settings/profile";

export type SettingsNavId =
  | "profile"
  | "account"
  | "privacy"
  | "security"
  | "verification"
  | "notifications"
  | "payments"
  | "language"
  | "appearance"
  | "connected"
  | "data"
  | "help";

export type SettingsNavItem = {
  id: SettingsNavId;
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

/**
 * Single source of truth for desktop sidebar and mobile drawer destinations.
 * Every href must be a real Settings Center route.
 */
export const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  {
    id: "profile",
    href: "/settings/profile",
    label: "Profile",
    description: "Public identity, photo, and social links.",
    icon: UserRound,
  },
  {
    id: "account",
    href: "/settings/account",
    label: "Account",
    description: "Email, verification status, and account controls.",
    icon: Settings2,
  },
  {
    id: "privacy",
    href: "/settings/privacy",
    label: "Privacy & Visibility",
    description: "Who can see your profile and which details appear.",
    icon: Lock,
  },
  {
    id: "security",
    href: "/settings/security",
    label: "Security",
    description: "Password, two-factor authentication, and sessions.",
    icon: ShieldCheck,
  },
  {
    id: "verification",
    href: "/settings/verification",
    label: "Verification",
    description: "Identity and business verification status.",
    icon: BadgeCheck,
  },
  {
    id: "notifications",
    href: "/settings/notifications",
    label: "Notifications",
    description: "Email, in-app, and product alerts.",
    icon: Bell,
  },
  {
    id: "payments",
    href: "/settings/payments",
    label: "Payments & Payouts",
    description: "Wallet, payout methods, and money movement.",
    icon: Wallet,
  },
  {
    id: "language",
    href: "/settings/language",
    label: "Language & Region",
    description: "Language, timezone, and currency preference.",
    icon: Languages,
  },
  {
    id: "appearance",
    href: "/settings/appearance",
    label: "Appearance",
    description: "Product appearance currently in use.",
    icon: Palette,
  },
  {
    id: "connected",
    href: "/settings/connected",
    label: "Connected Accounts",
    description: "Sign-in methods and live destinations.",
    icon: Link2,
  },
  {
    id: "data",
    href: "/settings/data",
    label: "Data & Export",
    description: "Download your data or close the account.",
    icon: Database,
  },
  {
    id: "help",
    href: "/settings/help",
    label: "Help & Support",
    description: "Help Center and support tickets.",
    icon: CircleHelp,
  },
];

const LEGACY_SETTINGS_REDIRECTS: Record<string, string> = {
  "/identity/settings": "/settings/profile",
  "/identity/edit": "/settings/profile",
  "/identity/account": "/settings/account",
  "/identity/privacy": "/settings/privacy",
  "/identity/security": "/settings/security",
  "/identity/verification": "/settings/verification",
};

export function isSettingsPath(pathname: string): boolean {
  return pathname === "/settings" || pathname.startsWith("/settings/");
}

export function resolveSettingsHref(pathname: string): string {
  if (LEGACY_SETTINGS_REDIRECTS[pathname]) return LEGACY_SETTINGS_REDIRECTS[pathname];
  return pathname;
}

export function getActiveSettingsId(pathname: string): SettingsNavId | null {
  const normalized = resolveSettingsHref(pathname);
  const match = SETTINGS_NAV_ITEMS.find(
    (item) => normalized === item.href || normalized.startsWith(`${item.href}/`),
  );
  return match?.id ?? (normalized === "/settings" ? "profile" : null);
}
