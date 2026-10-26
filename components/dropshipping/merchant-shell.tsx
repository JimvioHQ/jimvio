"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/commerce", label: "Overview", exact: true },
  { href: "/commerce/connected-stores", label: "Connected Stores" },
  { href: "/commerce/channel-products", label: "Products" },
  { href: "/commerce/channel-orders", label: "Orders" },
  { href: "/commerce/channel-inventory", label: "Inventory" },
  { href: "/commerce/pricing", label: "Pricing" },
  { href: "/commerce/sync", label: "Sync" },
  { href: "/commerce/integrations", label: "Integrations" },
  { href: "/developers/api-keys", label: "API" },
  { href: "/commerce/channel-settings", label: "Settings" },
] as const;

export function MerchantShell({
  children,
  title,
  description,
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-[70vh] bg-[#F8FAFC] text-[#111827]">
      <div className="border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#FF5A1F]">
                Jimvio Commerce OS
              </p>
              {title ? (
                <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-[#111827]">
                  {title}
                </h1>
              ) : null}
              {description ? (
                <p className="mt-1 text-sm text-[#6B7280]">{description}</p>
              ) : null}
            </div>
          </div>
          <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1">
            {NAV.map((item) => {
              const active =
                "exact" in item && item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "shrink-0 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                    active
                      ? "bg-[#FF5A1F]/10 text-[#FF5A1F]"
                      : "text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</div>
    </div>
  );
}
