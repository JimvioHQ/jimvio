"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
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
  CircleHelp,
  LayoutDashboard,
  Settings,
  LogOut,
  TrendingUp,
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
  Play,
  Megaphone,
  Clapperboard,
  Sun,
  BatteryCharging,
  Headphones,
  Laptop,
  Lamp,
  Bookmark,
  Smartphone,
  Clock,
  Flame,
  PlaySquare,
  Store,
  Handshake,
  ArrowRight,
  FileText,
  BanknoteIcon,
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
import { NavbarSearch } from "@/components/layout/navbar-search";
import { CurrencySelector } from "@/context/CurrencyContext";
import { CurrencyConverterWidget } from "@/components/shared/currency-converter-widget";
import { Input } from "@/components/ui/input";
import JimvioLogo from "../ui/logo";


const TRENDING_SEARCHES: {
  label: string;
  count: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}[] = [
    { label: "Wireless chargers", count: "142 products", icon: BatteryCharging, color: "#f97316", bg: "bg-orange-50 dark:bg-orange-500/10" },
    { label: "Wireless earbuds", count: "89 products", icon: Headphones, color: "#3b82f6", bg: "bg-blue-50 dark:bg-blue-500/10" },
    { label: "Laptop accessories", count: "230 products", icon: Laptop, color: "#8b5cf6", bg: "bg-violet-50 dark:bg-violet-500/10" },
    { label: "LED desk lamps", count: "77 products", icon: Lamp, color: "#eab308", bg: "bg-yellow-50 dark:bg-yellow-500/10" },
    { label: "Phone stands", count: "190 products", icon: Smartphone, color: "#10b981", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
  ];

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
        // Light: denser fill + inset ring so selection is unmistakable
        "bg-black/[0.07] text-stone-900 font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.09)]",
        // Dark: bump to 11% white + matching inset ring
        "dark:bg-white/[0.11] dark:text-white dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)]",
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
    "relative flex items-center justify-center h-9 w-9 shrink-0 rounded-xl text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/8 hover:text-stone-800 dark:hover:text-white transition-all duration-150 active:scale-[0.94]",
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


function ensureCoreNavLinks(links: NavLinkConfig[]): NavLinkConfig[] {
  const hide = [
    "/vendors",
    "/influencers",
    "/influencers/browse",
    "/influencers/program",
    "/shorts",
  ];

  const norm = (h: string) => h.replace(/\/$/, "") || "/";

  let out = links.filter((l) => {
    const h = norm(l.href);
    return h !== "/clips" && !hide.includes(h);
  });

  if (!out.some((l) => norm(l.href) === "/ugc"))
    out.push({ label: "UGC & Clipping", href: "/ugc" });

  if (!out.some((l) => norm(l.href) === "/marketplace"))
    out.push({ label: "Marketplace", href: "/marketplace" });

  if (!out.some((l) => norm(l.href) === "/communities"))
    out.push({ label: "Communities", href: "/communities" });

  if (!out.some((l) => norm(l.href) === "/"))
    out.unshift({ label: "Home", href: "/" });

  // Move Home to index 0
  const hi = out.findIndex((l) => norm(l.href) === "/");
  if (hi > 0) {
    const [home] = out.splice(hi, 1);
    out.unshift(home);
  }

  // Move Marketplace to index 1 (right after Home)
  const mi = out.findIndex((l) => norm(l.href) === "/marketplace");
  if (mi > 1) {
    const [marketplace] = out.splice(mi, 1);
    out.splice(1, 0, marketplace);
  }

  return out;
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
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const exploreTimer = useRef<NodeJS.Timeout | null>(null);
  const DROPDOWN_CLOSE_DELAY = 220;
  const marketplaceTimer = useRef<NodeJS.Timeout | null>(null);
  const IsMobile = (typeof window !== "undefined") && window.innerWidth < 1150;
  const { cartCount, chatCount, refreshCounts } = useCartStore();
  const { openAssistant } = useAIStore();
  const pathname = usePathname();
  const router = useRouter();

  const navHidden = useScrollDirection();
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 15);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  useEffect(() => setPortalReady(true), []);
  useEffect(() => {
    document.body.style.overflow = mobileOpen || searchOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen, searchOpen]);

  useEffect(() => { if (user) refreshCounts(); }, [user, refreshCounts]);
  useEffect(() => { setSearchOpen(false); setSearchQ(""); }, [pathname]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setSearchOpen(false); setSearchQ(""); }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  const topBarOpacity = useTransform(scrollY, [0, 40], [1, 0]);
  const topBarH = useTransform(scrollY, [0, 40], [30, 0]);

  const navLinks = ensureCoreNavLinks(marketing.nav_links ?? []);

  const marketplaceVariants = [
    { title: "Digital Market", desc: "Software, courses & assets", href: "/marketplace?type=digital", icon: Zap, color: "#0ea5e9", badge: "Hot" },
    { title: "Physical Market", desc: "Real-world goods & equipment", href: "/marketplace?type=physical", icon: Package, color: "#f59e0b" },
    { title: "All Products", desc: "Complete global catalog", href: "/marketplace", icon: ShoppingBag, color: "#fd5000" },
  ];

  const mobileBottomLinks = [
    { label: "Home", href: "/", icon: Home },
    { label: "Market", href: "/marketplace", icon: ShoppingBag },
    { label: "Communities", href: "/communities", icon: Users },
    { label: "UGC & Clipping", href: "/ugc", icon: Clapperboard },
  ];

  const runSearch = useCallback(
    (override?: string) => {
      const t = (override ?? searchQ).trim();
      const qs = t ? `?q=${encodeURIComponent(t)}` : "";
      router.push(`/marketplace${qs}`);
      setSearchOpen(false);
      setSearchQ("");
      setMobileOpen(false);
    },
    [router, searchQ]
  );

  const onMarketplaceEnter = () => {
    if (marketplaceTimer.current) clearTimeout(marketplaceTimer.current);
    setMarketplaceOpen(true);
  };
  const onMarketplaceLeave = () => {
    marketplaceTimer.current = setTimeout(() => setMarketplaceOpen(false), DROPDOWN_CLOSE_DELAY);
  };

  return (
    <header className="fixed top-0 inset-x-0 z-[100] pointer-events-none transition-all duration-300">
      <div
        className={cn(
          "pointer-events-auto relative mx-auto transition-all duration-300 flex flex-col",
          scrolled
            ? "bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-2xl shadow-[0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_1px_0_rgba(255,255,255,0.04)]"
            : "bg-white/70 dark:bg-[#0a0a0a]/70 backdrop-blur-xl"
        )}
      >
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/10 pointer-events-none" />
        <div className="min-w-full">
          {/* top strip */}
          <motion.div
            style={{ height: topBarH, opacity: topBarOpacity }}
            className="hidden md:block dark:bg-black/20 border-b border-border"
          >
            <div className="max-w-8xl mx-auto md:flex items-center justify-between px-8 shrink-0 ">
              <div className="flex items-center justify-between gap-6 ">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-stone-500 uppercase tracking-tight">
                  <Globe className="h-3 w-3 text-orange-500" />
                  <span>Global Sourcing Network</span>
                </div>
                <div>
                  <CurrencySelector className="h-5 bg-transparent border-0 focus:ring-0 px-1 ring-0 text-[10px] font-bold text-stone-500 hover:text-stone-800 transition-colors" />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <Link href="/help" className="text-[10px] font-bold text-stone-500 hover:text-orange-600 transition-colors uppercase">Support</Link>
                <div className="h-3 w-px bg-border" />
                <Link href="/vendors" className="text-[10px] font-bold text-stone-500 hover:text-stone-800 transition-colors uppercase">Sell on Jimvio</Link>
              </div>
            </div>
          </motion.div>

          {/* main bar */}
          <div className="flex items-center max-w-8xl mx-auto h-14 md:h-[62px] px-4 sm:px-8 gap-2 md:gap-4">
            {/* Logo */}
            <div className="shrink-0 mr-3 transition-transform active:scale-95">
              <JimvioLogo href="/" size={IsMobile ? "md" : "xl"} className="text-[36px] tracking-[0.03em]" />
            </div>

            {/* Desktop nav */}
            <nav className="hidden min-[1150px]:flex items-center gap-1">

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
                            className="px-3.5 py-2 text-[13px] dark:text-white font-semibold tracking-[0.01em] "
                            // Also wire enter/leave on the button itself for robustness
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
                    <ConsoleButton key={item.href} href={item.href} active={active} className={
                      cn(active ? "font-semibold text-orange-700 dark:text-orange-400" : "text-stone-600 hover:text-orange-500 dark:text-white",
                        "px-3.5 py-2",
                        "px-3.5 text-[13px] font-semibold tracking-[0.01em] py-2 group"
                      )
                    }>
                      <Icon className={cn("h-3.5 w-3.5 shrink-0  text-[var(--color-accent)] group-hover:text-orange-600")} />
                      <span className={active ? "text-orange-700 dark:text-orange-400" : "text-stone-600 group-hover:text-orange-500 dark:text-white"}>{item.label}</span>
                    </ConsoleButton>
                  );
                }
              })}
            </nav>

            {/* Right side */}
            <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">

              {/* Desktop search */}
              <div className="hidden min-[1100px]:block max-w-[260px] w-full shrink min-w-0">
                <NavbarSearch
                  searchQ={searchQ}
                  setSearchQ={setSearchQ}
                  placeholder={marketing.search_placeholder}
                  variant="desktop"
                  runSearch={runSearch}
                  navLinks={navLinks}
                />
              </div>

              {/* AI button */}
              <ConsoleButton
                orange
                className="hidden min-[1200px]:flex shrink-0 px-3.5 py-2 text-[11px] uppercase tracking-widest"
                onClick={() => openAssistant()}
              >
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

              {/* Theme Toggle (wide screens) */}
              <div className="hidden min-[1280px]:flex mr-0.5">
                <ThemeToggle />
              </div>

              <div className="hidden lg:block h-6 w-px mx-1 bg-border/40 shrink-0" />

              {/* User menu / auth */}
              <div className="hidden sm:flex items-center shrink-0">
                {user ? (
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <button className="relative flex items-center justify-center p-0.5 h-9 w-9 rounded-full transition-all border border-border bg-surface shadow-sm active:scale-95 hover:border-orange-400">
                        <Avatar className="h-full w-full rounded-full shrink-0">
                          <AvatarImage src={user.avatar_url ?? undefined} className="object-cover" />
                          <AvatarFallback className="bg-orange-100 rounded-full text-orange-600 text-[10px] font-bold capitalize">
                            {user.full_name?.[0] || user.email?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-60 p-1.5 mt-2 rounded-sm border border-border bg-surface shadow-none outline-none">
                      <div className="px-3 py-1.5 rounded-md mb-1.5 bg-stone-50 dark:bg-stone-900 border border-border">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8 ring-2 rounded-full ring-white shrink-0">
                            <AvatarImage src={user.avatar_url ?? undefined} />
                            <AvatarFallback className="bg-gradient-to-br rounded-full from-orange-400 to-orange-600 text-white text-[10px] font-bold capitalize">
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
                      ].map((item) => (
                        <DropdownMenuItem key={item.href} asChild className="p-0 focus:bg-transparent rounded-sm cursor-pointer">
                          <Link
                            href={item.href}
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-sm text-[13px] font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition-colors"
                            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--color-surface-secondary)")}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            {item.label}
                          </Link>
                        </DropdownMenuItem>
                      ))}

                      <div className="h-px my-1 mx-1 bg-border/60" />

                      <DropdownMenuItem
                        onSelect={async () => { await signOut(); window.location.href = "/"; }}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-sm text-[13px] font-semibold text-red-500 hover:bg-red-500/10 cursor-pointer focus:bg-transparent transition-colors"
                      >
                        <LogOut className="h-4 w-4 shrink-0" />
                        Logout
                      </DropdownMenuItem>

                      <DropdownMenuItem className="min-[1280px]:hidden flex items-center justify-between px-3 py-2.5 rounded-sm text-[13px] font-semibold text-stone-600 dark:text-stone-300 focus:bg-transparent">
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
                    <Link href="/login" className="h-9 px-4 flex items-center rounded-sm text-[12px] font-bold text-stone-600 dark:text-stone-300 border border-border bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white transition-all whitespace-nowrap">
                      Log In
                    </Link>
                    <Link href="/register" className="h-9 px-4 flex items-center rounded-sm text-[12px] font-black uppercase tracking-widest bg-orange-500 text-white hover:bg-orange-600 transition-all active:scale-95 shrink-0 whitespace-nowrap">
                      Join Free
                    </Link>
                  </div>
                )}
              </div>

              {/* Mobile search icon */}
              <ConsoleIconBtn className="md:hidden" onClick={() => setSearchOpen(true)}>
                <Search className="h-[18px] w-[18px]" />
              </ConsoleIconBtn>

              {/* Mobile hamburger */}
              <ConsoleIconBtn className="md:hidden" onClick={() => setMobileOpen(true)}>
                <Menu className="h-5 w-5" />
              </ConsoleIconBtn>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════
          MOBILE SEARCH OVERLAY PORTAL
          ══════════════════════════════════════════ */}
        {portalReady &&
          createPortal(
            <AnimatePresence>
              {searchOpen && (
                <>
                  {/* backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    onClick={() => { setSearchOpen(false); setSearchQ(""); }}
                    className="fixed inset-0 z-[9990] bg-black/50 md:hidden"
                  />

                  {/* sheet */}
                  <motion.div
                    initial={{ y: -16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -16, opacity: 0 }}
                    transition={{ type: "spring", damping: 28, stiffness: 320 }}
                    className="fixed top-20 inset-x-0 z-[9991] md:hidden bg-white dark:bg-[#0a0a0a] border-b border-stone-100 dark:border-white/8 shadow-2xl"
                  >
                    {/* input row */}
                    <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                      <div className="flex-1 flex items-center gap-2.5 bg-stone-50 dark:bg-[#111] border border-[#fd5000]/40 focus-within:border-[#fd5000] rounded-full px-4 h-11 transition-colors duration-150">
                        <Search className="h-4 w-4 text-[#fd5000] shrink-0" />
                        <input
                          autoFocus
                          value={searchQ}
                          onChange={(e) => setSearchQ(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && searchQ.trim()) runSearch(); }}
                          placeholder={marketing.search_placeholder ?? "Search products, stores…"}
                          className="flex-1 bg-transparent text-[14px] text-stone-900 dark:text-white placeholder:text-stone-400 outline-none"
                        />
                        {searchQ && (
                          <button
                            onClick={() => setSearchQ("")}
                            className="flex items-center justify-center h-5 w-5 rounded-full bg-stone-200 dark:bg-stone-700 shrink-0 transition-colors hover:bg-stone-300 dark:hover:bg-stone-600"
                          >
                            <X className="h-3 w-3 text-stone-500 dark:text-stone-300" />
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => { setSearchOpen(false); setSearchQ(""); }}
                        className="text-[13px] font-semibold text-[#fd5000] shrink-0 px-1 active:opacity-60 transition-opacity"
                      >
                        Cancel
                      </button>
                    </div>

                    {/* suggestions */}
                    <div className="px-4 pb-6 max-h-[72vh] overflow-y-auto">
                      {!searchQ.trim() ? (
                        <>
                          <div className="flex items-center gap-2 px-1 pb-2 pt-1">
                            <Flame className="h-3.5 w-3.5 text-orange-500" />
                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Trending</p>
                          </div>
                          <div className="space-y-0.5">
                            {TRENDING_SEARCHES.map((item) => (
                              <button
                                key={item.label}
                                onClick={() => runSearch(item.label)}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-white/5 text-left transition-colors group"
                              >
                                <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", item.bg)}>
                                  <item.icon className="h-4 w-4" style={{ color: item.color }} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[13px] font-semibold text-stone-800 dark:text-white leading-tight">{item.label}</p>
                                  <p className="text-[11px] text-stone-400 mt-0.5">{item.count}</p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-stone-300 dark:text-stone-600 shrink-0 group-hover:text-[#fd5000] transition-colors" />
                              </button>
                            ))}
                          </div>

                          <div className="mt-4 pt-4 border-t border-stone-100 dark:border-white/5">
                            <div className="flex items-center gap-2 px-1 pb-2">
                              <Globe className="h-3.5 w-3.5 text-stone-400" />
                              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Browse</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {navLinks.slice(0, 4).map((l: NavLinkConfig) => {
                                const Icon = iconForHref(l.href);
                                return (
                                  <Link
                                    key={l.href}
                                    href={l.href}
                                    onClick={() => setSearchOpen(false)}
                                    className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-50 dark:bg-white/5 hover:bg-stone-100 dark:hover:bg-white/8 transition-colors"
                                  >
                                    <Icon className="h-4 w-4 text-stone-400 shrink-0" />
                                    <span className="text-[12px] font-semibold text-stone-700 dark:text-stone-300 truncate">{l.label}</span>
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 px-1 pb-2 pt-1">
                            <Search className="h-3.5 w-3.5 text-stone-400" />
                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                              Results for &ldquo;{searchQ}&rdquo;
                            </p>
                          </div>
                          <div className="space-y-0.5">
                            {navLinks
                              .filter((l: NavLinkConfig) => l.label.toLowerCase().includes(searchQ.toLowerCase()))
                              .map((l: NavLinkConfig) => {
                                const Icon = iconForHref(l.href);
                                return (
                                  <Link
                                    key={l.href}
                                    href={l.href}
                                    onClick={() => setSearchOpen(false)}
                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-white/5 transition-colors group"
                                  >
                                    <div className="h-9 w-9 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-100 dark:border-white/5 flex items-center justify-center shrink-0">
                                      <Icon className="h-4 w-4 text-stone-400" />
                                    </div>
                                    <span className="text-[13px] font-semibold text-stone-800 dark:text-white flex-1">{l.label}</span>
                                    <ChevronRight className="h-4 w-4 text-stone-300 dark:text-stone-600 shrink-0 group-hover:text-[#fd5000] transition-colors" />
                                  </Link>
                                );
                              })}
                          </div>

                          <button
                            onClick={() => runSearch()}
                            className="w-full mt-3 flex items-center gap-3 p-3.5 rounded-xl bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/15 border border-orange-100 dark:border-orange-500/20 transition-colors"
                          >
                            <div className="h-9 w-9 rounded-xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center shrink-0">
                              <Search className="h-4 w-4 text-[#fd5000]" />
                            </div>
                            <span className="text-[13px] font-bold text-[#fd5000] text-left flex-1">
                              Search all results for &ldquo;{searchQ}&rdquo;
                            </span>
                            <ChevronRight className="h-4 w-4 text-[#fd5000] shrink-0" />
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>,
            document.body
          )}

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
          <div className="md:hidden fixed bottom-0 inset-x-0 z-[100] h-[68px] pointer-events-none">
            <motion.nav
              initial={{ y: 80 }}
              animate={{ y: navHidden ? 80 : 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="h-full bg-white/95 dark:bg-stone-950/95 backdrop-blur-md border-t border-stone-100 dark:border-white/5 flex items-center px-1 pointer-events-auto relative shadow-[0_-10px_30px_rgba(0,0,0,0.04)]"
            >
              {mobileBottomLinks.map((link) => {
                const active = isActive(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-300",
                      active ? "text-orange-600 dark:text-orange-500" : "text-stone-400 dark:text-stone-600"
                    )}
                  >
                    <div className="relative">
                      <link.icon
                        className={cn("h-5 w-5 transition-all duration-500", active ? "scale-110" : "scale-100")}
                        strokeWidth={active ? 2.5 : 2}
                      />
                      {active && (
                        <motion.div layoutId="mobile-glow" className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full" />
                      )}
                    </div>
                    <span className={cn("text-[10px] font-bold tracking-tight transition-all duration-300", active ? "opacity-100" : "opacity-50")}>
                      {link.label}
                    </span>
                    {active && (
                      <motion.div layoutId="mobile-pill-active" className="absolute top-0 h-[3px] w-8 rounded-b-full bg-orange-500" />
                    )}
                  </Link>
                );
              })}

              <button
                onClick={() => setMobileOpen(true)}
                className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-stone-400 dark:text-stone-600 transition-all duration-300"
              >
                <Menu className="h-5 w-5 stroke-[2px]" />
                <span className="text-[10px] font-bold tracking-tight opacity-50">Menu</span>
              </button>
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
  const toggle = (s: string) => setExpanded((p) => (p === s ? null : s));

  const accountLinks = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/dashboard/library", icon: Video, label: "Digital Library" },
    { href: "/dashboard/settings", icon: Settings, label: "Account Settings" },
  ];

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest px-1 mb-2">{children}</p>
  );

  const NavRow = ({
    href, icon: Icon, label, active,
  }: { href: string; icon: LucideIcon; label: string; active: boolean }) => (
    <Link
      href={href}
      onClick={onClose}
      className={cn(
        "flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-[14px] font-semibold transition-all",
        active
          ? "bg-orange-50 dark:bg-orange-500/10 text-[#fd5000] border border-orange-100 dark:border-orange-500/20"
          : "text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-white/5"
      )}
    >
      <div className={cn(
        "h-8 w-8 rounded-xl flex items-center justify-center shrink-0",
        active ? "bg-orange-100 dark:bg-orange-500/20" : "bg-stone-100 dark:bg-white/5"
      )}>
        <Icon className={cn("h-4 w-4", active ? "text-[#fd5000]" : "text-stone-400 dark:text-stone-500")} />
      </div>
      {label}
      {active && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[#fd5000]" />}
    </Link>
  );

  const ExpandSection = ({
    id, icon: Icon, label, children,
  }: { id: string; icon: LucideIcon; label: string; children: React.ReactNode }) => (
    <div>
      <button
        onClick={() => toggle(id)}
        className={cn(
          "w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-[14px] font-semibold transition-all",
          expanded === id
            ? "bg-stone-100 dark:bg-white/8 text-stone-900 dark:text-white"
            : "text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-white/5"
        )}
      >
        <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0 bg-stone-100 dark:bg-white/5">
          <Icon className="h-4 w-4 text-stone-400 dark:text-stone-500" />
        </div>
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown className={cn("h-4 w-4 text-stone-400 transition-transform duration-300", expanded === id && "rotate-180")} />
      </button>
      <AnimatePresence>
        {expanded === id && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-3 pt-1 pb-1 space-y-0.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const SubItem = ({ href, icon: Icon, color, title, desc }: {
    href: string; icon: LucideIcon; color: string; title: string; desc?: string;
  }) => (
    <Link
      href={href}
      onClick={onClose}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-white/5 hover:text-stone-900 dark:hover:text-white transition-colors group"
    >
      <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0 bg-white dark:bg-[#1a1a1a] border border-stone-100 dark:border-white/5 shadow-sm">
        <Icon className="h-3.5 w-3.5" style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="leading-tight truncate">{title}</p>
        {desc && <p className="text-[11px] text-stone-400 mt-0.5 truncate">{desc}</p>}
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-stone-300 group-hover:text-stone-400 dark:text-stone-600 shrink-0" />
    </Link>
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-[2px]"
          />

          {/* panel */}
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 w-[88%] max-w-[400px] z-[9999] bg-white dark:bg-[#0a0a0a] flex flex-col pointer-events-auto border-l border-stone-100 dark:border-white/5 shadow-2xl"
          >
            {/* header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-[#fd5000] flex items-center justify-center">
                  <Menu className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-[14px] font-bold text-stone-900 dark:text-white tracking-tight">Console</span>
              </div>
              <button
                onClick={onClose}
                className="h-8 w-8 flex items-center justify-center rounded-xl bg-stone-100 dark:bg-white/8 hover:bg-stone-200 dark:hover:bg-white/12 text-stone-500 dark:text-stone-400 transition-all active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* scrollable body */}
            <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-none">
              <div className="px-4 pt-5 pb-4">
                {user ? (
                  <div className="bg-stone-50 dark:bg-[#111] rounded-2xl border border-stone-100 dark:border-white/5 overflow-hidden">
                    <button
                      onClick={() => toggle("account")}
                      className="w-full flex items-center gap-3 p-4 hover:bg-stone-100 dark:hover:bg-white/5 transition-colors"
                    >
                      <Avatar className="h-10 w-10 ring-2 ring-white dark:ring-[#111] shrink-0">
                        <AvatarImage src={user.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-[#fd5000] to-orange-600 text-white text-[11px] font-bold">
                          {user.full_name?.[0] || user.email?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-[14px] font-bold text-stone-900 dark:text-white truncate leading-tight">{user.full_name || "My Account"}</p>
                        <p className="text-[11px] text-stone-400 mt-0.5 truncate">{user.email}</p>
                      </div>
                      <ChevronDown className={cn("h-4 w-4 text-stone-400 shrink-0 transition-transform duration-300", expanded === "account" && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                      {expanded === "account" && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden border-t border-stone-100 dark:border-white/5"
                        >
                          <div className="p-2 space-y-0.5">
                            {accountLinks.map((link) => (
                              <Link
                                key={link.href}
                                href={link.href}
                                onClick={onClose}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-stone-600 dark:text-stone-300 hover:bg-white dark:hover:bg-white/5 hover:text-stone-900 dark:hover:text-white transition-colors"
                              >
                                <link.icon className="h-4 w-4 shrink-0 text-stone-400" />
                                {link.label}
                              </Link>
                            ))}
                            <div className="h-px bg-stone-100 dark:bg-white/5 mx-1 my-1" />
                            <button
                              onClick={async () => { await signOut(); window.location.href = "/"; }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            >
                              <LogOut className="h-4 w-4 shrink-0" />
                              Sign Out
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="bg-stone-50 dark:bg-[#111] rounded-2xl border border-stone-100 dark:border-white/5 p-3 space-y-2">
                    <p className="text-[12px] text-stone-500 dark:text-stone-400 px-1 pb-1">Join the Jimvio network</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href="/login"
                        onClick={onClose}
                        className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white dark:bg-[#1a1a1a] text-[13px] font-semibold text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-white/8 active:scale-95 transition-all"
                      >
                        <User className="h-4 w-4 text-stone-400" />
                        Log In
                      </Link>
                      <Link
                        href="/register"
                        onClick={onClose}
                        className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#fd5000] text-[13px] font-bold text-white shadow-[0_2px_8px_rgba(253,80,0,0.3)] active:scale-95 transition-all"
                      >
                        <Sparkles className="h-4 w-4" />
                        Join Free
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* AI ASSISTANT */}
              <div className="px-4 pb-4">
                <button
                  onClick={() => { openAssistant(); onClose(); }}
                  className="w-full relative flex items-center gap-4 p-4 rounded-2xl bg-[#fd5000] overflow-hidden active:scale-[0.98] transition-all group"
                >
                  <div className="absolute -right-6 -top-6 h-24 w-24 bg-white/15 rounded-full blur-2xl pointer-events-none" />
                  <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 border border-white/20 relative z-10">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left relative z-10 flex-1">
                    <p className="text-[14px] font-bold text-white leading-tight">Neural Core</p>
                    <p className="text-[11px] font-medium text-white/70 mt-0.5">AI Shopping Assistant</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-white/60 group-active:translate-x-0.5 transition-transform relative z-10 shrink-0" />
                </button>
              </div>

              {/* THEME + CURRENCY ROW */}
              <div className="px-4 pb-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 dark:bg-[#111] border border-stone-100 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                        <Sun className="h-3.5 w-3.5 text-amber-500" />
                      </div>
                      <span className="text-[12px] font-semibold text-stone-600 dark:text-stone-300">Theme</span>
                    </div>
                    <ThemeToggle />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 dark:bg-[#111] border border-stone-100 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                      <span className="text-[12px] font-semibold text-stone-600 dark:text-stone-300">USD</span>
                    </div>
                    <Globe className="h-3.5 w-3.5 text-stone-400" />
                  </div>
                </div>
              </div>

              {/* NAVIGATION */}
              <div className="px-4 pb-6">
                <SectionLabel>Navigation</SectionLabel>
                <div className="space-y-1">
                  <NavRow href="/" icon={Home} label="Home" active={pathname === "/"} />

                  <ExpandSection id="market" icon={ShoppingBag} label="Marketplace">
                    {marketplaceVariants.map((v) => (
                      <SubItem key={v.href} href={v.href} icon={v.icon} color={v.color} title={v.title} desc={v.desc} />
                    ))}
                  </ExpandSection>
                  <NavRow href="/communities" icon={Users} label="Communities" active={pathname.startsWith("/communities")} />
                  <NavRow href="/ugc" icon={FileText} label="UGC & clipping" active={pathname.startsWith("/ugc")} />
                  <NavRow href={"/affiliates"} icon={BanknoteIcon} label="Affiliates" active={pathname.startsWith("/affiliates")} />
                  <NavRow href="/help" icon={CircleHelp} label="Help Center" active={pathname.startsWith("/help")} />
                </div>
              </div>

              {/* CURRENCY WIDGET */}
              <div className="px-4 pb-8">
                <SectionLabel>Live Rates</SectionLabel>
                <CurrencyConverterWidget variant="compact" className="mx-0" />
              </div>
            </div>

            {/* footer */}
            <div className="px-5 py-4 border-t border-stone-100 dark:border-white/5 bg-stone-50 dark:bg-[#111] flex items-center justify-between">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Jimvio Protocol</p>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-semibold text-stone-400">Online</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}