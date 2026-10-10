"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ArrowLeftRight,
  Banknote,
  CreditCard,
  FileText,
  Globe,
  LayoutDashboard,
  LayoutGrid,
  Menu,
  Package,
  Settings,
  ShoppingBag,
  Store,
  Truck,
  Users,
  Wand2,
  Warehouse,
  Wallet,
  X,
} from "lucide-react";
import { AppTopNav } from "@/components/shell/AppTopNav";
import { builderShouldHideCommerceNav } from "@/lib/commerce-os/builder/editor-chrome";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  exact?: boolean;
  /** Match finance tab query when set */
  tab?: string;
};

type NavGroup = { id: string; label: string; items: NavItem[] };

/**
 * Native Jimvio Store Commerce OS navigation.
 * Only routes that exist and are operational — no channel/Shopify surfaces.
 */
const NAV_GROUPS: NavGroup[] = [
  {
    id: "top",
    label: "",
    items: [
      { href: "/commerce", label: "Overview", exact: true, icon: LayoutDashboard },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      { href: "/commerce/orders", label: "Orders", icon: ShoppingBag },
      { href: "/commerce/products", label: "Products", icon: Package },
      { href: "/commerce/inventory", label: "Inventory", icon: Warehouse },
      { href: "/commerce/customers", label: "Customers", icon: Users },
    ],
  },
  {
    id: "store",
    label: "Store",
    items: [
      { href: "/commerce/stores", label: "Store", icon: Store },
      { href: "/commerce/builder", label: "Storefront", icon: Wand2 },
      { href: "/commerce/collections", label: "Collections", icon: LayoutGrid },
      { href: "/commerce/pages", label: "Pages", icon: FileText },
      { href: "/commerce/domains", label: "Domains", icon: Globe },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    items: [
      { href: "/commerce/finance", label: "Revenue", icon: Wallet, tab: "overview" },
      {
        href: "/commerce/finance?tab=transactions",
        label: "Transactions",
        icon: ArrowLeftRight,
        tab: "transactions",
      },
      {
        href: "/commerce/finance?tab=payouts",
        label: "Payouts",
        icon: Banknote,
        tab: "payouts",
      },
      { href: "/commerce/payments", label: "Payments", icon: CreditCard },
    ],
  },
  {
    id: "fulfillment",
    label: "Fulfillment",
    items: [
      { href: "/commerce/fulfillment", label: "Fulfillment", icon: Truck },
      { href: "/commerce/shipping", label: "Shipping", icon: Truck },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    items: [{ href: "/commerce/settings", label: "Settings", icon: Settings }],
  },
];

function navPath(href: string) {
  return href.split("?")[0];
}

function isNavActive(
  pathname: string,
  searchTab: string | null,
  item: NavItem
) {
  const path = navPath(item.href);
  if (item.exact) return pathname === path;

  if (path === "/commerce/finance" && item.tab) {
    if (pathname !== "/commerce/finance" && !pathname.startsWith("/commerce/finance/")) {
      return false;
    }
    const current = searchTab || "overview";
    return current === item.tab;
  }

  return pathname === path || pathname.startsWith(`${path}/`);
}

function NavLink({
  item,
  pathname,
  searchTab,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  searchTab: string | null;
  onNavigate?: () => void;
}) {
  const active = isNavActive(pathname, searchTab, item);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors",
        active
          ? "bg-[#FF5A1F]/10 text-[#FF5A1F]"
          : "text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]"
      )}
    >
      {active ? (
        <span
          className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-[#FF5A1F]"
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
  searchTab,
  onNavigate,
}: {
  pathname: string;
  searchTab: string | null;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-[#E5E7EB] px-4 py-3.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#111827]">
          Commerce OS
        </p>
      </div>
      <nav
        aria-label="Commerce OS"
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-2 py-3"
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.id}>
            {group.label ? (
              <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                {group.label}
              </p>
            ) : null}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={`${item.href}-${item.label}`}
                  item={item}
                  pathname={pathname}
                  searchTab={searchTab}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
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
  const searchParams = useSearchParams();
  const searchTab = searchParams?.get("tab") ?? null;
  const [mobileNav, setMobileNav] = useState(false);
  const isBuilder = builderShouldHideCommerceNav(
    pathname,
    searchParams?.toString() ?? "",
  );

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
        <aside className="sticky top-0 hidden h-full w-[220px] shrink-0 self-stretch overflow-hidden border-r border-[#E5E7EB] bg-white lg:block">
          <SidebarBody pathname={pathname} searchTab={searchTab} />
        </aside>

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
              "relative flex h-full w-[min(280px,88vw)] flex-col border-r border-[#E5E7EB] bg-white shadow-xl transition-transform duration-150 ease-out",
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
                searchTab={searchTab}
                onNavigate={() => setMobileNav(false)}
              />
            </div>
          </aside>
        </div>

        <div className="flex min-w-0 flex-1 overflow-hidden">
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto pb-6">
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

            <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-6">{children}</div>
          </main>
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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E5E7EB] bg-white px-5 py-8 text-center">
      <p className="text-sm font-semibold text-[#111827]">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-[#6B7280]">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
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
        "rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
        className
      )}
    >
      {children}
    </div>
  );
}
