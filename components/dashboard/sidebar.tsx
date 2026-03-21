"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Globe,
  ShoppingCart,
  FileText,
  Heart,
  Store,
  Package,
  Truck,
  Layers,
  Link2,
  Megaphone,
  DollarSign,
  Wallet,
  Video,
  BarChart3,
  UserPlus,
  Users,
  MessageSquare,
  MessageCircle,
  Bell,
  User,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  PenSquare,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut } from "@/lib/auth/actions";

export type DashboardRole = "buyer" | "vendor" | "affiliate" | "influencer" | "community" | "admin";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  requiredRole?: DashboardRole;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const sidebarSections: NavSection[] = [
  {
    title: "",
    items: [{ label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> }],
  },
  {
    title: "BUYER",
    items: [
      { label: "Browse Marketplace", href: "/dashboard/marketplace", icon: <Globe className="h-4 w-4" /> },
      { label: "Orders", href: "/dashboard/orders", icon: <ShoppingCart className="h-4 w-4" /> },
      { label: "Buying Leads", href: "/dashboard/requests", icon: <FileText className="h-4 w-4" /> },
      { label: "Saved Products", href: "/dashboard/wishlist", icon: <Heart className="h-4 w-4" /> },
    ],
  },
  {
    title: "VENDOR",
    items: [
      { label: "My Store", href: "/dashboard/vendor/store", icon: <Store className="h-4 w-4" />, requiredRole: "vendor" },
      { label: "Products", href: "/dashboard/products", icon: <Package className="h-4 w-4" />, requiredRole: "vendor" },
      { label: "Orders Received", href: "/dashboard/vendor/orders", icon: <Truck className="h-4 w-4" />, requiredRole: "vendor" },
      { label: "Inventory", href: "/dashboard/inventory", icon: <Layers className="h-4 w-4" />, requiredRole: "vendor" },
      { label: "Analytics", href: "/dashboard/vendor/analytics", icon: <BarChart3 className="h-4 w-4" />, requiredRole: "vendor" },
    ],
  },
  {
    title: "AFFILIATE",
    items: [
      { label: "Overview & Links", href: "/dashboard/links", icon: <Link2 className="h-4 w-4" />, requiredRole: "affiliate" },
      { label: "Promoted Products", href: "/dashboard/affiliate/products", icon: <Megaphone className="h-4 w-4" />, requiredRole: "affiliate" },
      { label: "Earnings", href: "/dashboard/earnings", icon: <DollarSign className="h-4 w-4" />, requiredRole: "affiliate" },
      { label: "Analytics", href: "/dashboard/affiliate/analytics", icon: <BarChart3 className="h-4 w-4" />, requiredRole: "affiliate" },
      { label: "Payouts", href: "/dashboard/withdrawals", icon: <Wallet className="h-4 w-4" />, requiredRole: "affiliate" },
    ],
  },
  {
    title: "CREATOR",
    items: [
      { label: "Creator Studio", href: "/dashboard/influencer", icon: <Video className="h-4 w-4" />, requiredRole: "influencer" },
      { label: "My Clips", href: "/dashboard/clips", icon: <Video className="h-4 w-4" />, requiredRole: "influencer" },
      { label: "Video Analytics", href: "/dashboard/analytics", icon: <BarChart3 className="h-4 w-4" />, requiredRole: "influencer" },
      { label: "Creator Earnings", href: "/dashboard/creator/earnings", icon: <DollarSign className="h-4 w-4" />, requiredRole: "influencer" },
      { label: "Discover Clips", href: "/clips", icon: <Megaphone className="h-4 w-4" /> },
    ],
  },
  {
    title: "COMMUNITY",
    items: [
      { label: "Discover Communities", href: "/dashboard/communities", icon: <Users className="h-4 w-4" /> },
      { label: "My Communities", href: "/dashboard/my-communities", icon: <UserPlus className="h-4 w-4" /> },
      { label: "My Posts", href: "/dashboard/my-posts", icon: <MessageSquare className="h-4 w-4" /> },
      { label: "Create Post", href: "/dashboard/create-post", icon: <PenSquare className="h-4 w-4" /> },
      { label: "Discussions", href: "/dashboard/discussions", icon: <MessageCircle className="h-4 w-4" /> },
      { label: "Saved Threads", href: "/dashboard/saved-threads", icon: <Bookmark className="h-4 w-4" /> },
      { label: "Community Hub", href: "/communities/hub", icon: <MessageCircle className="h-4 w-4" /> },
    ],
  },
  {
    title: "GENERAL",
    items: [
      { label: "Messages", href: "/dashboard/messages", icon: <MessageSquare className="h-4 w-4" /> },
      { label: "Notifications", href: "/dashboard/notifications", icon: <Bell className="h-4 w-4" /> },
      { label: "Profile", href: "/dashboard/settings", icon: <User className="h-4 w-4" /> },
      { label: "Settings", href: "/dashboard/settings", icon: <Settings className="h-4 w-4" /> },
    ],
  },
];

