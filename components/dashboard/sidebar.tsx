"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { VscPackage } from "react-icons/vsc";
import {
  LayoutDashboard, Truck, Heart, Globe, Users,
  MessageSquare, Bell, BarChart3, Store, DollarSign, Settings,
  Boxes, ChevronRight, ShoppingBag,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { subscribePostgresChanges, unsubscribeRealtime } from "@/lib/supabase/realtime-subscribe";
import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  SidebarHeader,
  SidebarSection,
  SidebarProfile,
  SidebarBadgeDot,
  type SidebarNavItemConfig,
  type SidebarSectionConfig,
} from "@/components/ui/sidebar";

export type DashboardRole = "buyer" | "vendor" | "affiliate" | "influencer" | "admin";

interface SidebarProps {
  user: { email: string; full_name?: string | null; avatar_url?: string | null };
  activeRoles: DashboardRole[];
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  collapsible?: boolean;
}

const NAV_ITEMS: SidebarNavItemConfig[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Marketplace", href: "/marketplace", icon: VscPackage, activeMatch: (p) => p.startsWith("/marketplace") },
  { label: "Products", href: "/dashboard/products", icon: VscPackage },
  { label: "Orders", href: "/dashboard/orders", icon: ShoppingBag },
  { label: "Customers", href: "/dashboard/vendor/orders", icon: Users },
  { label: "Revenue", href: "/dashboard/payments", icon: DollarSign },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Wishlist", href: "/dashboard/wishlist", icon: Heart },
  { label: "Store", href: "/dashboard/vendor/store", icon: Store },
  { label: "Seller Hub", href: "/dashboard/vendor/store", icon: Boxes, activeMatch: (p) => p.startsWith("/dashboard/vendor") },
  { label: "Communities", href: "/dashboard/communities", icon: Globe, activeMatch: (p) => p.startsWith("/dashboard/communities") || p.startsWith("/communities") },
  { label: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { label: "Account", href: "/dashboard/settings", icon: Settings },
];

const SECTIONS: SidebarSectionConfig[] = [
  {
    key: "commerce",
    title: "Commerce",
    items: NAV_ITEMS.filter((i) =>
      ["Dashboard", "Marketplace", "Products", "Orders", "Customers", "Revenue", "Analytics", "Wishlist", "Store", "Seller Hub"].includes(i.label)
    ),
  },
  {
    key: "community",
    title: "Community",
    items: NAV_ITEMS.filter((i) => ["Communities", "Messages", "Notifications"].includes(i.label)),
  },
  {
    key: "account",
    title: "Account",
    items: NAV_ITEMS.filter((i) => ["Account", "Jimvio OS"].includes(i.label)),
  },
];

function SidebarContent({ collapsed, onCollapsedChange, onMobileClose, user, activeRoles, collapsible }: SidebarProps) {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const [unreadNotifications, setUnreadNotifications] = React.useState(0);
  const [unreadMessages, setUnreadMessages] = React.useState(0);
  const [openSections, setOpenSections] = React.useState<Set<string>>(new Set(["commerce", "community", "account"]));

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
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("type", "message").eq("is_read", false),
      ]);
      if (cancelled) return;
      setUnreadNotifications(notifCount ?? 0);
      setUnreadMessages(msgCount ?? 0);
    }

    async function setup() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      await refreshBadges(user.id);
      channel = await subscribePostgresChanges(supabase, `${channelPrefix}-${user.id}`, {
        event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}`,
      }, () => { void refreshBadges(user.id); }, () => cancelled);
    }

    void setup();
    return () => { cancelled = true; unsubscribeRealtime(supabase, channel, channelPrefix); };
  }, []);

  function badgeForItem(label: string): string | number | undefined {
    if (label === "Notifications" && unreadNotifications > 0) return unreadNotifications > 99 ? "99+" : unreadNotifications;
    if (label === "Messages" && unreadMessages > 0) return unreadMessages > 99 ? "99+" : unreadMessages;
    return undefined;
  }

  function isActive(hrefOrLabel: string | undefined): boolean {
    if (!hrefOrLabel) return false;
    const item = NAV_ITEMS.find((i) => i.label === hrefOrLabel || i.href === hrefOrLabel);
    if (item?.activeMatch) return item.activeMatch(pathname);
    if (!item?.href) return false;
    if (item.href === "/dashboard") return pathname === "/dashboard";
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  // Collapsed mode
  if (collapsed) {
    const collapsedItems = NAV_ITEMS.filter(
      (i) => !["Customers", "Revenue", "Analytics", "Wishlist", "Store", "Seller Hub", "Account"].includes(i.label)
    );

    return (
      <div className="flex flex-col h-full">
        <SidebarHeader collapsed onToggle={() => onCollapsedChange(false)} collapsible={collapsible} />
        <nav className="flex-1 flex flex-col items-center gap-1 py-2 overflow-y-auto no-scrollbar">
          {collapsedItems.map((item) => (
            <div key={item.label} className="relative">
              <SidebarNavItemPrimitive item={item} active={isActive(item.href)} collapsed badge={badgeForItem(item.label)} />
              <SidebarBadgeDot show={!!badgeForItem(item.label)} />
            </div>
          ))}
        </nav>
        <SidebarProfile user={user} collapsed onSettingsClick={onMobileClose} />
        {collapsible && (
          <button
            onClick={() => onCollapsedChange(false)}
            aria-label="Expand sidebar"
            className="w-6 h-6 mx-auto mb-2 flex items-center justify-center transition-colors hover:bg-[color-mix(in_srgb,var(--color-paper)_8%,transparent)] active:scale-95"
            style={{ borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)" }}
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  // Expanded mode
  return (
    <div
      className="flex flex-col h-full"
    >
      <SidebarHeader onToggle={() => onCollapsedChange(true)} onMobileClose={onMobileClose} collapsible={collapsible} />

      <nav className="flex-1 overflow-y-auto px-2.5 py-2 no-scrollbar" aria-label="Dashboard navigation">
        {SECTIONS.map((section) => (
          <SidebarSection
            key={section.key}
            section={section}
            isOpen={openSections.has(section.key)}
            onToggle={() => toggleSection(section.key)}
            isActive={(href) => isActive(href)}
            getBadge={(label) => badgeForItem(label)}
            onItemClick={onMobileClose}
          />
        ))}
      </nav>

      <SidebarProfile user={user} roles={activeRoles} signOutButton={<SignOutButton variant="icon" />} />
    </div>
  );
}

// Mini local wrapper for collapsed nav items (avoids full import dependency)
function SidebarNavItemPrimitive({ item, active, collapsed, badge }: {
  item: SidebarNavItemConfig; active: boolean; collapsed?: boolean; badge?: string | number;
}) {
  const Icon = item.icon;
  const content = (
    <>
      <Icon className="h-4 w-4 flex-shrink-0" style={{ color: active ? "var(--color-accent)" : "color-mix(in srgb, var(--color-paper) 50%, transparent)" }} />
      {badge && (
        <span
          className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
          style={{ backgroundColor: "var(--color-accent)" }}
        />
      )}
    </>
  );

  const style = {
    borderRadius: "var(--radius-sm)",
    backgroundColor: active ? "color-mix(in srgb, var(--color-accent) 10%, transparent)" : "transparent",
    color: active ? "var(--color-accent)" : "var(--color-paper-dim)",
    transition: "background-color 0.12s, color 0.12s",
  };

  if (item.onClick) {
    return (
      <button type="button" title={item.label} className="w-9 h-9 flex items-center justify-center hover:bg-[color-mix(in_srgb,var(--color-paper)_8%,transparent)] active:scale-95" style={style}>
        {content}
      </button>
    );
  }

  return (
    <Link href={item.href ?? "#"} title={item.label} className="w-9 h-9 flex items-center justify-center hover:bg-[color-mix(in_srgb,var(--color-paper)_8%,transparent)]" style={style}>
      {content}
    </Link>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function Sidebar(props: SidebarProps) {
  const { collapsed, onCollapsedChange, mobileOpen, onMobileClose } = props;
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const sharedProps = { ...props };
  const sidebarBg = isLight ? "var(--color-ink)" : "var(--color-ink-deep)";

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? "3.5rem" : "14rem" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="hidden lg:flex flex-col sticky top-0 h-screen z-40 overflow-hidden"
        style={{
          backgroundColor: sidebarBg,
          boxShadow: "1px 0 0 0 var(--color-border), 4px 0 12px -8px rgba(0,0,0,0.08)",
        }}
        suppressHydrationWarning
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
              style={{ backgroundColor: sidebarBg, boxShadow: "4px 0 16px -8px rgba(0,0,0,0.15)" }}
            >
              <SidebarContent {...sharedProps} collapsed={false} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}


