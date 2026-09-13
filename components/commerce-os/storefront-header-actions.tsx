"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCart } from "@/lib/actions/marketplace";
import { storefrontHref } from "@/lib/commerce-os/storefront-url";
import { storefrontCartItemCount } from "@/lib/commerce-os/storefront/cart-count";
import { formatStoreMoney } from "@/lib/commerce-os/storefront/money";
import {
  storefrontDesktopSearchClass,
  storefrontHeaderMenuButtonClass,
  storefrontMobileSearchIconClass,
  storefrontShowHeaderMenu,
} from "@/lib/commerce-os/storefront/chrome";
import { useCartStore } from "@/lib/store/use-cart-store";

type PreviewDevice = "desktop" | "laptop" | "tablet" | "mobile" | "custom";

function CartGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 6h15l-1.5 9h-12z" />
      <circle cx="9" cy="20" r="1.25" />
      <circle cx="18" cy="20" r="1.25" />
      <path d="M6 6 5 3H2" />
    </svg>
  );
}

function AccountGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
    </svg>
  );
}

function MenuGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

/** Client island for storefront header search, account, store-scoped cart, and mobile menu. */
export function StorefrontHeaderActions({
  handle,
  storeId,
  currency,
  onStoreHost = false,
  previewDevice,
  navItems = [],
  mobileNavStyle = "bottom",
}: {
  handle: string;
  storeId?: string;
  currency?: string | null;
  onStoreHost?: boolean;
  previewDevice?: PreviewDevice;
  navItems?: Array<{ label: string; href: string }>;
  mobileNavStyle?: "bottom" | "drawer" | "hidden";
}) {
  const linkOpts = { onStoreHost };
  const { cartCount } = useCartStore();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [storeCount, setStoreCount] = useState(0);
  const [storeTotal, setStoreTotal] = useState(0);
  const searchBase = storefrontHref(handle, "/search", linkOpts);
  const cartHref = storefrontHref(handle, "/cart", linkOpts);
  const accountHref = storefrontHref(handle, "/account", linkOpts);
  const desktopSearch =
    previewDevice == null
      ? null
      : previewDevice === "desktop" ||
        previewDevice === "laptop" ||
        previewDevice === "custom";

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    void getCart({ jimvioStoreId: storeId, jimvioStoreHandle: handle }).then(
      (result) => {
        if (cancelled) return;
        setStoreCount(storefrontCartItemCount(result.items));
        setStoreTotal(Number(result.total) || 0);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [storeId, handle, cartCount]);

  const searchFormClass = storefrontDesktopSearchClass(previewDevice);
  const searchIconClass = storefrontMobileSearchIconClass(previewDevice);
  const accountClass =
    desktopSearch === false
      ? "hidden"
      : desktopSearch === true
        ? "inline-flex h-10 items-center gap-1.5 rounded-full px-2 text-xs font-semibold text-[var(--store-text,#111827)]"
        : "hidden h-10 items-center gap-1.5 rounded-full px-2 text-xs font-semibold text-[var(--store-text,#111827)] lg:inline-flex";
  const cartClass =
    desktopSearch === false
      ? "relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-[var(--store-btn-text,#fff)] shadow-sm"
      : desktopSearch === true
        ? "relative inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-[var(--store-btn-text,#fff)] shadow-sm"
        : "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-[var(--store-btn-text,#fff)] shadow-sm lg:w-auto lg:gap-1.5 lg:px-3.5";
  const showMenu = storefrontShowHeaderMenu(previewDevice, mobileNavStyle);

  const badge = storeCount > 0 ? (storeCount > 99 ? "99+" : String(storeCount)) : null;

  return (
    <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
      <form action={searchBase} method="get" className={`${searchFormClass} items-center gap-2`} role="search">
        <label className="sr-only" htmlFor="storefront-search">
          Search products
        </label>
        <input
          id="storefront-search"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search for products, brands, or more…"
          className="h-10 min-w-0 flex-1 border border-[var(--store-border,rgba(0,0,0,0.1))] bg-[var(--store-surface,#fff)] px-4 text-sm text-[var(--store-text,#111827)] outline-none placeholder:text-[var(--store-muted,#6B7280)]"
          style={{ borderRadius: "var(--store-input-radius,9999px)" }}
        />
        <button
          type="submit"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white shadow-sm"
          style={{ background: "var(--store-btn, var(--store-primary,#FF5A1F))" }}
          aria-label="Search"
        >
          ⌕
        </button>
      </form>
      <Link href={searchBase} className={searchIconClass} aria-label="Search">
        ⌕
      </Link>
      <Link href={accountHref} className={accountClass} aria-label="Account">
        <AccountGlyph />
        <span>Sign in</span>
      </Link>
      <Link
        href={cartHref}
        className={cartClass}
        style={{ background: "var(--store-btn, var(--store-primary,#FF5A1F))" }}
        aria-label={badge ? `Cart, ${storeCount} items` : "Cart"}
      >
        <CartGlyph />
        {desktopSearch === true ? (
          <span>Cart {formatStoreMoney(storeTotal, currency)}</span>
        ) : null}
        {desktopSearch === null ? (
          <span className="hidden lg:inline">Cart {formatStoreMoney(storeTotal, currency)}</span>
        ) : null}
        {badge ? (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--store-error)] px-1 text-[10px] font-bold text-white">
            {badge}
          </span>
        ) : null}
      </Link>
      {showMenu ? (
        <button
          type="button"
          className={storefrontHeaderMenuButtonClass(previewDevice)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <MenuGlyph />
        </button>
      ) : null}
      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Store menu">
          <button
            type="button"
            className="absolute inset-0 bg-[var(--store-text)]/40"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-[min(320px,92vw)] flex-col bg-[var(--store-surface,#fff)] p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold">Menu</p>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs font-semibold text-[var(--store-muted,#6B7280)]"
                onClick={() => setMenuOpen(false)}
              >
                Close
              </button>
            </div>
            <nav className="flex flex-col gap-1 text-sm">
              {navItems.map((item) => (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  className="rounded-lg px-3 py-2.5 font-medium text-[var(--store-text,#111827)] hover:bg-black/[0.04]"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href={accountHref}
                className="rounded-lg px-3 py-2.5 font-medium"
                onClick={() => setMenuOpen(false)}
              >
                Account
              </Link>
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}
