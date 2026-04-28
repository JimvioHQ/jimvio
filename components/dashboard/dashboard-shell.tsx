"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Globe, MessageSquare, UserRound, Menu, Settings, Wallet, Search, Bell } from "lucide-react";
import { Sidebar, type DashboardRole } from "@/components/dashboard/sidebar";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { CurrencySelector } from "@/context/CurrencyContext";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface UserProfile {
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

import { useUserStore } from "@/lib/store/use-user-store";

function DashboardShellContent({ children }: { children: React.ReactNode }) {
  const { activeRoles, fetchRoles } = useUserStore();
  const [user, setUser] = useState<UserProfile>({ email: "", full_name: null, avatar_url: null });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const initials = user.full_name
    ? user.full_name.substring(0, 2).toUpperCase()
    : user.email ? user.email.substring(0, 2).toUpperCase() : "U";

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name, avatar_url")
        .eq("id", authUser.id)
        .single();

      if (profile) {
        setUser({ email: profile.email, full_name: profile.full_name, avatar_url: profile.avatar_url });
      }
    }

    loadUser();
    fetchRoles();
  }, [fetchRoles]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        user={user}
        activeRoles={activeRoles}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="sticky top-0 z-40 shrink-0 bg-surface border-b border-border">
          <div className="flex items-center justify-between gap-4 px-4 sm:px-6 h-14 w-full">

            {/* Mobile: Hamburger */}
            <div className="lg:hidden flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="flex items-center justify-center h-10 w-10 rounded-sm bg-background border border-border"
              >
                <Menu className="h-5 w-5 text-stone-500" />
              </button>
            </div>

            {/* Breadcrumb / Title placeholder — Shopify Style */}
            <div className="hidden lg:flex items-center gap-2">
              <h1 className="text-[14px] font-bold text-stone-900 dark:text-white uppercase tracking-tight">Dashboard</h1>
            </div>

            {/* Desktop: Global Command Search */}
            <div className="flex-1 max-w-lg hidden md:block">
              <div className="relative group">
                <Input
                  icon={<Search className="absolute left-1 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                  }
                  type="text"
                  placeholder="Search apps, products, orders..."
                  className="w-full h-9 pl-9 pr-4 rounded-sm text-[13px] bg-surface border border-border
                   text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
                   focus:border-orange-500/50 focus:bg-surface transition-all outline-none"
                />
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Currency */}
              <div className="hidden sm:block">
                <CurrencySelector
                  className="h-9 rounded-sm text-[11px] font-bold bg-surface border border-border px-3 text-[var(--color-text-secondary)] hover:bg-background transition-colors"
                />
              </div>

              {/* Notifications */}
              <Link
                href="/dashboard/notifications"
                className="flex items-center justify-center h-9 w-9 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-all active:scale-95 relative bg-surface border border-border"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-orange-500 rounded-sm border border-white dark:border-stone-900" />
              </Link>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-1 rounded-full transition-all hover:shadow-none active:scale-95 bg-surface border border-border hover:bg-background">
                    <div className="w-7 h-7 rounded-full bg-background flex items-center justify-center text-[10px] font-bold text-[var(--color-text-secondary)] border border-border overflow-hidden">
                      {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : initials}
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 rounded-sm p-2 shadow-none border border-border bg-surface"
                >
                  <DropdownMenuLabel className="px-3 py-2">
                    <p className="text-xs font-semibold tracking-[0.05em] text-stone-900 dark:text-white uppercase">{user.full_name || 'Account'}</p>
                    <p className="text-[10px] font-medium text-stone-400 dark:text-stone-600 truncate">{user.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-stone-100/60 dark:bg-stone-800" />
                  <DropdownMenuItem asChild className="rounded-sm focus:bg-orange-500/10 cursor-pointer">
                    <Link href="/dashboard/settings" className="flex items-center gap-2.5 p-2.5">
                      <UserRound className="h-4 w-4 text-stone-400 dark:text-text-muted" />
                      <span className="text-[12px] font-bold text-stone-700 dark:text-stone-300">Profile Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-sm focus:bg-orange-500/10 cursor-pointer">
                    <Link href="/dashboard/wallet" className="flex items-center gap-2.5 p-2.5">
                      <Wallet className="h-4 w-4 text-orange-500 dark:text-stone-500" />
                      <span className="text-[12px] font-bold text-stone-700 dark:text-stone-300">My Wallet</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-stone-100/60 dark:bg-stone-800" />
                  <div className="p-1">
                    <SignOutButton variant="menu" />
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden relative bg-background">
          <div className="px-4 py-6 sm:px-6 sm:py-8 lg:p-10 max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>

        {/* ══════════════════════════════════════
            MOBILE BOTTOM NAV — Frosted Bar
        ══════════════════════════════════════ */}
        <nav
          className="lg:hidden fixed bottom-5 left-5 right-5 z-40 rounded-sm overflow-hidden bg-surface border border-border shadow-none"
        >
          <div className="flex items-center justify-around h-[60px]">
            <BottomNavLink href="/dashboard" icon={<LayoutDashboard className="h-5 w-5" />} label="Home" />
            <BottomNavLink
              href="/dashboard/marketplace"
              icon={<Globe className="h-5 w-5" />}
              label="Shop"
              activeMatch={(p) => p.startsWith("/dashboard/marketplace") || p.startsWith("/marketplace")}
            />
            <BottomNavLink href="/dashboard/messages" icon={<MessageSquare className="h-5 w-5" />} label="Inbox" />
            <BottomNavMore onClick={() => setMobileMenuOpen(true)} />
          </div>
        </nav>
      </div>
    </div>
  );
}

