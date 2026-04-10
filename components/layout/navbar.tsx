"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  User,
  ShoppingCart,
  MessageCircle,
  Menu,
  X,
  Globe,
  HelpCircle,
  LayoutDashboard,
  Settings,
  LogOut,
  TrendingUp,
  Video,
  Factory,
  Plus,
  Home,
  ShoppingBag,
  Package,
  Users,
  Search,
  Command,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Zap,
  Play,
  Megaphone,
  Clapperboard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth/actions";
import { useCartStore } from "@/lib/store/use-cart-store";
import { useAIStore } from "@/lib/store/use-ai-store";
import type { MarketingSettings, NavLinkConfig } from "@/lib/platform-settings-shared";
import { NavbarSearch } from "@/components/layout/navbar-search";
import { CurrencySelector } from "@/context/CurrencyContext";
import { CurrencyConverterWidget } from "@/components/shared/currency-converter-widget";

interface NavbarProps {
  user?: { email: string; full_name?: string | null; avatar_url?: string | null } | null;
  marketing: MarketingSettings;
}

function ensureCoreNavLinks(links: NavLinkConfig[]): NavLinkConfig[] {
  // Hide specific links from the main bar that should stay in Explore
  const hideHrefs = [
    "/ugc",
    "/vendors",
    "/affiliates",
    "/influencers",
    "/influencers/browse",
    "/influencers/program",
    "/shorts"
  ];

  let updated = links.filter(l => {
    const normHref = l.href.replace(/\/$/, "") || "/";
    return normHref !== "/clips" && !hideHrefs.includes(normHref);
  });
  
  const norm = (href: string) => href.replace(/\/$/, "") || "/";

  // Ensure Marketplace and Communities are present in the main bar
  if (!updated.some(l => norm(l.href) === "/marketplace")) {
    updated.push({ label: "Marketplace", href: "/marketplace" });
  }
  if (!updated.some(l => norm(l.href) === "/communities")) {
    updated.push({ label: "Communities", href: "/communities" });
  }

  // Move home to front if present
  const homeIdx = updated.findIndex((l) => norm(l.href) === "/");
  if (homeIdx > 0) {
    const home = updated[homeIdx];
    updated.splice(homeIdx, 1);
    updated.unshift(home);
  }

  return updated;
}

