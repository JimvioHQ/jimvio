"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCartStore } from "@/lib/store/use-cart-store";
import { storefrontHref } from "@/lib/commerce-os/storefront-url";

/** Client island for storefront header search + cart badge. */
export function StorefrontHeaderActions({
  handle,
  onStoreHost = false,
}: {
  handle: string;
  onStoreHost?: boolean;
}) {
  const linkOpts = { onStoreHost };
  const { cartCount, refreshCounts } = useCartStore();
  const [q, setQ] = useState("");
  const searchBase = storefrontHref(handle, "/search", linkOpts);
  const cartHref = storefrontHref(handle, "/cart", linkOpts);

  useEffect(() => {
    void refreshCounts();
  }, [refreshCounts]);

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <form
        action={searchBase}
        method="get"
        className="hidden min-w-0 flex-1 md:flex"
        role="search"
      >
        <label className="sr-only" htmlFor="storefront-search">
          Search products
        </label>
        <div className="flex w-full max-w-md overflow-hidden rounded-full border border-[var(--store-border,rgba(0,0,0,0.1))] bg-[var(--store-surface,#fff)]">
          <input
            id="storefront-search"
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products…"
            className="h-10 min-w-0 flex-1 bg-transparent px-4 text-sm text-[var(--store-text,#111827)] outline-none placeholder:text-[var(--store-muted,#6B7280)]"
          />
          <button
            type="submit"
            className="grid h-10 w-11 place-items-center text-white"
            style={{ background: "var(--store-btn, var(--store-primary,#FF5A1F))" }}
            aria-label="Search"
          >
            ⌕
          </button>
        </div>
      </form>
      <Link
        href={searchBase}
        className="grid h-10 w-10 place-items-center rounded-full border border-[var(--store-border,rgba(0,0,0,0.08))] text-sm text-[var(--store-text,#111827)] md:hidden"
        aria-label="Search"
      >
        ⌕
      </Link>
      <Link
        href={cartHref}
        className="relative inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-[var(--store-btn-text,#fff)] shadow-sm"
        style={{ background: "var(--store-btn, var(--store-primary,#FF5A1F))" }}
      >
        Cart
        {cartCount > 0 ? (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#DC2626] px-1 text-[10px] font-bold text-white">
            {cartCount > 99 ? "99+" : cartCount}
          </span>
        ) : null}
      </Link>
    </div>
  );
}
