"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Link2,
  Megaphone,
  Target,
  Wallet,
  Package,
  Truck,
  Heart,
  BookOpen,
  Globe,
  Users,
  MessageSquare,
  Bell,
  FileText,
  Video,
  BarChart3,
  Zap,
  Store,
  DollarSign,
  Settings,
  Shield,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  ArrowUpRight,
  X,
  FolderSymlink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrency } from "@/context/CurrencyContext";
import { getUserBalance } from "@/lib/actions/wallet";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DashboardRole =
  | "buyer"
  | "vendor"
  | "affiliate"
  | "influencer"
  | "admin";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  requiredRole?: DashboardRole;
}

interface NavSection {
  key: string;
  title: string;
  items: NavItem[];
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

const SECTIONS: NavSection[] = [
  {
    key: "earn",
    title: "Earn",
    items: [
      { label: "Earnings", href: "/dashboard/earnings", icon: TrendingUp },
      { label: "Affiliate links", href: "/dashboard/links", icon: Link2, requiredRole: "affiliate" },
      { label: "Campaigns", href: "/dashboard/vendor/campaigns", icon: Megaphone, badge: "New" },
      { label: "Creator missions", href: "/ugc", icon: Target },
      { label: "Withdrawals", href: "/dashboard/withdrawals", icon: Wallet },
    ],
  },
  {
    key: "marketplace",
    title: "Marketplace",
    items: [
      { label: "Browse products", href: "/marketplace", icon: Package },
      { label: "Orders", href: "/dashboard/orders", icon: Truck },
      { label: "Wishlist", href: "/dashboard/wishlist", icon: Heart },
      { label: "Digital library", href: "/dashboard/library", icon: BookOpen },
    ],
  },
  {
    key: "communities",
    title: "Communities",
    items: [
      { label: "Explore", href: "/communities", icon: Globe },
      { label: "My communities", href: "/dashboard/communities", icon: Users },
      { label: "Messages", href: "/dashboard/messages", icon: MessageSquare, badge: "3" },
      { label: "Notifications", href: "/dashboard/notifications", icon: Bell, badge: "8" },
    ],
  },
  {
    key: "creator",
    title: "Creator hub",
    items: [
      { label: "Studio", href: "/dashboard/influencer", icon: LayoutDashboard, requiredRole: "influencer" },
      { label: "My clips", href: "/dashboard/influencer/videos", icon: Video, requiredRole: "influencer" },
      { label: "Submissions", href: "/dashboard/submissions", icon: FileText, requiredRole: "influencer" },
      { label: "Analytics", href: "/dashboard/influencer/analytics", icon: BarChart3, requiredRole: "influencer" },
      { label: "Explore missions", href: "/ugc", icon: Zap },
    ],
  },
  {
    key: "seller",
    title: "Seller hub",
    items: [
      { label: "My store", href: "/dashboard/vendor/store", icon: Store, requiredRole: "vendor" },
      { label: "Products", href: "/dashboard/products", icon: Package, requiredRole: "vendor" },
      { label: "Orders", href: "/dashboard/vendor/orders", icon: Truck, requiredRole: "vendor" },
      { label: "Revenue", href: "/dashboard/payments", icon: DollarSign, requiredRole: "vendor" },
      { label: "Customers", href: "/dashboard/customers", icon: Users, requiredRole: "vendor" },
    ],
  },
  {
    key: "affiliate",
    title: "Affiliate",
    items: [
      { label: "My links", href: "/dashboard/links", icon: FolderSymlink, requiredRole: "affiliate" },
      { label: "Products", href: "/dashboard/affiliate/products", icon: Megaphone, requiredRole: "affiliate" },
      { label: "Earnings", href: "/dashboard/earnings", icon: DollarSign, requiredRole: "affiliate" },
      { label: "Analytics", href: "/dashboard/affiliate/analytics", icon: BarChart3, requiredRole: "affiliate" },
    ],
  },
  {
    key: "account",
    title: "Account",
    items: [
      { label: "Settings", href: "/dashboard/settings", icon: Settings },
      { label: "Security", href: "/dashboard/security", icon: Shield },
      { label: "Help center", href: "/support", icon: HelpCircle },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function activateHref(role: DashboardRole): string {
  return role === "influencer"
    ? "/dashboard/activate/creator"
    : `/dashboard/activate/${role}`;
}

function BadgePill({ label }: { label: string }) {
  const isNumeric = /^\d+$/.test(label);
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
  user,
  activeRoles,
  collapsed,
  onCollapsedChange,
  onMobileClose,
}: Omit<SidebarProps, "mobileOpen">) {
  const pathname = usePathname();
  const { formatMoney } = useCurrency();
  const [balance, setBalance] = React.useState({ available: 0, pending: 0 });
  const [balanceHidden, setBalanceHidden] = React.useState(true);
  const [openSections, setOpenSections] = React.useState<Set<string>>(
    new Set(["earn", "marketplace", "communities"])
  );

  React.useEffect(() => {
    async function load() {
      const res = await getUserBalance();
      if (res.success)
        setBalance({ available: res.available, pending: res.pending });
    }
    load();
    const t = setInterval(load, 120_000);
    return () => clearInterval(t);
  }, []);

  function toggleSection(key: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function hasRole(r: DashboardRole) {
    return activeRoles.includes("admin") || activeRoles.includes(r);
  }

  function resolveHref(item: NavItem): string {
    if (!item.requiredRole || item.requiredRole === "buyer") return item.href;
    return hasRole(item.requiredRole) ? item.href : activateHref(item.requiredRole);
  }

  function isLocked(item: NavItem): boolean {
    return (
      !!item.requiredRole &&
      item.requiredRole !== "buyer" &&
      !hasRole(item.requiredRole)
    );
  }

  function isActive(href: string): boolean {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  // ── Collapsed icon-only rail ───────────────────────────────────────────────
  if (collapsed) {
    const collapsedItems: NavItem[] = [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Earnings", href: "/dashboard/earnings", icon: TrendingUp },
      { label: "Affiliate links", href: "/dashboard/links", icon: Link2 },
      { label: "Campaigns", href: "/dashboard/vendor/campaigns", icon: Megaphone, badge: "New" },
      { label: "Browse products", href: "/marketplace", icon: Package },
      { label: "Messages", href: "/dashboard/messages", icon: MessageSquare, badge: "3" },
      { label: "Settings", href: "/dashboard/settings", icon: Settings },
    ];

    return (
      <div className="flex flex-col h-full">
        {/* Logo */}
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

        {/* Wallet icon */}
        <div
          className="flex justify-center py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <Link
            href="/dashboard/wallet"
            title="My wallet"
            className="w-9 h-9 flex items-center justify-center"
            style={{
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--color-accent-light)",
              border: "1px solid var(--color-accent-subtle)",
              color: "var(--color-accent)",
            }}
          >
            <Wallet className="h-4 w-4" />
          </Link>
        </div>

        {/* Nav icons */}
        <nav
          className="flex-1 flex flex-col items-center gap-1 py-3 overflow-y-auto no-scrollbar"
        >
          {collapsedItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={resolveHref(item)}
                title={item.label}
                className="relative w-9 h-9 flex items-center justify-center"
                style={{
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: active ? "var(--color-accent-light)" : "transparent",
                  color: active ? "var(--color-accent)" : "var(--color-text-muted)",
                }}
              >
                <Icon className="h-4 w-4" />
                {item.badge && (
                  <span
                    className="absolute top-0.5 right-0.5 flex items-center justify-center rounded-full font-bold"
                    style={{
                      width: /^\d+$/.test(item.badge) ? "1rem" : "0.5rem",
                      height: /^\d+$/.test(item.badge) ? "1rem" : "0.5rem",
                      fontSize: "8px",
                      backgroundColor: "var(--color-accent)",
                      color: "white",
                      border: "2px solid var(--color-bg)",
                    }}
                  >
                    {/^\d+$/.test(item.badge) ? item.badge : ""}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Expand button */}
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
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      {/* Logo bar */}
      <div
        className="flex items-center justify-between px-4 h-14 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <Link
          href="/"
          onClick={onMobileClose}
          className="flex items-center gap-2 min-w-0"
        >
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

      {/* Wallet widget */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <Link
          href="/dashboard/wallet"
          onClick={onMobileClose}
          className="block group"
          style={{
            padding: "0.75rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {/* Widget header */}
          <div className="flex items-center justify-between mb-2">
            <div
              className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--color-text-muted)" }}
            >
              <Wallet
                className="h-3 w-3"
                style={{ color: "var(--color-accent)" }}
              />
              Balance
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setBalanceHidden((v) => !v);
              }}
              aria-label={balanceHidden ? "Show balance" : "Hide balance"}
              style={{ color: "var(--color-text-muted)" }}
            >
              {balanceHidden
                ? <EyeOff className="h-3 w-3" />
                : <Eye className="h-3 w-3" />}
            </button>
          </div>

          {/* Amount */}
          <p
            className="text-[17px] font-semibold tabular-nums leading-none mb-1.5"
            style={{ color: "var(--color-text-primary)" }}
          >
            {balanceHidden ? "••••••" : formatMoney(balance.available, "USD")}
          </p>

          {/* Pending row */}
          <div className="flex items-center justify-between">
            <span
              className="text-[11px]"
              style={{ color: "var(--color-text-muted)" }}
            >
              {balanceHidden ? "•••" : formatMoney(balance.pending, "USD")} pending
            </span>
            <ArrowUpRight
              className="h-3 w-3"
              style={{ color: "var(--color-text-muted)" }}
            />
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto px-2.5 py-1 no-scrollbar"
        aria-label="Dashboard navigation"
      >
        {/* Dashboard standalone link */}
        <Link
          href="/dashboard"
          onClick={onMobileClose}
          className="relative flex items-center gap-2.5 px-2.5 py-2 mb-1 text-[13px] font-medium"
          style={{
            borderRadius: "var(--radius-sm)",
            backgroundColor: isActive("/dashboard")
              ? "var(--color-accent-light)"
              : "transparent",
            color: isActive("/dashboard")
              ? "var(--color-accent)"
              : "var(--color-text-secondary)",
            fontWeight: isActive("/dashboard") ? 600 : 500,
          }}
        >
          {isActive("/dashboard") && (
            <span
              className="absolute left-0 inset-y-[20%] w-[3px] rounded-r-full"
              style={{ backgroundColor: "var(--color-accent)" }}
            />
          )}
          <LayoutDashboard
            className="h-3.5 w-3.5 flex-shrink-0"
            style={{
              color: isActive("/dashboard")
                ? "var(--color-accent)"
                : "var(--color-text-muted)",
            }}
          />
          Dashboard
        </Link>

        <div
          className="mb-1"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        />

        {/* Sections */}
        {SECTIONS.map((section) => {
          const isOpen = openSections.has(section.key);
          return (
            <React.Fragment key={section.key}>
              <div className="mb-0.5">
                {/* Section header */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.key)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider"
                  style={{
                    borderRadius: "var(--radius-sm)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  <span className="flex-1 text-left">{section.title}</span>
                  {isOpen
                    ? <ChevronDown className="h-3 w-3" />
                    : <ChevronRight className="h-3 w-3" />}
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
                      <ul className="space-y-px mt-0.5">
                        {section.items.map((item) => {
                          const href = resolveHref(item);
                          const active = isActive(item.href);
                          const locked = isLocked(item);
                          const Icon = item.icon;
                          return (
                            <li key={`${section.key}-${item.label}`}>
                              <Link
                                href={href}
                                onClick={onMobileClose}
                                aria-current={active ? "page" : undefined}
                                className={cn(
                                  "relative flex items-center gap-2.5 px-2.5 py-2 text-[13px]",
                                  locked && "opacity-40"
                                )}
                                style={{
                                  borderRadius: "var(--radius-sm)",
                                  backgroundColor: active
                                    ? "var(--color-surface-secondary)"
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
                                  className="h-3.5 w-3.5 flex-shrink-0"
                                  style={{
                                    color: active
                                      ? "var(--color-accent)"
                                      : "var(--color-text-muted)",
                                  }}
                                />
                                <span className="flex-1 truncate">{item.label}</span>
                                {item.badge && !locked && (
                                  <BadgePill label={item.badge} />
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

              {isOpen && (
                <div
                  className="mb-1"
                  style={{ borderBottom: "1px solid var(--color-border)" }}
                />
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Streak footer */}
      <div
        className="px-3 pb-3 pt-2 flex-shrink-0"
        style={{ borderTop: "1px solid var(--color-border)" }}
      >
        <div
          className="flex items-center gap-2.5 px-3 py-2.5"
          style={{
            borderRadius: "var(--radius-lg)",
            backgroundColor: "var(--color-accent-light)",
            border: "1px solid var(--color-accent-subtle)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <span className="text-lg leading-none">🔥</span>
          <div className="min-w-0">
            <p
              className="text-[11px] font-semibold leading-tight"
              style={{ color: "var(--color-accent)" }}
            >
              4 day streak 🔥
            </p>
            <p
              className="text-[10px] leading-tight mt-0.5 truncate"
              style={{ color: "var(--color-text-muted)" }}
            >
              Keep it up! You&apos;re doing great.
            </p>
          </div>
          <ChevronRight
            className="h-3.5 w-3.5 ml-auto flex-shrink-0"
            style={{ color: "var(--color-accent)" }}
          />
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
  const sharedProps = { user, activeRoles, collapsed, onCollapsedChange, onMobileClose };

  return (
    <>
      {/* Desktop sidebar */}
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

      {/* Mobile drawer */}
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