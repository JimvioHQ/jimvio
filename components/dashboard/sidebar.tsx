"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Globe, ShoppingCart, FileText, Heart, Store, Package,
  Truck, Layers, Link2, Megaphone, DollarSign, Wallet, Video, BarChart3,
  MessageSquare, Bell, User, Settings, ChevronLeft, ChevronRight, X, Zap,
  Users, CirclePlus, LayoutGrid, ArrowUpRight, LogOut, Eye, EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { CurrencySelector, useCurrency } from "@/context/CurrencyContext";
import { getUserBalance } from "@/lib/actions/wallet";

export type DashboardRole = "buyer" | "vendor" | "affiliate" | "influencer" | "admin";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  requiredRole?: DashboardRole;
};
type NavSection = {
  title: string;
  accentRgb?: string; // rgb for the section dot color
  items: NavItem[];
};

const sidebarSections: NavSection[] = [
  {
    title: "",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-[14px] w-[14px]" /> },
    ],
  },
  {
    title: "Buyer",
    accentRgb: "56,189,248",
    items: [
      { label: "All Items", href: "/marketplace", icon: <LayoutGrid className="h-[14px] w-[14px]" /> },
      { label: "Digital Assets", href: "/marketplace/digital", icon: <Zap className="h-[14px] w-[14px]" /> },
      { label: "Physical Goods", href: "/marketplace/physical", icon: <Package className="h-[14px] w-[14px]" /> },
      { label: "My Orders", href: "/dashboard/orders", icon: <ShoppingCart className="h-[14px] w-[14px]" /> },
      { label: "Digital Library", href: "/dashboard/library", icon: <Video className="h-[14px] w-[14px]" /> },
    ],
  },
  {
    title: "Community",
    accentRgb: "52,211,153",
    items: [
      { label: "Browse", href: "/communities", icon: <Users className="h-[14px] w-[14px]" /> },
      { label: "Create", href: "/communities/create", icon: <CirclePlus className="h-[14px] w-[14px]" /> },
      { label: "My Spaces", href: "/creator", icon: <LayoutGrid className="h-[14px] w-[14px]" /> },
      { label: "Analytics", href: "/dashboard/community/analytics", icon: <BarChart3 className="h-[14px] w-[14px]" /> },
    ],
  },
  {
    title: "Mission Owner",
    accentRgb: "251,146,60",
    items: [
      { label: "Mission Hub", href: "/dashboard/vendor/campaigns", icon: <LayoutDashboard className="h-[14px] w-[14px]" /> },
      { label: "Submissions", href: "/dashboard/vendor/submissions", icon: <Video className="h-[14px] w-[14px]" /> },
      { label: "Launch", href: "/dashboard/vendor/campaigns/new", icon: <CirclePlus className="h-[14px] w-[14px]" /> },
      { label: "Analytics", href: "/dashboard/vendor/campaigns/analytics", icon: <BarChart3 className="h-[14px] w-[14px]" /> },
    ],
  },
  {
    title: "Vendor Hub",
    accentRgb: "251,191,36",
    items: [
      { label: "My Store", href: "/dashboard/vendor/store", icon: <Store className="h-[14px] w-[14px]" />, requiredRole: "vendor" },
      { label: "Products", href: "/dashboard/products", icon: <Package className="h-[14px] w-[14px]" />, requiredRole: "vendor" },
      { label: "Orders", href: "/dashboard/vendor/orders", icon: <Truck className="h-[14px] w-[14px]" />, requiredRole: "vendor" },
      { label: "Inventory", href: "/dashboard/inventory", icon: <Layers className="h-[14px] w-[14px]" />, requiredRole: "vendor" },
      { label: "Payouts", href: "/dashboard/payments", icon: <Wallet className="h-[14px] w-[14px]" />, requiredRole: "vendor" },
    ],
  },
  {
    title: "Creator Hub",
    accentRgb: "129,140,248",
    items: [
      { label: "Explore Missions", href: "/ugc", icon: <Zap className="h-[14px] w-[14px]" /> },
      { label: "Submissions", href: "/dashboard/submissions", icon: <FileText className="h-[14px] w-[14px]" />, requiredRole: "influencer" },
      { label: "Studio", href: "/dashboard/influencer", icon: <LayoutDashboard className="h-[14px] w-[14px]" />, requiredRole: "influencer" },
      { label: "My Clips", href: "/dashboard/influencer/videos", icon: <Video className="h-[14px] w-[14px]" />, requiredRole: "influencer" },
      { label: "Analytics", href: "/dashboard/influencer/analytics", icon: <BarChart3 className="h-[14px] w-[14px]" />, requiredRole: "influencer" },
      { label: "Earnings", href: "/dashboard/earnings", icon: <DollarSign className="h-[14px] w-[14px]" />, requiredRole: "influencer" },
    ],
  },
  {
    title: "Affiliate",
    accentRgb: "251,113,133",
    items: [
      { label: "My Links", href: "/dashboard/links", icon: <Link2 className="h-[14px] w-[14px]" />, requiredRole: "affiliate" },
      { label: "Products", href: "/dashboard/affiliate/products", icon: <Megaphone className="h-[14px] w-[14px]" />, requiredRole: "affiliate" },
      { label: "Earnings", href: "/dashboard/earnings", icon: <DollarSign className="h-[14px] w-[14px]" />, requiredRole: "affiliate" },
      { label: "Analytics", href: "/dashboard/affiliate/analytics", icon: <BarChart3 className="h-[14px] w-[14px]" />, requiredRole: "affiliate" },
      { label: "Payouts", href: "/dashboard/withdrawals", icon: <Wallet className="h-[14px] w-[14px]" />, requiredRole: "affiliate" },
    ],
  },
  {
    title: "General",
    accentRgb: "148,163,184",
    items: [
      { label: "Messages", href: "/dashboard/messages", icon: <MessageSquare className="h-[14px] w-[14px]" /> },
      { label: "Notifications", href: "/dashboard/notifications", icon: <Bell className="h-[14px] w-[14px]" /> },
      // { label: "Profile", href: "/dashboard/settings", icon: <User className="h-[14px] w-[14px]" /> },
      { label: "Settings", href: "/dashboard/settings", icon: <Settings className="h-[14px] w-[14px]" /> },
    ],
  },
];

