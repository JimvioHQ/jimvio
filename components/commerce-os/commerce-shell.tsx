"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  CircleHelp,
  CreditCard,
  FileText,
  Globe,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  Link2,
  Menu,
  Package,
  Percent,
  Plug,
  RefreshCw,
  Settings,
  ShoppingBag,
  Store,
  Truck,
  Users,
  Wand2,
  Warehouse,
  X,
} from "lucide-react";
import { AppTopNav } from "@/components/shell/AppTopNav";
import {
  MobilePrimaryBottomNav,
  MOBILE_PRIMARY_BOTTOM_NAV_PAD,
} from "@/components/layout/mobile-primary-bottom-nav";
import { builderShouldHideCommerceNav } from "@/lib/commerce-os/builder/editor-chrome";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  exact?: boolean;
};

type NavGroup = { id: string; label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    id: "core",
    label: "Operations",
    items: [
      { href: "/commerce", label: "Overview", exact: true, icon: LayoutDashboard },
      { href: "/commerce/stores", label: "Stores", icon: Store },
      { href: "/commerce/products", label: "Products", icon: Package },
      { href: "/commerce/orders", label: "Orders", icon: ShoppingBag },
      { href: "/commerce/inventory", label: "Inventory", icon: Warehouse },
    ],
  },
  {
    id: "channels",
    label: "Channels",
    items: [
      { href: "/commerce/integrations", label: "Integrations", icon: Plug },
      { href: "/commerce/connected-stores", label: "Connected Stores", icon: Link2 },
      { href: "/commerce/channel-products", label: "Channel Products", icon: Boxes },
      { href: "/commerce/channel-orders", label: "Channel Orders", icon: ShoppingBag },
      { href: "/commerce/channel-inventory", label: "Channel Inventory", icon: Warehouse },
      { href: "/commerce/pricing", label: "Pricing", icon: Percent },
      { href: "/commerce/sync", label: "Sync", icon: RefreshCw },
    ],
  },
  {
    id: "supply",
    label: "Supply",
    items: [
      { href: "/commerce/suppliers", label: "Suppliers", icon: Package },
      { href: "/commerce/fulfillment", label: "Fulfillment", icon: Truck },
      { href: "/commerce/shipping", label: "Shipping", icon: Truck },
    ],
  },
  {
    id: "storefront",
    label: "Storefront",
    items: [
      { href: "/commerce/builder", label: "Builder", icon: Wand2 },
      { href: "/commerce/collections", label: "Collections", icon: LayoutGrid },
      { href: "/commerce/customers", label: "Customers", icon: Users },
      { href: "/commerce/discounts", label: "Discounts", icon: Percent },
      { href: "/commerce/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/commerce/payments", label: "Payments", icon: CreditCard },
      { href: "/commerce/pages", label: "Pages", icon: FileText },
      { href: "/commerce/domains", label: "Domains", icon: Globe },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { href: "/commerce/settings", label: "Settings", icon: Settings },
      { href: "/commerce/api-keys", label: "API Keys", icon: KeyRound },
      { href: "/commerce/channel-settings", label: "Channel Settings", icon: Settings },
    ],
  },
];

const FLAT_NAV = NAV_GROUPS.flatMap((g) => g.items);

function isNavActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = isNavActive(pathname, item);
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
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-[#E5E7EB] px-4 py-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#111827]">
          Commerce OS
        </p>
        <p className="mt-1 text-[11px] text-[#9CA3AF]">
          Stores · channels · suppliers
        </p>
      </div>
      <nav
        aria-label="Commerce OS"
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-2 py-3"
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.id}>
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t border-[#E5E7EB] p-3">
        <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-3">
          <div className="flex items-start gap-2">
            <CircleHelp className="mt-0.5 h-4 w-4 text-[#FF5A1F]" />
            <div>
              <p className="text-xs font-semibold text-[#111827]">Need help?</p>
              <p className="mt-0.5 text-[11px] leading-snug text-[#6B7280]">
                Stores, Shopify, suppliers, and orders.
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
  user,
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
  user?: {
    name: string;
    avatarUrl?: string | null;
    isPremium?: boolean;
  };
}) {
  const pathname = usePathname() ?? "/commerce";
  const [mobileNav, setMobileNav] = useState(false);
  const isBuilder = builderShouldHideCommerceNav(pathname);

  useEffect(() => {
    // Close mobile drawer when navigating between Commerce routes.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset on route change
    setMobileNav(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNav) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNav(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileNav]);

  /* Store Builder 3.0 — dedicated full-page editor shell (no Commerce OS chrome). */
  if (isBuilder) {
    return (
      <div
        className="h-dvh overflow-hidden bg-[#F3F4F6] text-[#111827]"
        data-jimvio-builder-shell="1"
      >
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#F8FAFC] text-[#111827]">
      <AppTopNav showUtilityBar activeNav="Commerce" user={user} />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Desktop sidebar — stationary; only its inner nav scrolls when needed */}
        <aside className="sticky top-0 hidden h-full w-[248px] shrink-0 self-stretch overflow-hidden border-r border-[#E5E7EB] bg-white lg:block">
          <SidebarBody pathname={pathname} />
        </aside>

        {/* Mobile drawer — always mounted; CSS open only (matches Affiliates) */}
        <div
          className={cn(
            "fixed inset-0 z-[110] lg:hidden",
            mobileNav ? "pointer-events-auto" : "pointer-events-none"
          )}
          aria-hidden={!mobileNav}
        >
          <button
            type="button"
            aria-label="Close navigation"
            tabIndex={mobileNav ? 0 : -1}
            className={cn(
              "absolute inset-0 bg-black/40 transition-opacity duration-150",
              mobileNav ? "opacity-100" : "opacity-0"
            )}
            onClick={() => setMobileNav(false)}
          />
          <aside
            className={cn(
              "relative flex h-full w-[min(300px,88vw)] flex-col border-r border-[#E5E7EB] bg-white shadow-xl transition-transform duration-150 ease-out",
              mobileNav ? "translate-x-0" : "-translate-x-full"
            )}
            role="dialog"
            aria-modal={mobileNav}
            aria-label="Commerce OS"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[#E5E7EB] px-4 py-3">
              <span className="text-sm font-semibold text-[#111827]">Commerce OS</span>
              <button
                type="button"
                onClick={() => setMobileNav(false)}
                aria-label="Close"
                tabIndex={mobileNav ? 0 : -1}
                className="grid h-9 w-9 place-items-center rounded-lg border border-[#E5E7EB]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <SidebarBody
                pathname={pathname}
                onNavigate={() => setMobileNav(false)}
              />
            </div>
          </aside>
        </div>

        <div className="flex min-w-0 flex-1 overflow-hidden">
          <main
            className={cn(
              "min-w-0 flex-1 overflow-x-hidden overflow-y-auto",
              MOBILE_PRIMARY_BOTTOM_NAV_PAD
            )}
          >
            {/* Mobile page header — Affiliates pattern: [☰] title */}
            <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-[#E5E7EB] bg-white/95 px-4 py-2 backdrop-blur lg:hidden">
              <button
                type="button"
                onClick={() => setMobileNav(true)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-[#E5E7EB]"
                aria-label="Open navigation"
                aria-expanded={mobileNav}
              >
                <Menu className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-[#111827]">Commerce OS</span>
            </div>

            {/* Tablet horizontal chips when permanent sidebar is hidden */}
            <div className="hidden border-b border-[#E5E7EB] bg-white md:block lg:hidden">
              <nav
                aria-label="Commerce sections"
                className="flex gap-1 overflow-x-auto px-4 py-2"
              >
                {FLAT_NAV.map((item) => {
                  const active = isNavActive(pathname, item);
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
          </main>
        </div>
      </div>

      <MobilePrimaryBottomNav isAuthenticated={Boolean(user)} />
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
