"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronDown,
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
  Users,
  Factory,
  Plus,
  Home,
  ShoppingBag,
  Package,
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
import { getNavbarCounts } from "@/lib/actions/marketplace";
import type { MarketingSettings } from "@/lib/platform-settings-shared";

interface NavbarProps {
  user?: { email: string; full_name?: string | null; avatar_url?: string | null } | null;
  marketing: MarketingSettings;
}

function iconForNavHref(href: string): LucideIcon {
  const h = href.replace(/\/$/, "") || "/";
  if (h === "/") return Home;
  if (h.startsWith("/marketplace")) return ShoppingBag;
  if (h.startsWith("/affiliates")) return TrendingUp;
  if (h.startsWith("/influencers")) return Video;
  if (h.startsWith("/communities")) return Users;
  if (h.startsWith("/vendors")) return Factory;
  if (h.startsWith("/clips") || h.startsWith("/clippings")) return Video;
  return Package;
}

function linkIsActive(pathname: string, href: string): boolean {
  const h = href.replace(/\/$/, "") || "/";
  if (h === "/") return pathname === "/";
  return pathname === h || pathname.startsWith(`${h}/`);
}

export function Navbar({ user, marketing }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [counts, setCounts] = useState({ cartCount: 0, chatCount: 0 });
  const pathname = usePathname();
  const router = useRouter();

  const navLinks = marketing.nav_links ?? [];
  const localeStrip = (marketing.locale_strip?.trim() || "EN · USD").trim();

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

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const refreshCounts = () => {
      if (!user) {
        setCounts({ cartCount: 0, chatCount: 0 });
        return;
      }
      getNavbarCounts()
        .then(setCounts)
        .catch((e) => console.error("Navbar: counts failed", e));
    };
    refreshCounts();
    window.addEventListener("cart-updated", refreshCounts);
    return () => window.removeEventListener("cart-updated", refreshCounts);
  }, [user]);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 w-full border-b transition-[box-shadow,background-color] duration-200",
        "border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-xl backdrop-saturate-150",
        "supports-[backdrop-filter]:bg-[var(--color-surface)]/75",
        isScrolled ? "shadow-[var(--shadow-md)]" : "shadow-[var(--shadow-sm)]",
      )}
    >
      <nav>
        <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-5 md:px-8 py-2 sm:py-2.5">
          {/* Primary links — slim strip */}
          <div className="hidden lg:block border-b border-[var(--color-border)]/90 bg-[var(--color-surface-secondary)]/80">
            <div className="flex items-center justify-center gap-0.5 sm:gap-1 min-h-[32px] py-0 overflow-x-auto no-scrollbar">
              {navLinks.map((item) => {
                const Icon = iconForNavHref(item.href);
                const active = linkIsActive(pathname, item.href);
                return (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold tracking-tight shrink-0 rounded-t-md transition-colors",
                      active
                        ? "text-[var(--color-accent)]"
                        : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
                    )}
                  >
                    <Icon className={cn("h-3.5 w-3.5 opacity-70", active && "text-[var(--color-accent)] opacity-100")} />
                    {item.label}
                    {active ? (
                      <span
                        className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-[var(--color-accent)]"
                        aria-hidden
                      />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Logo · search · actions */}
          <div className="flex items-center justify-between gap-3 sm:gap-4 min-h-[52px] py-1.5 sm:py-2 min-w-0">
            <Link
              href="/"
              className="shrink-0 transition-transform active:scale-[0.98] flex items-center min-w-0 max-w-[46%] sm:max-w-none"
            >
              <Image
                src="/jimvio-logo.png"
                alt="Jimvio"
                width={320}
                height={90}
                className="w-[88px] sm:w-[112px] md:w-[140px] lg:w-[168px] h-auto object-contain"
                priority
              />
            </Link>

            <div className="flex-1 hidden lg:flex flex-col min-w-0 max-w-[min(560px,52vw)]">
              <div className="flex items-stretch gap-2 w-full min-w-0">
                <div className="hidden xl:flex shrink-0 items-center gap-2 text-[12px] text-[var(--color-text-secondary)]">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] font-medium tabular-nums">
                    <Globe className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden />
                    {localeStrip}
                  </span>
                  <Link
                    href="/help"
                    className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg font-medium hover:bg-[var(--color-surface-secondary)] transition-colors"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                    Help
                  </Link>
                </div>
                <form
                  className="flex-1 min-w-0 flex rounded-xl overflow-hidden h-10 bg-[var(--color-surface)] ring-1 ring-ink-darker/10 shadow-[var(--shadow-sm)] focus-within:ring-2 focus-within:ring-[var(--color-accent)]/35 focus-within:shadow-[var(--shadow-md)] transition-shadow"
                  onSubmit={(e) => {
                    e.preventDefault();
                    runSearch(searchQ);
                  }}
                >
                  <label className="sr-only" htmlFor="nav-search-q">
                    Search marketplace
                  </label>
                  <Link
                    href="/marketplace"
                    className="pl-3 pr-2.5 flex items-center gap-1 bg-zinc-50/90 border-r border-[var(--color-border)] text-[12px] font-semibold text-[var(--color-text-secondary)] hover:bg-zinc-100 transition-colors whitespace-nowrap min-w-[88px]"
                  >
                    All <ChevronDown className="h-3 w-3 opacity-50" />
                  </Link>
                  <input
                    id="nav-search-q"
                    type="search"
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    placeholder={marketing.search_placeholder}
                    autoComplete="off"
                    className="flex-1 min-w-0 px-3 text-[14px] outline-none font-medium placeholder:text-[var(--color-text-muted)] bg-transparent"
                  />
                  <button
                    type="submit"
                    className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-4 flex items-center justify-center transition-colors"
                    aria-label="Search"
                  >
                    <Search className="h-4 w-4" strokeWidth={2.25} />
                  </button>
                </form>
              </div>
            </div>

            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 flex-nowrap min-w-0">
              {user ? (
                <>
                  <div className="flex items-center">
                    <Link
                      href="/cart"
                      className="relative p-2 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-secondary)] transition-colors"
                    >
                      <ShoppingCart className="h-[22px] w-[22px]" />
                      {counts.cartCount > 0 ? (
                        <span className="absolute top-1 right-1 h-4 min-w-[1rem] px-0.5 bg-[var(--color-accent)] text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-[var(--color-surface)]">
                          {counts.cartCount > 9 ? "9+" : counts.cartCount}
                        </span>
                      ) : null}
                    </Link>
                    <Link
                      href="/messages"
                      className="relative p-2 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-secondary)] transition-colors"
                    >
                      <MessageCircle className="h-[22px] w-[22px]" />
                      {counts.chatCount > 0 ? (
                        <span className="absolute top-1 right-1 h-4 min-w-[1rem] px-0.5 bg-[var(--color-accent)] text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-[var(--color-surface)]">
                          {counts.chatCount > 9 ? "9+" : counts.chatCount}
                        </span>
                      ) : null}
                    </Link>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-2 pl-1 pr-1 sm:pr-2 py-1 rounded-xl hover:bg-[var(--color-surface-secondary)] transition-colors outline-none"
                      >
                        {user.avatar_url ? (
                          <Avatar className="h-8 w-8 border border-[var(--color-border)]">
                            <AvatarImage src={user.avatar_url} alt="" />
                            <AvatarFallback className="text-xs bg-[var(--color-accent)] text-white font-semibold">
                              {user.full_name?.charAt(0) || user.email.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white text-xs font-semibold border border-white shadow-sm">
                            {(user.full_name?.charAt(0) || user.email.charAt(0)).toUpperCase()}
                          </div>
                        )}
                        <span className="hidden md:inline text-[12px] font-semibold text-[var(--color-text-secondary)] max-w-[7rem] truncate">
                          {user.full_name?.split(" ")[0] || "Account"}
                        </span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-xl">
                      <DropdownMenuLabel>
                        <div className="flex flex-col space-y-0.5">
                          <p className="text-sm font-semibold truncate">{user.full_name || "Creator"}</p>
                          <p className="text-[11px] text-muted-foreground font-normal truncate">{user.email}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard" className="cursor-pointer flex items-center gap-2">
                          <LayoutDashboard className="h-4 w-4" />
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/settings" className="cursor-pointer flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600 cursor-pointer flex items-center gap-2"
                        onSelect={async () => {
                          await signOut();
                          window.location.href = "/";
                        }}
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <div className="flex items-center">
                  <Link
                    href="/cart"
                    className="relative p-2 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-secondary)] transition-colors"
                  >
                    <ShoppingCart className="h-[22px] w-[22px]" />
                  </Link>
                  <Link
                    href="/login"
                    className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-[var(--color-surface-secondary)] transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)]">
                      <User className="h-4 w-4" />
                    </div>
                    <span className="hidden sm:inline text-[12px] font-semibold text-[var(--color-text-secondary)]">
                      Sign in
                    </span>
                  </Link>
                </div>
              )}

              <Link href={marketing.primary_cta.href} className="hidden lg:block ml-1">
                <Button
                  size="sm"
                  className="h-9 rounded-xl px-4 text-[13px] font-semibold bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white shadow-[var(--shadow-sm)] border-0"
                >
                  {marketing.primary_cta.label}
                </Button>
              </Link>

              <button
                type="button"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
                className="lg:hidden flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] active:scale-[0.98] transition-all shadow-[var(--shadow-sm)]"
                onClick={() => setMobileOpen((o) => !o)}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {portalReady &&
          createPortal(
            <AnimatePresence>
              {mobileOpen ? (
                <>
                  <motion.div
                    key="m-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="lg:hidden fixed inset-0 bg-ink-darker/45 backdrop-blur-[2px] z-[9998]"
                    aria-hidden
                    onClick={() => setMobileOpen(false)}
                  />
                  <motion.div
                    key="m-drawer"
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", damping: 32, stiffness: 360 }}
                    className="lg:hidden fixed inset-y-0 right-0 z-[9999] w-[min(100%,380px)] overflow-y-auto bg-[var(--color-surface)] border-l border-[var(--color-border)] shadow-2xl pt-[env(safe-area-inset-top,0px)]"
                  >
                    <div className="sticky top-0 flex items-center justify-between gap-3 px-4 py-3.5 bg-[var(--color-surface)]/95 backdrop-blur-md border-b border-[var(--color-border)] z-10">
                      <span className="text-[15px] font-semibold text-[var(--color-text-primary)]">Menu</span>
                      <button
                        type="button"
                        aria-label="Close menu"
                        className="p-2 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]"
                        onClick={() => setMobileOpen(false)}
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="p-4 flex flex-col gap-4 pb-24">
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-[var(--color-text-secondary)] bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
                          <Globe className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                          {localeStrip}
                        </span>
                        <Link
                          href="/help"
                          onClick={() => setMobileOpen(false)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium border border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]"
                        >
                          <HelpCircle className="h-3.5 w-3.5" />
                          Help
                        </Link>
                      </div>

                      <form
                        className="flex rounded-xl overflow-hidden h-12 bg-[var(--color-surface)] ring-1 ring-ink-darker/10 shadow-[var(--shadow-sm)] focus-within:ring-2 focus-within:ring-[var(--color-accent)]/35"
                        onSubmit={(e) => {
                          e.preventDefault();
                          runSearch(searchQ);
                        }}
                      >
                        <Link
                          href="/marketplace"
                          onClick={() => setMobileOpen(false)}
                          className="pl-3 pr-2 flex items-center gap-1 bg-zinc-50 border-r border-[var(--color-border)] text-[12px] font-semibold text-[var(--color-text-secondary)] min-w-[76px]"
                        >
                          All <ChevronDown className="h-3 w-3 opacity-50" />
                        </Link>
                        <input
                          type="search"
                          value={searchQ}
                          onChange={(e) => setSearchQ(e.target.value)}
                          placeholder={marketing.search_placeholder}
                          className="flex-1 min-w-0 px-3 text-[15px] outline-none font-medium placeholder:text-[var(--color-text-muted)] bg-transparent"
                        />
                        <button
                          type="submit"
                          className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-4 flex items-center justify-center shrink-0"
                          aria-label="Search"
                        >
                          <Search className="h-4 w-4" strokeWidth={2.25} />
                        </button>
                      </form>

                      <div className="h-px bg-[var(--color-border)]" />

                      <div className="space-y-1">
                        {navLinks.map((item) => {
                          const Icon = iconForNavHref(item.href);
                          const active = linkIsActive(pathname, item.href);
                          return (
                            <Link
                              key={`mob-${item.href}-${item.label}`}
                              href={item.href}
                              onClick={() => setMobileOpen(false)}
                              className={cn(
                                "flex items-center gap-3 py-3 px-3 rounded-xl text-[15px] font-semibold transition-colors",
                                active
                                  ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                                  : "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]",
                              )}
                            >
                              <span
                                className={cn(
                                  "flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)]",
                                  active && "border-[var(--color-accent)]/30 bg-white",
                                )}
                              >
                                <Icon className="h-[18px] w-[18px]" />
                              </span>
                              {item.label}
                            </Link>
                          );
                        })}
                      </div>

                      <Link
                        href={marketing.primary_cta.href}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center justify-between gap-3 py-3.5 px-4 rounded-xl bg-[var(--color-accent)] text-white font-semibold shadow-[var(--shadow-md)] active:scale-[0.99] transition-transform"
                      >
                        <span>{marketing.primary_cta.label}</span>
                        <Plus className="h-5 w-5 opacity-90" />
                      </Link>

                      {!user ? (
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <Link
                            href="/login"
                            className="py-3.5 text-center rounded-xl border border-[var(--color-border)] font-semibold text-sm hover:bg-[var(--color-surface-secondary)]"
                            onClick={() => setMobileOpen(false)}
                          >
                            Log in
                          </Link>
                          <Link
                            href="/register"
                            className="py-3.5 text-center rounded-xl bg-[var(--color-text-primary)] text-white font-semibold text-sm hover:opacity-90"
                            onClick={() => setMobileOpen(false)}
                          >
                            Join
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  </motion.div>
                </>
              ) : null}
            </AnimatePresence>,
            document.body,
          )}
      </nav>
    </header>
  );
}