function getActivateHref(role: DashboardRole) {
  return role === "influencer" ? "/dashboard/activate/creator" : `/dashboard/activate/${role}`;
}

interface SidebarProps {
  user: { email: string; full_name?: string | null; avatar_url?: string | null };
  activeRoles: DashboardRole[];
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ user, activeRoles, collapsed, onCollapsedChange, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { formatMoney } = useCurrency();
  const [balance, setBalance] = React.useState({ available: 0, pending: 0 });
  const [balanceHidden, setBalanceHidden] = React.useState(true);

  React.useEffect(() => {
    async function fetch() {
      const res = await getUserBalance();
      if (res.success) setBalance({ available: res.available, pending: res.pending });
    }
    fetch();
    const t = setInterval(fetch, 120_000);
    return () => clearInterval(t);
  }, []);

  const hasRole = (r: DashboardRole) => activeRoles.includes("admin") || activeRoles.includes(r);
  const resolveHref = (item: NavItem) => {
    if (!item.requiredRole || item.requiredRole === "buyer") return item.href;
    return hasRole(item.requiredRole) ? item.href : getActivateHref(item.requiredRole);
  };
  const needsActivation = (item: NavItem) =>
    !!item.requiredRole && item.requiredRole !== "buyer" && !hasRole(item.requiredRole);

  const initials = (user.full_name?.[0] || user.email?.[0] || "U").toUpperCase();

