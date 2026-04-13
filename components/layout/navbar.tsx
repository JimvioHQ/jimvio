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
  ChevronRight, Sparkles, Zap, Play, Megaphone, Clapperboard,
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
import type { MarketingSettings, NavLinkConfig } from "@/lib/platform-settings-shared";
import { NavbarSearch } from "@/components/layout/navbar-search";
import { CurrencySelector } from "@/context/CurrencyContext";
import { CurrencyConverterWidget } from "@/components/shared/currency-converter-widget";

/* ─────────────────────────────────────────────────────────
   iPhone 17 Liquid Glass Design Tokens
   ───────────────────────────────────────────────────────── */

/** Light mode navbar — like iOS Control Centre: frosted white over light bg */
const GLASS_LIGHT = {
  body: "rgba(255,255,255,0.68)",
  border: "rgba(255,255,255,0.90)",
  blur: "blur(48px) saturate(200%) brightness(106%)",
  shadow: "0 8px 32px rgba(0,0,0,0.09), inset 0 1px 0 rgba(255,255,255,1), inset 0 -1px 0 rgba(255,255,255,0.35)",
  shadowDeep: "0 24px 64px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,1)",
};

/** Dark glass — for dropdowns and mobile drawer over blurred backdrop */
const GLASS_DARK = {
  /**Make it light not dark */
  body: "rgba(255,255,255,0.68)",
  border: "rgba(255,255,255,0.90)",
  blur: "blur(48px) saturate(160%)",
  shadow: "0 24px 64px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.10)",
};

