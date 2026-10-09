"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  ShoppingCart,
  Menu,
  X,
  CircleHelp,
  LogOut,
  Factory,
  Home,
  ShoppingBag,
  Package,
  Users,
  Search,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Zap,
  Clapperboard,
  ArrowRight,
  BanknoteIcon,
  DollarSign,
  Bell,
  Wallet,
  Store,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth/actions";
import { useCartStore } from "@/lib/store/use-cart-store";
import { useHeaderAccountStore } from "@/lib/store/use-header-account-store";
import { useAIStore } from "@/lib/store/use-ai-store";
import type { MarketingSettings, NavLinkConfig } from "@/lib/platform-settings-shared";
import { formatMoneyAsUSD } from "@/lib/currency/platform";
import JimvioLogo from "../ui/logo";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  PRIMARY_NAV_ITEMS,
  PROFILE_TOOL_ITEMS,
  PROFILE_SUPPORT_ITEMS,
} from "@/lib/navigation/primary-nav";
import { ProfileAccountMenu } from "@/components/shell/ProfileAccountMenu";
import { HeaderUtilityActions } from "@/components/shell/HeaderUtilityActions";
import { CreateMenuDropdown } from "@/components/feed/CreateQuickLaunch";
import { WalletBalanceChip } from "@/components/wallet-os/WalletBalanceChip";
import { useCommandCenterStore } from "@/lib/store/use-command-center-store";
import { MobilePrimaryBottomNav } from "@/components/layout/mobile-primary-bottom-nav";
import type { CreateMenuContext } from "@/lib/navigation/create-menu";


const ConsoleButton = React.forwardRef<
  any,
  {
    children: React.ReactNode;
    href?: string;
    onClick?: () => void;
    className?: string;
    active?: boolean;
    orange?: boolean;
    style?: React.CSSProperties;
    [key: string]: any;
  }
>(({ children, href, onClick, className, active = false, orange = false, style, ...props }, ref) => {

  const cls = cn(
    // base
    "relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium tracking-tight transition-all duration-150 active:scale-[0.97] select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-stone-400/60",
    active
      ? [
        "bg-[var(--color-accent-light)] text-[var(--color-accent)] font-semibold",
        "shadow-[inset_0_0_0_1px_var(--color-accent-subtle)]",
      ]
      : orange
        ? [
          // Light: tinted shadow ties the shadow to the hue
          "bg-[#fd5000] text-white hover:bg-[#e04700]",
          "shadow-[0_1px_3px_rgba(200,60,0,0.25),inset_0_0_0_1px_rgba(200,60,0,0.12)]",
          "hover:shadow-[0_2px_6px_rgba(200,60,0,0.35)]",
          // Dark: lighter hover (not darker) so it reads as a lift, not a sink
          "dark:hover:bg-[#ff6520]",
          "dark:shadow-[0_1px_4px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(255,120,40,0.18)]",
          "dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.50)]",
        ]
        : [
          // Light: rgba over stone avoids surface-color conflicts
          "text-stone-500 hover:bg-black/[0.055] hover:text-stone-900",
          // Dark: 7% white is the sweet spot on #1a1917
          "dark:text-stone-400 dark:hover:bg-white/[0.07] dark:hover:text-stone-100",
        ],
    className
  );
  if (href)
    return (
      <Link href={href} className={cls} style={style} ref={ref} {...props}>
        {children}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} className={cls} style={style} ref={ref} {...props}>
      {children}
    </button>
  );
});
ConsoleButton.displayName = "ConsoleButton";

/* ─────────────────────────────────────────────────────────
   ConsoleIconBtn
   ───────────────────────────────────────────────────────── */
const ConsoleIconBtn = React.forwardRef<
  any,
  {
    children: React.ReactNode;
    href?: string;
    onClick?: () => void;
    badge?: number;
    badgeTone?: "orange" | "red";
    className?: string;
    style?: React.CSSProperties;
    [key: string]: any;
  }