  const content = (
    <div className="relative flex flex-col h-full z-10">

      {/* Logo bar — Shopify Admin Style */}
      <div className="flex items-center justify-between shrink-0 px-4 py-5 bg-[var(--color-surface)] border-b border-border">
        <Link href="/" onClick={onMobileClose} className="flex items-center gap-0 min-w-0 group">
          {!collapsed ? (
            <>
              <Image
                src="/jimvio-logo.png"
                alt="Jimvio"
                width={32}
                height={32}
                className="h-7 w-auto mix-blend-multiply dark:mix-blend-normal"
                priority
              />
              <span className="text-[22px] font-black tracking-[-0.07em] select-none truncate">
                <span className="text-stone-950 dark:text-white">Jim</span>
                <span className="bg-gradient-to-br from-[#fd5000] via-[#fd5000] to-[#ff6a00] bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(253,80,0,0.12)]">
                  vio
                </span>
              </span>
            </>
          ) : (
            <div className="w-8 h-8 rounded-sm bg-orange-500 flex items-center justify-center text-white font-black text-xs">J</div>
          )}
        </Link>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onCollapsedChange(!collapsed)}
            className="hidden lg:flex items-center justify-center transition-all hover:scale-105 active:scale-95 rounded-sm bg-surface-secondary dark:bg-surface-secondary border border-border text-stone-400 dark:text-text-muted"
            style={{
              width: 28, height: 28,
            }}
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronRight style={{ width: 12, height: 12 }} /> : <ChevronLeft style={{ width: 12, height: 12 }} />}
          </button>
          {onMobileClose && (
            <button
              type="button"
              onClick={onMobileClose}
              className="lg:hidden flex items-center justify-center transition-all active:scale-95 rounded-sm bg-surface-secondary dark:bg-surface-secondary border border-border text-stone-400  hover:text-stone-800 dark:text-text-secondary dark:hover:text-stone-200"
              style={{ width: 30, height: 30 }}
              aria-label="Close"
            >
              <X style={{ width: 13, height: 13 }} />
            </button>
          )}
        </div>
      </div>

      {/* ── Wallet Card ── */}
      {!collapsed && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="px-4 pt-4 pb-2"
        >
          <div className="relative overflow-hidden rounded-sm bg-[var(--color-bg-dark)] border border-stone-800 p-4 group">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-sm bg-orange-500/10 flex items-center justify-center text-orange-400 border border-orange-500/20">
                    <Wallet className="w-3 h-3" />
                  </div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Available Balance</span>
                </div>
                <button
                  onClick={() => setBalanceHidden(!balanceHidden)}
                  className="text-stone-500 hover:text-white transition-colors"
                >
                  {balanceHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <Link href="/dashboard/wallet" onClick={onMobileClose}>
                <div className="text-xl font-bold text-[var(--color-text-primary)] tabular-nums tracking-tight">
                  {balanceHidden ? "••••••" : formatMoney(balance.available, "USD")}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] font-medium text-stone-500">
                    {balanceHidden ? "•••" : formatMoney(balance.pending, "USD")} pending
                  </span>
                  <ArrowUpRight className="w-3 h-3 text-stone-500 group-hover:text-orange-400 transition-colors" />
                </div>
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* Collapsed wallet icon */}
      {collapsed && (
        <div className="px-2 pt-3 pb-1 shrink-0 flex justify-center">
          <Link
            href="/dashboard/wallet"
            title="My Wallet"
            className="flex items-center justify-center transition-all hover:scale-110 active:scale-95 bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/20 text-orange-600 dark:text-orange-500 rounded-sm h-9 w-9"
          >
            <Wallet style={{ width: 14, height: 14 }} />
          </Link>
        </div>
      )}

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2" style={{ scrollbarWidth: "none" }}>
        <div className={collapsed ? "px-2" : "px-2.5"}>
          {sidebarSections.map((section) => (
            <div key={section.title || "main"} className="mb-1">
              {section.title && !collapsed && (
                <div className="flex items-center gap-2 px-2 pt-3 pb-1">
                  {section.accentRgb && (<span className="block shrink-0 rounded-sm" style={{ width: 5, height: 5, background: `rgb(${section.accentRgb})` }} />)}
                  <span
                    style={{
                      fontSize: 9, fontWeight: 800, letterSpacing: "0.14em",
                      textTransform: "uppercase",
                    }}
                    className="text-stone-400 dark:text-text-muted"
                  >
                    {section.title}
                  </span>
                </div>
              )}

              <ul className="space-y-0.5">
                {section.items.map((item, idx) => {
                  const href = resolveHref(item);
                  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  const locked = needsActivation(item);

                  return (
                    <motion.li
                      key={`${section.title}-${item.label}`}
                      initial={{ x: -5, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 + idx * 0.03 }}
                    >
                      <Link
                        href={href}
                        onClick={onMobileClose}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "flex items-center group relative transition-all duration-150",
                          isActive
                            ? "bg-[var(--color-surface-secondary)] border border-border shadow-sm"
                            : "hover:bg-[var(--color-surface-secondary)]/50 border border-transparent"
                        )}
                        style={{
                          gap: collapsed ? 0 : 10,
                          padding: collapsed ? "8px" : "8px 12px",
                          borderRadius: 0,
                          justifyContent: collapsed ? "center" : "flex-start",
                          opacity: locked ? 0.4 : 1,
                        }}
                      >
                        {/* Hover layer */}
                        <motion.div
                          className="absolute inset-0 bg-stone-900/5 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
                          initial={false}
                          whileHover={{ scale: 1.05 }}
                        />

                        {/* Active left bar */}
                        {isActive && (
                          <span
                            className="pointer-events-none absolute left-0 inset-y-0 w-0.5 bg-orange-500"
                          />
                        )}

                        {/* Icon */}
                        <motion.span
                          whileHover={{ scale: 1.1 }}
                          className={cn(
                            "flex items-center justify-center flex-shrink-0 transition-all z-10",
                            isActive
                              ? "text-orange-600"
                              : "text-neutral-400 group-hover:text-neutral-600 dark:text-text-muted dark:group-hover:text-zinc-300"
                          )}
                          style={{
                            width: 24,
                            height: 24,
                          }}
                        >
                          {item.icon}
                        </motion.span>

                        {!collapsed && (
                          <>
                            <span
                              className={cn(
                                "flex-1 truncate group-hover:translate-x-0.5 transition-transform z-10 text-[13px] tracking-tight",
                                isActive ? "font-bold text-[var(--color-text-primary)]" : "font-semibold text-[var(--color-text-secondary)]"
                              )}
                            >
                              {item.label}
                            </span>
                            {locked && (
                              <span className="text-[9px] font-bold tracking-widest uppercase text-stone-400/40 dark:text-text-muted/40 flex-shrink-0">
                                Unlock
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* Removed Redundant Sections */}
    </div>
  );

  /* ── Solid shell styles (border-only) ── */
  const solidShell = (
    <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-border" />
  );

  return (
    <>
      {/* Desktop */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? "4.5rem" : "15.5rem" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="hidden lg:block sticky top-0 h-screen relative z-40 overflow-hidden bg-surface"
      >
        {solidShell}
        {content}
      </motion.aside>

      {/* Mobile */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 lg:hidden animate-in fade-in duration-200 bg-black/50"
            onClick={onMobileClose}
            aria-hidden
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 lg:hidden w-[min(15.5rem,88vw)] animate-in slide-in-from-left duration-250 bg-surface border-r border-border shadow-none"
          >
            {content}
          </aside>
        </>
      )}
    </>
  );
}

