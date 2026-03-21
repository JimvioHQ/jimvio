"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Globe, MessageSquare, UserRound, Menu, Settings, LogOut } from "lucide-react";
import { Sidebar, type DashboardRole } from "@/components/dashboard/sidebar";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserProfile {
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

function DashboardShellContent({ children }: { children: React.ReactNode }) {
  const [activeRoles, setActiveRoles] = useState<DashboardRole[]>(["buyer"]);
  const [user, setUser] = useState<UserProfile>({ email: "", full_name: null, avatar_url: null });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function loadUserAndRoles() {
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

      const roles: DashboardRole[] = ["buyer"];

      const [vendorRes, affiliateRes, influencerRes, communityRes] = await Promise.all([
        supabase.from("vendors").select("id").eq("user_id", authUser.id).maybeSingle(),
        supabase.from("affiliates").select("id").eq("user_id", authUser.id).maybeSingle(),
        supabase.from("influencers").select("id").eq("user_id", authUser.id).maybeSingle(),
        supabase.from("communities").select("id").eq("owner_id", authUser.id).maybeSingle(),
      ]);

      if (vendorRes.data) roles.push("vendor");
      if (affiliateRes.data) roles.push("affiliate");
      if (influencerRes.data) roles.push("influencer");
      if (communityRes.data) roles.push("community");

      setActiveRoles(roles);
    }

    loadUserAndRoles();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-surface-secondary)]">
      <Sidebar
        user={user}
        activeRoles={activeRoles}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Mobile header — logo + account menu */}
        <header className="lg:hidden sticky top-0 z-40 shrink-0 pt-[env(safe-area-inset-top)] border-b border-[var(--color-border)]/80 bg-[var(--color-surface)]/80 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-[var(--color-surface)]/70">
          <div className="flex items-center justify-between gap-3 px-3 sm:px-4 py-2.5">
            <Link href="/dashboard" className="shrink-0 py-1" aria-label="Dashboard home">
              <Image src="/jimvio-logo.png" alt="Jimvio" width={128} height={40} priority className="h-7 w-auto sm:h-8" />
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)]/70 bg-[var(--color-surface-secondary)]/80 text-[var(--color-text-muted)] shadow-sm outline-none transition-colors hover:text-[var(--color-text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 active:scale-[0.98] touch-manipulation"
                  aria-label="Account menu"
                >
                  <UserRound className="h-5 w-5" strokeWidth={1.35} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 z-[100]">
                <DropdownMenuLabel className="font-normal normal-case tracking-normal">
                  <span className="block truncate text-sm font-semibold text-[var(--color-text-primary)]">
                    {user.full_name || user.email?.split("@")[0] || "Account"}
                  </span>
                  {user.email ? (
                    <span className="block truncate text-xs font-normal text-[var(--color-text-muted)]">{user.email}</span>
                  ) : null}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/dashboard/settings" className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 shrink-0 opacity-70" strokeWidth={1.35} />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/dashboard/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4 shrink-0 opacity-70" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                  <form action={signOut} className="w-full">
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 outline-none hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <LogOut className="h-4 w-4 shrink-0" />
                      Sign out
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-[calc(5.25rem+env(safe-area-inset-bottom))] lg:pb-0 overscroll-y-contain">
          <div className="px-3 py-4 sm:px-5 sm:py-5 lg:p-6 max-w-[1400px] mx-auto max-lg:max-w-none">{children}</div>
        </main>

        {/* Mobile bottom nav — floating glass bar */}
        <nav
          className="lg:hidden fixed left-0 right-0 z-30 pointer-events-none"
          style={{ bottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))" }}
          aria-label="Primary"
        >
          <div className="pointer-events-auto mx-3 rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/85 backdrop-blur-xl backdrop-saturate-150 shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.12),0_8px_32px_-8px_rgba(249,115,22,0.18)] supports-[backdrop-filter]:bg-[var(--color-surface)]/72">
            <div className="flex items-stretch justify-between px-0.5 py-1 min-h-[3.5rem]">
              <BottomNavLink href="/dashboard" icon={<LayoutDashboard className="h-[1.35rem] w-[1.35rem]" />} label="Home" />
              <BottomNavLink
                href="/dashboard/marketplace"
                icon={<Globe className="h-[1.35rem] w-[1.35rem]" />}
                label="Shop"
                activeMatch={(p) => p.startsWith("/dashboard/marketplace") || p.startsWith("/marketplace")}
              />
              <BottomNavLink href="/dashboard/messages" icon={<MessageSquare className="h-[1.35rem] w-[1.35rem]" />} label="Inbox" />
              <BottomNavMore onClick={() => setMobileMenuOpen(true)} />
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}

function BottomNavMore({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1.5 rounded-xl transition-colors duration-200 active:opacity-80",
        "touch-manipulation select-none text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      )}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-200">
        <Menu className="h-[1.35rem] w-[1.35rem]" />
      </span>
      <span className="text-[9px] sm:text-[10px] font-semibold tracking-tight truncate max-w-[4.25rem] text-center leading-tight">
        More
      </span>
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
        "flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1.5 rounded-xl transition-colors duration-200 active:opacity-80",
        "touch-manipulation select-none",
        isActive
          ? "text-[var(--color-accent)] bg-[var(--color-accent-light)]/90"
          : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-200",
          isActive && "scale-105"
        )}
      >
        {icon}
      </span>
      <span className="text-[9px] sm:text-[10px] font-semibold tracking-tight truncate max-w-[4.25rem] text-center leading-tight">
        {label}
      </span>
    </Link>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[var(--color-surface-secondary)]">Loading...</div>}>
      <DashboardShellContent>{children}</DashboardShellContent>
    </Suspense>
  );
}