/* Specular line — the 1px bright edge every glass element has */
function SpecularLine({ rounded = false }: { rounded?: boolean }) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-x-0 top-0 h-px z-10", rounded && "rounded-t-[inherit]")}
      style={{ background: "linear-gradient(90deg,transparent 5%,rgba(255,255,255,0.85) 40%,rgba(255,255,255,0.55) 60%,transparent 95%)" }}
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
          background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 55%)",
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
      background: "rgba(251,146,60,0.12)",
      backdropFilter: "blur(24px) saturate(160%)",
      WebkitBackdropFilter: "blur(24px) saturate(160%)",
      border: "1px solid rgba(251,146,60,0.35)",
      boxShadow: "0 2px 10px rgba(249,115,22,0.12), inset 0 1px 0 rgba(255,255,255,0.7)",
      color: "#ea580c",
    }
    : orange
      ? {
        background: "rgba(255,237,213,0.65)",
        backdropFilter: "blur(24px) saturate(160%)",
        WebkitBackdropFilter: "blur(24px) saturate(160%)",
        border: "1px solid rgba(251,146,60,0.30)",
        boxShadow: "0 2px 12px rgba(249,115,22,0.10), inset 0 1px 0 rgba(255,255,255,0.8)",
        color: "#c2410c",
      }
      : {
        background: GLASS_LIGHT.body,
        backdropFilter: GLASS_LIGHT.blur,
        WebkitBackdropFilter: GLASS_LIGHT.blur,
        border: `1px solid ${GLASS_LIGHT.border}`,
        boxShadow: "0 2px 10px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1)",
        color: "#44403c",
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
    boxShadow: "0 2px 10px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1)",
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

/* ─── helpers ─── */

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

/* ─── Main Navbar ─── */

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

  const mobileLinks = [
    { label: "Home", href: "/", icon: Home },
    { label: "Marketplace", href: "/marketplace", icon: ShoppingBag },
    { label: "Videos", href: "/shorts", icon: Clapperboard },
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

  /* ── Navbar shell glass styles (light mode, changes on scroll) ── */
  const shellStyle: React.CSSProperties = {
    background: scrolled ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.65)",
    backdropFilter: GLASS_LIGHT.blur,
    WebkitBackdropFilter: GLASS_LIGHT.blur,
    borderBottom: "1px solid rgba(255,255,255,0.70)",
    borderTop: scrolled ? "1px solid rgba(255,255,255,0.90)" : "none",
    borderLeft: scrolled ? "1px solid rgba(255,255,255,0.88)" : "none",
    borderRight: scrolled ? "1px solid rgba(255,255,255,0.88)" : "none",
    boxShadow: scrolled
      ? "0 16px 56px rgba(0,0,0,0.11), inset 0 1px 0 rgba(255,255,255,1), inset 0 -1px 0 rgba(255,255,255,0.4)"
      : "0 2px 16px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.9)",
  };

  return (
    <header className={cn(
      "fixed top-0 inset-x-0 z-[100] pointer-events-none transition-all duration-500",
      "px-0 pt-0"
    )}>
      <div className="pointer-events-auto relative w-full mx-auto transition-all duration-500 flex flex-col"
        style={shellStyle}
      >
        {/* ── Specular glass edges ── */}
        <SpecularLine rounded={scrolled} />
        <SpecularSweep />

        {/* ── Desktop top strip ── */}
        <motion.div
          style={{ height: topBarH, opacity: topBarOpacity, overflow: "hidden" }}
          className="hidden md:flex items-center justify-between px-8 md:px-12 shrink-0 border-b border-white/40"
        >
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5 text-[9px] font-semibold text-stone-400 tracking-widest uppercase">
              <Globe className="h-3 w-3 text-orange-500" />
              {(marketing.locale_strip?.trim() || "EN · USD")}
            </span>
            <CurrencySelector className="h-5 bg-transparent border-0 px-1 text-[10px] font-semibold text-stone-400 hover:text-stone-700 transition-colors" />
          </div>
          <div className="flex items-center gap-5">
            <Link href="/help" className="text-[9px] font-semibold tracking-widest text-stone-400 hover:text-orange-500 transition-colors uppercase">Help center</Link>
            <Link href="/vendors" className="text-[9px] font-semibold tracking-widest text-stone-400 hover:text-stone-700 transition-colors uppercase">Suppliers</Link>
          </div>
        </motion.div>

        {/* ── Main bar ── */}
        <div className="flex items-center h-14 md:h-[62px] px-3 sm:px-5 md:px-8 gap-2 md:gap-4">

          {/* Logo */}
          <Link href="/" className="shrink-0 mr-1 transition-transform active:scale-95">
            <Image src="/jimvio-logo.png" alt="Jimvio" width={130} height={36}
              className="h-7 sm:h-8 w-auto object-contain" priority />
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
                  <GlassPill className="px-3.5 py-2 text-[13px] font-semibold text-stone-600 hover:text-stone-900 group">
                    <Globe className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                    Explore
                    <ChevronDown className={cn("h-3 w-3 text-stone-400 transition-transform duration-300", exploreOpen && "rotate-180")} />
                  </GlassPill>
                </DropdownMenuTrigger>

                {/* Dark glass dropdown */}
                <DropdownMenuContent
                  onMouseEnter={() => { if (exploreTimer.current) clearTimeout(exploreTimer.current); setExploreOpen(true); }}
                  onMouseLeave={() => { exploreTimer.current = setTimeout(() => setExploreOpen(false), 140); }}
                  sideOffset={10}
                  className="w-72 p-2 rounded-[24px] border border-white/60 outline-none overflow-hidden"
                  style={{
                    background: "rgba(255,255,255,0.85)",
                    backdropFilter: "blur(40px) saturate(180%)",
                    WebkitBackdropFilter: "blur(40px) saturate(180%)",
                    boxShadow: "0 20px 50px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,1)",
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
                          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)";
                          (e.currentTarget as HTMLElement).style.border = "1px solid rgba(255,255,255,0.10)";
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
                            background: "rgba(249,115,22,0.06)",
                            border: "1px solid rgba(249,115,22,0.12)",
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
                            color: s.color,
                          }}
                        >
                          <s.icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-stone-800 leading-none mb-0.5">{s.title}</p>
                          <p className="text-[11px] text-stone-400 truncate">{s.desc}</p>
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
                  <Icon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-orange-500" : "text-stone-400 group-hover:text-stone-600")} />
                  <span className={active ? "text-orange-700" : "text-stone-600 group-hover:text-stone-900"}>{item.label}</span>
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
            <GlassPill orange className="hidden sm:flex shrink-0 whitespace-nowrap px-4 py-2 text-[12px] font-semibold"
              onClick={() => openAssistant()}>
              <Sparkles className="h-3.5 w-3.5 fill-orange-500 stroke-none" />
              <span className="uppercase tracking-tight">AI Mode</span>
            </GlassPill>
            <GlassCircle className="sm:hidden" onClick={() => openAssistant()}
              style={{ background: "rgba(255,237,213,0.65)", border: "1px solid rgba(251,146,60,0.30)" }}>
              <Sparkles className="h-4 w-4 fill-orange-500 stroke-none" />
            </GlassCircle>

            {/* Messages */}
            <GlassCircle href="/dashboard/messages" badge={chatCount} className="hidden sm:flex">
              <MessageCircle className="h-[18px] w-[18px] text-stone-600" />
            </GlassCircle>

            {/* Cart */}
            <GlassCircle href="/cart" badge={cartCount}>
              <ShoppingCart className="h-[18px] w-[18px] text-stone-600" />
            </GlassCircle>

            {/* Divider */}
            <div className="hidden lg:block h-6 w-px mx-1"
              style={{ background: "rgba(255,255,255,0.7)", boxShadow: "1px 0 0 rgba(0,0,0,0.04)" }} />

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
                        border: `1px solid ${GLASS_LIGHT.border}`,
                        boxShadow: "0 4px 14px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,1)",
                      }}
                    >
                      <SpecularSweep />
                      <Avatar className="h-7 w-7 ring-2 ring-white/80 shadow-sm shrink-0">
                        <AvatarImage src={user.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-[10px] font-bold uppercase">
                          {user.full_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden xl:block text-[13px] font-semibold text-stone-800 max-w-[110px] truncate">
                        {user.full_name?.split(" ")[0]}
                      </span>
                      <ChevronDown className="hidden xl:block h-3 w-3 text-stone-400" />
                    </button>
                  </DropdownMenuTrigger>

                  {/* Dark glass user dropdown */}
                  <DropdownMenuContent
                    align="end"
                    className="w-60 p-2 mt-2 rounded-[28px] border border-white/60 outline-none overflow-hidden"
                    style={{
                      background: "rgba(255,255,255,0.85)",
                      backdropFilter: "blur(40px) saturate(180%)",
                      WebkitBackdropFilter: "blur(40px) saturate(180%)",
                      boxShadow: "0 20px 50px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,1)",
                    }}
                  >
                    <SpecularLine rounded />
                    <SpecularSweep />

                    <div className="px-3 py-3 rounded-[20px] mb-2"
                      style={{
                        background: "rgba(249,115,22,0.05)",
                        border: "1px solid rgba(249,115,22,0.10)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
                      }}>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8 ring-2 ring-white shrink-0">
                          <AvatarImage src={user.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-[10px] font-bold uppercase">
                            {user.full_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-stone-900 truncate leading-tight">{user.full_name}</p>
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
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-[13px] text-[13px] font-semibold text-stone-600 hover:text-stone-900 transition-colors"
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.03)"}
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
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-[13px] text-[13px] font-semibold text-red-400 hover:text-red-300 cursor-pointer focus:bg-transparent"
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.10)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}
                    >
                      <LogOut className="h-4 w-4 shrink-0" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <GlassPill href="/login" className="px-4 py-2 text-[13px] font-semibold text-stone-600 hover:text-stone-900 shrink-0 whitespace-nowrap">
                    Log In
                  </GlassPill>
                  <Link
                    href="/register"
                    className="px-5 py-2.5 rounded-full text-[12px] font-black uppercase tracking-widest text-orange-600 transition-all active:scale-95 shrink-0 whitespace-nowrap"
                    style={{
                      background: "rgba(251,146,60,0.12)",
                      backdropFilter: "blur(20px) saturate(160%)",
                      WebkitBackdropFilter: "blur(20px) saturate(160%)",
                      border: "1px solid rgba(251,146,60,0.35)",
                      boxShadow: "0 2px 10px rgba(249,115,22,0.10), inset 0 1px 0 rgba(255,255,255,0.9)",
                    }}
                  >
                    Join Free
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <GlassCircle className="md:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5 text-stone-700" />
            </GlassCircle>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          MOBILE DRAWER — dark liquid glass
          ════════════════════════════════════════ */}
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
                initial={{ x: "100%", opacity: 0.6 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 32, stiffness: 300 }}
                className="fixed inset-y-0 right-0 w-full z-[9999] flex flex-col pointer-events-auto overflow-hidden"
                style={{
                  background: GLASS_DARK.body,
                  backdropFilter: "blur(52px) saturate(160%)",
                  WebkitBackdropFilter: "blur(52px) saturate(160%)",
                  borderLeft: `1px solid ${GLASS_DARK.border}`,
                  boxShadow: "-8px 0 60px rgba(0,0,0,0.50)",
                }}
              >
                <SpecularLine />
                {/* Full-height left specular edge */}
                <div className="pointer-events-none absolute inset-y-0 left-0 w-px z-10"
                  style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 40%, transparent 80%)" }} />
                <SpecularSweep />

                {/* Drawer header */}
                <div className="flex items-center justify-between px-4 py-3 shrink-0"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <Link href="/" onClick={() => setMobileOpen(false)}>
                    <Image src="/jimvio-logo.png" alt="Jimvio" width={100} height={28}
                      className="h-6 w-auto object-contain" priority />
                  </Link>
                  <div className="flex items-center gap-2">
                    {/* Cart + messages in drawer header */}
                    <button onClick={() => { router.push("/cart"); setMobileOpen(false); }}
                      className="relative flex items-center justify-center h-10 w-10 rounded-full transition-all active:scale-90"
                      style={{ background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.35)" }}>
                      <ShoppingCart className="h-4 w-4 text-orange-600" />
                      {cartCount > 0 && <span className="absolute -top-1 -right-1 h-[17px] min-w-[17px] bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full ring-2 ring-white">{cartCount}</span>}
                    </button>
                    <button
                      onClick={() => setMobileOpen(false)}
                      className="flex h-10 w-10 items-center justify-center rounded-full transition-all active:scale-90"
                      style={{ background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.35)", color: "#ea580c" }}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-1.5"
                  style={{ scrollbarWidth: "none" }}>

                  {/* Mobile search */}
                  <div className="mb-3">
                    <NavbarSearch searchQ={searchQ} setSearchQ={setSearchQ}
                      placeholder={marketing.search_placeholder ?? "Search…"}
                      isScrolled={scrolled} variant="mobile" runSearch={runSearch} navLinks={navLinks} />
                  </div>

                  {/* Currency widget */}
                  <div className="mb-3">
                    <CurrencyConverterWidget variant="compact" className="mx-0" />
                  </div>

                  {/* AI mode CTA — orange glass */}
                  <button
                    onClick={() => { openAssistant(); setMobileOpen(false); }}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-[20px] transition-all active:scale-[0.98] mb-1"
                    style={{
                      background: "rgba(254,215,170,0.12)",
                      border: "1px solid rgba(251,146,60,0.25)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-5 w-5 fill-orange-400 stroke-none shrink-0" />
                      <span className="text-[14px] font-semibold text-orange-300">Launch AI Mode</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-orange-400/60" />
                  </button>

                  {/* Dashboard shortcut for logged-in users */}
                  {user && (
                    <DrawerLink
                      href="/dashboard" label="Dashboard"
                      icon={<LayoutDashboard className="h-4 w-4" />}
                      active={isActive(pathname, "/dashboard")}
                      onClick={() => setMobileOpen(false)}
                    />
                  )}

                  {/* Nav links */}
                  <div className="pt-1 space-y-1">
                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(0,0,0,0.42)", paddingLeft: 4, paddingBottom: 4 }}>
                      Navigate
                    </p>
                    {mobileLinks.map(item => (
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

                  {/* Help */}
                  <div className="pt-1 space-y-1">
                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(0,0,0,0.42)", paddingLeft: 4, paddingBottom: 4 }}>
                      More
                    </p>
                    <DrawerLink href="/help" label="Help center"
                      icon={<HelpCircle className="h-4 w-4" />}
                      active={false} onClick={() => setMobileOpen(false)} />
                  </div>
                </div>

                {/* Footer — user identity */}
                <div
                  className="shrink-0 px-3 py-3"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
                >
                  {user ? (
                    <div className="flex items-center gap-3 p-3 rounded-[20px]"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.10)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
                      }}>
                      <Avatar className="h-9 w-9 ring-2 ring-white/15 shrink-0">
                        <AvatarImage src={user.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-[12px] font-bold uppercase">
                          {user.full_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-white/85 truncate">{user.full_name}</p>
                        <p className="text-[10px] text-white/30 truncate">{user.email}</p>
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
                    <div className="grid grid-cols-2 gap-2.5">
                      <Link href="/login" onClick={() => setMobileOpen(false)}
                        className="h-12 rounded-full flex items-center justify-center text-[14px] font-semibold text-white/70 transition-all active:scale-95"
                        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)" }}>
                        Log In
                      </Link>
                      <Link href="/register" onClick={() => setMobileOpen(false)}
                        className="h-12 rounded-full flex items-center justify-center text-[12px] font-black uppercase tracking-widest text-orange-600 transition-all hover:scale-[1.02] active:scale-95"
                        style={{
                          background: "rgba(251,146,60,0.12)",
                          backdropFilter: "blur(20px) saturate(160%)",
                          WebkitBackdropFilter: "blur(20px) saturate(160%)",
                          border: "1px solid rgba(251,146,60,0.35)",
                          boxShadow: "0 2px 10px rgba(249,115,22,0.10), inset 0 1px 0 rgba(255,255,255,0.9)",
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
    </header>
  );
}

/* ─── Drawer nav link ─── */
function DrawerLink({
  href, label, icon, active, onClick,
}: {
  href: string; label: string; icon: React.ReactNode; active: boolean; onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-3.5 py-3 rounded-[18px] transition-all active:scale-[0.98]"
      style={active ? {
        background: "rgba(251,146,60,0.12)",
        border: "1px solid rgba(251,146,60,0.25)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
      } : {
        background: "rgba(0,0,0,0.03)",
        border: "1px solid transparent",
      }}
      onMouseEnter={e => !active && ((e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.05)")}
      onMouseLeave={e => !active && ((e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.03)")}
    >
      {/* Icon bubble */}
      <span
        className="flex items-center justify-center h-9 w-9 rounded-[13px] shrink-0"
        style={{
          background: active ? "rgba(251,146,60,0.18)" : "rgba(0,0,0,0.04)",
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
          color: active ? "#ea580c" : "rgba(0,0,0,0.45)",
        }}
      >
        {icon}
      </span>
      <span className="text-[14px] font-bold flex-1"
        style={{ color: active ? "#c2410c" : "#44403c" }}>
        {label}
      </span>
      {active && <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" style={{ boxShadow: "0 0 6px rgba(249,115,22,0.8)" }} />}
    </Link>
  );
}