>(({ children, href, onClick, badge, badgeTone = "orange", className, style, ...props }, ref) => {
  const cls = cn(
    "relative flex items-center justify-center h-9 w-9 shrink-0 rounded-xl transition-all duration-150 active:scale-[0.94]",
    "text-stone-500 hover:bg-black/[0.06] hover:text-stone-800",
    className
  );
  const badgeClass =
    badgeTone === "red"
      ? "absolute -top-1 -right-1 h-4 min-w-[16px] px-1 bg-red-500 text-white text-[9px] font-black flex items-center justify-center rounded-full ring-2 ring-white z-20"
      : "absolute -top-1 -right-1 h-4 min-w-[16px] px-1 bg-[#fd5000] text-white text-[9px] font-black flex items-center justify-center rounded-full ring-2 ring-white z-20";
  const inner = (
    <>
      {children}
      {badge != null && badge > 0 && (
        <span className={badgeClass}>
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </>
  );
  if (href)
    return (
      <Link href={href} className={cls} style={style} ref={ref} {...props}>
        {inner}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} className={cls} style={style} ref={ref} {...props}>
      {inner}
    </button>
  );
});
ConsoleIconBtn.displayName = "ConsoleIconBtn";


function ensureCoreNavLinks(_links: NavLinkConfig[]): NavLinkConfig[] {
  void _links;
  // CMS leftovers (Campaigns=/ugc, Affiliate) must not override the canonical set.
  return PRIMARY_NAV_ITEMS.map((item) => ({
    label: item.label,
    href: item.href,
    mobileLabel: item.mobileLabel,
  }));
}

function navDisplayLabel(item: NavLinkConfig): { short: string; full: string } {
  return {
    short: item.mobileLabel ?? item.label,
    full: item.label,
  };
}


function iconForHref(href: string): LucideIcon {
  const h = href.replace(/\/$/, "") || "/";
  if (h === "/") return Home;
  if (h.startsWith("/communities")) return Users;
  if (h.startsWith("/ugc")) return Clapperboard;
  if (h.startsWith("/marketplace")) return ShoppingBag;
  if (h.startsWith("/affiliates")) return DollarSign;
  if (h.startsWith("/commerce")) return Store;
  if (h.startsWith("/influencers")) return User;
  if (h.startsWith("/vendors")) return Factory;
  if (h.startsWith("/shorts")) return Clapperboard;
  return Package;
}

function isActive(pathname: string, href: string) {
  const h = href.replace(/\/$/, "") || "/";
  if (h === "/") return pathname === "/";
  if (h === "/communities") return pathname === "/communities" || pathname.startsWith("/communities/");
  return pathname === h || pathname.startsWith(`${h}/`);
}

/* ─────────────────────────────────────────────────────────
   NavbarProps
   ───────────────────────────────────────────────────────── */
interface NavbarProps {
  user?: { email: string; full_name?: string | null; avatar_url?: string | null } | null;
  marketing: MarketingSettings;
}

export function Navbar({ user, marketing }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drawerPortalEl, setDrawerPortalEl] = useState<HTMLElement | null>(null);
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const DROPDOWN_CLOSE_DELAY = 220;
  const marketplaceTimer = useRef<NodeJS.Timeout | null>(null);
  const { isMobile } = useIsMobile();
  const { cartCount, chatCount, refreshCounts } = useCartStore();
  const {
    walletBalance,
    rewardsBalance,
    notificationCount,
    currency: walletCurrency,
  } = useHeaderAccountStore();
  const { openAssistant } = useAIStore();
  const openCommandCenter = useCommandCenterStore((s) => s.openCommandCenter);
  const pathname = usePathname();

  // Portal target ready on first client paint (layout) — no data gate.
  useLayoutEffect(() => {
    setDrawerPortalEl(document.body);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 15);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // Counts / wallet / notifications are non-blocking — never gate menu/nav chrome.
  useEffect(() => { if (user) refreshCounts(); }, [user, refreshCounts]);

  const navLinks = ensureCoreNavLinks(marketing.nav_links ?? []);
  const createContext: CreateMenuContext =
    pathname.startsWith("/marketplace") ? "marketplace" : "home";

  const marketplaceVariants = [
    { title: "Digital Market", desc: "Software, courses & assets", href: "/marketplace?type=digital", icon: Zap, color: "#0ea5e9", badge: "Hot" },
    { title: "Physical Market", desc: "Real-world goods & equipment", href: "/marketplace/physical", icon: Package, color: "#f59e0b" },
  ];

  const onMarketplaceEnter = () => {
    if (marketplaceTimer.current) clearTimeout(marketplaceTimer.current);
    setMarketplaceOpen(true);
  };
  const onMarketplaceLeave = () => {
    marketplaceTimer.current = setTimeout(() => setMarketplaceOpen(false), DROPDOWN_CLOSE_DELAY);
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 pointer-events-none">
      <div
        className={cn(
          "pointer-events-auto relative mx-auto flex flex-col",
          "bg-white pt-[env(safe-area-inset-top,0px)] shadow-[0_1px_0_rgba(0,0,0,0.06)]",
          "dark:bg-[#0a0a0a] dark:shadow-[0_1px_0_rgba(255,255,255,0.04)]",
          "md:transition-all md:duration-300",
          scrolled
            ? "md:bg-white/90 md:backdrop-blur-2xl md:dark:bg-[#0a0a0a]/90"
            : "md:bg-white/70 md:backdrop-blur-xl md:dark:bg-[#0a0a0a]/70 md:shadow-none",
        )}
      >
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/10 pointer-events-none" />
        <div className="min-w-0 w-full">
          {/* main bar — 3-column grid; nav may clip, Create menu portals above */}
          <div className="grid w-full min-w-0 max-w-8xl mx-auto h-14 md:h-[62px] px-4 sm:px-8 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 sm:gap-x-4">
            {/* Logo */}
            <div className="flex shrink-0 items-center self-center">
              <JimvioLogo
                href="/"
                size={isMobile ? "md" : "lg"}
                presentation="header"
              />
            </div>

            {/* Desktop nav — clips before overlapping search; shorter UGC label until 2xl */}
            <nav className="hidden min-[1240px]:flex min-w-0 flex-nowrap items-center justify-start gap-1.5 overflow-hidden pl-3 xl:gap-2.5 xl:pl-5 2xl:gap-3">

              {navLinks.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = iconForHref(item.href);
                if (item.href === "/marketplace") {
                  return (
                    <div
                      onMouseEnter={onMarketplaceEnter}
                      onMouseLeave={onMarketplaceLeave}
                      className="relative"
                      key={item.href + item.label}
                    >
                      <DropdownMenu open={marketplaceOpen} onOpenChange={setMarketplaceOpen} modal={false}>
                        <DropdownMenuTrigger asChild>
                          <ConsoleButton
                            active={active}
                            className="h-9 gap-1.5 px-2 xl:px-2.5 2xl:px-3 py-0 text-[12px] xl:text-[13px] font-semibold tracking-[0.01em] shrink-0"
                            onMouseEnter={onMarketplaceEnter}
                            onMouseLeave={onMarketplaceLeave}
                          >
                            <ShoppingBag className="h-3.5 w-3.5 text-[var(--color-accent)] shrink-0" />
                            Marketplace
                            <ChevronDown className={cn("h-3 w-3 text-stone-400 transition-transform duration-300", marketplaceOpen && "rotate-180")} />
                          </ConsoleButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          sideOffset={2}
                          align="start"
                          onMouseEnter={onMarketplaceEnter}
                          onMouseLeave={onMarketplaceLeave}
                          className="w-80 p-2 rounded-2xl border shadow-xl"
                          style={{
                            background: "var(--color-surface, #fff)",
                            borderColor: "var(--color-border, #e5e5e5)",
                            boxShadow: "0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)",
                          }}
                        >
                          {/* Header */}
                          <div className="px-3 pb-3 pt-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest"
                              style={{ color: "var(--color-text-muted, #a3a3a3)" }}>Browse by type</p>
                          </div>
                          {marketplaceVariants.map((v) => (
                            <DropdownMenuItem key={v.href} asChild className="p-0 focus:bg-transparent">
                              <Link href={v.href}
                                className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-stone-50 dark:hover:bg-white/5 group cursor-pointer"
                                style={{ outline: "none" }}>
                                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                                  style={{ background: `${v.color}15`, border: `1px solid ${v.color}25` }}>
                                  <v.icon className="h-4.5 w-4.5" style={{ color: v.color }} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-[13px] font-bold leading-none"
                                      style={{ color: "var(--color-text-primary, #171717)" }}>{v.title}</p>
                                    {v.badge && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                                        style={{ background: "#fd5000" }}>{v.badge}</span>
                                    )}
                                  </div>
                                  <p className="text-[11px] mt-1 leading-snug" style={{ color: "var(--color-text-muted, #a3a3a3)" }}>{v.desc}</p>
                                </div>
                                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5"
                                  style={{ color: v.color }} />
                              </Link>
                            </DropdownMenuItem>
                          ))}

                          {/* Footer CTA */}
                          <div className="mt-1 pt-2" style={{ borderTop: "1px solid var(--color-border, #e5e5e5)" }}>
                            <Link href="/marketplace"
                              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-all hover:bg-stone-50 dark:hover:bg-white/5 group"
                              style={{ color: "var(--color-text-muted, #a3a3a3)" }}>
                              <span>Browse all categories</span>
                              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform text-[#fd5000]" />
                            </Link>
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )
                } else {
                  return (
                    <ConsoleButton
                      key={item.href}
                      href={item.href}
                      active={active}
                      className="h-9 gap-1.5 px-2 xl:px-2.5 2xl:px-3 py-0 text-[12px] xl:text-[13px] font-semibold tracking-[0.01em] shrink-0"
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" />
                      <span className="whitespace-nowrap">{navDisplayLabel(item).full}</span>
                    </ConsoleButton>
                  );
                }
              })}
            </nav>

            {/* Right side — fixed-width cluster, never overlaps nav */}
            <div className="relative z-10 flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 min-w-0">

              {/* Desktop search → unified Command+K; shrinks before colliding with nav */}
              <button
                type="button"
                onClick={() => openCommandCenter()}
                aria-label="Search everything or run a command"
                className="hidden min-[1240px]:flex h-9 w-[min(100%,140px)] xl:w-[160px] 2xl:w-[200px] min-w-0 shrink items-center gap-2 rounded-full border border-border bg-stone-50/90 px-3 text-left transition-colors hover:border-orange-300 hover:bg-white"
              >
                <Search className="h-3.5 w-3.5 shrink-0 text-stone-400" />
                <span className="min-w-0 flex-1 truncate text-[12px] text-stone-400">
                  Search globally…
                </span>
                <kbd className="hidden shrink-0 rounded border border-border bg-white px-1 py-px text-[9px] font-medium text-stone-400 2xl:inline">
                  ⌘K
                </kbd>
              </button>

              {/* Global Create — authenticated only; instant shared menu */}
              {user ? (
                <CreateMenuDropdown
                  variant="header"
                  context={createContext}
                  className="hidden sm:block"
                />
              ) : null}

              {/* Products → Notifications → Cart → Wallet — no Orders / theme */}
              <HeaderUtilityActions
                isAuthenticated={Boolean(user)}
                cartCount={cartCount}
                notificationCount={notificationCount}
                walletBalance={walletBalance}
                walletCurrency={walletCurrency}
                className="hidden sm:flex"
              />

              {/* Mobile: essential actions before hamburger */}
              <div className="flex items-center gap-0.5 sm:hidden">
                {user ? (
                  <CreateMenuDropdown variant="header" context={createContext} />
                ) : null}
                {user ? (
                  <ConsoleIconBtn
                    href="/notifications"
                    aria-label={
                      notificationCount > 0
                        ? `Notifications (${notificationCount} unread)`
                        : "Notifications"
                    }
                    badge={notificationCount > 0 ? notificationCount : undefined}
                    badgeTone="red"
                  >
                    <Bell className="h-[18px] w-[18px]" />
                  </ConsoleIconBtn>
                ) : null}
                <ConsoleIconBtn href="/cart" badge={cartCount}>
                  <ShoppingCart className="h-[18px] w-[18px]" />
                </ConsoleIconBtn>
                {user ? (
                  <ConsoleIconBtn href="/wallet" aria-label="Wallet">
                    <Wallet className="h-[18px] w-[18px] text-[#fd5000]" />
                  </ConsoleIconBtn>
                ) : null}
              </div>

              {/* User menu / auth */}
              <div className="hidden sm:flex items-center shrink-0">
                {user ? (
                  <ProfileAccountMenu
                    user={{
                      name: user.full_name || user.email?.split("@")[0] || "Account",
                      avatarUrl: user.avatar_url,
                    }}
                    messageCount={chatCount}
                    walletBalance={walletBalance}
                    rewardsBalance={rewardsBalance}
                    walletCurrency={walletCurrency}
                    trigger={
                      <button
                        type="button"
                        aria-label="Open profile menu"
                        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface p-0.5 shadow-sm transition-all hover:border-orange-400 active:scale-95"
                      >
                        <Avatar className="h-full w-full shrink-0 rounded-full">
                          <AvatarImage src={user.avatar_url ?? undefined} className="object-cover" />
                          <AvatarFallback className="rounded-full bg-[#fd5000] text-[10px] font-bold capitalize text-white">
                            {user.full_name?.[0] || user.email?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    }
                  />
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href="/login" className="h-9 px-4 flex items-center rounded-sm text-[12px] font-bold text-stone-600 border border-border bg-white hover:bg-stone-50 hover:text-stone-900 transition-all whitespace-nowrap">
                      Log In
                    </Link>
                    <Link href="/register" className="h-9 px-4 flex items-center rounded-sm text-[12px] font-black uppercase tracking-widest bg-orange-500 text-white hover:bg-orange-600 transition-all active:scale-95 shrink-0 whitespace-nowrap">
                      Join Free
                    </Link>
                  </div>
                )}
              </div>

              {/* Mobile search — opens Global Search / Command Center */}
              <ConsoleIconBtn className="md:hidden" onClick={() => openCommandCenter()} aria-label="Search">
                <Search className="h-[18px] w-[18px]" />
              </ConsoleIconBtn>

              {/* Mobile hamburger — sole Menu control */}
              <ConsoleIconBtn className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </ConsoleIconBtn>
            </div>
          </div>
        </div>
      </div>

      {/*
        Bottom nav stays in-tree outside the blur shell (no portal gate).
        Drawer portals to document.body so no ancestor stacking/clipping
        (including header pointer-events / future transforms) can trap it.
      */}
      {drawerPortalEl
        ? createPortal(
            <MobileDrawer
              open={mobileOpen}
              onClose={() => setMobileOpen(false)}
              user={user}
              pathname={pathname}
              marketplaceVariants={marketplaceVariants}
              navLinks={navLinks}
              openAssistant={openAssistant}
            />,
            drawerPortalEl,
          )
        : null}
      <MobilePrimaryBottomNav isAuthenticated={Boolean(user)} />
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════
   MOBILE DRAWER  — navigation only, no search
   ═══════════════════════════════════════════════════════════ */
interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  user?: { email: string; full_name?: string | null; avatar_url?: string | null } | null;
  pathname: string;
  marketplaceVariants: { title: string; desc: string; href: string; icon: LucideIcon; color: string }[];
  navLinks: NavLinkConfig[];
  openAssistant: () => void;
}

function MobileDrawer({
  open, onClose, user, pathname, marketplaceVariants, navLinks, openAssistant,
}: MobileDrawerProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { chatCount, cartCount } = useCartStore();
  const { walletBalance, currency: walletCurrency, hydrated } = useHeaderAccountStore();
  const toggle = (s: string) => setExpanded((p) => (p === s ? null : s));

  const accountLinks = [
    ...PROFILE_TOOL_ITEMS.map((item) => ({
      href: item.href,
      icon: item.icon,
      label: item.label,
    })),
    ...PROFILE_SUPPORT_ITEMS.map((item) => ({
      href: item.href,
      icon: item.icon,
      label: item.label,
    })),
  ];

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
      {children}
    </p>
  );

  const NavRow = ({
    href, icon: Icon, label, active, badge,
  }: { href: string; icon: LucideIcon; label: string; active: boolean; badge?: number }) => (
    <Link
      href={href}
      onClick={onClose}
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-[14px] font-medium transition-colors",
        active
          ? "border-[#fd5000]/25 bg-[#fd5000]/5 text-[#fd5000]"
          : "border-transparent text-[var(--color-text-secondary)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]"
      )}
    >
      <Icon className={cn("size-4 shrink-0", active ? "text-[#fd5000]" : "text-[var(--color-text-muted)]")} />
      <span className="flex-1">{label}</span>
      {badge && badge > 0 ? (
        <span className="rounded-full bg-[#fd5000] px-1.5 py-0.5 text-[10px] font-bold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );

  const ExpandSection = ({
    id, icon: Icon, label, children,
  }: { id: string; icon: LucideIcon; label: string; children: React.ReactNode }) => {
    const isOpen = expanded === id;
    const isActive = pathname.startsWith("/marketplace");

    return (
      <div>
        <button
          type="button"
          onClick={() => toggle(id)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-[14px] font-medium transition-colors",
            isOpen || isActive
              ? "border-[#fd5000]/25 bg-[#fd5000]/5 text-[#fd5000]"
              : "border-transparent text-[var(--color-text-secondary)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]"
          )}
        >
          <Icon className={cn("size-4 shrink-0", isOpen || isActive ? "text-[#fd5000]" : "text-[var(--color-text-muted)]")} />
          <span className="flex-1 text-left">{label}</span>
          <ChevronDown className={cn("size-4 text-[var(--color-text-muted)] transition-transform", isOpen && "rotate-180")} />
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="space-y-0.5 border-l border-[var(--color-border)] py-1 pl-3 ml-3 mt-1">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const SubItem = ({ href, icon: Icon, color, title, desc }: {
    href: string; icon: LucideIcon; color: string; title: string; desc?: string;
  }) => (
    <Link
      href={href}
      onClick={onClose}
      className="flex items-center gap-2.5 rounded-md px-2 py-2 text-[13px] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
    >
      <Icon className="size-3.5 shrink-0" style={{ color }} />
      <span className="min-w-0 flex-1 truncate">{title}</span>
      {desc ? <span className="hidden text-[10px] text-[var(--color-text-muted)] sm:inline">{desc}</span> : null}
    </Link>
  );

  return (
    <>
      {/* Backdrop — CSS open only; never both pointer-events utilities at once */}
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-[9998] bg-black/50 transition-opacity duration-150 motion-reduce:transition-none md:hidden",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* Drawer shell — always mounted so first open is transform-only (no cold remount) */}
      <div
        role="dialog"
        aria-modal={open}
        aria-hidden={!open}
        className={cn(
          "fixed inset-y-0 right-0 z-[9999] flex w-[min(100%,380px)] flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl md:hidden",
          "pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]",
          "transition-transform duration-150 ease-out motion-reduce:transition-none",
          open
            ? "translate-x-0 pointer-events-auto"
            : "translate-x-full pointer-events-none",
        )}
      >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3.5">
              <JimvioLogo href="/" size="sm" onClick={onClose} />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="grid size-9 place-items-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {/* Account */}
              <div className="border-b border-[var(--color-border)] px-4 py-4">
                {user ? (
                  <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                    <button
                      type="button"
                      onClick={() => toggle("account")}
                      className="flex w-full items-center gap-3 p-3 text-left"
                    >
                      <Avatar className="size-10 shrink-0 border border-[var(--color-border)]">
                        <AvatarImage src={user.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-[#fd5000]/10 text-[11px] font-bold text-[#fd5000]">
                          {user.full_name?.[0] || user.email?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-[var(--color-text-primary)]">
                          {user.full_name || "My account"}
                        </p>
                        <p className="truncate text-[11px] text-[var(--color-text-muted)]">
                          View and manage your account
                        </p>
                      </div>
                      <ChevronDown className={cn("size-4 shrink-0 text-[var(--color-text-muted)] transition-transform", expanded === "account" && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                      {expanded === "account" && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-[var(--color-border)]"
                        >
                          <div className="space-y-0.5 p-2">
                            {accountLinks.map((link) => (
                              <Link
                                key={link.href}
                                href={link.href}
                                onClick={onClose}
                                className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]"
                              >
                                <link.icon className="size-4 shrink-0 text-[var(--color-text-muted)]" />
                                {link.label}
                                {link.href === "/communities/messages" && chatCount > 0 && (
                                  <span className="ml-auto rounded-full bg-[#fd5000] px-1.5 py-0.5 text-[10px] font-bold text-white">
                                    {chatCount > 99 ? "99+" : chatCount}
                                  </span>
                                )}
                              </Link>
                            ))}
                            <div className="my-1 h-px bg-[var(--color-border)]" />
                            <button
                              type="button"
                              onClick={async () => { await signOut(); window.location.href = "/"; }}
                              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-500/5"
                            >
                              <LogOut className="size-4 shrink-0" />
                              Sign out
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[13px] text-[var(--color-text-muted)]">Sign in to track orders, messages, and earnings.</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href="/login"
                        onClick={onClose}
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--color-border)] text-[13px] font-semibold text-[var(--color-text-primary)]"
                      >
                        Log in
                      </Link>
                      <Link
                        href="/register"
                        onClick={onClose}
                        className="inline-flex h-10 items-center justify-center rounded-lg bg-[#fd5000] text-[13px] font-bold text-white"
                      >
                        Join free
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Jimvio AI */}
              <div className="border-b border-[var(--color-border)] px-4 py-4">
                <button
                  type="button"
                  onClick={() => { openAssistant(); onClose(); }}
                  className="flex w-full items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-3 text-left transition-colors hover:border-[#fd5000]/30"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#fd5000]/10 text-[#fd5000]">
                    <Sparkles className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-[var(--color-text-primary)]">Jimvio AI</span>
                    <span className="block text-[12px] text-[var(--color-text-muted)]">Products, campaigns, and growth tips</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-[var(--color-text-muted)]" />
                </button>
              </div>

              {/* Quick access — compact wallet amount + Cart */}
              {user && (
                <div className="grid grid-cols-2 gap-2 border-b border-[var(--color-border)] px-4 py-4">
                  <WalletBalanceChip
                    amount={walletBalance}
                    currency={walletCurrency || "USD"}
                    hydrated={hydrated}
                    href="/wallet"
                    onClick={onClose}
                  />
                  <Link
                    href="/cart"
                    onClick={onClose}
                    className="relative flex min-h-[52px] items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] py-2.5 text-[13px] font-semibold text-[var(--color-text-primary)]"
                  >
                    <ShoppingCart className="size-4 text-[var(--color-text-muted)]" />
                    Cart
                    {cartCount > 0 && (
                      <span className="absolute -right-1 -top-1 rounded-full bg-[#fd5000] px-1.5 py-0.5 text-[9px] font-bold text-white">
                        {cartCount > 99 ? "99+" : cartCount}
                      </span>
                    )}
                  </Link>
                </div>
              )}

              {/* Navigation — same five primary destinations as desktop (Home via logo only) */}
              <div className="px-4 py-4">
                <SectionLabel>Menu</SectionLabel>
                <div className="space-y-1">
                  <ExpandSection id="market" icon={ShoppingBag} label="Marketplace">
                    {marketplaceVariants.map((v) => (
                      <SubItem key={v.href} href={v.href} icon={v.icon} color={v.color} title={v.title} desc={v.desc} />
                    ))}
                  </ExpandSection>
                  <NavRow href="/communities" icon={Users} label="Communities" active={pathname.startsWith("/communities")} />
                  <NavRow href="/commerce" icon={Store} label="Commerce" active={pathname === "/commerce" || pathname.startsWith("/commerce/")} />
                  <NavRow href="/affiliates" icon={BanknoteIcon} label="Affiliates" active={pathname.startsWith("/affiliates")} />
                  <NavRow href="/ugc" icon={Clapperboard} label="UGC & Clipping" active={pathname.startsWith("/ugc")} />
                  <NavRow href="/help" icon={CircleHelp} label="Help Center" active={pathname.startsWith("/help")} />
                </div>
              </div>
            </div>
      </div>
    </>
  );
}