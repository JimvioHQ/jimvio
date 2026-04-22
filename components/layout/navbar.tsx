"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  User, ShoppingCart, MessageCircle, Menu, X, Globe, CircleHelp,
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

/** Standard Professional Design Tokens — solid surfaces, high trust */
const GLASS_LIGHT = {
  body: "var(--color-surface)",
  border: "var(--color-border)",
  blur: "none",
  shadow: "var(--shadow-none)",
};

const GLASS_DARK = {
  body: "var(--color-surface)",
  border: "var(--color-border)",
  blur: "none",
  shadow: "var(--shadow-none)",
};

/* Specular line — the 1px bright edge every glass element has */
function SpecularLine({ rounded = false }: { rounded?: boolean }) { return null; }

/* Diagonal specular sweep — adds depth */
function SpecularSweep() { return null; }

/* Console Link/Button — strictly sharp Shopify aesthetics */
const ConsoleButton = React.forwardRef<any, {
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
  const cls = cn(
    "relative inline-flex items-center gap-2 px-3.5 py-2 rounded-none text-[13px] font-bold tracking-tight transition-all duration-150 active:scale-[0.98] select-none border",
    active 
      ? "bg-stone-100 dark:bg-white/5 border-stone-200 dark:border-white/10 text-orange-600"
      : orange
        ? "bg-orange-500 border-orange-600 text-white hover:bg-orange-600"
        : "bg-surface border-border text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-white/5",
    className
  );

  if (href) return (
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

/* Standard icon button used in Whop/Shopify bars */
const ConsoleIconBtn = React.forwardRef<any, {
  children: React.ReactNode; href?: string; onClick?: () => void;
  badge?: number; className?: string; style?: React.CSSProperties;
  [key: string]: any;
}>(({
  children, href, onClick, badge, className, style, ...props
}, ref) => {
  const cls = cn(
    "relative flex items-center justify-center h-10 w-10 shrink-0 rounded-none border border-border bg-surface text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-white/5 transition-all duration-200 active:scale-[0.95]",
    className,
  );

  const inner = (
    <>
      {children}
      {badge != null && badge > 0 && (
        <span className="absolute top-1.5 right-1.5 h-4 min-w-[16px] px-1 bg-orange-500 text-white text-[9px] font-black flex items-center justify-center rounded-none ring-1 ring-white dark:ring-stone-900 z-20">
          {badge}
        </span>
      )}
    </>
  );

  if (href) return <Link href={href} className={cls} style={style} ref={ref} {...props}>{inner}</Link>;
  return <button type="button" onClick={onClick} className={cls} style={style} ref={ref} {...props}>{inner}</button>;
});
ConsoleIconBtn.displayName = "ConsoleIconBtn";

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
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const exploreTimer = useRef<NodeJS.Timeout | null>(null);
  const marketplaceTimer = useRef<NodeJS.Timeout | null>(null);

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

  const marketplaceVariants = [
    { title: "Digital Market", desc: "Software, courses & assets", href: "/marketplace?type=digital", icon: Zap, color: "rgba(14,165,233,0.8)" },
    { title: "Physical Marketplace", desc: "Real-world goods & equipment", href: "/marketplace?type=physical", icon: Package, color: "rgba(245,158,11,0.8)" },
    { title: "All Type Market", desc: "Complete global catalog", href: "/marketplace", icon: ShoppingBag, color: "rgba(249,115,22,0.8)" },
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
  ];

  const categories = [
    { label: "Communities", href: "/communities", icon: Users },
  ];

  const runSearch = useCallback((override?: string) => {
    const t = (override ?? searchQ).trim();
    const qs = t ? `?q=${encodeURIComponent(t)}` : "";
    router.push(`/marketplace${qs}`);
    setMobileOpen(false);
  }, [router, searchQ]);

  /* --- Navbar shell glass styles (always applies) --- */
  const shellStyle: React.CSSProperties = {
    borderBottom: "1px solid var(--color-border)",
    boxShadow: scrolled ? "var(--shadow-none)" : "none",
  };

  return (
    <header className={cn(
      "fixed top-0 inset-x-0 z-[100] pointer-events-none transition-all duration-500",
      "px-0 pt-0"
    )}>
      <div className="pointer-events-auto relative w-full mx-auto transition-all duration-500 flex flex-col bg-[var(--color-surface)]"
        style={{
          ...shellStyle,
          borderBottom: scrolled ? "1px solid var(--color-border)" : "1px solid transparent",
        }}
      >
        {/* Top-down structure for professional layout */}

        {/* Top Strip — Minimal Shopify Info Bar */}
        <motion.div
          style={{ height: topBarH, opacity: topBarOpacity, overflow: "hidden" }}
          className="hidden md:flex items-center justify-between px-8 shrink-0 bg-stone-50 dark:bg-black/20 border-b border-border"
        >
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-stone-500 uppercase tracking-tight">
              <Globe className="h-3 w-3 text-orange-500" />
              <span>Global Sourcing Network</span>
            </div>
            <CurrencySelector className="h-5 bg-transparent border-0 px-0 text-[10px] font-bold text-stone-500 hover:text-stone-800 transition-colors" />
          </div>
          <div className="flex items-center gap-6">
            <Link href="/help" className="text-[10px] font-bold text-stone-500 hover:text-orange-600 transition-colors uppercase">Support</Link>
            <div className="h-3 w-px bg-border" />
            <Link href="/vendors" className="text-[10px] font-bold text-stone-500 hover:text-stone-800 transition-colors uppercase">Sell on Jimvio</Link>
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
                  <ConsoleButton className="px-3.5 py-2 group">
                    <Globe className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                    Explore
                    <ChevronDown className={cn("h-3 w-3 text-stone-400 dark:text-stone-600 transition-transform duration-300", exploreOpen && "rotate-180")} />
                  </ConsoleButton>
                </DropdownMenuTrigger>

                {/* Dark glass dropdown */}
                <DropdownMenuContent
                  onMouseEnter={() => { if (exploreTimer.current) clearTimeout(exploreTimer.current); setExploreOpen(true); }}
                  onMouseLeave={() => { exploreTimer.current = setTimeout(() => setExploreOpen(false), 140); }}
                  sideOffset={4}
                  className="w-72 p-1.5 rounded-none border border-border shadow-none bg-surface"
                >
                  {solutions.map(s => (
                    <DropdownMenuItem key={s.href} asChild className="p-0 focus:bg-transparent">
                      <Link
                        href={s.href}
                        className="relative flex items-center gap-3 p-3 rounded-none group/item transition-all hover:bg-stone-50 dark:hover:bg-white/5"
                        style={{ outline: "none" }}
                      >
                        {/* Standard Structured Icon Box */}
                        <div
                          className="h-9 w-9 rounded-none flex items-center justify-center shrink-0 bg-stone-50 dark:bg-stone-900 border border-stone-100 dark:border-stone-800"
                          style={{ color: s.color }}
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

            {/* Marketplace dropdown */}
            <div
              onMouseEnter={() => { if (marketplaceTimer.current) clearTimeout(marketplaceTimer.current); setMarketplaceOpen(true); }}
              onMouseLeave={() => { marketplaceTimer.current = setTimeout(() => setMarketplaceOpen(false), 140); }}
              className="relative"
            >
              <DropdownMenu open={marketplaceOpen} onOpenChange={setMarketplaceOpen} modal={false}>
                <DropdownMenuTrigger asChild>
                  <ConsoleButton className="px-3.5 py-2 group">
                    <ShoppingBag className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                    Marketplace
                    <ChevronDown className={cn("h-3 w-3 text-stone-400 dark:text-stone-600 transition-transform duration-300", marketplaceOpen && "rotate-180")} />
                  </ConsoleButton>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  onMouseEnter={() => { if (marketplaceTimer.current) clearTimeout(marketplaceTimer.current); setMarketplaceOpen(true); }}
                  onMouseLeave={() => { marketplaceTimer.current = setTimeout(() => setMarketplaceOpen(false), 140); }}
                  sideOffset={4}
                  className="w-72 p-1.5 rounded-none border border-border shadow-none bg-surface"
                >
                  {marketplaceVariants.map(v => (
                    <DropdownMenuItem key={v.href} asChild className="p-0 focus:bg-transparent rounded-none">
                      <Link
                        href={v.href}
                        className="relative flex items-center gap-3 p-3 rounded-none group/item transition-all hover:bg-stone-50 dark:hover:bg-white/5"
                        style={{ outline: "none" }}
                      >
                        <div
                          className="h-9 w-9 rounded-none flex items-center justify-center shrink-0 bg-stone-50 dark:bg-stone-900 border border-stone-100 dark:border-stone-800"
                          style={{ color: v.color }}
                        >
                          <v.icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-stone-800 dark:text-white leading-none mb-0.5">{v.title}</p>
                          <p className="text-[11px] text-stone-400 dark:text-white/40 truncate">{v.desc}</p>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {navLinks.filter(l => l.href !== "/marketplace").map(item => {
              const active = isActive(pathname, item.href);
              const Icon = iconForHref(item.href);
              return (
                <ConsoleButton key={item.href} href={item.href} active={active}
                  className="px-3.5 py-2 group">
                  <Icon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-orange-500" : "text-stone-400 group-hover:text-orange-600")} />
                  <span className={active ? "text-orange-700" : "text-stone-600 group-hover:text-orange-500 dark:text-white"}>{item.label}</span>
                </ConsoleButton>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">

            {/* Desktop search — collapses earlier to preserve space for auth */}
            <div className="hidden min-[1100px]:block max-w-[260px] w-full shrink min-w-0">
              <NavbarSearch searchQ={searchQ} setSearchQ={setSearchQ}
                placeholder={marketing.search_placeholder} isScrolled={scrolled}
                variant="desktop" runSearch={runSearch} navLinks={navLinks} />
            </div>

            {/* AI Mode — hide on smaller desktops */}
            <ConsoleButton orange className="hidden min-[1200px]:flex shrink-0 px-3.5 py-2 text-[11px] uppercase tracking-widest"
              onClick={() => openAssistant()}>
              <Sparkles className="h-3.5 w-3.5 fill-white stroke-none" />
              <span>AI</span>
            </ConsoleButton>

            {/* Messages */}
            {user && (
              <ConsoleIconBtn href="/dashboard/messages" badge={chatCount} className="flex">
                <MessageCircle className="h-[18px] w-[18px]" />
              </ConsoleIconBtn>
            )}

            {/* Cart */}
            <ConsoleIconBtn href="/cart" badge={cartCount}>
              <ShoppingCart className="h-[18px] w-[18px]" />
            </ConsoleIconBtn>

            {/* Theme Toggle */}
            <div className="hidden min-[1280px]:flex mr-0.5">
              <ThemeToggle />
            </div>

            {/* Divider */}
            <div className="hidden lg:block h-6 w-px mx-1 bg-border/40 shrink-0" />

            {/* User menu / Auth buttons */}
            <div className="hidden sm:flex items-center shrink-0">
              {user ? (
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="relative flex items-center justify-center p-0.5 h-9 w-9 rounded-full transition-all border border-border bg-surface shadow-sm active:scale-95 hover:border-orange-400"
                    >
                      <Avatar className="h-full w-full border border-border shrink-0">
                        <AvatarImage src={user.avatar_url ?? undefined} className="object-cover" />
                        <AvatarFallback className="bg-orange-100 text-orange-600 text-[10px] font-bold capitalize">
                          {user.full_name?.[0] || user.email?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>

                  {/* Dark glass user dropdown */}
                  <DropdownMenuContent
                    align="end"
                    className="w-60 p-1.5 mt-2 rounded-none border border-border bg-surface shadow-none outline-none"
                  >
                    <div className="px-3 py-3 rounded-none mb-1.5 bg-stone-50 dark:bg-stone-900 border border-border">
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
                      { href: "/dashboard/library", icon: Video, label: "Digital Library" },
                      { href: "/dashboard/settings", icon: Settings, label: "My Account" },
                    ].map(item => (
                      <DropdownMenuItem key={item.href} asChild
                        className="p-0 focus:bg-transparent rounded-none cursor-pointer">
                        <Link
                          href={item.href}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-none text-[13px] font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition-colors"
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--color-surface-secondary)"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}

                    <div className="h-px my-1 mx-1 bg-border/60" />

                    <DropdownMenuItem
                      onSelect={async () => { await signOut(); window.location.href = "/"; }}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-none text-[13px] font-semibold text-red-500 hover:bg-red-500/10 cursor-pointer focus:bg-transparent transition-colors"
                    >
                      <LogOut className="h-4 w-4 shrink-0" />
                      Logout
                    </DropdownMenuItem>

                    {/* Theme toggle inside menu for smaller desktop screens */}
                    <DropdownMenuItem
                      className="min-[1280px]:hidden flex items-center justify-between px-3 py-2.5 rounded-none text-[13px] font-semibold text-stone-600 dark:text-stone-300 focus:bg-transparent"
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
                  <Link
                    href="/login"
                    className="h-9 px-4 flex items-center text-[12px] font-bold text-stone-600 dark:text-stone-300 border border-border bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white transition-all whitespace-nowrap"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    className="h-9 px-4 flex items-center text-[12px] font-black uppercase tracking-widest bg-orange-500 text-white hover:bg-orange-600 transition-all active:scale-95 shrink-0 whitespace-nowrap"
                  >
                    Join Free
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <ConsoleIconBtn className="md:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </ConsoleIconBtn>
          </div>
        </div>
      </div>

      {/* MOBILE DRAWER — Premium Solid Theme */}
      {portalReady && createPortal(
        <MobileDrawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          user={user}
          pathname={pathname}
          marketing={marketing}
          searchQ={searchQ}
          setSearchQ={setSearchQ}
          runSearch={runSearch}
          navLinks={navLinks}
          solutions={solutions}
          marketplaceVariants={marketplaceVariants}
          scrolled={scrolled}
          openAssistant={openAssistant}
        />,
        document.body,
      )}

      {/* MOBILE BOTTOM NAVIGATION PILL */}
      <div className="md:hidden fixed bottom-6 inset-x-4 z-[100] h-[72px] pointer-events-none">
        <motion.nav
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="h-full bg-white dark:bg-stone-900 border border-border rounded-none flex items-center px-4 pointer-events-auto overflow-hidden relative shadow-none"
        >
          {mobileBottomLinks.map(link => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative flex flex-col items-center justify-center flex-1 h-[85%] gap-1 transition-all duration-300 rounded-none",
                  active ? "text-orange-500 bg-orange-500/5" : "text-stone-500 hover:text-orange-500 dark:text-stone-400 dark:hover:text-white"
                )}
              >
                <link.icon className={cn("h-5 w-5 transition-transform duration-300", active ? "scale-110" : "scale-100")} />
                <span className={cn("text-[9px] font-bold uppercase tracking-wider transition-all", active ? "opacity-100" : "opacity-60")}>
                  {link.label}
                </span>
                {active && (
                  <motion.div
                    layoutId="mobile-pill-active"
                    className="absolute -bottom-1.5 h-1 w-6 rounded-none bg-orange-500 shadow-none shadow-orange-500/40"
                  />
                )}
              </Link>
            );
          })}

          <button
            onClick={() => setMobileOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-[85%] gap-1 text-zinc-500 hover:text-orange-500 dark:text-stone-400 dark:hover:text-white transition-all duration-300 relative group"
          >
            <div className="relative">
              <Menu className="h-5 w-5 stroke-[2px]" />
              <div className="absolute -top-1 -right-1 h-2 w-2 rounded-none bg-orange-500 ring-2 ring-white dark:ring-stone-900 shadow-none" />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">Menu</span>
          </button>
        </motion.nav>
      </div>
    </header>
  );
}

/* --- Mobile Drawer Component --- */
function MobileDrawer({
  open, onClose, user, pathname, marketing, searchQ, setSearchQ, runSearch, navLinks, solutions, marketplaceVariants, scrolled, openAssistant
}: any) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (section: string) => setExpanded(expanded === section ? null : section);

  const accountLinks = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/dashboard/library", icon: Video, label: "Digital Library" },
    { href: "/dashboard/settings", icon: Settings, label: "My Account" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[9998] bg-black/60 "
          />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 w-[85%] max-w-[400px] z-[9999] bg-[var(--color-surface)] shadow-none flex flex-col pointer-events-auto"
          >
            {/* Header / Dismiss */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-border bg-zinc-50/50 dark:bg-black/20">
               <span className="text-[10px] font-black text-stone-400 uppercase tracking-[0.4em]">Jimvio Console</span>
              <button 
                onClick={onClose}
                className="h-9 w-9 flex items-center justify-center rounded-none bg-white dark:bg-surface-secondary text-stone-500 shadow-none transition-transform active:scale-90"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Container */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7 scrollbar-none">
              
              {/* SECTION: Quick Access (Account -> AI -> Utils) */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-stone-400 dark:text-stone-600 uppercase tracking-[0.2em] px-2 mb-2">My Console</p>
                
                {/* 1. User Profile / Login */}
                <div className="bg-zinc-50 dark:bg-surface-secondary rounded-none p-2 border border-stone-100 dark:border-white/5 shadow-none">
                  {user ? (
                    <div className="space-y-1">
                      <button 
                        onClick={() => toggle('account')}
                        className={cn("w-full flex items-center justify-between p-3 rounded-none text-[14px] font-bold transition-all", 
                          expanded === 'account' ? "bg-white dark:bg-surface-secondary text-stone-900 dark:text-white" : "text-stone-600 dark:text-stone-400 hover:bg-white dark:hover:bg-surface-secondary")}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 ring-1 ring-orange-500/20">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback className="bg-orange-500 text-white text-[10px] font-bold rounded-none">{user.full_name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="text-left">
                            <p className="text-[13px] leading-tight truncate max-w-[120px]">{user.full_name}</p>
                            <p className="text-[9px] text-stone-400 font-medium">Account Settings</p>
                          </div>
                        </div>
                        <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", expanded === 'account' && "rotate-180")} />
                      </button>

                      <AnimatePresence>
                        {expanded === 'account' && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden pl-11 space-y-1 py-2"
                          >
                            {accountLinks.map(link => (
                              <Link key={link.href} href={link.href} onClick={onClose} className="flex items-center gap-4 p-2.5 text-sm font-semibold text-stone-500 hover:text-stone-900 dark:text-stone-500 dark:hover:text-white transition-colors">
                                <link.icon className="h-4 w-4 opacity-70" /> {link.label}
                              </Link>
                            ))}
                            <button 
                              onClick={async () => { await signOut(); window.location.href = "/"; }}
                              className="w-full flex items-center gap-4 p-2.5 text-sm font-bold text-red-500"
                            >
                              <LogOut className="h-4 w-4" /> Logout
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 p-1">
                      <Link href="/login" onClick={onClose} className="flex items-center justify-center p-3 rounded-none bg-white dark:bg-surface-secondary text-[11px] font-black uppercase tracking-widest text-stone-600 dark:text-stone-400 shadow-none active:scale-95 transition-all">Log In</Link>
                      <Link href="/register" onClick={onClose} className="flex items-center justify-center p-3 rounded-none bg-orange-500 text-[11px] font-black uppercase tracking-widest text-white shadow-none shadow-orange-500/20 active:scale-95 transition-all">Join Free</Link>
                    </div>
                  )}
                </div>

                {/* 2. AI Assistant */}
                <button
                  onClick={() => { openAssistant(); onClose(); }}
                  className="w-full relative flex items-center justify-between p-4 rounded-none bg-gradient-to-br from-orange-500 to-orange-600 shadow-none shadow-orange-500/20 group overflow-hidden"
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="h-10 w-10 rounded-none bg-white/20 flex items-center justify-center shadow-inner">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-[12px] font-black uppercase tracking-[0.1em] text-white leading-tight">Neural Core</p>
                      <p className="text-[9px] font-bold text-white/70">AI Assistant Online</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-white/50 group-active:translate-x-1 transition-transform" />
                </button>

                {/* 3. Utility Icon Grid (Theme + Currency) */}
                <div className="grid grid-cols-2 gap-3">
                   <div className="flex items-center justify-between p-3 rounded-none bg-zinc-50 dark:bg-surface-secondary border border-stone-100 dark:border-white/5">
                      <div className="h-8 w-8 rounded-none bg-white dark:bg-surface-secondary flex items-center justify-center shadow-none">
                        <Sun className="h-4 w-4 text-orange-500" />
                      </div>
                      <ThemeToggle />
                   </div>
                   <div className="flex items-center justify-between p-3 rounded-none bg-zinc-50 dark:bg-surface-secondary border border-stone-100 dark:border-white/5">
                      <div className="h-8 w-8 rounded-none bg-emerald-500/10 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                      </div>
                      <span className="text-[11px] font-black text-stone-600 dark:text-stone-300 pr-2">USD</span>
                   </div>
                </div>
              </div>

              {/* Search */}
              <div className="bg-zinc-50 dark:bg-surface-secondary rounded-none p-1.5 ring-1 ring-zinc-100 dark:ring-border shadow-none">
                <NavbarSearch searchQ={searchQ} setSearchQ={setSearchQ} variant="mobile" runSearch={runSearch} navLinks={navLinks} isScrolled={false} />
              </div>

              {/* SECTION: Global Navigation */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-stone-400 dark:text-stone-600 uppercase tracking-[0.2em] px-2 mb-2">Navigation</p>
                
                <Link href="/" onClick={onClose} 
                  className={cn("flex items-center gap-4 p-4 rounded-none text-[15px] font-bold transition-all", 
                    pathname === "/" ? "bg-orange-500 text-white shadow-none shadow-orange-500/20" : "text-stone-600 dark:text-stone-300 hover:bg-zinc-50 dark:hover:bg-stone-900")}>
                  <Home className={cn("h-5 w-5", pathname === "/" ? "text-white" : "text-orange-500")} /> Home
                </Link>

                {/* Marketplace Dropdown (Expanding) */}
                <div className="space-y-1">
                  <button 
                    onClick={() => toggle('market')}
                    className={cn("w-full flex items-center justify-between p-4 rounded-none text-[15px] font-bold transition-all", 
                      expanded === 'market' ? "bg-stone-100 dark:bg-stone-900 text-stone-900 dark:text-white" : "text-stone-600 dark:text-stone-400 hover:bg-zinc-50 dark:hover:bg-stone-900")}
                  >
                    <div className="flex items-center gap-4">
                      <ShoppingBag className="h-5 w-5 text-orange-500" /> Marketplace
                    </div>
                    <ChevronDown className={cn("h-5 w-5 transition-transform duration-300", expanded === 'market' && "rotate-180")} />
                  </button>
                  
                  <AnimatePresence>
                    {expanded === 'market' && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden pl-10 space-y-1"
                      >
                        {marketplaceVariants.map((v: any) => (
                          <Link key={v.href} href={v.href} onClick={onClose} className="flex items-center gap-4 p-3.5 text-sm font-semibold text-stone-500 hover:text-orange-600 transition-colors">
                            <v.icon className="h-4 w-4 opacity-70" style={{ color: v.color }} /> {v.title}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Explore Dropdown */}
                <div className="space-y-1">
                  <button 
                    onClick={() => toggle('explore')}
                    className={cn("w-full flex items-center justify-between p-4 rounded-none text-[15px] font-bold transition-all", 
                      expanded === 'explore' ? "bg-stone-100 dark:bg-stone-900 text-stone-900 dark:text-white" : "text-stone-600 dark:text-stone-400 hover:bg-zinc-50 dark:hover:bg-stone-900")}
                  >
                    <div className="flex items-center gap-4">
                      <Globe className="h-5 w-5 text-orange-500" /> Explore
                    </div>
                    <ChevronDown className={cn("h-5 w-5 transition-transform duration-300", expanded === 'explore' && "rotate-180")} />
                  </button>
                  
                  <AnimatePresence>
                    {expanded === 'explore' && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden pl-10 space-y-1"
                      >
                        {solutions.map((s: any) => (
                          <Link key={s.href} href={s.href} onClick={onClose} className="flex items-center gap-4 p-3.5 text-sm font-semibold text-stone-500 hover:text-orange-600 transition-colors">
                            <s.icon className="h-4 w-4 opacity-70" /> {s.title}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Link href="/communities" onClick={onClose} 
                  className={cn("flex items-center gap-4 p-4 rounded-none text-[15px] font-bold transition-all", 
                    pathname.startsWith("/communities") ? "bg-orange-50 text-orange-600" : "text-stone-600 dark:text-stone-300 hover:bg-zinc-50 dark:hover:bg-stone-900")}>
                  <Users className="h-5 w-5 text-orange-500" /> Communities
                </Link>

                <Link href="/help" onClick={onClose} 
                  className={cn("flex items-center gap-4 p-4 rounded-none text-[15px] font-bold transition-all", 
                    pathname.startsWith("/help") ? "bg-orange-50 text-orange-600" : "text-stone-600 dark:text-stone-300 hover:bg-zinc-50 dark:hover:bg-stone-900")}>
                  <CircleHelp className="h-5 w-5 text-orange-500" /> Help Center
                </Link>
              </div>

              {/* Live Status Widget */}
              <div className="pt-4 px-2">
                 <div className="bg-zinc-50 dark:bg-stone-900/40 rounded-none p-4 border border-zinc-100 dark:border-white/5">
                    <CurrencyConverterWidget variant="compact" className="mx-0" />
                 </div>
              </div>
            </div>
            
            <div className="p-8 text-center bg-zinc-50 dark:bg-stone-900/20">
              <p className="text-[9px] font-black text-stone-400 uppercase tracking-[0.4em]">Jimvio Multi-Channel Protocol</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


