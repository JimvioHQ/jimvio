"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Truck,
  Heart,
  Globe,
  Users,
  MessageSquare,
  Bell,
  BarChart3,
  Store,
  DollarSign,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Boxes,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { subscribePostgresChanges, unsubscribeRealtime } from "@/lib/supabase/realtime-subscribe";
import { useJimvioOsStore } from "@/lib/store/use-jimvio-os-store";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DashboardRole =
  | "buyer"
  | "vendor"
  | "affiliate"
  | "influencer"
  | "admin";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  badge?: string;
  onClick?: () => void;
  activeMatch?: (pathname: string) => boolean;
}

interface SidebarProps {
  user: {
    email: string;
    full_name?: string | null;
    avatar_url?: string | null;
  };
  activeRoles: DashboardRole[];
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Marketplace",
    href: "/marketplace",
    icon: Package,
    activeMatch: (p) => p.startsWith("/marketplace"),
  },
  { label: "Products", href: "/dashboard/products", icon: Package },
  { label: "Orders", href: "/dashboard/orders", icon: Truck },
  { label: "Customers", href: "/dashboard/vendor/orders", icon: Users },
  { label: "Revenue", href: "/dashboard/payments", icon: DollarSign },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Wishlist", href: "/dashboard/wishlist", icon: Heart },
  { label: "Store", href: "/dashboard/vendor/store", icon: Store },
  {
    label: "Seller Hub",
    href: "/dashboard/vendor/store",
    icon: Boxes,
    activeMatch: (p) => p.startsWith("/dashboard/vendor"),
  },
  {
    label: "Communities",
    href: "/dashboard/communities",
    icon: Globe,
    activeMatch: (p) =>
      p.startsWith("/dashboard/communities") || p.startsWith("/communities"),
  },
  { label: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { label: "Account", href: "/dashboard/settings", icon: Settings },
  { label: "Jimvio OS", icon: Monitor },
];

// ─── Section types & config ────────────────────────────────────────────────────

interface Section {
  key: string;
  title: string;
  items: NavItem[];
}

function resolveHref(item: NavItem): string {
  return item.href ?? "#";
}

function isLocked(_item: NavItem): boolean {
  return false;
}

