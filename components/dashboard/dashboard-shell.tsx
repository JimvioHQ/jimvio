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
    <div className="flex h-screen overflow-hidden bg-[#f8f7f5]">
      <Sidebar
        user={user}
        activeRoles={activeRoles}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* ══════════════════════════════════════
            HEADER — Frosted Glass iOS 17
        ══════════════════════════════════════ */}
        <header
          className="sticky top-0 z-40 shrink-0"
          style={{
            background: "rgba(248,247,245,0.75)",
            backdropFilter: "blur(40px) saturate(180%)",
            WebkitBackdropFilter: "blur(40px) saturate(180%)",
            borderBottom: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 h-[60px] max-w-[1400px] mx-auto w-full">
            
            {/* Mobile: Hamburger + Logo */}
            <div className={cn("lg:hidden flex items-center gap-3", mobileMenuOpen && "invisible")}>
               <button
                 onClick={() => setMobileMenuOpen(true)}
                 className="flex items-center justify-center h-9 w-9 rounded-[14px] transition-all active:scale-95 hover:shadow-sm"
                 style={{
                   background: "rgba(0,0,0,0.04)",
                   border: "1px solid rgba(0,0,0,0.06)",
                 }}
               >
                  <Menu className="h-[18px] w-[18px] text-stone-500" />
               </button>
               <Link href="/dashboard" className="shrink-0">
                  <Image src="/jimvio-logo.png" alt="Jimvio" width={80} height={20} priority className="h-5 w-auto" />
               </Link>
            </div>

            {/* Desktop: Search */}
            <div className="hidden lg:flex flex-1 items-center gap-4">
               <div className="relative max-w-sm w-full group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-300 group-focus-within:text-orange-500 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Search dashboard..." 
                    className="w-full h-10 pl-10 pr-4 rounded-[16px] text-[13px] font-medium placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500/15 transition-all"
                    style={{
                      background: "rgba(0,0,0,0.03)",
                      border: "1px solid rgba(0,0,0,0.05)",
                    }}
                  />
               </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
               {/* Currency */}
               <div className="hidden sm:block">
                  <CurrencySelector
                    className="h-9 rounded-[14px] text-[11px] font-bold text-stone-600 px-3 hover:shadow-sm transition-all border-none"
                    style={{
                      background: "rgba(0,0,0,0.03)",
                      border: "1px solid rgba(0,0,0,0.05)",
                    }}
                  />
               </div>
               
               {/* Notifications */}
               <Link
                 href="/dashboard/notifications"
                 className="flex items-center justify-center h-9 w-9 rounded-[14px] text-stone-400 hover:text-stone-800 transition-all active:scale-95 relative hover:shadow-sm"
                 style={{
                   background: "rgba(0,0,0,0.03)",
                   border: "1px solid rgba(0,0,0,0.05)",
                 }}
               >
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full border-[1.5px] border-white" />
               </Link>

               {/* User Menu */}
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center gap-2 p-1 pl-1 pr-2.5 rounded-full transition-all hover:shadow-sm active:scale-95"
                      style={{
                        background: "rgba(255,255,255,0.8)",
                        border: "1px solid rgba(0,0,0,0.06)",
                      }}
                    >
                       <div className="w-7 h-7 rounded-full overflow-hidden border-[1.5px] border-orange-200 shrink-0"
                         style={{ background: user.avatar_url ? "transparent" : "linear-gradient(135deg, #f97316, #a855f7)" }}
                       >
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white">
                               {user.email?.[0]?.toUpperCase() || 'U'}
                            </div>
                          )}
                       </div>
                       <span className="hidden sm:block text-[11px] font-bold text-stone-700 truncate max-w-[80px]">
                          {user.full_name?.split(' ')[0] || user.email.split('@')[0]}
                       </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 rounded-[20px] p-2 shadow-xl"
                    style={{
                      background: "rgba(255,255,255,0.85)",
                      backdropFilter: "blur(40px) saturate(180%)",
                      WebkitBackdropFilter: "blur(40px) saturate(180%)",
                      border: "1px solid rgba(0,0,0,0.06)",
                    }}
                  >
                    <DropdownMenuLabel className="px-3 py-2">
                       <p className="text-xs font-bold text-stone-900">{user.full_name || 'My Account'}</p>
                       <p className="text-[10px] font-medium text-stone-400 truncate">{user.email}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-stone-100/60" />
                    <DropdownMenuItem asChild className="rounded-[14px] focus:bg-orange-50/50 cursor-pointer">
                       <Link href="/dashboard/settings" className="flex items-center gap-2.5 p-2.5">
                          <UserRound className="h-4 w-4 text-stone-400" />
                          <span className="text-[12px] font-bold text-stone-700">Profile Settings</span>
                       </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-[14px] focus:bg-orange-50/50 cursor-pointer">
                       <Link href="/dashboard/wallet" className="flex items-center gap-2.5 p-2.5">
                          <Wallet className="h-4 w-4 text-orange-500" />
                          <span className="text-[12px] font-bold text-stone-700">My Wallet</span>
                       </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-stone-100/60" />
                    <div className="p-1">
                       <SignOutButton variant="menu" />
                    </div>
                  </DropdownMenuContent>
               </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <div className="px-4 py-6 sm:px-6 sm:py-8 lg:p-10 max-w-[1400px] mx-auto">
             {children}
          </div>
        </main>

        {/* ══════════════════════════════════════
            MOBILE BOTTOM NAV — Frosted Bar
        ══════════════════════════════════════ */}
        <nav
          className="lg:hidden fixed bottom-5 left-5 right-5 z-40 rounded-[22px] overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(40px) saturate(180%)",
            WebkitBackdropFilter: "blur(40px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.6)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
          }}
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
      className="flex flex-col items-center justify-center gap-1 flex-1 text-stone-400 hover:text-stone-900 transition-all active:scale-95"
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
        isActive ? "text-orange-600" : "text-stone-400"
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
    <Suspense fallback={
       <div className="flex flex-col h-screen items-center justify-center bg-[#f8f7f5] space-y-4">
          <div className="w-10 h-10 border-4 border-stone-100 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Loading...</p>
       </div>
    }>
      <DashboardShellContent>{children}</DashboardShellContent>
    </Suspense>
  );
}