function BottomNavMore({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1 flex-1 text-stone-400 dark:text-text-muted hover:text-stone-900 dark:text-white dark:hover:text-stone-200 transition-all active:scale-95"
    >
      <Menu className="h-5 w-5" />
      <span className="text-[9px] font-bold uppercase tracking-widest">More</span>
    </button>
  );
}

function BottomNavLink({
  href,
  icon,
  label,
  activeMatch,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  activeMatch?: (pathname: string) => boolean;
}) {
  const pathname = usePathname();
  const isActive = activeMatch
    ? activeMatch(pathname)
    : pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-1 flex-1 transition-all active:scale-95",
        isActive ? "text-orange-600" : "text-stone-400 dark:text-text-muted"
      )}
    >
      {icon}
      <span className="text-[9px] font-bold uppercase tracking-widest leading-none">
        {label}
      </span>
    </Link>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<DashboardLoadingSkeleton />}>
      <DashboardShellContent>{children}</DashboardShellContent>
    </Suspense>
  );
}

function DashboardLoadingSkeleton() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f5f5] dark:bg-[#0a0a0a] px-4 py-10 gap-10 animate-in fade-in duration-500">

      {/* ── Spinner + Label ── */}
      <div className="flex flex-col items-center gap-5">
        <div className="relative w-[72px] h-[72px]">
          {/* outer spinning ring */}
          <svg
            className="absolute inset-0 animate-spin"
            style={{ animationDuration: "1.1s" }}
            width="72" height="72" viewBox="0 0 72 72"
          >
            <circle cx="36" cy="36" r="30" fill="none" stroke="#e8e8e8" strokeWidth="3" />
            <circle
              cx="36" cy="36" r="30" fill="none"
              stroke="#fd5000" strokeWidth="3"
              strokeLinecap="round" strokeDasharray="60 130"
            />
          </svg>
          {/* inner icon surface */}
          <div className="absolute inset-[10px] rounded-[14px] bg-white dark:bg-[#111111] border border-[#e8e8e8] dark:border-[#222222] flex items-center justify-center">
            <LayoutDashboard className="h-5 w-5 text-[#fd5000]" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <p className="text-[11px] font-black text-[#11181c] dark:text-[#ededed] uppercase tracking-[0.3em]">
            Loading Console
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-[10px] font-bold text-[#889096] dark:text-[#6a6a6a] uppercase tracking-[0.2em]">
              Establishing parameters
            </span>
            <span className="flex gap-[3px] items-center">
              {[0, 200, 400].map((delay) => (
                <span
                  key={delay}
                  className="w-[3px] h-[3px] rounded-full bg-[#fd5000] animate-pulse"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </span>
          </div>
        </div>
      </div>

      {/* ── Skeleton Layout ── */}
      <div className="w-full max-w-3xl flex flex-col gap-3">

        {/* Wallet skeleton */}
        <div className="bg-white dark:bg-[#111111] border border-[#e8e8e8] dark:border-[#222222] rounded-[24px] p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-[46px] h-[46px] rounded-[13px]" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-[9px] w-[90px] rounded" />
                <Skeleton className="h-[13px] w-[130px] rounded" />
              </div>
            </div>
            <Skeleton className="w-[38px] h-[38px] rounded-[11px]" />
          </div>
          <div className="flex items-end justify-between">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-[9px] w-[110px] rounded" />
              <Skeleton className="h-[40px] w-[180px] rounded-lg" />
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Skeleton className="h-[28px] w-[130px] rounded-[10px]" />
              <Skeleton className="h-[10px] w-[100px] rounded" />
            </div>
          </div>
        </div>

        {/* Quick actions skeleton */}
        <div className="grid grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[82px] rounded-[20px]" />
          ))}
        </div>

        {/* Chart + side cards */}
        <div className="grid grid-cols-[1fr_200px] gap-3">
          <div className="bg-white dark:bg-[#111111] border border-[#e8e8e8] dark:border-[#222222] rounded-[18px] p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-[16px] w-[150px] rounded" />
                <Skeleton className="h-[9px] w-[100px] rounded" />
              </div>
              <Skeleton className="h-[26px] w-[80px] rounded-lg" />
            </div>
            {/* Animated bar chart skeleton */}
            <div className="flex items-end gap-2 h-[130px] pb-1">
              {[45, 65, 52, 88, 72, 95, 80].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-md animate-pulse bg-[#efefef] dark:bg-[#1a1a1a]"
                  style={{ height: `${h}%`, animationDelay: `${i * 80}ms` }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Skeleton className="h-[110px] rounded-[18px]" />
            <Skeleton className="h-[110px] rounded-[18px]" />
          </div>
        </div>

        {/* Role section skeletons */}
        <div className="grid grid-cols-2 gap-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#111111] border border-[#e8e8e8] dark:border-[#222222] rounded-[18px] p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Skeleton className="w-[26px] h-[26px] rounded-lg" />
                <Skeleton className="h-[10px] w-[100px] rounded" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-[100px] rounded-[14px]" />
                <Skeleton className="h-[100px] rounded-[14px]" />
              </div>
              <Skeleton className="h-[40px] rounded-[12px]" />
              <Skeleton className="h-[40px] rounded-[12px]" />
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("relative overflow-hidden bg-[#efefef] dark:bg-[#1a1a1a]", className)}
      style={{
        backgroundImage:
          "linear-gradient(90deg, #efefef 25%, #f8f8f8 50%, #efefef 75%)",
        backgroundSize: "600px 100%",
        animation: "shimmer 1.6s infinite linear",
      }}
    />
  );
}
