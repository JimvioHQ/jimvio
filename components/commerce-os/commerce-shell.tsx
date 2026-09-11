"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CircleHelp,
  CreditCard,
  FileText,
  Globe,
  LayoutDashboard,
  LayoutGrid,
  Menu,
  Package,
  Percent,
  Settings,
  ShoppingBag,
  Store,
  Truck,
  Users,
  Wand2,
  Warehouse,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/commerce", label: "Overview", exact: true, icon: LayoutDashboard },
  { href: "/commerce/stores", label: "Stores", icon: Store },
  { href: "/commerce/products", label: "Products", icon: Package },
  { href: "/commerce/orders", label: "Orders", icon: ShoppingBag },
  { href: "/commerce/customers", label: "Customers", icon: Users },
  { href: "/commerce/collections", label: "Collections", icon: LayoutGrid },
  { href: "/commerce/inventory", label: "Inventory", icon: Warehouse },
  { href: "/commerce/discounts", label: "Discounts", icon: Percent },
  { href: "/commerce/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/commerce/builder", label: "Builder", icon: Wand2 },
  { href: "/commerce/shipping", label: "Shipping", icon: Truck },
  { href: "/commerce/payments", label: "Payments", icon: CreditCard },
  { href: "/commerce/pages", label: "Pages", icon: FileText },
  { href: "/commerce/domains", label: "Domains", icon: Globe },
  { href: "/commerce/settings", label: "Settings", icon: Settings },
] as const;

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: (typeof NAV)[number];
  pathname: string;
  onNavigate?: () => void;
}) {
  const active =
    "exact" in item && item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors",
        active
          ? "bg-[#FF5A1F]/10 text-[#FF5A1F]"
          : "text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]"
      )}
    >
      {active ? (
        <span
          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[#FF5A1F]"
          aria-hidden
        />
      ) : null}
      <Icon
        className={cn("h-4 w-4 shrink-0", active ? "text-[#FF5A1F]" : "text-[#9CA3AF]")}
        strokeWidth={active ? 2.25 : 1.75}
      />
      <span>{item.label}</span>
    </Link>
  );
}

function SidebarBody({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#E5E7EB] px-4 py-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#111827]">
          Commerce OS
        </p>
        <p className="mt-1 text-[11px] text-[#9CA3AF]">Jimvio merchant workspace</p>
      </div>
      <nav
        aria-label="Commerce OS"
        className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3"
      >
        {NAV.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
      <div className="border-t border-[#E5E7EB] p-3">
        <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-3">
          <div className="flex items-start gap-2">
            <CircleHelp className="mt-0.5 h-4 w-4 text-[#FF5A1F]" />
            <div>
              <p className="text-xs font-semibold text-[#111827]">Need help?</p>
              <p className="mt-0.5 text-[11px] leading-snug text-[#6B7280]">
                Guides for stores, products, and orders.
              </p>
            </div>
          </div>
          <Link
            href="/help"
            onClick={onNavigate}
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-semibold text-[#374151] transition hover:border-[#FF5A1F]/40 hover:text-[#FF5A1F]"
          >
            Help Center
          </Link>
        </div>
      </div>
    </div>
  );
}

export function CommerceShell({
  children,
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
}) {
  const pathname = usePathname() ?? "/commerce";
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-[70vh] bg-[#F8FAFC] text-[#111827]">
      <div className="mx-auto flex w-full max-w-[1440px]">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-[calc(100vh-0px)] w-[232px] shrink-0 border-r border-[#E5E7EB] bg-white lg:block">
          <SidebarBody pathname={pathname} />
        </aside>

        <div className="min-w-0 flex-1">
          {/* Mobile commerce header */}
          <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[#E5E7EB] bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#111827]">
                Commerce OS
              </p>
            </div>
            <button
              type="button"
              aria-label={mobileOpen ? "Close commerce menu" : "Open commerce menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#111827]"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* Mobile drawer */}
          {mobileOpen ? (
            <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
              <button
                type="button"
                aria-label="Close menu overlay"
                className="absolute inset-0 bg-black/40"
                onClick={() => setMobileOpen(false)}
              />
              <aside className="absolute left-0 top-0 flex h-full w-[min(300px,88vw)] flex-col bg-white shadow-xl">
                <SidebarBody
                  pathname={pathname}
                  onNavigate={() => setMobileOpen(false)}
                />
              </aside>
            </div>
          ) : null}

          {/* Horizontal scroll chips on tablet */}
          <div className="hidden border-b border-[#E5E7EB] bg-white md:block lg:hidden">
            <nav
              aria-label="Commerce sections"
              className="flex gap-1 overflow-x-auto px-4 py-2"
            >
              {NAV.map((item) => {
                const active =
                  "exact" in item && item.exact
                    ? pathname === item.href
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
                      active
                        ? "bg-[#FF5A1F]/10 text-[#FF5A1F]"
                        : "text-[#6B7280] hover:bg-[#F3F4F6]"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function CommerceEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E5E7EB] bg-white px-6 py-12 text-center">
      <p className="text-sm font-semibold text-[#111827]">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-[#6B7280]">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function CommerceCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
        className
      )}
    >
      {children}
    </div>
  );
}
