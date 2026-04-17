"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  User, ShoppingCart, MessageCircle, Menu, X, Globe, HelpCircle,
  LayoutDashboard, Settings, LogOut, TrendingUp, Video, Factory, Plus,
  Home, ShoppingBag, Package, Users, Search, Command, ChevronDown,
  ChevronRight, Sparkles, Zap, Play, Megaphone, Clapperboard, Sun,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth/actions";
import { useCartStore } from "@/lib/store/use-cart-store";
import { useAIStore } from "@/lib/store/use-ai-store";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { MarketingSettings, NavLinkConfig } from "@/lib/platform-settings-shared";
import { NavbarSearch } from "@/components/layout/navbar-search";
import { CurrencySelector } from "@/context/CurrencyContext";
import { CurrencyConverterWidget } from "@/components/shared/currency-converter-widget";

/* ---------------------------------------------------------
   iPhone 17 Liquid Glass Design Tokens
   --------------------------------------------------------- */

/** Liquid Glass Design Tokens — adapted for dynamic theme */
const GLASS_LIGHT = {
  body: "var(--glass-bg)",
  border: "var(--glass-border)",
  blur: "var(--glass-blur) saturate(160%)",
  shadow: "var(--glass-shadow), inset 0 1px 0 rgba(255,255,255,0.05)",
  shadowDeep: "0 24px 64px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.05)",
};

const GLASS_DARK = {
  body: "var(--glass-bg)",
  border: "var(--glass-border)",
  blur: "var(--glass-blur) saturate(160%)",
  shadow: "var(--glass-shadow)",
};

/* Specular line — the 1px bright edge every glass element has */
function SpecularLine({ rounded = false }: { rounded?: boolean }) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-x-0 top-0 h-px z-10", rounded && "rounded-t-[inherit]")}
      style={{ background: "linear-gradient(90deg,transparent 5%,rgba(255,255,255,0.3) 40%,rgba(255,255,255,0.1) 60%,transparent 95%)" }}
    />
  );
}

/* Diagonal specular sweep — adds depth */
function SpecularSweep() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] z-10"
      style={{ borderRadius: "inherit" }}
    >
      <div
        className="absolute"
        style={{
          top: "-50%", left: "-25%", width: "55%", height: "100%",
          background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 55%)",
          transform: "rotate(-15deg)",
        }}
      />
    </div>
  );
}

/* Glass pill button */
const GlassPill = React.forwardRef<any, {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  active?: boolean;
  orange?: boolean;
  style?: React.CSSProperties;
  [key: string]: any;
}>(({
  children, href, onClick, className, active = false, orange = false,
  style, ...props
}, ref) => {
  const base: React.CSSProperties = active
    ? {
      background: "var(--glass-bg)",
      backdropFilter: GLASS_LIGHT.blur,
      WebkitBackdropFilter: GLASS_LIGHT.blur,
      border: "1px solid var(--glass-border)",
      boxShadow: "0 2px 10px rgba(249,115,22,0.12), inset 0 1px 0 rgba(255,255,255,0.1)",
      color: "var(--color-accent)",
    }
    : orange
      ? {
        background: "var(--glass-bg)",
        backdropFilter: GLASS_LIGHT.blur,
        WebkitBackdropFilter: GLASS_LIGHT.blur,
        border: "1px solid var(--glass-border)",
        boxShadow: "0 2px 12px rgba(249,115,22,0.10), inset 0 1px 0 rgba(255,255,255,0.1)",
        color: "var(--color-text-primary)",
      }
      : {
        background: GLASS_LIGHT.body,
        backdropFilter: GLASS_LIGHT.blur,
        WebkitBackdropFilter: GLASS_LIGHT.blur,
        border: `1px solid ${GLASS_LIGHT.border}`,
        boxShadow: GLASS_LIGHT.shadow,
        color: "var(--color-text-primary)",
      };

  const cls = cn(
    "relative inline-flex items-center gap-1.5 rounded-full transition-all duration-200 active:scale-[0.96] select-none",
    className,
  );

  if (href) return (
    <Link href={href} className={cls} style={{ ...base, ...style }} ref={ref} {...props}>
      <SpecularSweep />
      {children}
    </Link>
  );

  return (
    <button type="button" onClick={onClick} className={cls} style={{ ...base, ...style }} ref={ref} {...props}>
      <SpecularSweep />
      {children}
    </button>
  );
});
GlassPill.displayName = "GlassPill";

