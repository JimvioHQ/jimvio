"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Store,
  Package,
  ShoppingCart,
  MessageSquare,
  BarChart3,
  ShieldCheck,
  AlertTriangle,
  DollarSign,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  UsersRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut } from "@/lib/auth/actions";

const adminNavItems = [
  { label: "Overview", href: "/admin", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Users", href: "/admin/users", icon: <Users className="h-4 w-4" /> },
  { label: "Vendors", href: "/admin/vendors", icon: <Store className="h-4 w-4" /> },
  { label: "Products", href: "/admin/products", icon: <Package className="h-4 w-4" /> },
  { label: "Orders", href: "/admin/orders", icon: <ShoppingCart className="h-4 w-4" /> },
  { label: "Shopify", href: "/admin/shopify", icon: <Package className="h-4 w-4" /> },
  { label: "Communities", href: "/admin/communities", icon: <UsersRound className="h-4 w-4" /> },
  { label: "Messages", href: "/admin/messages", icon: <MessageCircle className="h-4 w-4" /> },
  { label: "Reports", href: "/admin/reports", icon: <BarChart3 className="h-4 w-4" /> },
  { label: "Verification Requests", href: "/admin/verifications", icon: <ShieldCheck className="h-4 w-4" /> },
  { label: "Disputes", href: "/admin/disputes", icon: <AlertTriangle className="h-4 w-4" /> },
  { label: "Payments", href: "/admin/payments", icon: <DollarSign className="h-4 w-4" /> },
  { label: "Settings", href: "/admin/settings", icon: <Settings className="h-4 w-4" /> },
];

interface AdminSidebarProps {
  user: { email: string; full_name?: string | null; avatar_url?: string | null };
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AdminSidebar({ user, collapsed, onCollapsedChange, mobileOpen, onMobileClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const content = (
    <>
      <div className="flex items-center justify-between gap-2 px-3 py-3 border-b border-[var(--color-border)] min-h-[3.5rem] shrink-0">
        <Link href="/admin" className="flex items-center shrink-0 min-w-0" onClick={onMobileClose}>
          <Image
            src="/jimvio-logo.png"
            alt="Jimvio"
            width={120}
            height={40}
            className={cn("h-8 w-auto", collapsed && "hidden")}
          />
          {collapsed && (
            <div className="h-8 w-8 rounded-lg bg-red-600 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
          )}
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onCollapsedChange(!collapsed)}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] shrink-0 hidden lg:inline-flex"
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          {onMobileClose && (
            <button
              type="button"
              onClick={onMobileClose}
              className="lg:hidden flex h-10 w-10 items-center justify-center rounded-xl text-[var(--color-text-primary)] bg-[var(--color-surface-secondary)] border border-[var(--color-border)]/80 active:scale-[0.97] transition-transform"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <p className={cn("px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]", collapsed && "text-center")}>
          {!collapsed ? "Admin" : ""}
        </p>
        <ul className="space-y-0.5">
          {adminNavItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onMobileClose}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium transition-all",
                    "hover:bg-[var(--color-surface-secondary)]",
                    active ? "bg-red-500/10 text-red-600 dark:text-red-400" : "text-[var(--color-text-primary)]"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="flex-shrink-0 [&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-3 border-t border-[var(--color-border)] shrink-0">
        <div className={cn("flex items-center gap-2", collapsed ? "justify-center" : "px-1")}>
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={user.avatar_url || ""} />
            <AvatarFallback className="bg-red-500/10 text-red-600 text-sm">
              {user.full_name?.[0] || user.email?.[0]?.toUpperCase() || "A"}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.full_name || "Admin"}</p>
                <p className="text-xs text-[var(--color-text-muted)] truncate">{user.email}</p>
              </div>
              <form action={signOut}>
                <button type="submit" className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-red-50 hover:text-red-600" title="Sign out">
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      <aside
        className={cn(
          "hidden lg:flex flex-col h-screen sticky top-0 border-r bg-[var(--color-surface)] border-[var(--color-border)] transition-[width] duration-300 z-40",
          collapsed ? "w-[4.25rem]" : "w-64"
        )}
      >
        {content}
      </aside>

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-ink-darker/50 backdrop-blur-[2px] animate-in fade-in duration-200 lg:hidden"
            onClick={onMobileClose}
            aria-hidden
          />
          <aside
            className={cn(
              "fixed inset-y-0 left-0 flex flex-col w-[min(18rem,90vw)] max-w-[90vw]",
              "bg-[var(--color-surface)] border-r border-[var(--color-border)] shadow-2xl z-50 lg:hidden",
              "rounded-r-3xl overflow-hidden animate-in slide-in-from-left duration-200"
            )}
          >
            {content}
          </aside>
        </>
      )}
    </>
  );
}