const SECTIONS: Section[] = [
  {
    key: "commerce",
    title: "Commerce",
    items: NAV_ITEMS.filter((i) =>
      [
        "Dashboard",
        "Marketplace",
        "Products",
        "Orders",
        "Customers",
        "Revenue",
        "Analytics",
        "Wishlist",
        "Store",
        "Seller Hub",
      ].includes(i.label)
    ),
  },
  {
    key: "community",
    title: "Community",
    items: NAV_ITEMS.filter((i) =>
      ["Communities", "Messages", "Notifications"].includes(i.label)
    ),
  },
  {
    key: "account",
    title: "Account",
    items: NAV_ITEMS.filter((i) =>
      ["Account", "Jimvio OS"].includes(i.label)
    ),
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function BadgePill({ label }: { label: string }) {
  const isNumeric = /^\d+$/.test(label) || label.endsWith("+");
  return (
    <span
      className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none"
      style={
        isNumeric
          ? {
              backgroundColor: "var(--color-surface-secondary)",
              color: "var(--color-text-muted)",
            }
          : {
              backgroundColor: "var(--color-accent-subtle)",
              color: "var(--color-accent)",
            }
      }
    >
      {label}
    </span>
  );
}

// ─── Sidebar inner content ────────────────────────────────────────────────────

function SidebarContent({
  collapsed,
  onCollapsedChange,
  onMobileClose,
  user,
  activeRoles,
}: SidebarProps) {
  const pathname = usePathname();
  const openOs = useJimvioOsStore((s) => s.openOs);
  const [unreadNotifications, setUnreadNotifications] = React.useState(0);
  const [unreadMessages, setUnreadMessages] = React.useState(0);
  const [openSections, setOpenSections] = React.useState<Set<string>>(
    new Set(["commerce", "community", "account"])
  );

  function toggleSection(key: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  React.useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    let channel: Awaited<ReturnType<typeof subscribePostgresChanges>> = null;
    const channelPrefix = "sidebar-notifications";

    async function refreshBadges(userId: string) {
      const [{ count: notifCount }, { count: msgCount }] = await Promise.all([
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("is_read", false),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("type", "message")
          .eq("is_read", false),
      ]);

      if (cancelled) return;
      setUnreadNotifications(notifCount ?? 0);
      setUnreadMessages(msgCount ?? 0);
    }

    async function setup() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      await refreshBadges(user.id);

      channel = await subscribePostgresChanges(
        supabase,
        `${channelPrefix}-${user.id}`,
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void refreshBadges(user.id);
        },
        () => cancelled
      );
    }

    void setup();

    return () => {
      cancelled = true;
      unsubscribeRealtime(supabase, channel, channelPrefix);
    };
  }, []);

  function badgeForItem(label: string, fallback?: string): string | undefined {
    if (label === "Notifications" && unreadNotifications > 0) {
      return unreadNotifications > 99 ? "99+" : String(unreadNotifications);
    }
    if (label === "Messages" && unreadMessages > 0) {
      return unreadMessages > 99 ? "99+" : String(unreadMessages);
    }
    return fallback;
  }

  function isActive(item: NavItem): boolean {
    if (item.activeMatch) return item.activeMatch(pathname);
    if (!item.href) return false;
    if (item.href === "/dashboard") return pathname === "/dashboard";
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  function handleItemClick(item: NavItem) {
    if (item.label === "Jimvio OS") {
      openOs();
      onMobileClose?.();
      return;
    }
    onMobileClose?.();
  }

  function renderNavItem(item: NavItem, compact = false) {
    const active = isActive(item);
    const Icon = item.icon;
    const badge = badgeForItem(item.label, item.badge);
    const isOs = item.label === "Jimvio OS";

    const content = (
      <>
        {active && !compact && (
          <span
            className="absolute left-0 inset-y-[20%] w-[3px] rounded-r-full"
            style={{ backgroundColor: "var(--color-accent)" }}
          />
        )}
        <Icon
          className={cn("flex-shrink-0", compact ? "h-4 w-4" : "h-3.5 w-3.5")}
          style={{
            color: active ? "var(--color-accent)" : "var(--color-text-muted)",
          }}
        />
        {!compact && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {badge && <BadgePill label={badge} />}
          </>
        )}
      </>
    );

    const style = {
      borderRadius: "var(--radius-sm)",
      backgroundColor: active ? "var(--color-accent-light)" : "transparent",
      color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
      fontWeight: active ? 600 : 500,
      transition: "background-color 0.12s, color 0.12s",
    };

    if (isOs || item.onClick) {
      return (
        <button
          key={item.label}
          type="button"
          onClick={() => {
            item.onClick?.();
            handleItemClick(item);
          }}
          title={compact ? item.label : undefined}
          className={cn(
            "relative flex items-center gap-2.5 text-[13px] font-medium w-full text-left",
            compact ? "w-9 h-9 justify-center" : "px-2.5 py-2"
          )}
          style={style}
        >
          {content}
        </button>
      );
    }

    return (
      <Link
        key={item.label}
        href={item.href!}
        onClick={() => onMobileClose?.()}
        title={compact ? item.label : undefined}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex items-center gap-2.5 text-[13px] font-medium",
          compact ? "w-9 h-9 justify-center" : "px-2.5 py-2",
          !active && "hover:bg-[var(--color-surface-secondary)]"
        )}
        style={style}
      >
        {content}
      </Link>
    );
  }

  // ── Collapsed icon-only rail ───────────────────────────────────────────────
  if (collapsed) {
    const collapsedItems = NAV_ITEMS.filter(
      (item) =>
        !["Customers", "Revenue", "Analytics", "Wishlist", "Store", "Seller Hub", "Account"].includes(
          item.label
        )
    );

    return (
      <div className="flex flex-col h-full">
        <div className="flex justify-center items-center h-14 flex-shrink-0">
          <button
            onClick={() => onCollapsedChange(false)}
            aria-label="Expand sidebar"
            className="w-8 h-8 flex items-center justify-center text-white font-semibold text-sm transition-transform hover:scale-105 active:scale-95"
            style={{
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--color-accent)",
            }}
          >
            J
          </button>
        </div>

        <nav className="flex-1 flex flex-col items-center gap-1 py-2 overflow-y-auto no-scrollbar">
          {collapsedItems.map((item) => {
            const badge = badgeForItem(item.label, item.badge);
            return (
              <div key={item.label} className="relative">
                {renderNavItem(item, true)}
                {badge && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                    style={{ backgroundColor: "var(--color-accent)" }}
                  />
                )}
              </div>
            );
          })}
        </nav>

        {/* Profile icon + expand */}
        <div className="flex flex-col items-center gap-2 py-2 flex-shrink-0">
          <Link
            href="/dashboard/settings"
            title="Settings"
            className="w-9 h-9 flex items-center justify-center"
          >
            <Avatar className="h-7 w-7 rounded-lg shrink-0 transition-opacity hover:opacity-80">
              <AvatarImage src={user.avatar_url ?? undefined} className="rounded-lg object-cover" />
              <AvatarFallback className="rounded-lg bg-[var(--color-accent)] text-white text-[9px] font-bold">
                {user.full_name?.[0] || user.email?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
          </Link>
          <button
            onClick={() => onCollapsedChange(false)}
            aria-label="Expand sidebar"
            className="w-6 h-6 flex items-center justify-center transition-colors hover:bg-[var(--color-surface-secondary)] active:scale-95"
            style={{ borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)" }}
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  // ── Expanded sidebar ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: "var(--color-bg)" }}>
      <div className="flex items-center justify-between px-4 h-14 flex-shrink-0">
        <Link href="/" onClick={onMobileClose} className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-7 h-7 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 transition-transform hover:scale-105"
            style={{
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--color-accent)",
            }}
          >
            J
          </div>
          <span
            className="text-[17px] font-semibold tracking-tight truncate"
            style={{ color: "var(--color-text-primary)" }}
          >
            Jim
            <span style={{ color: "var(--color-accent)" }}>vio</span>
          </span>
        </Link>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => onCollapsedChange(true)}
            aria-label="Collapse sidebar"
            className="hidden lg:flex w-6 h-6 items-center justify-center transition-colors hover:bg-[var(--color-surface-secondary)] active:scale-95"
            style={{ borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)" }}
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          {onMobileClose && (
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Close sidebar"
              className="lg:hidden w-6 h-6 flex items-center justify-center transition-colors hover:bg-[var(--color-surface-secondary)] active:scale-95"
              style={{ borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)" }}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <nav
        className="flex-1 overflow-y-auto px-2.5 py-2 no-scrollbar"
        aria-label="Dashboard navigation"
      >
        {/* Sections */}
        {SECTIONS.map((section) => {
          const isOpen = openSections.has(section.key);
          return (
            <React.Fragment key={section.key}>
              <div className="mb-px">
                {/* Section header */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.key)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors",
                    "hover:bg-[var(--color-surface-secondary)]"
                  )}
                  style={{ borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)" }}
                >
                  <span className="flex-1 text-left">{section.title}</span>
                  <motion.div
                    animate={{ rotate: isOpen ? 0 : -90 }}
                    transition={{ duration: 0.18, ease: "easeInOut" }}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </motion.div>
                </button>

                {/* Section items */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="items"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <ul className="space-y-px mt-px">
                        {section.items.map((item) => {
                          const href = resolveHref(item);
                          const active = isActive(item.href);
                          const locked = isLocked(item);
                          const Icon = item.icon;
                          const badge = badgeForItem(item.label, item.badge);
                          return (
                            <li key={`${section.key}-${item.label}`}>
                              <Link
                                href={href}
                                onClick={onMobileClose}
                                aria-current={active ? "page" : undefined}
                                className={cn(
                                  "relative flex items-center gap-2.5 px-2.5 py-2 text-[13px] transition-all duration-150",
                                  locked && "opacity-40",
                                  !active && "hover:bg-[var(--color-surface-secondary)]"
                                )}
                                style={{
                                  borderRadius: "var(--radius-sm)",
                                  backgroundColor: active
                                    ? "var(--color-accent-light)"
                                    : "transparent",
                                  color: active
                                    ? "var(--color-accent)"
                                    : "var(--color-text-secondary)",
                                  fontWeight: active ? 600 : 500,
                                }}
                              >
                                {active && (
                                  <span
                                    className="absolute left-0 inset-y-[20%] w-[3px] rounded-r-full"
                                    style={{ backgroundColor: "var(--color-accent)" }}
                                  />
                                )}
                                <Icon
                                  className="h-4 w-4 flex-shrink-0"
                                  style={{
                                    color: active
                                      ? "var(--color-accent)"
                                      : "var(--color-text-muted)",
                                  }}
                                />
                                <span className="flex-1 truncate">{item.label}</span>
                                {badge && !locked && (
                                  <BadgePill label={badge} />
                                )}
                                {locked && (
                                  <span
                                    className="text-[9px] font-semibold uppercase tracking-wider"
                                    style={{ color: "var(--color-text-muted)" }}
                                  >
                                    Unlock
                                  </span>
                                )}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </React.Fragment>
          );
        })}
      </nav>

      {/* Profile footer */}
      <div className="flex-shrink-0 px-2.5 py-2.5">
        <div className="flex items-center gap-2.5">
          <Link href="/dashboard/settings" onClick={onMobileClose}>
            <Avatar className="h-8 w-8 rounded-lg shrink-0 transition-opacity hover:opacity-80">
              <AvatarImage src={user.avatar_url ?? undefined} className="rounded-lg object-cover" />
              <AvatarFallback className="rounded-lg bg-[var(--color-accent)] text-white text-[11px] font-bold">
                {user.full_name?.[0] || user.email?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0 flex-1 hidden sm:block">
            <Link href="/dashboard/settings" onClick={onMobileClose}>
              <p
                className="text-[13px] font-semibold truncate leading-tight"
                style={{ color: "var(--color-text-primary)" }}
              >
                {user.full_name?.split(" ")[0] || "Account"}
              </p>
            </Link>
            <div className="flex items-center gap-1.5 mt-px">
              <p className="text-[11px] truncate leading-tight" style={{ color: "var(--color-text-muted)" }}>
                {user.email}
              </p>
              {activeRoles.length > 0 && (
                <span className="text-[9px] font-semibold uppercase tracking-wider shrink-0 px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: "var(--color-accent-subtle)", color: "var(--color-accent)" }}
                >
                  {activeRoles[0]}
                </span>
              )}
            </div>
          </div>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function Sidebar({
  user,
  activeRoles,
  collapsed,
  onCollapsedChange,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const sharedProps = { collapsed, onCollapsedChange, onMobileClose, user };

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? "3.5rem" : "14rem" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="hidden lg:flex flex-col sticky top-0 h-screen z-40 overflow-hidden"
        style={{
          backgroundColor: "var(--color-bg)",
          boxShadow: "1px 0 0 0 var(--color-border), 4px 0 12px -8px rgba(0,0,0,0.08)",
        }}
      >
        <SidebarContent {...sharedProps} />
      </motion.aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 lg:hidden"
              style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
              onClick={onMobileClose}
              aria-hidden="true"
            />
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden flex flex-col w-[min(14rem,88vw)]"
              style={{
                backgroundColor: "var(--color-bg)",
                boxShadow: "4px 0 16px -8px rgba(0,0,0,0.15)",
              }}
            >
              <SidebarContent {...sharedProps} collapsed={false} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
