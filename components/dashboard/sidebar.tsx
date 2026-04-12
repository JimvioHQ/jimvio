"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Globe, ShoppingCart, FileText, Heart, Store, Package,
  Truck, Layers, Link2, Megaphone, DollarSign, Wallet, Video, BarChart3,
  MessageSquare, Bell, User, Settings, ChevronLeft, ChevronRight, X, Zap,
  Users, CirclePlus, LayoutGrid, ArrowUpRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
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
  items: NavItem[];
};

const sidebarSections: NavSection[] = [
  {
    title: "",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: "My Wallet", href: "/dashboard/wallet", icon: <Wallet className="h-4 w-4" /> },
    ],
  },
  {
    title: "Buyer",
    items: [
      { label: "Marketplace", href: "/dashboard/marketplace", icon: <Globe className="h-4 w-4" /> },
      { label: "Orders", href: "/dashboard/orders", icon: <ShoppingCart className="h-4 w-4" /> },
      { label: "Digital Library", href: "/dashboard/library", icon: <Video className="h-4 w-4" /> },
      { label: "Saved", href: "/dashboard/wishlist", icon: <Heart className="h-4 w-4" /> },
      { label: "Analytics", href: "/dashboard/buyer/analytics", icon: <BarChart3 className="h-4 w-4" /> },
    ],
  },
  {
    title: "Community",
    items: [
      { label: "Browse", href: "/communities", icon: <Users className="h-4 w-4" /> },
      { label: "Create", href: "/communities/create", icon: <CirclePlus className="h-4 w-4" /> },
      { label: "My Spaces", href: "/creator", icon: <LayoutGrid className="h-4 w-4" /> },
      { label: "Analytics", href: "/dashboard/community/analytics", icon: <BarChart3 className="h-4 w-4" /> },
    ],
  },
  {
    title: "Mission Owner",
    items: [
      { label: "Mission Hub", href: "/dashboard/vendor/campaigns", icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: "Submissions", href: "/dashboard/vendor/submissions", icon: <Video className="h-4 w-4" /> },
      { label: "Launch Mission", href: "/dashboard/vendor/campaigns/new", icon: <CirclePlus className="h-4 w-4" /> },
      { label: "Intelligence", href: "/dashboard/vendor/campaigns/analytics", icon: <BarChart3 className="h-4 w-4" /> },
    ],
  },
  {
    title: "Vendor Hub",
    items: [
      { label: "My Store", href: "/dashboard/vendor/store", icon: <Store className="h-4 w-4" />, requiredRole: "vendor" },
      { label: "Products", href: "/dashboard/products", icon: <Package className="h-4 w-4" />, requiredRole: "vendor" },
      { label: "Orders", href: "/dashboard/vendor/orders", icon: <Truck className="h-4 w-4" />, requiredRole: "vendor" },
      { label: "Inventory", href: "/dashboard/inventory", icon: <Layers className="h-4 w-4" />, requiredRole: "vendor" },
      { label: "Payouts", href: "/dashboard/payments", icon: <Wallet className="h-4 w-4" />, requiredRole: "vendor" },
    ],
  },
  {
    title: "Creator Hub",
    items: [
      { label: "Explore Missions", href: "/ugc", icon: <Zap className="h-4 w-4" /> },
      { label: "Submissions", href: "/dashboard/submissions", icon: <FileText className="h-4 w-4" />, requiredRole: "influencer" },
      { label: "Studio", href: "/dashboard/influencer", icon: <LayoutDashboard className="h-4 w-4" />, requiredRole: "influencer" },
      { label: "My Clips", href: "/dashboard/influencer/videos", icon: <Video className="h-4 w-4" />, requiredRole: "influencer" },
      { label: "Analytics", href: "/dashboard/influencer/analytics", icon: <BarChart3 className="h-4 w-4" />, requiredRole: "influencer" },
      { label: "Earnings", href: "/dashboard/earnings", icon: <DollarSign className="h-4 w-4" />, requiredRole: "influencer" },
    ],
  },
  {
    title: "Affiliate",
    items: [
      { label: "My Links", href: "/dashboard/links", icon: <Link2 className="h-4 w-4" />, requiredRole: "affiliate" },
      { label: "Products", href: "/dashboard/affiliate/products", icon: <Megaphone className="h-4 w-4" />, requiredRole: "affiliate" },
      { label: "Earnings", href: "/dashboard/earnings", icon: <DollarSign className="h-4 w-4" />, requiredRole: "affiliate" },
      { label: "Analytics", href: "/dashboard/affiliate/analytics", icon: <BarChart3 className="h-4 w-4" />, requiredRole: "affiliate" },
      { label: "Payouts", href: "/dashboard/withdrawals", icon: <Wallet className="h-4 w-4" />, requiredRole: "affiliate" },
    ],
  },
  {
    title: "General",
    items: [
      { label: "Messages", href: "/dashboard/messages", icon: <MessageSquare className="h-4 w-4" /> },
      { label: "Notifications", href: "/dashboard/notifications", icon: <Bell className="h-4 w-4" /> },
      { label: "Profile", href: "/dashboard/settings", icon: <User className="h-4 w-4" /> },
      { label: "Settings", href: "/dashboard/settings", icon: <Settings className="h-4 w-4" /> },
    ],
  },
];

