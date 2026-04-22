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
        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            HEADER â€” Professional Solid
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <header className="sticky top-0 z-40 shrink-0 bg-white dark:bg-black/20 border-b border-border">
          <div className="flex items-center justify-between gap-4 px-4 sm:px-6 h-14 w-full">
            
            {/* Mobile: Hamburger */}
            <div className="lg:hidden flex items-center gap-3">
               <button
                 onClick={() => setMobileMenuOpen(true)}
                 className="flex items-center justify-center h-10 w-10 rounded-none bg-stone-50 dark:bg-white/5 border border-border"
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
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                  <input 
                    type="text" 
                    placeholder="Search apps, products, orders..." 
                    className="w-full h-9 pl-9 pr-4 rounded-none text-[13px] bg-stone-50 dark:bg-white/5 border border-border focus:border-orange-500/50 focus:bg-white transition-all outline-none"
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
                      className="h-9 rounded-none text-[11px] font-bold bg-white dark:bg-white/5 border border-border px-3 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-white/10 transition-colors"
                    />
                </div>
               
               {/* Notifications */}
                <Link
                  href="/dashboard/notifications"
                  className="flex items-center justify-center h-9 w-9 rounded-none text-stone-400 dark:text-stone-500 hover:text-stone-900 dark:hover:text-white transition-all active:scale-95 relative bg-white dark:bg-white/5 border border-border"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-orange-500 rounded-none border border-white dark:border-stone-900" />
                </Link>

               {/* User Menu */}
                <DropdownMenu>
                   <DropdownMenuTrigger asChild>
                     <button className="flex items-center gap-2 p-1 pl-1 pr-2.5 rounded-none transition-all hover:shadow-none active:scale-95 bg-white dark:bg-white/5 border border-border">
                        <div className="w-7 h-7 rounded-none bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-[10px] font-bold text-stone-600 border border-border overflow-hidden">
                           {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : initials}
                        </div>
                        <span className="hidden sm:block text-[12px] font-bold text-stone-800 dark:text-stone-300">
                           Admin
                        </span>
                     </button>
                   </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-56 rounded-none p-2 shadow-none border border-border bg-white dark:bg-stone-900"
                    >
                      <DropdownMenuLabel className="px-3 py-2">
                        <p className="text-xs font-bold text-stone-900 dark:text-white uppercase tracking-tighter">{user.full_name || 'Account'}</p>
                        <p className="text-[10px] font-medium text-stone-400 dark:text-stone-500 truncate">{user.email}</p>
                      </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-stone-100/60" />
                     <DropdownMenuItem asChild className="rounded-none focus:bg-orange-500/10 cursor-pointer">
                        <Link href="/dashboard/settings" className="flex items-center gap-2.5 p-2.5">
                           <UserRound className="h-4 w-4 text-stone-400 dark:text-text-muted" />
                           <span className="text-[12px] font-bold text-stone-700 dark:text-stone-300">Profile Settings</span>
                        </Link>
                     </DropdownMenuItem>
                     <DropdownMenuItem asChild className="rounded-none focus:bg-orange-500/10 cursor-pointer">
                        <Link href="/dashboard/wallet" className="flex items-center gap-2.5 p-2.5">
                           <Wallet className="h-4 w-4 text-orange-500" />
                           <span className="text-[12px] font-bold text-stone-700 dark:text-stone-300">My Wallet</span>
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

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            MOBILE BOTTOM NAV â€” Frosted Bar
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
         <nav
           className="lg:hidden fixed bottom-5 left-5 right-5 z-40 rounded-none overflow-hidden bg-surface/90 dark:bg-surface/90 border border-border shadow-none"
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
     <Suspense fallback={
        <div className="flex flex-col h-screen items-center justify-center bg-background space-y-4">
           <div className="w-10 h-10 border-4 border-stone-100 dark:border-border border-t-orange-500 rounded-none animate-spin" />
           <p className="text-[10px] font-bold text-stone-400 dark:text-text-muted uppercase tracking-widest">Loading...</p>
        </div>
     }>
      <DashboardShellContent>{children}</DashboardShellContent>
    </Suspense>
  );
}