function getActivateHref(role: DashboardRole): string {
  if (role === "influencer") return "/dashboard/activate/creator";
  return `/dashboard/activate/${role}`;
}

interface SidebarProps {
  user: { email: string; full_name?: string | null; avatar_url?: string | null };
  activeRoles: DashboardRole[];
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ user, activeRoles, collapsed, onCollapsedChange, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  const resolveHref = (item: NavItem): string => {
    if (!item.requiredRole) return item.href;
    if (item.requiredRole === "buyer") return item.href;
    if (activeRoles.includes(item.requiredRole)) return item.href;
    return getActivateHref(item.requiredRole);
  };

  const isActivationLink = (item: NavItem): boolean => {
    if (!item.requiredRole || item.requiredRole === "buyer") return false;
    return !activeRoles.includes(item.requiredRole);
  };

  const content = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between gap-2 px-3 py-3 border-b border-[var(--color-border)] min-h-[3.5rem] shrink-0">
        <Link href="/" className="flex items-center shrink-0 min-w-0" onClick={onMobileClose}>
          <Image
            src="/jimvio-logo.png"
            alt="Jimvio"
            width={120}
            height={40}
            className={cn("h-8 w-auto", collapsed && "hidden")}
          />
          {collapsed && (
            <div className="h-8 w-8 rounded-lg bg-[var(--color-accent)] flex items-center justify-center">
              <LayoutDashboard className="h-4 w-4 text-white" />
            </div>
          )}
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onCollapsedChange(!collapsed)}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] transition-colors hidden lg:inline-flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
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

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-5 max-lg:space-y-4">
        {sidebarSections.map((section) => (
          <div key={section.title || "main"}>
            {section.title && (
              <p
                className={cn(
                  "px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]",
                  collapsed && "text-center"
                )}
              >
                {!collapsed ? section.title : ""}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const href = resolveHref(item);
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const needsActivation = isActivationLink(item);
                return (
                  <li key={`${section.title}-${item.label}-${item.href}`}>
                    <Link
                      href={href}
                      onClick={onMobileClose}
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-2.5 max-lg:py-3 rounded-xl text-sm font-medium transition-all duration-200",
                        "hover:bg-[var(--color-surface-secondary)] hover:shadow-sm active:scale-[0.99] touch-manipulation",
                        active && !needsActivation
                          ? "bg-[var(--color-accent-light)] text-[var(--color-accent)] shadow-sm"
                          : "text-[var(--color-text-primary)]",
                        needsActivation && "opacity-80"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <span className="flex-shrink-0 [&>svg]:h-4 [&>svg]:w-4 flex items-center justify-center">
                        {item.icon}
                      </span>
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {needsActivation && (
                            <span className="text-[10px] font-medium text-[var(--color-text-muted)] shrink-0">Activate</span>
                          )}
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User & sign out */}
      <div className="p-3 border-t border-[var(--color-border)] shrink-0">
        <div className={cn("flex items-center gap-2", collapsed ? "justify-center" : "px-1")}>
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={user.avatar_url || ""} />
            <AvatarFallback className="text-sm bg-[var(--color-accent-light)] text-[var(--color-accent)]">
              {user.full_name?.[0] || user.email?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                {user.full_name || user.email?.split("@")[0]}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] truncate">{user.email}</p>
            </div>
          )}
          {!collapsed && (
            <form action={signOut}>
              <button
                type="submit"
                className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-red-50 hover:text-red-600 transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col h-screen sticky top-0 border-r bg-[var(--color-surface)] border-[var(--color-border)] transition-[width] duration-300 ease-out z-40",
          collapsed ? "w-[4.25rem]" : "w-64"
        )}
      >
        {content}
      </aside>

      {/* Mobile overlay sidebar */}
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