/* Icon-only glass circle button */
const GlassCircle = React.forwardRef<any, {
  children: React.ReactNode; href?: string; onClick?: () => void;
  badge?: number; className?: string; style?: React.CSSProperties;
  [key: string]: any;
}>(({
  children, href, onClick, badge, className, style: styleProp, ...props
}, ref) => {
  const style: React.CSSProperties = {
    background: GLASS_LIGHT.body,
    backdropFilter: GLASS_LIGHT.blur,
    WebkitBackdropFilter: GLASS_LIGHT.blur,
    border: `1px solid ${GLASS_LIGHT.border}`,
    boxShadow: GLASS_LIGHT.shadow,
    ...styleProp,
  };
  const cls = cn(
    "relative flex items-center justify-center h-10 w-10 shrink-0 rounded-full transition-all duration-200 hover:scale-[1.04] active:scale-[0.92]",
    className,
  );

  const inner = (
    <>
      <SpecularSweep />
      {children}
      {badge != null && badge > 0 && (
        <span className="absolute -top-1 -right-1 h-[18px] min-w-[18px] px-1 bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full ring-2 ring-white z-20">
          {badge}
        </span>
      )}
    </>
  );

  if (href) return <Link href={href} className={cls} style={style} ref={ref} {...props}>{inner}</Link>;
  return <button type="button" onClick={onClick} className={cls} style={style} ref={ref} {...props}>{inner}</button>;
});
GlassCircle.displayName = "GlassCircle";

/* --- helpers --- */

function ensureCoreNavLinks(links: NavLinkConfig[]): NavLinkConfig[] {
  const hide = ["/ugc", "/vendors", "/affiliates", "/influencers", "/influencers/browse", "/influencers/program", "/shorts"];
  let out = links.filter(l => {
    const h = l.href.replace(/\/$/, "") || "/";
    return h !== "/clips" && !hide.includes(h);
  });
  const norm = (h: string) => h.replace(/\/$/, "") || "/";
  if (!out.some(l => norm(l.href) === "/marketplace")) out.push({ label: "Marketplace", href: "/marketplace" });
  if (!out.some(l => norm(l.href) === "/communities")) out.push({ label: "Communities", href: "/communities" });
  const hi = out.findIndex(l => norm(l.href) === "/");
  if (hi > 0) { const home = out[hi]; out.splice(hi, 1); out.unshift(home); }
  return out;
}

function iconForHref(href: string): LucideIcon {
  const h = href.replace(/\/$/, "") || "/";
  if (h === "/") return Home;
  if (h.startsWith("/communities")) return Users;
  if (h.startsWith("/ugc")) return Megaphone;
  if (h.startsWith("/marketplace")) return ShoppingBag;
  if (h.startsWith("/affiliates")) return TrendingUp;
  if (h.startsWith("/influencers")) return User;
  if (h.startsWith("/vendors")) return Factory;
  if (h.startsWith("/shorts")) return Clapperboard;
  return Package;
}

function isActive(pathname: string, href: string) {
  const h = href.replace(/\/$/, "") || "/";
  if (h === "/") return pathname === "/";
  return pathname === h || pathname.startsWith(`${h}/`);
}

/* --- Main Navbar --- */

interface NavbarProps {
  user?: { email: string; full_name?: string | null; avatar_url?: string | null } | null;
  marketing: MarketingSettings;
}

