"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { createClient } from "@/lib/supabase/client";
import {
  Menu,
  LayoutDashboard,
  Users,
  ShoppingCart,
  UserRound,
  Settings,
  LogOut,
  LayoutPanelLeft,
} from "lucide-react";
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ email: string; full_name?: string | null; avatar_url?: string | null } | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.replace("/login?next=/admin");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("email, full_name, avatar_url").eq("id", authUser.id).single();
      setUser(profile ?? { email: authUser.email ?? "", full_name: authUser.user_metadata?.full_name, avatar_url: authUser.user_metadata?.avatar_url });

      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", authUser.id);
      const hasAdmin = roles?.some((r) => r.role === "admin") ?? false;
      setIsAdmin(hasAdmin);
      if (!hasAdmin) {
        router.replace("/dashboard");
      }
    }
    check();
  }, [router]);

  if (isAdmin === null || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-bg)]">
        <p className="text-sm text-[var(--color-text-muted)]">Loading admin…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
      <AdminSidebar
        user={user}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="lg:hidden sticky top-0 z-40 shrink-0 pt-[env(safe-area-inset-top)] border-b border-[var(--color-border)]/80 bg-[var(--color-surface)]/80 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-[var(--color-surface)]/70">
          <div className="flex items-center justify-between gap-3 px-3 sm:px-4 py-2.5">
            <Link href="/admin" className="shrink-0 py-1" aria-label="Admin overview">
              <Image src="/jimvio-logo.png" alt="Jimvio" width={128} height={40} priority className="h-7 w-auto sm:h-8" />
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)]/70 bg-[var(--color-surface-secondary)]/80 text-[var(--color-text-muted)] shadow-sm outline-none transition-colors hover:text-[var(--color-text-primary)] focus-visible:ring-2 focus-visible:ring-red-500/40 active:scale-[0.98] touch-manipulation"
                  aria-label="Account menu"
                >
                  <UserRound className="h-5 w-5" strokeWidth={1.35} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 z-[100]">
                <DropdownMenuLabel className="font-normal normal-case tracking-normal">
                  <span className="block truncate text-sm font-semibold text-[var(--color-text-primary)]">
                    {user.full_name || user.email?.split("@")[0] || "Admin"}
                  </span>
                  {user.email ? (
                    <span className="block truncate text-xs font-normal text-[var(--color-text-muted)]">{user.email}</span>
                  ) : null}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/admin/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4 shrink-0 opacity-70" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/dashboard" className="flex items-center gap-2">
                    <LayoutPanelLeft className="h-4 w-4 shrink-0 opacity-70" />
                    User dashboard
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
          <div className="p-4 sm:p-5 lg:p-6 max-w-[1400px] mx-auto">{children}</div>
        </main>

        <nav
          className="lg:hidden fixed left-0 right-0 z-30 pointer-events-none"
          style={{ bottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))" }}
          aria-label="Admin primary"
        >
          <div className="pointer-events-auto mx-3 rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/85 backdrop-blur-xl backdrop-saturate-150 shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.12),0_8px_32px_-8px_rgba(239,68,68,0.14)] supports-[backdrop-filter]:bg-[var(--color-surface)]/72">
            <div className="flex items-stretch justify-between px-0.5 py-1 min-h-[3.5rem]">
              <AdminBottomNavLink
                href="/admin"
                icon={<LayoutDashboard className="h-[1.35rem] w-[1.35rem]" />}
                label="Home"
                pathname={pathname}
              />
              <AdminBottomNavLink
                href="/admin/users"
                icon={<Users className="h-[1.35rem] w-[1.35rem]" />}
                label="Users"
                pathname={pathname}
              />
              <AdminBottomNavLink
                href="/admin/orders"
                icon={<ShoppingCart className="h-[1.35rem] w-[1.35rem]" />}
                label="Orders"
                pathname={pathname}
              />
              <AdminBottomNavMore onClick={() => setMobileOpen(true)} />
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}

function AdminBottomNavMore({ onClick }: { onClick: () => void }) {
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

function AdminBottomNavLink({
  href,
  icon,
  label,
  pathname,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  pathname: string;
}) {
  const isActive = pathname === href || (href !== "/admin" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1.5 rounded-xl transition-colors duration-200 active:opacity-80",
        "touch-manipulation select-none",
        isActive
          ? "text-red-600 bg-red-500/10"
          : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl duration-200",
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
