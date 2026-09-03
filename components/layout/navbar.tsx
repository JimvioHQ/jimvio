"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  ShoppingCart,
  MessageSquare,
  Menu,
  X,
  CircleHelp,
  Settings,
  LogOut,
  Video,
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
  Wallet,
  DollarSign,
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
import { useAIStore } from "@/lib/store/use-ai-store";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { MarketingSettings, NavLinkConfig } from "@/lib/platform-settings-shared";
import { CurrencySelector } from "@/context/CurrencyContext";
import JimvioLogo from "../ui/logo";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  MOBILE_BOTTOM_NAV_ITEMS,
  PRIMARY_NAV_ITEMS,
  PROFILE_QUICK_ACCESS_ITEMS,
  isOrdersActive,
  isWalletActive,
  resolvePrimaryNavHref,
} from "@/lib/navigation/primary-nav";
import { ProfileAccountMenu } from "@/components/shell/ProfileAccountMenu";
import { useCommandCenterStore } from "@/lib/store/use-command-center-store";

function useScrollDirection(threshold = 8) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY.current) < threshold) return;
      setHidden(y > lastY.current && y > 60);
      lastY.current = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return hidden;
}


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
    className?: string;
    style?: React.CSSProperties;
    [key: string]: any;
  }
>(({ children, href, onClick, badge, className, style, ...props }, ref) => {
  const cls = cn(
    "relative flex items-center justify-center h-9 w-9 shrink-0 rounded-xl transition-all duration-150 active:scale-[0.94]",
    "text-stone-500 hover:bg-black/[0.06] hover:text-stone-800",
    "dark:text-stone-400 dark:hover:bg-white/[0.08] dark:hover:text-stone-100",
    className
  );
  const inner = (
    <>
      {children}
      {badge != null && badge > 0 && (
        <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 bg-[#fd5000] text-white text-[9px] font-black flex items-center justify-center rounded-full ring-2 ring-white dark:ring-[#0a0a0a] z-20">
          {badge}
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
  }));
}


function iconForHref(href: string): LucideIcon {
  const h = href.replace(/\/$/, "") || "/";
  if (h === "/") return Home;
  if (h.startsWith("/communities")) return Users;
  if (h.startsWith("/ugc")) return Clapperboard;
  if (h.startsWith("/marketplace")) return ShoppingBag;
  if (h.startsWith("/affiliates")) return DollarSign;
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
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const DROPDOWN_CLOSE_DELAY = 220;
  const marketplaceTimer = useRef<NodeJS.Timeout | null>(null);
  const { isMobile } = useIsMobile();
  const { cartCount, chatCount, refreshCounts } = useCartStore();
  const { openAssistant } = useAIStore();
  const openCommandCenter = useCommandCenterStore((s) => s.openCommandCenter);
  const pathname = usePathname();

  const navHidden = useScrollDirection();
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 15);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  useEffect(() => setPortalReady(true), []);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => { if (user) refreshCounts(); }, [user, refreshCounts]);

  const navLinks = ensureCoreNavLinks(marketing.nav_links ?? []);

  const marketplaceVariants = [
    { title: "Digital Market", desc: "Software, courses & assets", href: "/marketplace?type=digital", icon: Zap, color: "#0ea5e9", badge: "Hot" },
    { title: "Physical Market", desc: "Real-world goods & equipment", href: "/marketplace?type=physical", icon: Package, color: "#f59e0b" },
  ];

  const mobileBottomLinks = MOBILE_BOTTOM_NAV_ITEMS;

  const onMarketplaceEnter = () => {
    if (marketplaceTimer.current) clearTimeout(marketplaceTimer.current);
    setMarketplaceOpen(true);
  };
  const onMarketplaceLeave = () => {
    marketplaceTimer.current = setTimeout(() => setMarketplaceOpen(false), DROPDOWN_CLOSE_DELAY);
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 pointer-events-none transition-all duration-300">
      <div
        className={cn(
          "pointer-events-auto relative mx-auto transition-all duration-300 flex flex-col",
          scrolled
            ? "bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-2xl shadow-[0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_1px_0_rgba(255,255,255,0.04)]"
            : "bg-white/70 dark:bg-[#0a0a0a]/70 backdrop-blur-xl"
        )}
      >
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/10 pointer-events-none" />
        <div className="min-w-0 w-full overflow-x-hidden">
          {/* main bar — 3-column grid prevents nav/search overlap */}
          <div className="grid w-full min-w-0 max-w-8xl mx-auto h-14 md:h-[62px] px-4 sm:px-8 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 sm:gap-x-3">
            {/* Logo */}
            <div className="flex shrink-0 items-center self-center">
              <JimvioLogo
                href="/"
                size={isMobile ? "md" : "lg"}
                presentation="header"
              />
            </div>

            {/* Desktop nav — flex-1 center column, clips before overlapping search */}
            {/* Desktop nav — discovery destinations with breathing room from logo */}
            <nav className="hidden min-[1240px]:flex min-w-0 flex-nowrap items-center justify-start gap-3 overflow-hidden pl-4 xl:gap-4 xl:pl-6">

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
                            className="h-9 gap-1.5 px-2.5 xl:px-3 py-0 text-[12px] xl:text-[13px] font-semibold tracking-[0.01em] shrink-0"
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
                      className="h-9 gap-1.5 px-2.5 xl:px-3 py-0 text-[12px] xl:text-[13px] font-semibold tracking-[0.01em] shrink-0"
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" />
                      <span className="whitespace-nowrap">{item.label}</span>
                    </ConsoleButton>
                  );
                }
              })}
            </nav>

            {/* Right side — fixed-width cluster, never overlaps nav */}
            <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 min-w-0">

              {/* Desktop search → unified Command+K */}
              <button
                type="button"
                onClick={() => openCommandCenter()}
                aria-label="Search everything or run a command"
                className="hidden min-[1240px]:flex h-9 w-[180px] xl:w-[220px] items-center gap-2 rounded-full border border-border bg-stone-50/90 dark:bg-stone-900/80 px-3 text-left transition-colors hover:border-orange-300 hover:bg-white dark:hover:bg-stone-900"
              >
                <Search className="h-3.5 w-3.5 shrink-0 text-stone-400" />
          <span className="min-w-0 flex-1 truncate text-[12px] text-stone-400">
                  Search globally…
                </span>
                <kbd className="hidden shrink-0 rounded border border-border bg-white px-1 py-px text-[9px] font-medium text-stone-400 dark:bg-stone-950 xl:inline">
                  ⌘K
                </kbd>
              </button>

              {/* Orders / Wallet — icon-only utilities */}
              {user && (
                <>
                  <ConsoleIconBtn
                    href="/orders"
                    className={cn(isOrdersActive(pathname) && "text-[#FF5A1F]")}
                    aria-label="Orders"
                  >
                    <Package className="h-[18px] w-[18px]" />
                  </ConsoleIconBtn>
                  <ConsoleIconBtn
                    href="/wallet"
                    className={cn(isWalletActive(pathname) && "text-[#FF5A1F]")}
                    aria-label="Wallet"
                  >
                    <Wallet className="h-[18px] w-[18px]" />
                  </ConsoleIconBtn>
                </>
              )}

              {/* Cart */}
              <ConsoleIconBtn href="/cart" badge={cartCount}>
                <ShoppingCart className="h-[18px] w-[18px]" />
              </ConsoleIconBtn>

              {/* Theme Toggle (wide screens) */}
              <div className="hidden min-[1280px]:flex mr-0.5">
                <ThemeToggle />
              </div>

              <div className="hidden lg:block h-6 w-px mx-0.5 bg-border/40 shrink-0" />

              {/* User menu / auth */}
              <div className="hidden sm:flex items-center shrink-0">
                {user ? (
                  <ProfileAccountMenu
                    user={{
                      name: user.full_name || user.email || "Account",
                      email: user.email,
                      avatarUrl: user.avatar_url,
                    }}
                    messageCount={chatCount}
                    trigger={
                      <button
                        type="button"
                        aria-label="Open profile menu"
                        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface p-0.5 shadow-sm transition-all hover:border-orange-400 active:scale-95"
                      >
                        <Avatar className="h-full w-full shrink-0 rounded-full">
                          <AvatarImage src={user.avatar_url ?? undefined} className="object-cover" />
                          <AvatarFallback className="rounded-full bg-orange-100 text-[10px] font-bold capitalize text-orange-600">
                            {user.full_name?.[0] || user.email?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    }
                  />
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href="/login" className="h-9 px-4 flex items-center rounded-sm text-[12px] font-bold text-stone-600 dark:text-stone-300 border border-border bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white transition-all whitespace-nowrap">
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

        {/* ══════════════════════════════════════════
          MOBILE DRAWER PORTAL
          ══════════════════════════════════════════ */}
        {portalReady &&
          createPortal(
            <MobileDrawer
              open={mobileOpen}
              onClose={() => setMobileOpen(false)}
              user={user}
              pathname={pathname}
              marketplaceVariants={marketplaceVariants}
              navLinks={navLinks}
              openAssistant={openAssistant}
            />,
            document.body
          )}
      </div>

      {portalReady &&
        createPortal(
          <div className="md:hidden fixed bottom-0 inset-x-0 z-[100] pointer-events-none pb-[env(safe-area-inset-bottom,0px)]">
            <motion.nav
              initial={{ y: 80 }}
              animate={{ y: navHidden ? 80 : 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="pointer-events-auto relative grid h-[60px] grid-cols-5 items-stretch border-t border-stone-100 bg-white/95 shadow-[0_-8px_24px_rgba(0,0,0,0.04)] backdrop-blur-md dark:border-white/5 dark:bg-stone-950/95"
            >
              {mobileBottomLinks.map((link) => {
                const href = resolvePrimaryNavHref(link, Boolean(user));
                const active = isActive(pathname, href);
                const ariaLabel =
                  "ariaLabel" in link && typeof link.ariaLabel === "string"
                    ? link.ariaLabel
                    : link.label;
                return (
                  <Link
                    key={`${link.label}-${href}`}
                    href={href}
                    aria-label={ariaLabel}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 px-0.5 transition-colors duration-200",
                      active ? "text-orange-600 dark:text-orange-500" : "text-stone-400 dark:text-stone-600"
                    )}
                  >
                    <div className="relative flex h-6 items-center justify-center">
                      <link.icon
                        className={cn("h-5 w-5 shrink-0 transition-transform duration-300", active && "scale-105")}
                        strokeWidth={active ? 2.5 : 2}
                      />
                      {active && (
                        <motion.div layoutId="mobile-glow" className="absolute inset-0 rounded-full bg-orange-500/20 blur-xl" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "max-w-full truncate text-[9px] font-semibold leading-none tracking-tight whitespace-nowrap",
                        active ? "text-orange-600 opacity-100 dark:text-orange-500" : "opacity-70"
                      )}
                    >
                      {link.label}
                    </span>
                    {active && (
                      <motion.div layoutId="mobile-pill-active" className="absolute top-0 h-[2px] w-7 rounded-b-full bg-orange-500" />
                    )}
                  </Link>
                );
              })}
            </motion.nav>
          </div>,
          document.body
        )}
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
  const toggle = (s: string) => setExpanded((p) => (p === s ? null : s));

  const accountLinks = [
    ...PROFILE_QUICK_ACCESS_ITEMS.map((item) => ({
      href: item.href,
      icon: item.icon,
      label: item.label,
    })),
    { href: "/library", icon: Video, label: "Digital Library" },
    { href: "/identity/settings", icon: Settings, label: "Settings" },
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
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[9998] bg-black/50"
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed inset-y-0 right-0 z-[9999] flex w-[min(100%,380px)] flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl pointer-events-auto"
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
                        <p className="truncate text-[11px] text-[var(--color-text-muted)]">{user.email}</p>
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
                                {link.href === "/messages" && chatCount > 0 && (
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

              {/* Quick access */}
              {user && (
                <div className="grid grid-cols-2 gap-2 border-b border-[var(--color-border)] px-4 py-4">
                  <Link
                    href="/messages"
                    onClick={onClose}
                    className="relative flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] py-2.5 text-[13px] font-semibold text-[var(--color-text-primary)]"
                  >
                    <MessageSquare className="size-4 text-[#fd5000]" />
                    Messages
                    {chatCount > 0 && (
                      <span className="absolute -right-1 -top-1 rounded-full bg-[#fd5000] px-1.5 py-0.5 text-[9px] font-bold text-white">
                        {chatCount > 99 ? "99+" : chatCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/cart"
                    onClick={onClose}
                    className="relative flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] py-2.5 text-[13px] font-semibold text-[var(--color-text-primary)]"
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

              {/* Navigation */}
              <div className="px-4 py-4">
                <SectionLabel>Menu</SectionLabel>
                <div className="space-y-1">
                  <NavRow href="/" icon={Home} label="Home" active={pathname === "/"} />
                  <ExpandSection id="market" icon={ShoppingBag} label="Marketplace">
                    {marketplaceVariants.map((v) => (
                      <SubItem key={v.href} href={v.href} icon={v.icon} color={v.color} title={v.title} desc={v.desc} />
                    ))}
                  </ExpandSection>
                  <NavRow href="/communities" icon={Users} label="Communities" active={pathname.startsWith("/communities")} />
                  <NavRow href="/ugc" icon={Clapperboard} label="UGC & Clipping" active={pathname.startsWith("/ugc")} />
                  <NavRow href="/affiliates" icon={BanknoteIcon} label="Affiliates" active={pathname.startsWith("/affiliates")} />
                  <NavRow href="/help" icon={CircleHelp} label="Help Center" active={pathname.startsWith("/help")} />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-[var(--color-text-muted)]">Theme</span>
                <ThemeToggle />
              </div>
              <CurrencySelector className="h-8 border-0 bg-transparent text-[12px] font-medium text-[var(--color-text-muted)]" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}