function getActivateHref(role: DashboardRole): string {
  if (role === "influencer") return "/dashboard/activate/creator";
  return `/dashboard/activate/${role}`;
}

interface SidebarProps {
  user: { email: string; full_name?: string | null; avatar_url?: string | null };
  activeRoles: DashboardRole[];
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({
  user, activeRoles, collapsed, onCollapsedChange, mobileOpen, onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { formatMoney } = useCurrency();
  const [balance, setBalance] = React.useState({ available: 0, pending: 0 });

  React.useEffect(() => {
    async function fetchBalance() {
      const res = await getUserBalance();
      if (res.success) setBalance({ available: res.available, pending: res.pending });
    }
    fetchBalance();
    const interval = setInterval(fetchBalance, 120_000);
    return () => clearInterval(interval);
  }, []);

  const hasRole = (role: DashboardRole) =>
    activeRoles.includes("admin") || activeRoles.includes(role);

  const resolveHref = (item: NavItem) => {
    if (!item.requiredRole || item.requiredRole === "buyer") return item.href;
    return hasRole(item.requiredRole) ? item.href : getActivateHref(item.requiredRole);
  };

  const isActivationLink = (item: NavItem) =>
    !!item.requiredRole && item.requiredRole !== "buyer" && !hasRole(item.requiredRole);

  /* ── Section color map ── */
  const sectionAccent: Record<string, string> = {
    "Buyer": "text-sky-500",
    "Community": "text-emerald-500",
    "Mission Owner": "text-orange-500",
    "Vendor Hub": "text-amber-500",
    "Creator Hub": "text-indigo-500",
    "Affiliate": "text-rose-500",
    "General": "text-stone-400",
  };

  const content = (
    <div className="flex flex-col h-full">

      {/* ── Logo bar ── */}
      <div className={cn(
        "flex items-center justify-between px-4 py-3.5 shrink-0",
        "border-b border-white/30",
      )}>
        <Link href="/" onClick={onMobileClose} className="flex items-center min-w-0">
          {collapsed ? (
            <div className="h-8 w-8 rounded-[12px] bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md shadow-orange-200/50">
              <LayoutDashboard className="h-4 w-4 text-white" />
            </div>
          ) : (
            <Image src="/jimvio-logo.png" alt="Jimvio" width={110} height={36} className="h-7 w-auto" />
          )}
        </Link>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onCollapsedChange(!collapsed)}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-full bg-white/50 border border-white/60 text-stone-500 hover:text-stone-800 hover:bg-white/80 transition-all shadow-sm backdrop-blur-xl"
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed
              ? <ChevronRight className="h-3.5 w-3.5" />
              : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
          {onMobileClose && (
            <button
              type="button"
              onClick={onMobileClose}
              className="lg:hidden flex h-8 w-8 items-center justify-center rounded-full bg-white/50 border border-white/60 text-stone-600 hover:bg-white/80 transition-all backdrop-blur-xl shadow-sm"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Wallet glass card ── */}
      {!collapsed && (
        <div className="px-3 pt-3 pb-1 shrink-0">
          <Link href="/dashboard/wallet" className="group block">
            <div className="relative overflow-hidden rounded-[20px] bg-white/40 border border-white/70 backdrop-blur-2xl p-3.5 shadow-[0_2px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] transition-all hover:bg-white/60 hover:shadow-md active:scale-[0.98]">
              {/* Specular */}
              <div className="pointer-events-none absolute -top-1/2 -left-1/4 w-3/4 h-3/4 bg-gradient-to-br from-white/70 to-transparent rotate-[-20deg]" />
              <div className="pointer-events-none absolute bottom-0 right-0 w-16 h-16 rounded-full blur-2xl bg-orange-100/50" />

              <div className="relative flex items-center justify-between mb-2.5">
                <div className="h-6 w-6 rounded-[9px] bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md shadow-orange-200/60">
                  <Zap className="h-3 w-3 text-white" />
                </div>
                <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-stone-400">Wallet</span>
              </div>

              <p className="text-[18px] font-bold text-stone-900 tabular-nums leading-none tracking-tight">
                {formatMoney(balance.available, "USD")}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                <p className="text-[10px] font-semibold text-stone-400 tabular-nums">
                  {formatMoney(balance.pending, "USD")} in escrow
                </p>
              </div>

              <ArrowUpRight className="absolute top-3.5 right-3.5 h-3 w-3 text-stone-300 opacity-0 group-hover:opacity-100 group-hover:text-orange-500 transition-all" />
            </div>
          </Link>
        </div>
      )}

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3 space-y-1 scrollbar-hide">
        {sidebarSections.map((section) => (
          <div key={section.title || "main"} className="mb-1">
            {section.title && !collapsed && (
              <p className={cn(
                "px-2.5 pt-3 pb-1 text-[9px] font-bold uppercase tracking-[0.18em]",
                sectionAccent[section.title] ?? "text-stone-400",
              )}>
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const href = resolveHref(item);
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const needsActivation = isActivationLink(item);

                return (
                  <li key={`${section.title}-${item.label}`}>
                    <Link
                      href={href}
                      onClick={onMobileClose}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-[14px] transition-all duration-150 touch-manipulation",
                        collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5",
                        active && !needsActivation
                          ? "bg-white/70 border border-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,1)] text-orange-600 font-semibold backdrop-blur-xl"
                          : "text-stone-600 hover:bg-white/45 hover:text-stone-900 hover:border hover:border-white/60 hover:backdrop-blur-xl",
                        needsActivation && "opacity-50",
                      )}
                    >
                      <span className={cn(
                        "shrink-0 flex items-center justify-center",
                        active && !needsActivation ? "text-orange-500" : "text-stone-400",
                        collapsed ? "h-9 w-9 rounded-[12px] bg-white/60 border border-white/70 shadow-sm backdrop-blur-xl" : "",
                      )}>
                        {item.icon}
                      </span>

                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate text-[13px]">{item.label}</span>
                          {needsActivation && (
                            <span className="text-[9px] font-semibold uppercase tracking-widest text-stone-300 shrink-0">
                              Unlock
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Currency selector ── */}
      {!collapsed && (
        <div className="px-3 py-2.5 border-t border-white/30 shrink-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-stone-400 mb-1.5 px-0.5">
            Display currency
          </p>
          <CurrencySelector className="w-full rounded-[12px] border border-white/60 bg-white/40 backdrop-blur-xl px-2.5 py-1.5 text-[12px] text-stone-700 shadow-sm" />
        </div>
      )}

      {/* ── User footer ── */}
      <div className={cn(
        "px-3 py-3 border-t border-white/30 shrink-0",
        collapsed ? "flex justify-center" : "",
      )}>
        <div className={cn("flex items-center gap-2.5", collapsed ? "flex-col" : "")}>
          <Avatar className="h-8 w-8 shrink-0 ring-2 ring-white/70 shadow-sm">
            <AvatarImage src={user.avatar_url || ""} />
            <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-orange-100 to-amber-100 text-orange-700">
              {user.full_name?.[0] || user.email?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>

          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-stone-800 truncate leading-tight">
                {user.full_name || user.email?.split("@")[0]}
              </p>
              <p className="text-[10px] text-stone-400 truncate">{user.email}</p>
            </div>
          )}

          {!collapsed && <SignOutButton variant="icon" />}
        </div>
      </div>
    </div>
  );

  /* ── Glass sidebar shell ── */
  const shellClass = cn(
    "flex flex-col h-screen",
    "bg-white/30 backdrop-blur-3xl",
    "border-r border-white/40",
    "shadow-[1px_0_24px_rgba(0,0,0,0.05)]",
  );

  /* Subtle warm atmosphere on the sidebar bg */
  const atmosphere = (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-orange-100/25 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-sky-100/20 blur-3xl" />
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className={cn(
        "hidden lg:block sticky top-0 h-screen relative z-40 transition-[width] duration-300 ease-out",
        shellClass,
        collapsed ? "w-[4.5rem]" : "w-60",
      )}>
        {atmosphere}
        <div className="relative z-10 h-full flex flex-col">{content}</div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[6px] lg:hidden animate-in fade-in duration-200"
            onClick={onMobileClose}
            aria-hidden
          />
          <aside className={cn(
            "fixed inset-y-0 left-0 z-50 lg:hidden w-[min(17rem,88vw)] relative",
            "rounded-r-[28px] overflow-hidden",
            "shadow-[4px_0_40px_rgba(0,0,0,0.12)]",
            shellClass,
            "animate-in slide-in-from-left duration-200",
          )}>
            {atmosphere}
            <div className="relative z-10 h-full flex flex-col">{content}</div>
          </aside>
        </>
      )}
    </>
  );
}