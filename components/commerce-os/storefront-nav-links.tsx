"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { storefrontNavIsActive } from "@/lib/commerce-os/storefront/header-nav";

export function StorefrontNavLinks({
  items,
  handle,
  variant = "header",
}: {
  items: Array<{ label: string; href: string }>;
  handle: string;
  variant?: "header" | "footer";
}) {
  const pathname = usePathname() || "/";
  const search = useSearchParams()?.toString() || "";

  return (
    <>
      {items.map((item) => {
        const active = storefrontNavIsActive({
          pathname,
          href: item.href,
          handle,
          search,
        });
        const headerClass = active
          ? "shrink-0 rounded-lg px-2.5 py-1.5 font-semibold text-[var(--store-text)]"
          : "shrink-0 rounded-lg px-2.5 py-1.5 text-[var(--store-text)]/75 transition hover:bg-black/[0.04] hover:text-[var(--store-text)]";
        const footerClass = active
          ? "font-semibold text-[var(--store-text)]"
          : "hover:text-[var(--store-text)]";
        return (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={variant === "footer" ? footerClass : headerClass}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
