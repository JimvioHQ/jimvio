"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ShoppingCart, MessageSquare, LayoutDashboard, Globe,
  Video, Settings, LogOut, Search, ChevronDown,
  ChevronRight, Sparkles, ArrowRight, Sun, Zap, Package,
  Menu,
  ShoppingBag,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
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
import { isDashboardActive } from "@/lib/navigation/primary-nav";
import { ConsoleButton, ConsoleIconBtn } from "./console-button";
import { MobileSearchOverlay } from "./mobile-search-overlay";
import { MobileDrawer } from "./mobile-drawer";
import { MobileBottomNav } from "./mobile-bottom-nav";
import {
  useScrollDirection, ensureCoreNavLinks, isActive, DROPDOWN_CLOSE_DELAY,
} from "./navbar-helpers";

interface NavbarProps {
  user?: { email: string; full_name?: string | null; avatar_url?: string | null } | null;
  marketing: MarketingSettings;
}

export function Navbar({ user, marketing }: NavbarProps) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const marketplaceTimer = useRef<NodeJS.Timeout | null>(null);
  const { isMobile } = useIsMobile();
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
    [router, searchQ],
  );

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
            ? "bg-white/90 dark:bg-[#122019]/90 backdrop-blur-2xl shadow-[0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_1px_0_rgba(255,255,255,0.04)]"
            : "bg-white/70 dark:bg-[#122019]/70 backdrop-blur-xl",
        )}
      >
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/10 pointer-events-none" />
        <div className="min-w-0 w-full overflow-x-hidden">
          {!pathname.startsWith("/dashboard") && (
            <motion.div
              style={{ height: topBarH, opacity: topBarOpacity }}
              className="hidden md:block dark:bg-black/20 border-b border-border"
            >
              <div className="max-w-8xl mx-auto md:flex items-center justify-between px-8 shrink-0">
                <div className="flex items-center justify-between gap-6">
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
          )}

          <div className="grid w-full min-w-0 max-w-8xl mx-auto h-14 md:h-[62px] px-4 sm:px-8 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 sm:gap-x-3">
            <div className="shrink-0 mr-3 transition-transform active:scale-95">
              <JimvioLogo href="/" size={isMobile ? "md" : "lg"} className="tracking-[0.03em]" />
            </div>

            <nav className="hidden min-[1240px]:flex min-w-0 flex-nowrap items-center justify-start gap-1 overflow-hidden px-1 xl:gap-1.5">
              {navLinks.map((item) => {
                const active = isActive(pathname, item.href);
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
                  );
                }
                return (
                  <ConsoleButton
                    key={item.href}
                    href={item.href}
                    active={active}
                    className="px-3.5 py-2 text-[13px] font-semibold tracking-[0.01em]"
                  >
                    {item.label}
                  </ConsoleButton>
                );
              })}
            </nav>

            <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 min-w-0">
              <ConsoleIconBtn href="/cart" badge={cartCount}>
                <ShoppingBag  className="h-[18px] w-[18px]" />
              </ConsoleIconBtn>

              <div className="hidden min-[1280px]:flex mr-0.5">
                <ThemeToggle />
              </div>

              <div className="hidden lg:block h-6 w-px mx-0.5 bg-border/40 shrink-0" />

              {user && (
                <ConsoleButton
                  href="/dashboard"
                  active={isDashboardActive(pathname)}
                  className="hidden h-9 shrink-0 gap-1 px-2.5 py-0 text-[11px] font-semibold sm:inline-flex sm:px-3 sm:text-xs"
                >
                  <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
                  <span className="whitespace-nowrap">Dashboard</span>
                </ConsoleButton>
              )}

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
                    <DropdownMenuContent align="end" className="w-60 p-1.5 mt-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg outline-none">
                      <div className="px-3 py-1.5 rounded-lg mb-1.5 bg-[var(--color-surface-secondary)]">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8 ring-2 rounded-full ring-[var(--color-border)] shrink-0">
                            <AvatarImage src={user.avatar_url ?? undefined} />
                            <AvatarFallback className="bg-gradient-to-br rounded-full 
                            from-orange-400 to-orange-600 leading-tight text-white text-[10px] font-bold capitalize">
                              {user.full_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate leading-tight">{user.full_name}</p>
                            <p className="text-[10px] text-[var(--color-text-muted)] truncate">{user.email}</p>
                          </div>
                        </div>
                      </div>

                      {[
                        { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
                        { href: "/dashboard/library", icon: Video, label: "Digital Library" },
                        { href: "/dashboard/settings", icon: Settings, label: "My Account" },
                      ].map((item) => (
                        <DropdownMenuItem key={item.href} asChild className="p-0 focus:bg-transparent rounded-lg cursor-pointer">
                          <Link
                            href={item.href}
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[12px] font-normal text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition-colors"
                          >
                            <item.icon className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                            {item.label}
                          </Link>
                        </DropdownMenuItem>
                      ))}

                      <div className="h-px my-1 mx-1 bg-[var(--color-border)]" />

                      <DropdownMenuItem asChild className="p-0 focus:bg-transparent rounded-lg cursor-pointer">
                        <button onClick={() => setSearchOpen(true)} className="flex items-center gap-2.5 px-3 py-2.5 w-full rounded-lg text-[13px] font-normal text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition-colors text-left">
                          <Search className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                          Search
                        </button>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild className="p-0 focus:bg-transparent rounded-lg cursor-pointer">
                        <button onClick={() => openAssistant()} className="flex items-center gap-2.5 px-3 py-2.5 w-full rounded-lg text-[13px] font-normal text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition-colors text-left">
                          <Sparkles className="h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                          AI Assistant
                        </button>
                      </DropdownMenuItem>

                      {user && (
                        <DropdownMenuItem asChild className="p-0 focus:bg-transparent rounded-lg cursor-pointer">
                          <Link href="/dashboard/messages" className="flex items-center gap-2.5 px-3 py-2.5 w-full rounded-lg text-[13px] font-normal text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition-colors">
                            <MessageSquare className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                            Messages
                            {chatCount > 0 && (
                              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-accent)] px-1.5 text-[10px] font-bold text-white">
                                {chatCount > 99 ? "99+" : chatCount}
                              </span>
                            )}
                          </Link>
                        </DropdownMenuItem>
                      )}

                      <div className="h-px my-1 mx-1 bg-[var(--color-border)]" />

                      <DropdownMenuItem
                        onSelect={async () => { await signOut(); window.location.href = "/"; }}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-semibold text-red-500 hover:bg-red-500/10 cursor-pointer focus:bg-transparent transition-colors"
                      >
                        <LogOut className="h-4 w-4 shrink-0" />
                        Logout
                      </DropdownMenuItem>

                      <DropdownMenuItem className="min-[1280px]:hidden flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] font-semibold text-[var(--color-text-secondary)] focus:bg-transparent">
                        <div className="flex items-center gap-2.5">
                          <Sun className="h-4 w-4 text-[var(--color-text-muted)]" />
                          Night Mode
                        </div>
                        <ThemeToggle />
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="flex items-center gap-3 shrink-0">
                    <a href="/login" className="px-3.5 py-2 text-[var(--color-text-primary)]/70 hover:text-[var(--color-text-primary)] transition-colors duration-300 font-body text-sm">
                      Sign in
                    </a>
                    <a href="/register" className="px-5 py-2.5 rounded-full bg-[var(--color-accent)] text-[var(--color-bg)] font-body font-semibold text-sm hover:bg-[var(--color-accent-hover)] transition-colors duration-300 shadow-lg shadow-[var(--color-accent)]/15">
                      Get started
                    </a>
                  </div>
                )}
              </div>

              <ConsoleIconBtn className="md:hidden" onClick={() => setSearchOpen(true)}>
                <Search className="h-[18px] w-[18px]" />
              </ConsoleIconBtn>

              <ConsoleIconBtn className="md:hidden" onClick={() => setMobileOpen(true)}>
                <Menu className="h-5 w-5" />
              </ConsoleIconBtn>
            </div>
          </div>
        </div>

        {portalReady && createPortal(
          <MobileSearchOverlay
            open={searchOpen}
            query={searchQ}
            onQueryChange={setSearchQ}
            onSearch={runSearch}
            onClose={() => { setSearchOpen(false); setSearchQ(""); }}
            navLinks={navLinks}
            placeholder={marketing.search_placeholder}
          />,
          document.body,
        )}

        {portalReady && createPortal(
          <MobileDrawer
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            user={user}
            pathname={pathname}
            marketplaceVariants={marketplaceVariants}
            navLinks={navLinks}
            openAssistant={openAssistant}
          />,
          document.body,
        )}
      </div>

      {portalReady && createPortal(
        <MobileBottomNav hidden={navHidden} onMenuOpen={() => setMobileOpen(true)} />,
        document.body,
      )}
    </header>
  );
}