function iconForNavHref(href: string): LucideIcon {
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

function colorForNavHref(href: string): string {
  const h = href.replace(/\/$/, "") || "/";
  if (h === "/") return "text-orange-500 bg-orange-50";
  if (h.startsWith("/marketplace")) return "text-blue-500 bg-blue-50";
  if (h.startsWith("/shorts")) return "text-red-500 bg-red-50";
  if (h.startsWith("/ugc")) return "text-violet-500 bg-violet-50";
  if (h.startsWith("/communities")) return "text-emerald-500 bg-emerald-50";
  if (h.startsWith("/affiliates")) return "text-purple-500 bg-purple-50";
  if (h.startsWith("/influencers")) return "text-pink-500 bg-pink-50";
  if (h.startsWith("/vendors")) return "text-yellow-600 bg-yellow-50";
  return "text-zinc-500 bg-zinc-50";
}

function linkIsActive(pathname: string, href: string): boolean {
  const h = href.replace(/\/$/, "") || "/";
  if (h === "/") return pathname === "/";
  return pathname === h || pathname.startsWith(`${h}/`);
}

export function Navbar({ user, marketing }: NavbarProps) {
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { cartCount, chatCount, refreshCounts } = useCartStore();
  const { openAssistant } = useAIStore();
  const pathname = usePathname();
  const router = useRouter();

  const handleExploreEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setExploreOpen(true);
  };

  const handleExploreLeave = () => {
    timeoutRef.current = setTimeout(() => setExploreOpen(false), 150);
  };

  const navLinks = ensureCoreNavLinks(marketing.nav_links ?? []);
  const localeStrip = (marketing.locale_strip?.trim() || "EN · USD").trim();

  const navHeight = useTransform(scrollY, [0, 80], [102, 72]);
  const mobileNavHeight = useTransform(scrollY, [0, 80], [48, 48]);
  const topBarOpacity = useTransform(scrollY, [0, 40], [1, 0]);
  const topBarHeight = useTransform(scrollY, [0, 40], [32, 0]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 15);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize(); // Set initial value
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => setPortalReady(true), []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    if (user) refreshCounts();
  }, [user, refreshCounts]);

  const runSearch = useCallback(
    (override?: string) => {
      const term = (override ?? searchQ).trim();
      const params = new URLSearchParams();
      if (term) params.set("q", term);
      const qs = params.toString();
      router.push(qs ? `/marketplace?${qs}` : "/marketplace");
      setMobileOpen(false);
    },
    [router, searchQ],
  );

  const solutions = [
    { title: "Videos", desc: "Watch top creator shorts and clips", href: "/shorts", icon: Clapperboard, color: "text-red-500" },
    { title: "Campaigns", desc: "Participate in active UGC missions", href: "/ugc", icon: Megaphone, color: "text-violet-500" },
    { title: "Suppliers", desc: "Tools for vendors and businesses", href: "/vendors", icon: Factory, color: "text-emerald-500" },
    { title: "Affiliate", desc: "Manage your referral empire", href: "/affiliates", icon: TrendingUp, color: "text-purple-500" },
    { title: "Creators", desc: "Connect with verified top talent", href: "/influencers/browse", icon: User, color: "text-pink-500" },
  ];

  // Ordered mobile nav links as requested
  const orderedMobileLinks = [
    { label: "Home", href: "/", icon: Home },
    { label: "Marketplace", href: "/marketplace", icon: ShoppingBag },
    { label: "Videos", href: "/shorts", icon: Clapperboard },
    { label: "Campaigns", href: "/ugc", icon: Megaphone },
    { label: "Communities", href: "/communities", icon: Users },
    { label: "Affiliate", href: "/affiliates", icon: TrendingUp },
    { label: "Creators", href: "/influencers/browse", icon: User },
    { label: "Suppliers", href: "/vendors", icon: Factory },
  ];

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-[100] w-full pointer-events-none isolate transition-all duration-500",
      isScrolled ? "px-0 sm:px-4 lg:px-8 pt-0 sm:pt-2 md:pt-4" : "px-0 pt-0"
    )}>
      <motion.div
        style={{
          height: isMobile ? mobileNavHeight : navHeight,
        }}
        className={cn(
          "mx-auto w-full relative pointer-events-auto transition-all duration-500 bg-white/85 backdrop-blur-3xl flex flex-col items-stretch overflow-visible group/nav",
          isScrolled
            ? "max-w-[1536px] sm:rounded-[32px] border-b sm:border border-white/60 sm:shadow-[0_20px_60px_rgba(0,0,0,0.12)] backdrop-saturate-150"
            : "max-w-none rounded-none border-b border-zinc-200/60 shadow-sm"
        )}
      >
        <div className="mx-auto w-full max-w-[1536px] flex flex-col items-stretch h-full overflow-visible">
          {/* DESKTOP TOP STRIP */}
          <motion.div
            style={{ height: topBarHeight, opacity: topBarOpacity }}
            className="hidden md:flex border-b border-zinc-100/50 items-center justify-between px-8 md:px-12 transition-all shrink-0 overflow-hidden"
          >
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5 text-[9px] font-black text-zinc-400 tracking-widest uppercase">
                <Globe className="h-3 w-3 text-[#f97316]" /> {localeStrip}
              </span>
              <CurrencySelector className="h-5 rounded-lg bg-transparent border-0 px-1 text-[10px] font-bold text-zinc-400 hover:text-zinc-900 transition-colors" />
            </div>
            <div className="flex items-center gap-6">
              <Link href="/help" className="text-[10px] font-black tracking-wider text-zinc-400 hover:text-[#f97316] transition-all uppercase">Help center</Link>
              <Link href="/vendors" className="text-[10px] font-black tracking-wider text-zinc-400 hover:text-zinc-800 transition-all uppercase">Suppliers</Link>
            </div>
          </motion.div>

          {/* MAIN NAVIGATION BAR */}
          <div className="flex-1 flex items-center px-2 sm:px-4 md:px-10 gap-2 sm:gap-3 md:gap-8 overflow-visible">
            {/* Logo */}
            <Link href="/" className="relative shrink-0 transition-transform active:scale-95 duration-300">
              <Image src="/jimvio-logo.png" alt="Jimvio" width={140} height={38} className="w-[90px] sm:w-[110px] md:w-[130px] h-auto object-contain" priority />
            </Link>

            {/* Desktop Central Links */}
            <div className="hidden min-[1150px]:flex items-center gap-1">
              <div 
                onMouseEnter={handleExploreEnter}
                onMouseLeave={handleExploreLeave}
                className="relative"
              >
                <DropdownMenu open={exploreOpen} onOpenChange={setExploreOpen} modal={false}>
                  <DropdownMenuTrigger asChild>
                    <button className="px-4 py-2 rounded-2xl text-[14px] font-black text-zinc-600 hover:text-zinc-900 transition-all flex items-center gap-1.5 group">
                      <Globe className="h-4 w-4 opacity-70 group-hover:text-orange-500 transition-colors" />
                      Explore <ChevronDown className="h-3.5 w-3.5 opacity-40 group-hover:rotate-180 transition-transform" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    onMouseEnter={handleExploreEnter}
                    onMouseLeave={handleExploreLeave}
                    sideOffset={15}
                    className="w-[360px] p-3 rounded-[32px] shadow-[0_32px_80px_rgba(0,0,0,0.15)] border-white/20 backdrop-blur-3xl bg-white/95 grid grid-cols-1 gap-1"
                  >
                  {solutions.map(s => (
                    <DropdownMenuItem key={s.href} asChild className="p-3 rounded-2xl border border-transparent focus:bg-zinc-50 cursor-pointer group">
                      <Link href={s.href} className="flex items-center gap-4">
                        <div className={cn("h-10 w-10 rounded-xl bg-orange-50/10 flex items-center justify-center shrink-0", s.color)}><s.icon className="h-5 w-5" /></div>
                        <div className="min-w-0">
                          <p className="text-[14px] font-black text-zinc-900 leading-none mb-1">{s.title}</p>
                          <p className="text-[11px] font-bold text-zinc-400 leading-tight truncate">{s.desc}</p>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              </div>

              {navLinks.map((item) => {
                const active = linkIsActive(pathname, item.href);
                const Icon = iconForNavHref(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group px-4 py-2 rounded-2xl text-[14px] font-black transition-all flex items-center gap-2",
                      active ? "text-zinc-900 bg-zinc-100/50" : "text-zinc-500 hover:text-zinc-900"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", active ? "text-orange-500" : "text-zinc-400 group-hover:text-zinc-900")} />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Action Center (Flexible) */}
            <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3 ml-auto">
              <div className="hidden md:block flex-initial max-w-[420px] w-full mr-2">
                <NavbarSearch searchQ={searchQ} setSearchQ={setSearchQ} placeholder={marketing.search_placeholder} isScrolled={isScrolled} variant="desktop" runSearch={runSearch} navLinks={navLinks} />
              </div>

              {/* Functional Icons */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <button
                  onClick={() => openAssistant()}
                  className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-full bg-orange-50 border border-orange-100 text-orange-600 hover:bg-orange-100 transition-all group mr-1"
                >
                  <Sparkles className="h-4 w-4 fill-orange-500 stroke-none animate-pulse" />
                  <span className="text-[12px] font-black uppercase tracking-tight">AI Mode</span>
                </button>
                <button
                  onClick={() => openAssistant()}
                  className="flex sm:hidden h-10 w-10 md:h-11 md:w-11 p-2 md:p-2.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100 transition-all"
                >
                  <Sparkles className="h-4 w-4 md:h-5 md:w-5 fill-orange-500 stroke-none" />
                </button>
                <Link href="/dashboard/messages" className="hidden sm:flex relative h-10 w-10 md:h-11 md:w-11 p-2 md:p-2.5 rounded-full hover:bg-zinc-100 transition-all group items-center justify-center">
                  <MessageCircle className="h-4 w-4 md:h-5 md:w-5 text-zinc-800 transition-transform group-hover:rotate-6" />
                  {chatCount > 0 && <span className="absolute -top-1 -right-1 h-[18px] min-w-[18px] bg-[#f97316] text-white text-[9px] font-black flex items-center justify-center rounded-full ring-2 ring-white animate-pulse">{chatCount}</span>}
                </Link>
                <Link href="/cart" className="relative h-10 w-10 md:h-11 md:w-11 p-2 md:p-2.5 rounded-full hover:bg-zinc-100 transition-all group flex items-center justify-center">
                  <ShoppingCart className="h-4 w-4 md:h-5 md:w-5 text-zinc-800 transition-transform group-hover:-rotate-6" />
                  {cartCount > 0 && <span className="absolute -top-1 -right-1 h-[18px] min-w-[18px] bg-zinc-900 text-white text-[9px] font-black flex items-center justify-center rounded-full ring-2 ring-white">{cartCount}</span>}
                </Link>
              </div>

              <div className="h-8 w-[1px] bg-zinc-200/50 hidden lg:block mx-1" />

              <div className="hidden sm:flex items-center gap-2 shrink-0">
                {user ? (
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2.5 p-1 xl:pr-3.5 rounded-full bg-zinc-50 border border-zinc-100 hover:bg-white hover:shadow-xl hover:border-zinc-200 transition-all active:scale-95 group shrink-0 h-10 md:h-11">
                        <Avatar className="h-7 w-7 md:h-9 md:w-9 xl:h-10 xl:w-10 ring-2 ring-white shadow-sm flex-shrink-0">
                          <AvatarImage src={user.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-[#f97316] to-[#ea580c] text-white font-black text-[10px] md:text-[12px] uppercase">{user.full_name?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="hidden xl:block text-[13px] font-black text-zinc-900 truncate max-w-[140px]">{user.full_name?.split(" ")[0]}</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 rounded-[32px] p-3 shadow-2xl border-white/20 bg-white/95 mt-4">
                      <div className="p-4 bg-zinc-50 rounded-[24px] mb-2">
                        <p className="text-[15px] font-black text-zinc-900 leading-tight">{user.full_name}</p>
                        <p className="text-[11px] font-medium text-zinc-500 mt-1 truncate">{user.email}</p>
                      </div>
                      <DropdownMenuItem asChild className="rounded-2xl py-3 font-bold text-zinc-600 focus:bg-zinc-50 focus:text-[#f97316] cursor-pointer">
                        <Link href="/dashboard"><LayoutDashboard className="h-4 w-4 mr-3" /> Dashboard</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="rounded-2xl py-3 font-bold text-zinc-600 focus:bg-zinc-50 focus:text-zinc-900 cursor-pointer">
                        <Link href="/dashboard/settings"><Settings className="h-4 w-4 mr-3" /> My Account</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="mx-2 bg-zinc-100/50" />
                      <DropdownMenuItem onSelect={async () => { await signOut(); window.location.href = "/"; }} className="rounded-2xl py-3 font-bold text-red-500 focus:bg-red-50 cursor-pointer">
                        <LogOut className="h-4 w-4 mr-3" /> Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <Link href="/login" className="px-4 py-2 text-[13px] font-black text-zinc-500 hover:text-zinc-900 transition-colors">Log In</Link>
                    <Button asChild className="h-10 sm:h-11 rounded-full px-5 sm:px-7 text-[13px] font-black bg-zinc-900 hover:bg-black text-white shadow-xl shadow-black/10 active:scale-95 transition-all">
                      <Link href="/register">Join Free</Link>
                    </Button>
                  </div>
                )}
              </div>

              <button onClick={() => setMobileOpen(true)} className="md:hidden h-10 w-10 p-2 rounded-full bg-zinc-50 border border-zinc-100 text-zinc-900 shadow-sm active:scale-90 transition-all shrink-0">
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── MOBILE DRAWER ─────────────────────────────────────────── */}
      {portalReady && createPortal(
        <AnimatePresence>
          {mobileOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998] pointer-events-auto"
              />

              {/* Drawer Panel */}
              <motion.div
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 30, stiffness: 280 }}
                className="fixed inset-y-0 right-0 w-full bg-white z-[9999] flex flex-col pointer-events-auto overflow-hidden"
              >
                {/* ── Drawer Header ── */}
                <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-zinc-100 shrink-0">
                  <Link href="/" onClick={() => setMobileOpen(false)} className="shrink-0">
                    <Image src="/jimvio-logo.png" alt="Jimvio" width={110} height={30} className="h-6 sm:h-7 w-auto object-contain" priority />
                  </Link>
                  <div className="flex items-center gap-2">
                    <Link href="/cart" onClick={() => setMobileOpen(false)} className="relative h-10 w-10 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-700">
                      <ShoppingCart className="h-4.5 w-4.5" />
                      {cartCount > 0 && <span className="absolute -top-1 -right-1 h-[18px] min-w-[18px] bg-zinc-900 text-white text-[9px] font-black flex items-center justify-center rounded-full ring-2 ring-white">{cartCount}</span>}
                    </Link>
                    <Link href="/dashboard/messages" onClick={() => setMobileOpen(false)} className="relative h-10 w-10 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-700">
                      <MessageCircle className="h-4.5 w-4.5" />
                      {chatCount > 0 && <span className="absolute -top-1 -right-1 h-[18px] min-w-[18px] bg-[#f97316] text-white text-[9px] font-black flex items-center justify-center rounded-full ring-2 ring-white">{chatCount}</span>}
                    </Link>
                    <button
                      onClick={() => setMobileOpen(false)}
                      className="h-10 w-10 rounded-full bg-zinc-900 text-white flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* ── Scrollable body ── */}
                <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-2">

                  {/* Search */}
                  <div className="relative z-[99999] mb-2">
                    <NavbarSearch
                      searchQ={searchQ}
                      setSearchQ={setSearchQ}
                      placeholder={marketing.search_placeholder ?? "Search globally..."}
                      isScrolled={isScrolled}
                      variant="mobile"
                      runSearch={runSearch}
                      navLinks={navLinks}
                    />
                  </div>

                  {/* Currency Converter */}
                  <div className="mb-2">
                    <CurrencyConverterWidget variant="compact" className="mx-0" />
                  </div>

                  {/* AI Mode CTA */}
                  <button
                    onClick={() => { openAssistant(); setMobileOpen(false); }}
                    className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full
  bg-gradient-to-r from-orange-50/80 to-amber-50/60
  border border-orange-200/50
  text-orange-600 font-black text-[12px] uppercase tracking-wider
  shadow-[0_4px_16px_rgba(249,115,22,0.12),0_1px_0_rgba(255,255,255,0.7)_inset]
  hover:shadow-[0_6px_20px_rgba(249,115,22,0.22),0_1px_0_rgba(255,255,255,0.9)_inset]
  hover:-translate-y-0.5 hover:scale-[1.02]
  transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-5 w-5 fill-orange-500 stroke-none shrink-0" />
                      <span className="text-[15px] font-black">Launch AI Mode</span>
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-50 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* ── Dashboard shortcut (logged-in only) ── */}
                  {user && (
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[15px] font-black transition-all",
                        linkIsActive(pathname, "/dashboard")
                          ? "bg-orange-50 text-[#f97316]"
                          : "text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
                      )}
                    >
                      <span className={cn(
                        "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                        linkIsActive(pathname, "/dashboard") ? "bg-orange-100 text-orange-500" : "bg-zinc-100 text-zinc-500"
                      )}>
                        <LayoutDashboard className="h-4.5 w-4.5" />
                      </span>
                      Dashboard
                      {linkIsActive(pathname, "/dashboard") && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#f97316]" />}
                    </Link>
                  )}

                  {/* ── All Nav Links (Flattened) ── */}
                  <div className="pt-2">
                    <div className="flex flex-col gap-1">
                      {orderedMobileLinks.map((item: any) => {
                        const Icon = item.icon || iconForNavHref(item.href);
                        const active = linkIsActive(pathname, item.href);
                        const colorClasses = colorForNavHref(item.href);
                        const [iconColor, iconBg] = colorClasses.split(" ");
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              "flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[15px] font-black transition-all",
                              active
                                ? "bg-orange-50 text-[#f97316]"
                                : "text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
                            )}
                          >
                            <span className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", active ? "bg-orange-100 text-orange-500" : `${iconBg} ${iconColor}`)}>
                              <Icon className="h-4.5 w-4.5" />
                            </span>
                            {item.label}
                            {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#f97316]" />}
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Extra Links ── */}
                  <div className="pt-1">
                    <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest px-2 mb-2">More</p>
                    <div className="flex flex-col gap-1">
                      <Link href="/help" onClick={() => setMobileOpen(false)} className="flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[15px] font-black text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-all">
                        <span className="h-9 w-9 rounded-xl bg-zinc-50 flex items-center justify-center shrink-0">
                          <HelpCircle className="h-4.5 w-4.5 text-zinc-400" />
                        </span>
                        Help center
                      </Link>
                    </div>
                  </div>
                </div>

                {/* ── Footer Auth ── */}
                <div className="shrink-0 px-4 py-4 border-t border-zinc-100 bg-white">
                  {user ? (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 ring-2 ring-orange-100 shrink-0">
                        <AvatarImage src={user.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-[#f97316] to-[#ea580c] text-white font-black text-[13px] uppercase">{user.full_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-black text-zinc-900 truncate">{user.full_name}</p>
                        <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="h-10 w-10 rounded-full bg-zinc-900 text-white flex items-center justify-center">
                          <LayoutDashboard className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={async () => { await signOut(); window.location.href = "/"; }}
                          className="h-10 w-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center"
                        >
                          <LogOut className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <Button asChild variant="outline" className="h-12 rounded-2xl border-zinc-100 font-black text-zinc-600 text-[14px]">
                        <Link href="/login" onClick={() => setMobileOpen(false)}>Log In</Link>
                      </Button>
                      <Button asChild className="h-12 rounded-2xl font-black bg-[#f97316] hover:bg-[#ea580c] shadow-lg shadow-orange-500/20 text-white text-[14px]">
                        <Link href="/register" onClick={() => setMobileOpen(false)}>Join Free</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </header>
  );
}
