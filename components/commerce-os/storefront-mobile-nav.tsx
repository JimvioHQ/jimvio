"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getCart } from "@/lib/actions/marketplace";
import { storefrontHref } from "@/lib/commerce-os/storefront-url";
import { storefrontCartItemCount } from "@/lib/commerce-os/storefront/cart-count";
import { storefrontMobileNavClass } from "@/lib/commerce-os/storefront/chrome";
import { storefrontNavIsActive } from "@/lib/commerce-os/storefront/header-nav";
import { useCartStore } from "@/lib/store/use-cart-store";
type StorefrontPreviewDevice =
  | "desktop"
  | "laptop"
  | "tablet"
  | "mobile"
  | "custom";

export function StorefrontMobileNav({
  handle,
  storeId,
  onStoreHost = false,
  previewDevice,
  showDeals = false,
}: {
  handle: string;
  storeId?: string;
  onStoreHost?: boolean;
  previewDevice?: StorefrontPreviewDevice;
  showDeals?: boolean;
}) {
  const linkOpts = { onStoreHost };
  const { cartCount } = useCartStore();
  const [count, setCount] = useState(0);
  const pathname = usePathname() || "/";

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    void getCart({ jimvioStoreId: storeId }).then((result) => {
      if (cancelled) return;
      setCount(storefrontCartItemCount(result.items));
    });
    return () => {
      cancelled = true;
    };
  }, [storeId, cartCount]);

  const items = [
    { label: "Home", href: storefrontHref(handle, "", linkOpts), icon: "home" },
    {
      label: "Categories",
      href: storefrontHref(handle, "/collections/all", linkOpts),
      icon: "grid",
    },
    ...(showDeals
      ? [
          {
            label: "Deals",
            href: storefrontHref(handle, "/collections/all?sort=sale", linkOpts),
            icon: "bolt",
          },
        ]
      : [
          {
            label: "Search",
            href: storefrontHref(handle, "/search", linkOpts),
            icon: "search",
          },
        ]),
    {
      label: "Account",
      href: storefrontHref(handle, "/account", linkOpts),
      icon: "user",
    },
  ];

  return (
    <nav
      className={`${storefrontMobileNavClass(previewDevice)} border-t border-[var(--store-border)] bg-[var(--store-surface)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md`}
      aria-label="Store mobile"
      data-storefront-chrome="mobile-nav"
    >
      <ul className="mx-auto grid max-w-[var(--store-max-width,80rem)] grid-cols-4">
        {items.map((item) => {
          const active = storefrontNavIsActive({
            pathname,
            href: item.href,
            handle,
          });
          return (
          <li key={item.label}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-12 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-semibold ${
                active ? "text-[var(--store-primary)]" : "text-[var(--store-muted)]"
              }`}
            >
              <NavIcon name={item.icon} />
              {item.label}
            </Link>
          </li>
          );
        })}
      </ul>
      <span className="sr-only">Cart items: {count}</span>
    </nav>
  );
}

function NavIcon({ name }: { name: string }) {
  const cls = "h-5 w-5";
  if (name === "home") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M4 11 12 4l8 7v9H4z" />
      </svg>
    );
  }
  if (name === "grid") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="4" y="4" width="7" height="7" rx="1" />
        <rect x="13" y="4" width="7" height="7" rx="1" />
        <rect x="4" y="13" width="7" height="7" rx="1" />
        <rect x="13" y="13" width="7" height="7" rx="1" />
      </svg>
    );
  }
  if (name === "bolt") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden>
        <path d="M13 2 4 14h7l-1 8 10-14h-7l0-6z" />
      </svg>
    );
  }
  if (name === "search") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="11" cy="11" r="6" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
    </svg>
  );
}
