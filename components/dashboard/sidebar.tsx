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
      { label: "Marketplace", href: "/dashboard/marketplace", icon: <Globe className="h-[14px] w-[14px]" /> },
      { label: "My Orders", href: "/dashboard/orders", icon: <ShoppingCart className="h-[14px] w-[14px]" /> },
      { label: "Digital Library", href: "/dashboard/library", icon: <Video className="h-[14px] w-[14px]" /> },
      { label: "Wishlist", href: "/dashboard/wishlist", icon: <Heart className="h-[14px] w-[14px]" /> },
      { label: "Analytics", href: "/dashboard/buyer/analytics", icon: <BarChart3 className="h-[14px] w-[14px]" /> },
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
      { label: "Profile", href: "/dashboard/settings", icon: <User className="h-[14px] w-[14px]" /> },
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

      {/* ── Logo bar ── */}
      <div
        className="flex items-center justify-between shrink-0 px-4 py-4"
        style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}
      >
        <Link href="/" onClick={onMobileClose} className="flex items-center gap-2.5 min-w-0 group">
          {/* Orange glass logo mark */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex-shrink-0 flex items-center justify-center transition-transform group-hover:rotate-[10deg]"
            style={{
              width: 34, height: 34, borderRadius: 12,
              background: "linear-gradient(135deg, rgba(251,146,60,0.95), rgba(234,88,12,0.85))",
              boxShadow: "0 4px 12px rgba(251,146,60,0.3), inset 0 1px 0 rgba(255,255,255,0.3)",
            }}
          >
            <LayoutDashboard style={{ width: 15, height: 15, color: "white" }} />
          </motion.div>
          {!collapsed && (
            <motion.div
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Image 
                src="/jimvio-logo.png" 
                alt="Jimvio" 
                width={100} 
                height={30} 
                className="h-[26px] w-auto"
              />
            </motion.div>
          )}
        </Link>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onCollapsedChange(!collapsed)}
            className="hidden lg:flex items-center justify-center transition-all hover:scale-105 active:scale-95 rounded-full"
            style={{
              width: 28, height: 28,
              background: "rgba(0,0,0,0.04)",
              border: "1px solid rgba(0,0,0,0.06)",
              color: "rgba(0,0,0,0.35)",
            }}
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronRight style={{ width: 12, height: 12 }} /> : <ChevronLeft style={{ width: 12, height: 12 }} />}
          </button>
          {onMobileClose && (
            <button
              type="button"
              onClick={onMobileClose}
              className="lg:hidden flex items-center justify-center transition-all active:scale-95 rounded-full"
              style={{
                width: 30, height: 30,
                background: "rgba(0,0,0,0.04)",
                border: "1px solid rgba(0,0,0,0.06)",
                color: "rgba(0,0,0,0.45)",
              }}
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
          transition={{ type: "spring", damping: 25, stiffness: 200, delay: 0.1 }}
          className="px-3 pt-3 pb-1 shrink-0"
        >
          <div className="relative overflow-hidden rounded-[18px] bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 shadow-[0_6px_20px_rgba(249,115,22,0.2)] group">
            {/* Decorative blur */}
            <div className="absolute top-0 right-0 w-28 h-28 bg-white/15 blur-[35px] rounded-full translate-x-1/3 -translate-y-1/3" />
            
            <div className="relative z-10 p-3">
              {/* Top: icon + label + eye */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="h-6 w-6 rounded-[7px] bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/15">
                    <Wallet style={{ width: 11, height: 11 }} />
                  </div>
                  <span className="text-[8px] font-black text-white/85 uppercase tracking-widest">My Wallet</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setBalanceHidden(v => !v); }}
                  className="h-6 w-6 rounded-full bg-white/15 flex items-center justify-center text-white/75 hover:bg-white/25 transition-all active:scale-90 border border-white/10"
                  aria-label={balanceHidden ? "Show balance" : "Hide balance"}
                >
                  {balanceHidden ? <EyeOff style={{ width: 10, height: 10 }} /> : <Eye style={{ width: 10, height: 10 }} />}
                </button>
              </div>

              {/* Balance */}
              <Link href="/dashboard/wallet" onClick={onMobileClose} className="block">
                <p className="text-[20px] font-black text-white tabular-nums tracking-tighter leading-none mb-1.5">
                  {balanceHidden ? "• • • • • •" : formatMoney(balance.available, "USD")}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="w-[4px] h-[4px] rounded-full bg-white/50 animate-pulse block shrink-0" />
                    <span className="text-[9px] font-semibold text-white/55">
                      {balanceHidden ? "•••" : formatMoney(balance.pending, "USD")} pending
                    </span>
                  </div>
                  <div className="h-5 w-5 rounded-full bg-white/15 flex items-center justify-center group-hover:bg-white/25 transition-colors">
                    <ArrowUpRight style={{ width: 9, height: 9, color: "white" }} />
                  </div>
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
            className="flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{
              width: 36, height: 36, borderRadius: 12,
              background: "linear-gradient(135deg, rgba(251,146,60,0.15), rgba(251,146,60,0.08))",
              border: "1px solid rgba(251,146,60,0.2)",
              color: "#ea580c",
            }}
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
                  {section.accentRgb && (
                    <span
                      style={{
                        display: "block", width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                        background: `rgb(${section.accentRgb})`,
                        boxShadow: `0 0 6px rgba(${section.accentRgb},0.6)`,
                      }}
                    />
                  )}
                      <span
                        style={{
                          fontSize: 9, fontWeight: 800, letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          color: section.accentRgb ? `rgb(${section.accentRgb})` : "rgba(15,23,42,0.3)",
                        }}
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
                        className="flex items-center group relative overflow-hidden"
                        style={{
                          gap: collapsed ? 0 : 10,
                          padding: collapsed ? "8px" : "8px 10px",
                          borderRadius: 14,
                          justifyContent: collapsed ? "center" : "flex-start",
                          background: isActive ? "rgba(251,146,60,0.08)" : "transparent",
                          border: isActive ? "1px solid rgba(251,146,60,0.15)" : "1px solid transparent",
                          boxShadow: isActive
                            ? "inset 0 1px 0 rgba(255,255,255,0.8), 0 2px 8px rgba(0,0,0,0.03)"
                            : "none",
                          opacity: locked ? 0.35 : 1,
                        }}
                      >
                        {/* Hover layer */}
                        <motion.div
                          className="absolute inset-0 bg-stone-900/5 opacity-0 group-hover:opacity-100 transition-opacity"
                          initial={false}
                          whileHover={{ scale: 1.05 }}
                        />

                        {/* Active shimmer */}
                        {isActive && (
                          <motion.span
                            layoutId="activeShimmer"
                            className="pointer-events-none absolute inset-x-0 top-0"
                            style={{
                              height: 1.5, borderRadius: "14px 14px 0 0",
                              background: "linear-gradient(90deg, transparent, rgba(251,146,60,0.4) 50%, transparent)",
                            }}
                          />
                        )}

                        {/* Icon */}
                        <motion.span
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          className="flex items-center justify-center flex-shrink-0 transition-colors z-10"
                          style={{
                            width: collapsed ? 32 : 28,
                            height: collapsed ? 32 : 28,
                            borderRadius: collapsed ? 10 : 9,
                            background: isActive
                              ? "rgba(251,146,60,0.12)"
                              : collapsed ? "rgba(15,23,42,0.04)" : "transparent",
                            border: isActive
                              ? "1px solid rgba(251,146,60,0.25)"
                              : collapsed ? "1px solid rgba(15,23,42,0.08)" : "none",
                            color: isActive ? "#ea580c" : "rgba(15,23,42,0.4)",
                          }}
                        >
                          {item.icon}
                        </motion.span>

                        {!collapsed && (
                          <>
                            <span
                              className="flex-1 truncate group-hover:translate-x-0.5 transition-transform z-10"
                              style={{
                                fontSize: 13,
                                fontWeight: isActive ? 700 : 600,
                                letterSpacing: "-0.1px",
                                color: isActive ? "#0f172a" : "#475569",
                              }}
                            >
                              {item.label}
                            </span>
                            {locked && (
                              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(15,23,42,0.25)", flexShrink: 0 }}>
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

      {/* ── Currency selector ── */}
      {!collapsed && (
        <div
          className="px-3 py-2.5 shrink-0"
          style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}
        >
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(0,0,0,0.3)", marginBottom: 6, paddingLeft: 2 }}>
            Display currency
          </p>
          <div
            style={{
              borderRadius: 12,
              background: "rgba(0,0,0,0.03)",
              border: "1px solid rgba(0,0,0,0.06)",
              color: "#475569",
              fontSize: 12,
              padding: "2px 4px",
            }}
          >
            <CurrencySelector className="w-full bg-transparent border-none shadow-none focus:ring-0" />
          </div>
        </div>
      )}

      {/* ── User footer ── */}
      <div
        className="px-3 py-3 shrink-0"
        style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}
      >
        <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
          <div
            className="flex-shrink-0 flex items-center justify-center"
            style={{
              width: 34, height: 34, borderRadius: "50%",
              background: user.avatar_url ? "transparent" : "linear-gradient(135deg, #f97316, #a855f7)",
              border: "2px solid rgba(249,115,22,0.2)",
              boxShadow: "0 0 0 2px rgba(255,255,255,0.8)",
              overflow: "hidden",
              fontSize: 12, fontWeight: 700, color: "white",
            }}
          >
            {user.avatar_url
              ? <img src={user.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : initials
            }
          </div>

          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 12, fontWeight: 700, color: "#1c1917", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.full_name || user.email?.split("@")[0]}
                </p>
                <p style={{ fontSize: 10, fontWeight: 500, color: "#78716c", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.email}
                </p>
              </div>
              <SignOutButton variant="icon" />
            </>
          )}
        </div>
      </div>
    </div>
  );

  /* ── Glass shell styles ── */
  const glassShell = (
    <div className="pointer-events-none absolute inset-0" style={{ borderRadius: "inherit" }}>
      {/* Main frosted glass body */}
      <div
        className="absolute inset-0"
        style={{
          borderRadius: "inherit",
          background: "rgba(255,255,255,0.55)",
          backdropFilter: "blur(48px) saturate(160%)",
          WebkitBackdropFilter: "blur(48px) saturate(160%)",
        }}
      />
      {/* Top specular highlight */}
      <div
        className="absolute inset-x-0 top-0"
        style={{
          height: 1, borderRadius: "inherit",
          background: "linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.85) 40%, rgba(255,255,255,0.6) 60%, transparent 95%)",
        }}
      />
      {/* Left edge */}
      <div
        className="absolute inset-y-0 left-0"
        style={{
          width: 1,
          background: "linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.2) 50%, transparent 100%)",
        }}
      />
      {/* Inner top glow */}
      <div
        className="absolute inset-x-0 top-0"
        style={{
          height: "40%",
          background: "linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 100%)",
          borderRadius: "inherit",
        }}
      />
      {/* Ambient color blobs */}
      <div
        className="absolute"
        style={{
          top: -60, right: -40, width: 200, height: 200, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(251,146,60,0.06), transparent 70%)",
          filter: "blur(30px)",
        }}
      />
      <div
        className="absolute"
        style={{
          bottom: -40, left: -30, width: 180, height: 180, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.04), transparent 70%)",
          filter: "blur(25px)",
        }}
      />
      {/* Outer border */}
      <div
        className="absolute inset-0"
        style={{
          borderRadius: "inherit",
          border: "1px solid rgba(255,255,255,0.8)",
          boxShadow: "inset 0 0 40px rgba(255,255,255,0.1)",
        }}
      />
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? "4.5rem" : "15.5rem" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "hidden lg:block sticky top-0 h-screen relative z-40 overflow-hidden",
        )}
      >
        {glassShell}
        {content}
      </motion.aside>

      {/* Mobile */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 lg:hidden animate-in fade-in duration-200"
            style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
            onClick={onMobileClose}
            aria-hidden
          />
          <aside
            className={cn(
              "fixed inset-y-0 left-0 z-50 lg:hidden relative overflow-hidden",
              "w-[min(15.5rem,88vw)]",
              "animate-in slide-in-from-left duration-250",
            )}
            style={{ borderRadius: "0 28px 28px 0", boxShadow: "4px 0 40px rgba(0,0,0,0.15)" }}
          >
            {glassShell}
            {content}
          </aside>
        </>
      )}
    </>
  );
}