export function Navbar({ user, marketing }: NavbarProps) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const exploreTimer = useRef<NodeJS.Timeout | null>(null);

  const { cartCount, chatCount, refreshCounts } = useCartStore();
  const { openAssistant } = useAIStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 15);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    fn(); window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  useEffect(() => setPortalReady(true), []);
  useEffect(() => { document.body.style.overflow = mobileOpen ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [mobileOpen]);
  useEffect(() => { if (user) refreshCounts(); }, [user, refreshCounts]);

  const topBarOpacity = useTransform(scrollY, [0, 40], [1, 0]);
  const topBarH = useTransform(scrollY, [0, 40], [30, 0]);

  const navLinks = ensureCoreNavLinks(marketing.nav_links ?? []);

  const solutions = [
    { title: "Videos", desc: "Creator shorts & clips", href: "/shorts", icon: Clapperboard, color: "rgba(239,68,68,0.8)" },
    { title: "Campaigns", desc: "Active UGC missions", href: "/ugc", icon: Megaphone, color: "rgba(139,92,246,0.8)" },
    { title: "Suppliers", desc: "Vendor tools & storefronts", href: "/vendors", icon: Factory, color: "rgba(16,185,129,0.8)" },
    { title: "Affiliate", desc: "Your referral network", href: "/affiliates", icon: TrendingUp, color: "rgba(168,85,247,0.8)" },
    { title: "Creators", desc: "Find top creator talent", href: "/influencers/browse", icon: User, color: "rgba(236,72,153,0.8)" },
  ];

  const mobileBottomLinks = [
    { label: "Home", href: "/", icon: Home },
    { label: "Market", href: "/marketplace", icon: ShoppingBag },
    { label: "Play", href: "/shorts", icon: Play },
    { label: "Cart", href: "/cart", icon: ShoppingCart },
  ];

  const drawerLinks = [
    { label: "Home", href: "/", icon: Home },
    { label: "Marketplace", href: "/marketplace", icon: ShoppingBag },
    { label: "Videos", href: "/shorts", icon: Play },
    { label: "Campaigns", href: "/ugc", icon: Megaphone },
    { label: "Communities", href: "/communities", icon: Users },
    { label: "Affiliate", href: "/affiliates", icon: TrendingUp },
    { label: "Creators", href: "/influencers/browse", icon: User },
    { label: "Suppliers", href: "/vendors", icon: Factory },
  ];

  const runSearch = useCallback((override?: string) => {
    const t = (override ?? searchQ).trim();
    const qs = t ? `?q=${encodeURIComponent(t)}` : "";
    router.push(`/marketplace${qs}`);
    setMobileOpen(false);
  }, [router, searchQ]);

  /* --- Navbar shell glass styles (always applies) --- */
  const shellStyle: React.CSSProperties = {
    background: "var(--glass-bg)",
    backdropFilter: "blur(var(--glass-blur)) saturate(160%)",
    WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(160%)",
    borderBottom: "1px solid var(--color-border)",
    boxShadow: scrolled ? "var(--glass-shadow)" : "none",
  };

  return (
    <header className={cn(
      "fixed top-0 inset-x-0 z-[100] pointer-events-none transition-all duration-500",
      "px-0 pt-0"
    )}>
      <div className="pointer-events-auto relative w-full mx-auto transition-all duration-500 flex flex-col"
        style={{
          ...shellStyle,
          borderBottom: scrolled ? "1px solid var(--color-border)" : "none",
          background: scrolled ? "var(--glass-bg)" : "transparent",
        }}
      >
        {/* Specular glass edges */}
        {scrolled && <SpecularLine rounded={scrolled} />}
        {scrolled && <SpecularSweep />}

        {/* Desktop top strip */}
        <motion.div
          style={{ height: topBarH, opacity: topBarOpacity, overflow: "hidden" }}
          className="hidden md:flex items-center justify-between px-8 md:px-12 shrink-0 border-b border-white/5 dark:border-white/10"
        >
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5 text-[9px] font-semibold text-stone-500 dark:text-text-muted tracking-widest capitalize">
              <Globe className="h-3 w-3 text-orange-500" />
              {(marketing.locale_strip?.trim() || "EN · USD")}
            </span>
            <CurrencySelector className="h-5 bg-transparent border-0 px-1 text-[10px] font-semibold text-stone-500 dark:text-text-muted hover:text-stone-800 dark:text-text-secondary dark:hover:text-stone-200 transition-colors" />
          </div>
          <div className="flex items-center gap-5">
            <Link href="/help" className="text-[9px] font-semibold tracking-widest text-stone-500 dark:text-text-muted hover:text-orange-500 transition-colors capitalize">Help center</Link>
            <Link href="/vendors" className="text-[9px] font-semibold tracking-widest text-stone-500 dark:text-text-muted hover:text-stone-800 dark:text-text-secondary dark:hover:text-stone-200 transition-colors capitalize">Suppliers</Link>
          </div>
        </motion.div>

        {/* Main bar */}
        <div className="flex items-center h-14 md:h-[62px] px-3 sm:px-5 md:px-8 gap-2 md:gap-4">

          {/* Logo */}
          <Link href="/" className="shrink-0 mr-1 transition-transform active:scale-95">
            <Image
              src="/jimvio-logo.png"
              alt="Jimvio"
              width={140}
              height={40}
              className="h-8 sm:h-10 w-auto object-contain brightness-110 contrast-125"
              priority
            />
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden min-[1150px]:flex items-center gap-1">
            {/* Explore dropdown */}
            <div
              onMouseEnter={() => { if (exploreTimer.current) clearTimeout(exploreTimer.current); setExploreOpen(true); }}
              onMouseLeave={() => { exploreTimer.current = setTimeout(() => setExploreOpen(false), 140); }}
              className="relative"
            >
              <DropdownMenu open={exploreOpen} onOpenChange={setExploreOpen} modal={false}>
                <DropdownMenuTrigger asChild>
                  <GlassPill className="px-3.5 py-2 text-[13px] font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:text-white dark:hover:text-white group">
                    <Globe className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                    Explore
                    <ChevronDown className={cn("h-3 w-3 text-stone-400 dark:text-stone-600 transition-transform duration-300", exploreOpen && "rotate-180")} />
                  </GlassPill>
                </DropdownMenuTrigger>

                {/* Dark glass dropdown */}
                <DropdownMenuContent
                  onMouseEnter={() => { if (exploreTimer.current) clearTimeout(exploreTimer.current); setExploreOpen(true); }}
                  onMouseLeave={() => { exploreTimer.current = setTimeout(() => setExploreOpen(false), 140); }}
                  sideOffset={10}
                  className="w-72 p-2 rounded-[24px] border border-white/10 dark:border-white/5 outline-none overflow-hidden"
                  style={{
                    background: "var(--color-surface)",
                    backdropFilter: "blur(40px) saturate(180%)",
                    WebkitBackdropFilter: "blur(40px) saturate(180%)",
                    boxShadow: "0 20px 50px rgba(0,0,0,0.12)",
                  }}
                >
                  <SpecularLine rounded />
                  <SpecularSweep />
                  {solutions.map(s => (
                    <DropdownMenuItem key={s.href} asChild className="p-0 focus:bg-transparent rounded-[16px]">
                      <Link
                        href={s.href}
                        className="relative flex items-center gap-3 p-3 rounded-[16px] group/item transition-all"
                        style={{ outline: "none" }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = "var(--color-surface-secondary)";
                          (e.currentTarget as HTMLElement).style.border = "1px solid var(--color-border)";
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = "";
                          (e.currentTarget as HTMLElement).style.border = "";
                        }}
                      >
                        {/* Icon with glass backing */}
                        <div
                          className="h-9 w-9 rounded-[12px] flex items-center justify-center shrink-0"
                          style={{
                            background: "var(--color-surface-secondary)",
                            border: "1px solid var(--color-border)",
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                            color: s.color,
                          }}
                        >
                          <s.icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-stone-800 dark:text-text-secondary leading-none mb-0.5">{s.title}</p>
                          <p className="text-[11px] text-stone-400 dark:text-text-muted truncate">{s.desc}</p>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {navLinks.map(item => {
              const active = isActive(pathname, item.href);
              const Icon = iconForHref(item.href);
              return (
                <GlassPill key={item.href} href={item.href} active={active}
                  className="px-3.5 py-2 text-[13px] font-semibold group">
                  <Icon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-orange-500" : "text-stone-400 group-hover:text-orange-600")} />
                  <span className={active ? "text-orange-700" : "text-stone-600 group-hover:text-orange-500 dark:text-white"}>{item.label}</span>
                </GlassPill>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex-1 flex items-center justify-end gap-1">

            {/* Desktop search */}
            <div className="hidden min-[1000px]:block max-w-[380px] w-full shrink">
              <NavbarSearch searchQ={searchQ} setSearchQ={setSearchQ}
                placeholder={marketing.search_placeholder} isScrolled={scrolled}
                variant="desktop" runSearch={runSearch} navLinks={navLinks} />
            </div>

            {/* AI Mode */}
            <GlassPill orange className="hidden md:flex shrink-0 px-4 py-2 text-[12px] font-black capitalize tracking-widest text-primary border-primary/20 bg-primary/5 hover:bg-primary/10"
              onClick={() => openAssistant()}>
              <Sparkles className="h-4 w-4 fill-primary stroke-none" />
              <span>AI Mode</span>
            </GlassPill>

            {/* Messages */}
            {user && (
              <GlassCircle href="/dashboard/messages" badge={chatCount} className="flex">
                <MessageCircle className="h-[18px] w-[18px] text-stone-600 dark:text-stone-300" />
              </GlassCircle>
            )}

            {/* Cart */}
            <GlassCircle href="/cart" badge={cartCount}>
              <ShoppingCart className="h-[18px] w-[18px] text-stone-600 dark:text-stone-300" />
            </GlassCircle>

            {/* Theme Toggle */}
            <div className="hidden min-[1100px]:flex mr-1">
              <ThemeToggle />
            </div>

            {/* Divider */}
            <div className="hidden lg:block h-6 w-px mx-1 bg-border/40" />

            {/* User menu */}
            <div className="hidden sm:block">
              {user ? (
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="relative flex items-center gap-2.5 px-2 xl:px-3 h-11 rounded-full transition-all hover:scale-[1.02] active:scale-95"
                      style={{
                        background: GLASS_LIGHT.body,
                        backdropFilter: GLASS_LIGHT.blur,
                        WebkitBackdropFilter: GLASS_LIGHT.blur,
                        border: `1px solid var(--color-border)`,
                        boxShadow: GLASS_LIGHT.shadow,
                      }}
                    >
                      <SpecularSweep />
                      <Avatar className="h-7 w-7 ring-2 ring-white/80 shadow-sm shrink-0">
                        <AvatarImage src={user.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-[10px] font-bold capitalize">
                          {user.full_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden xl:block text-[13px] font-semibold text-stone-800 dark:text-white max-w-[110px] truncate">
                        {user.full_name?.split(" ")[0]}
                      </span>
                      <ChevronDown className="hidden xl:block h-3 w-3 text-stone-400 dark:text-stone-600" />
                    </button>
                  </DropdownMenuTrigger>

                  {/* Dark glass user dropdown */}
                  <DropdownMenuContent
                    align="end"
                    className="w-60 p-2 mt-2 rounded-[28px] border border-border outline-none overflow-hidden"
                    style={{
                      background: "var(--glass-bg)",
                      backdropFilter: "blur(40px) saturate(180%)",
                      WebkitBackdropFilter: "blur(40px) saturate(180%)",
                      boxShadow: "0 20px 50px rgba(0,0,0,0.12)",
                    }}
                  >
                    <SpecularLine rounded />
                    <SpecularSweep />

                    <div className="px-3 py-3 rounded-[20px] mb-2 bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/10 shadow-inner">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8 ring-2 ring-white shrink-0">
                          <AvatarImage src={user.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-[10px] font-bold capitalize">
                            {user.full_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-stone-900 dark:text-white truncate leading-tight">{user.full_name}</p>
                          <p className="text-[10px] text-stone-400 truncate">{user.email}</p>
                        </div>
                      </div>
                    </div>

                    {[
                      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
                      { href: "/dashboard/settings", icon: Settings, label: "My Account" },
                    ].map(item => (
                      <DropdownMenuItem key={item.href} asChild
                        className="p-0 focus:bg-transparent rounded-[13px] cursor-pointer">
                        <Link
                          href={item.href}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-[13px] text-[13px] font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:text-white dark:hover:text-white transition-colors"
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--color-surface-secondary)"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}

                    <div className="h-px my-1 mx-1" style={{ background: "rgba(255,255,255,0.07)" }} />

                    <DropdownMenuItem
                      onSelect={async () => { await signOut(); window.location.href = "/"; }}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-[13px] text-[13px] font-semibold text-red-500 hover:bg-red-500/10 cursor-pointer focus:bg-transparent transition-colors"
                    >
                      <LogOut className="h-4 w-4 shrink-0" />
                      Logout
                    </DropdownMenuItem>

                    {/* Theme toggle inside menu for smaller desktop screens */}
                    <DropdownMenuItem
                      className="min-[1100px]:hidden flex items-center justify-between px-3 py-2.5 rounded-[13px] text-[13px] font-semibold text-stone-600 dark:text-stone-300 focus:bg-transparent"
                    >
                      <div className="flex items-center gap-2.5">
                        <Sun className="h-4 w-4 text-stone-400" />
                        Night Mode
                      </div>
                      <ThemeToggle />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <GlassPill href="/login" className="px-4 py-2 text-[13px] font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:text-white dark:hover:text-white shrink-0 whitespace-nowrap">
                    Log In
                  </GlassPill>
                  <Link
                    href="/register"
                    className="px-5 py-2.5 rounded-full text-[12px] font-black capitalize tracking-widest text-orange-600 transition-all active:scale-95 shrink-0 whitespace-nowrap"
                    style={{
                      background: "rgba(251,146,60,0.12)",
                      backdropFilter: "blur(20px) saturate(160%)",
                      WebkitBackdropFilter: "blur(20px) saturate(160%)",
                      border: "1px solid rgba(251,146,60,0.35)",
                      boxShadow: "0 2px 10px rgba(249,115,22,0.10), inset 0 1px 0 rgba(255,255,255,0.05)",
                    }}
                  >
                    Join Free
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <GlassCircle className="md:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5 text-stone-900 dark:text-stone-300" />
            </GlassCircle>
          </div>
        </div>
      </div>

      {/* MOBILE DRAWER — dark liquid glass */}
      {portalReady && createPortal(
        <AnimatePresence>
          {mobileOpen && (
            <>
              {/* Backdrop blur scrim */}
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
                className="fixed inset-0 z-[9998] pointer-events-auto"
                style={{
                  background: "rgba(0,0,0,0.40)",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                }}
              />

              {/* Drawer */}
              <motion.div
                key="drawer"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 220 }}
                className="fixed inset-y-0 right-0 w-full z-[9999] flex flex-col pointer-events-auto overflow-hidden"
                style={{
                  background: "var(--color-surface)",
                  backdropFilter: "blur(60px) saturate(200%)",
                  WebkitBackdropFilter: "blur(60px) saturate(200%)",
                  borderLeft: "1px solid var(--color-border)",
                  boxShadow: "-15px 0 50px rgba(0,0,0,0.4)",
                }}
              >
                {/* Background Decor â€” Cyber Mesh */}
                <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
                  <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-orange-500/30 blur-[100px]" />
                  <div className="absolute top-[40%] -right-[20%] w-[60%] h-[60%] rounded-full bg-purple-600/20 blur-[120px]" />
                  <div className="absolute -bottom-[10%] left-[20%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[90px]" />
                </div>

                <SpecularLine />
                <div className="pointer-events-none absolute inset-y-0 left-0 w-px z-10 bg-gradient-to-b from-white/10 via-white/5 to-transparent" />
                <SpecularSweep />

                {/* Drawer header */}
                <div className="flex items-center justify-between px-7 py-5 shrink-0 relative z-20"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-orange-500 to-orange-400 flex items-center justify-center shadow-[0_4px_12px_rgba(249,115,22,0.3)]">
                      <Zap className="h-5 w-5 text-white fill-white/20" />
                    </div>
                    <Image src="/jimvio-logo.png" alt="Jimvio" width={100} height={28}
                      className="h-6 w-auto object-contain brightness-125 contrast-125" priority />
                  </Link>
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl transition-all active:scale-[0.85] bg-zinc-900/5 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-white/60 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-900/10 dark:hover:bg-white/10"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-8 space-y-8"
                  style={{ scrollbarWidth: "none" }}>

                  {/* USER GEAR - Premium Spotlight Card */}
                  {user && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="relative p-5 rounded-[28px] overflow-hidden group shadow-2xl"
                      style={{
                        background: "var(--color-surface-secondary)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-purple-500/10 opacity-50" />
                      <SpecularSweep />
                      <div className="flex items-center gap-4 relative z-10">
                        <Avatar className="h-14 w-14 ring-4 ring-white/10 shadow-lg shrink-0">
                          <AvatarImage src={user.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-lg font-black italic">
                            {user.full_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[17px] font-black tracking-tight text-zinc-900 dark:text-white leading-tight">{user.full_name}</h4>
                          <p className="text-[11px] font-bold text-zinc-500 dark:text-white/30 capitalize tracking-widest mt-0.5">{user.email}</p>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-2 relative z-10">
                        <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-zinc-900/5 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-[11px] font-black capitalize tracking-widest text-zinc-700 dark:text-white/70 hover:bg-zinc-900/10 dark:hover:bg-white/10 transition-colors">
                          <LayoutDashboard className="h-3.5 w-3.5 text-orange-500" />
                          Dash
                        </Link>
                        <Link href="/dashboard/settings" onClick={() => setMobileOpen(false)} className="flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-zinc-900/5 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-[11px] font-black capitalize tracking-widest text-zinc-700 dark:text-white/70 hover:bg-zinc-900/10 dark:hover:bg-white/10 transition-colors">
                          <Settings className="h-3.5 w-3.5 text-blue-400" />
                          Account
                        </Link>
                      </div>
                    </motion.div>
                  )}

                  {/* Mobile search - Premium Glass Wrapper */}
                  <div className="relative group px-1">
                    <div className="absolute -inset-1.5 bg-gradient-to-r from-orange-500/30 via-blue-500/20 to-orange-500/30 rounded-[28px] blur-2xl opacity-0 group-focus-within:opacity-100 transition-all duration-700" />
                    <div className="relative bg-white/60 dark:bg-stone-900/40 backdrop-blur-xl border border-zinc-200 dark:border-white/15 rounded-[22px] p-1.5 shadow-xl overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
                      <NavbarSearch searchQ={searchQ} setSearchQ={setSearchQ}
                        placeholder={marketing.search_placeholder ?? "What are you looking for?..."}
                        isScrolled={scrolled} variant="mobile" runSearch={runSearch} navLinks={navLinks} />
                    </div>
                  </div>

                  {/* Localize & Currency */}
                  <div className="grid grid-cols-1 gap-3">
                    <div className="bg-zinc-900/5 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 rounded-[22px] p-3 shadow-inner">
                      <CurrencyConverterWidget variant="compact" className="mx-0" />
                    </div>
                  </div>

                  {/* Theme toggle mobile */}
                  <div className="mb-3 flex items-center justify-between px-4 py-3 rounded-[20px] bg-surface/10 dark:bg-surface/5 border border-border shadow-sm">
                    <div className="flex items-center gap-3">
                      <Sun className="h-5 w-5 text-stone-400 dark:text-stone-400" />
                      <span className="text-[14px] font-semibold text-stone-900 dark:text-white/70">Theme Mode</span>
                    </div>
                    <ThemeToggle />
                  </div>

                  {/* AI mode CTA — orange glass */}
                  <button
                    onClick={() => { openAssistant(); setMobileOpen(false); }}
                    className="w-full flex items-center justify-between gap-3 px-6 py-5 rounded-[24px] transition-all active:scale-[0.96] mb-1 group relative overflow-hidden"
                    style={{
                      background: "rgba(255,184,108,0.08)",
                      border: "1px solid rgba(255,184,108,0.2)",
                      boxShadow: "0 8px 32px rgba(249,115,22,0.1), inset 0 1px 0 rgba(255,255,255,0.05)",
                    }}
                  >
                    <SpecularSweep />
                    <div className="flex items-center gap-3.5 relative z-10">
                      <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.4)]">
                        <Sparkles className="h-5 w-5 fill-white stroke-none" />
                      </div>
                      <div className="text-left">
                        <span className="block text-[13px] font-black capitalize tracking-[0.15em] text-orange-500 leading-none">AI Assistant</span>
                        <span className="text-[10px] font-bold dark:text-orange-500/50 capitalize tracking-widest">Ask anything...</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-orange-500/60 transition-transform group-hover:translate-x-1" />
                  </button>


                  {/* Nav links */}
                  <div className="pt-4 space-y-4">
                    <h5 className="text-[11px] font-black capitalize tracking-[0.3em] text-orange-500/80 px-5 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                      Explore Jimvio
                    </h5>
                    <div className="grid grid-cols-2 gap-2 px-1">
                      {drawerLinks.map(item => (
                        <DrawerLink
                          key={item.href}
                          href={item.href}
                          label={item.label}
                          icon={<item.icon className="h-4 w-4" />}
                          active={isActive(pathname, item.href)}
                          onClick={() => setMobileOpen(false)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Help & Support */}
                  <div className="pt-6 pb-20 space-y-3">
                    <h5 className="text-[11px] font-black capitalize tracking-[0.3em] text-blue-500/80 px-5 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                      Platform
                    </h5>
                    <div className="px-2">
                      <DrawerLink href="/help" label="Help center"
                        icon={<HelpCircle className="h-5 w-5" />}
                        active={false} onClick={() => setMobileOpen(false)} />
                    </div>
                  </div>
                </div>

                {/* Footer — user identity */}
                <div
                  className="shrink-0 px-3 py-3"
                  style={{ borderTop: "1px solid var(--color-border)", background: "var(--color-surface-secondary)" }}
                >
                  {user ? (
                    <div className="flex items-center gap-3 p-3 rounded-[20px]"
                      style={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                      }}>
                      <Avatar className="h-9 w-9 ring-2 ring-white/15 shrink-0">
                        <AvatarImage src={user.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-[12px] font-bold capitalize">
                          {user.full_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-zinc-900 dark:text-white/85 truncate">{user.full_name}</p>
                        <p className="text-[10px] text-zinc-500 dark:text-white/30 truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={async () => { await signOut(); window.location.href = "/"; }}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all active:scale-90"
                        style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}
                      >
                        <LogOut className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <Link href="/login" onClick={() => setMobileOpen(false)}
                        className="h-12 rounded-full flex items-center justify-center text-[13px] font-bold text-white/60 transition-all active:scale-95 bg-white/5 border border-white/10">
                        Log In
                      </Link>
                      <Link href="/register" onClick={() => setMobileOpen(false)}
                        className="h-12 rounded-full flex items-center justify-center text-[12px] font-black capitalize tracking-widest text-primary transition-all hover:scale-[1.02] active:scale-95"
                        style={{
                          background: "rgba(255,184,108,0.12)",
                          backdropFilter: "blur(20px) saturate(160%)",
                          WebkitBackdropFilter: "blur(20px) saturate(160%)",
                          border: "1px solid rgba(255,184,108,0.3)",
                          boxShadow: "0 2px 10px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)",
                        }}>
                        Join Free
                      </Link>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* MOBILE BOTTOM NAVIGATION PILL */}
      <div className="md:hidden fixed bottom-6 inset-x-4 z-[100] h-[72px] pointer-events-none">
        <motion.nav
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="h-full bg-white dark:bg-stone-900/85 backdrop-blur-3xl border border-white/10 rounded-[36px] flex items-center px-4 shadow-[0_25px_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] pointer-events-auto overflow-hidden relative"
        >
          {/* Internal gloss overlay */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/5 to-transparent" />

          {mobileBottomLinks.map(link => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative flex flex-col items-center justify-center flex-1 h-[85%] gap-1 transition-all duration-500 rounded-[28px]",
                  active ? "text-orange-500 bg-orange-500/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" : "text-zinc-700 hover:text-orange-500 dark:text-white/30 dark:hover:text-white/50 "
                )}
              >
                <link.icon className={cn("h-6 w-6 transition-transform duration-500", active ? "scale-110 dark:drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]" : "scale-100")} />
                <span className={cn("text-[9px] font-black capitalize tracking-[0.15em] transition-all", active ? "opacity-100" : "opacity-60")}>
                  {link.label}
                </span>
                {active && (
                  <motion.div
                    layoutId="mobile-pill-active"
                    className="absolute -bottom-2 h-1.5 w-8 rounded-full bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,1)]"
                  />
                )}
              </Link>
            );
          })}

          <button
            onClick={() => setMobileOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-[85%] gap-1 text-zinc-700 hover:text-orange-500 dark:text-white/30 dark:hover:text-white/70 transition-all duration-500 relative group"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-[8px] opacity-0 group-active:opacity-100 transition-opacity" />
              <Menu className="h-6 w-6 stroke-[1.5px] relative z-10" />
              <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-gradient-to-tr from-orange-600 to-orange-400 border-2 border-[#151515] shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
            </div>
            <span className="text-[9px] font-black capitalize tracking-[0.15em] opacity-60">Menu</span>
          </button>
        </motion.nav>
      </div>
    </header>
  );
}

/* --- Drawer nav link --- */
function DrawerLink({
  href, label, icon, active, onClick,
}: {
  href: string; label: string; icon: React.ReactNode; active: boolean; onClick: () => void;
}) {
  const isBlue = label.toLowerCase().includes("platform") || label.toLowerCase().includes("center");
  const colorClass = isBlue ? "blue" : "orange";

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 p-3 rounded-[24px] transition-all duration-500 active:scale-[0.9] group relative overflow-hidden",
        active
          ? `bg-${colorClass}-600/10 border border-${colorClass}-500/25 shadow-sm`
          : "bg-white/[0.04] dark:bg-stone-900/40 border border-zinc-200 dark:border-white/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
      )}
      style={{
        boxShadow: active
          ? isBlue ? "0 12px 40px rgba(59,130,246,0.15), inset 0 1px 0 rgba(255,255,255,0.05)" : "0 12px 40px rgba(249,115,22,0.15), inset 0 1px 0 rgba(255,255,255,0.05)"
          : "none",
      }}
    >
      <SpecularSweep />

      {/* Icon bubble */}
      <div
        className={cn(
          "flex items-center justify-center h-12 w-12 rounded-[18px] shrink-0 transition-all duration-500 group-hover:scale-110 shadow-xl relative",
          active
            ? isBlue ? "bg-blue-500 shadow-blue-500/30" : "bg-orange-500 shadow-orange-500/30"
            : "bg-white/[0.08] dark:bg-white/[0.03] border border-white/10"
        )}
      >
        {active && <div className="absolute inset-0 rounded-[18px] bg-white/20 animate-pulse" />}
        <div className={cn("transition-all duration-500 relative z-10", active ? "text-white dark:drop-shadow-md scale-110" : "text-zinc-500 dark:text-white/40 group-hover:text-zinc-900 dark:group-hover:text-white")}>
          {icon}
        </div>
      </div>

      <span className={cn(
        "text-[12px] font-black tracking-[0.05em] transition-all duration-300",
        active
          ? isBlue ? "text-blue-500" : "text-orange-500"
          : "text-zinc-500 dark:text-white/70 group-hover:text-zinc-900 dark:group-hover:text-white"
      )}>
        {label}
      </span>
    </Link>
  );
}
