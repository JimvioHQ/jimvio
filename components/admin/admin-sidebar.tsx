"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gauge,
  UsersRound,
  Store,
  Boxes,
  ClipboardList,
  Inbox,
  TrendingUp,
  BadgeCheck,
  Siren,
  Landmark,
  SlidersHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { JimvioLogo } from "@/components/ui/logo";

// ── Nav structure with sections ───────────────────────────────────────────────

const navSections = [
  {
    label: "Main",
    items: [
      { label: "Overview",  href: "/admin",          icon: Gauge },
      { label: "Users",     href: "/admin/users",    icon: UsersRound },
      { label: "Vendors",   href: "/admin/vendors",  icon: Store },
      { label: "Products",  href: "/admin/products", icon: Boxes },
      { label: "Orders",    href: "/admin/orders",   icon: ClipboardList },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Payments", href: "/admin/payments", icon: Landmark },
      { label: "Reports",  href: "/admin/reports",  icon: TrendingUp },
    ],
  },
  {
    label: "Moderation",
    items: [
      { label: "Verifications", href: "/admin/verifications", icon: BadgeCheck },
      { label: "Disputes",      href: "/admin/disputes",      icon: Siren },
      { label: "Messages",      href: "/admin/messages",      icon: Inbox },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Settings", href: "/admin/settings", icon: SlidersHorizontal },
    ],
  },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface AdminSidebarProps {
  user: {
    email: string;
    full_name?: string | null;
    avatar_url?: string | null;
    role?: string | null;
  };
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  /** Live badge counts keyed by href, e.g. { "/admin/orders": 4 } */
  badges?: Partial<Record<string, number>>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AdminSidebar({
  user,
  collapsed,
  onCollapsedChange,
  mobileOpen,
  onMobileClose,
  badges = {},
}: AdminSidebarProps) {
  const pathname = usePathname();

  const initials =
    user.full_name
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ||
    user.email?.[0]?.toUpperCase() ||
    "A";

  // ⌘K shortcut — wire to your command palette
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        // TODO: open command palette
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const content = (
    <div className="flex flex-col h-full">

      {/* ── Header ── */}
      <div className={cn(
        "flex items-center gap-2 px-3 pt-3 pb-2.5 shrink-0",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {collapsed ? (
          <JimvioLogo variant="icon" size="sm" href="/admin" onClick={onMobileClose} />
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <JimvioLogo variant="full" size="sm" href="/admin" onClick={onMobileClose} />
            <span className="ml-auto shrink-0 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-muted)] tracking-wide uppercase">
              Admin
            </span>
          </div>
        )}

        {/* Desktop collapse toggle */}
        <button
          type="button"
          onClick={() => onCollapsedChange(!collapsed)}
          className={cn(
            "hidden lg:flex items-center justify-center h-7 w-7 shrink-0 rounded-md",
            "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]",
            "hover:bg-[var(--color-surface-secondary)] transition-colors"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed
            ? <PanelLeftOpen  className="h-[14px] w-[14px]" />
            : <PanelLeftClose className="h-[14px] w-[14px]" />}
        </button>

        {/* Mobile close */}
        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="lg:hidden flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Search bar (expanded only) ── */}
      {!collapsed && (
        <div className="px-3 pb-3 shrink-0">
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2.5 py-2",
              "border border-[var(--color-border)] bg-[var(--color-surface-secondary)]",
              "text-[12px] text-[var(--color-text-muted)]",
              "hover:border-[var(--color-border)]/70 hover:text-[var(--color-text-primary)]",
              "transition-colors cursor-pointer select-none"
            )}
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="flex items-center rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)]">
              ⌘K
            </kbd>
          </button>
        </div>
      )}

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-1 scrollbar-none">
        {navSections.map((section, si) => (
          <div key={section.label}>
            {/* Section label */}
            {!collapsed ? (
              <p className="px-2.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] select-none">
                {section.label}
              </p>
            ) : (
              si > 0 && <div className="my-2 h-px bg-[var(--color-border)]/50 mx-2" />
            )}

            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/admin" && pathname.startsWith(item.href));
                const Icon  = item.icon;
                const badge = badges[item.href];

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onMobileClose}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "group relative flex items-center rounded-sm transition-all duration-150 select-none",
                        collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-2.5 py-[7px]",
                        active
                          ? "bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]"
                          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                      )}
                    >
                      {/* Active left bar */}
                      {active && !collapsed && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-red-500" />
                      )}

                      <Icon
                        className={cn(
                          "shrink-0 transition-transform duration-150",
                          collapsed ? "h-[17px] w-[17px]" : "h-[15px] w-[15px]",
                          !active && "group-hover:scale-110"
                        )}
                        strokeWidth={active ? 2.2 : 1.7}
                      />

                      {!collapsed && (
                        <>
                          <span className={cn(
                            "flex-1 text-[13px] truncate leading-none",
                            active ? "font-semibold" : "font-medium"
                          )}>
                            {item.label}
                          </span>

                          {badge != null && badge > 0 && (
                            <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white tabular-nums leading-none">
                              {badge > 99 ? "99+" : badge}
                            </span>
                          )}
                        </>
                      )}

                      {/* Collapsed: dot indicator */}
                      {collapsed && badge != null && badge > 0 && (
                        <span className="absolute top-1.5 right-1.5 h-[7px] w-[7px] rounded-full bg-red-500 ring-2 ring-[var(--color-surface)]" />
                      )}

                      {/* Collapsed tooltip */}
                      {collapsed && (
                        <span className={cn(
                          "pointer-events-none absolute left-full ml-3 z-50",
                          "whitespace-nowrap rounded-lg px-2.5 py-1.5",
                          "bg-[var(--color-surface)] border border-[var(--color-border)] shadow-lg",
                          "text-[12px] font-medium text-[var(--color-text-primary)]",
                          "opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100",
                          "transition-all duration-150 origin-left"
                        )}>
                          {item.label}
                          {badge != null && badge > 0 && (
                            <span className="ml-1.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
                              {badge}
                            </span>
                          )}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Divider after each section (expanded) */}
            {!collapsed && (
              <div className="mt-2 h-px bg-[var(--color-border)]/40 mx-1" />
            )}
          </div>
        ))}
      </nav>

      {/* ── User footer ── */}
      <div className="shrink-0 border-t border-[var(--color-border)] p-3">
        <div className={cn(
          "flex items-center gap-2.5 rounded-sm px-2 py-1.5",
          "hover:bg-[var(--color-surface-secondary)] transition-colors",
          collapsed && "justify-center px-0"
        )}>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={user.avatar_url || ""} />
            <AvatarFallback className="bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-[11px] font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>

          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold leading-tight truncate text-[var(--color-text-primary)]">
                  {user.full_name || "Admin"}
                </p>
                <p className="text-[11px] leading-tight text-[var(--color-text-muted)] truncate mt-0.5">
                  {user.role ?? "Super admin"}
                </p>
              </div>
              <SignOutButton variant="icon" />
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className={cn(
        "hidden lg:flex flex-col h-screen sticky top-0",
        "border-r border-[var(--color-border)] bg-[var(--color-surface)]",
        "transition-[width] duration-300 ease-[cubic-bezier(.4,0,.2,1)] z-40 overflow-hidden",
        collapsed ? "w-[3.75rem]" : "w-[15rem]"
      )}>
        {content}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200 lg:hidden"
            onClick={onMobileClose}
            aria-hidden
          />
          <aside className={cn(
            "fixed inset-y-0 left-0 flex flex-col z-50 lg:hidden overflow-hidden",
            "w-[min(16rem,88vw)] bg-[var(--color-surface)]",
            "border-r border-[var(--color-border)] shadow-xl",
            "animate-in slide-in-from-left duration-200"
          )}>
            {content}
          </aside>
        </>
      )}
    </>
  );
}