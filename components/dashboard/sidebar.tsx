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
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  {
    label: "Marketplace",
    href: "/marketplace",
    icon: Package,
    activeMatch: (p) => p.startsWith("/marketplace"),
  },
  { label: "Products", href: "/marketplace", icon: Package },
  { label: "Orders", href: "/orders", icon: Truck },
  { label: "Customers", href: "/ugc/campaign-center/orders", icon: Users },
  { label: "Revenue", href: "/wallet", icon: DollarSign },
  { label: "Analytics", href: "/", icon: BarChart3 },
  { label: "Wishlist", href: "/marketplace", icon: Heart },
  { label: "Store", href: "/ugc/campaign-center/store", icon: Store },
  {
    label: "Seller Hub",
    href: "/ugc/campaign-center/store",
    icon: Boxes,
    activeMatch: (p) => p.startsWith("/ugc/campaign-center"),
  },
  {
    label: "Communities",
    href: "/owner/communities",
    icon: Globe,
    activeMatch: (p) =>
      p.startsWith("/owner/communities") || p.startsWith("/communities"),
  },
  { label: "Messages", href: "/messages", icon: MessageSquare },
  { label: "Notifications", href: "/settings/notifications", icon: Bell },
  { label: "Account", href: "/identity/settings", icon: Settings },
  { label: "Jimvio OS", icon: Monitor },
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
}: Omit<SidebarProps, "mobileOpen" | "user" | "activeRoles">) {
  const pathname = usePathname();
  const openOs = useJimvioOsStore((s) => s.openOs);
  const [unreadNotifications, setUnreadNotifications] = React.useState(0);
  const [unreadMessages, setUnreadMessages] = React.useState(0);

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
    if (item.href === "/") return pathname === "/";
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
          compact ? "w-9 h-9 justify-center" : "px-2.5 py-2"
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
        <div
          className="flex justify-center items-center h-14 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <button
            onClick={() => onCollapsedChange(false)}
            aria-label="Expand sidebar"
            className="w-8 h-8 flex items-center justify-center text-white font-semibold text-sm"
            style={{
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--color-accent)",
            }}
          >
            J
          </button>
        </div>

        <nav className="flex-1 flex flex-col items-center gap-1 py-3 overflow-y-auto no-scrollbar">
          {collapsedItems.map((item) => renderNavItem(item, true))}
        </nav>

        <div
          className="flex justify-center py-3 flex-shrink-0"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <button
            onClick={() => onCollapsedChange(false)}
            aria-label="Expand sidebar"
            className="w-7 h-7 flex items-center justify-center"
            style={{
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-border-strong)",
              color: "var(--color-text-muted)",
            }}
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
      <div
        className="flex items-center justify-between px-4 h-14 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <Link href="/" onClick={onMobileClose} className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
            style={{
              borderRadius: "var(--radius-sm)",
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
            className="hidden lg:flex w-6 h-6 items-center justify-center"
            style={{
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-border-strong)",
              color: "var(--color-text-muted)",
            }}
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          {onMobileClose && (
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Close sidebar"
              className="lg:hidden w-6 h-6 flex items-center justify-center"
              style={{
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-border-strong)",
                color: "var(--color-text-muted)",
              }}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <nav
        className="flex-1 overflow-y-auto px-2.5 py-3 no-scrollbar"
        aria-label="Dashboard navigation"
      >
        <ul className="space-y-px">
          {NAV_ITEMS.map((item) => (
            <li key={item.label}>{renderNavItem(item)}</li>
          ))}
        </ul>
      </nav>
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
  const sharedProps = { collapsed, onCollapsedChange, onMobileClose };

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? "3.5rem" : "14rem" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="hidden lg:flex flex-col sticky top-0 h-screen z-40 overflow-hidden"
        style={{
          backgroundColor: "var(--color-bg)",
          borderRight: "1px solid var(--color-border)",
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
                borderRight: "1px solid var(--color-border)",
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
