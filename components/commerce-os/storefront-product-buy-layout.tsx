"use client";

import { useState } from "react";
import { StorefrontProductGallery } from "@/components/commerce-os/storefront-product-gallery";
import { StorefrontAddToCartButton } from "@/components/commerce-os/storefront-add-to-cart";
import { formatStorefrontMoney, salePercent } from "@/lib/commerce-os/storefront/money";
import { storefrontDetailAvailabilityLabel } from "@/lib/commerce-os/storefront/availability";
import { storefrontHref } from "@/lib/commerce-os/storefront-url";
import Link from "next/link";

type VariantOption = {
  id: string;
  name?: string | null;
  price?: number | string | null;
  options?: unknown;
  inventory_quantity?: number | null;
  image_url?: string | null;
  is_active?: boolean | null;
};

export function StorefrontProductBuyLayout({
  handle,
  storeHandle,
  storeId,
  storeVendorId,
  product,
  variants,
  gallery,
  displayCurrency,
  sourceCurrency,
  onStoreHost,
  stickyAtc = true,
}: {
  handle: string;
  storeHandle: string;
  storeId: string;
  storeVendorId: string;
  product: {
    id: string;
    name: string;
    price: number | string | null;
    compare_at_price?: number | string | null;
    vendor_id?: string | null;
    short_description?: string | null;
    inventory_quantity?: number | null;
    track_inventory?: boolean | null;
    sku?: string | null;
  };
  variants: VariantOption[];
  gallery: string[];
  displayCurrency: string;
  sourceCurrency: string;
  onStoreHost: boolean;
  stickyAtc?: boolean;
}) {
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const pct = salePercent(product.price, product.compare_at_price);
  const stockLabel = storefrontDetailAvailabilityLabel({
    inventory_quantity: product.inventory_quantity,
    track_inventory: product.track_inventory,
  });
  const inStock = stockLabel !== "Out of stock";
  const short =
    product.short_description?.trim() &&
    product.short_description.trim().toLowerCase() !==
      product.name.trim().toLowerCase()
      ? product.short_description.trim()
      : null;

  return (
    <div className="mx-auto grid max-w-[var(--store-max-width,80rem)] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:py-10">
      <StorefrontProductGallery
        images={gallery}
        alt={product.name}
        activeSrc={activeImage}
      />

      <div className="flex flex-col">
        <h1
          className="text-2xl font-semibold tracking-tight text-[var(--store-text,#111827)] sm:text-3xl"
          style={{ fontFamily: "var(--store-heading-font, inherit)" }}
        >
          {product.name}
        </h1>

        <div className="mt-3 flex flex-wrap items-baseline gap-2">
          <p className="text-2xl font-bold text-[var(--store-primary,#FF5A1F)]">
            {formatStorefrontMoney(
              product.price,
              sourceCurrency,
              displayCurrency,
            )}
          </p>
          {pct != null ? (
            <>
              <p className="text-sm text-[var(--store-muted,#6B7280)] line-through">
                {formatStorefrontMoney(
                  product.compare_at_price,
                  sourceCurrency,
                  displayCurrency,
                )}
              </p>
              <span className="rounded-md bg-[var(--store-primary,#FF5A1F)] px-2 py-0.5 text-[10px] font-bold text-white">
                -{pct}%
              </span>
            </>
          ) : null}
        </div>

        <p className="mt-3 text-sm font-medium text-[var(--store-text,#111827)]">
          <span
            className={`mr-1.5 inline-block h-2 w-2 rounded-full ${
              inStock ? "bg-emerald-500" : "bg-rose-500"
            }`}
            aria-hidden
          />
          {stockLabel}
        </p>

        {short ? (
          <p className="mt-4 text-sm leading-relaxed text-[var(--store-muted,#6B7280)]">
            {short}
          </p>
        ) : null}

        <div className="mt-6 rounded-[var(--store-card-radius,16px)] border border-[var(--store-border,rgba(0,0,0,0.06))] bg-[var(--store-surface,#fff)] p-4 sm:p-5">
          <StorefrontAddToCartButton
            productId={product.id}
            vendorId={product.vendor_id || storeVendorId}
            variants={variants}
            storeHandle={storeHandle}
            storeId={storeId}
            currency={displayCurrency}
            sourceCurrency={sourceCurrency}
            price={product.price}
            soldOut={!inStock}
            sticky={stickyAtc}
            onStoreHost={onStoreHost}
            trackInventory={product.track_inventory === true}
            onVariantImageChange={setActiveImage}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-2.5 text-[11px] text-[var(--store-muted,#6B7280)] sm:grid-cols-3">
          <Link
            href={storefrontHref(
              handle,
              onStoreHost ? "/shipping-policy" : "/pages/shipping-policy",
              { onStoreHost },
            )}
            className="rounded-[var(--store-card-radius,16px)] border border-[var(--store-border,rgba(0,0,0,0.06))] bg-[var(--store-bg,#F8FAFC)] px-3 py-3.5 text-left transition hover:border-[var(--store-primary,#FF5A1F)]/35"
          >
            <p className="font-semibold text-[var(--store-text,#111827)]">
              Shipping
            </p>
            <p className="mt-0.5">See store policy</p>
          </Link>
          <Link
            href={storefrontHref(
              handle,
              onStoreHost ? "/refund-policy" : "/pages/refund-policy",
              { onStoreHost },
            )}
            className="rounded-[var(--store-card-radius,16px)] border border-[var(--store-border,rgba(0,0,0,0.06))] bg-[var(--store-bg,#F8FAFC)] px-3 py-3.5 text-left transition hover:border-[var(--store-primary,#FF5A1F)]/35"
          >
            <p className="font-semibold text-[var(--store-text,#111827)]">
              Returns
            </p>
            <p className="mt-0.5">Merchant policy applies</p>
          </Link>
          <div className="rounded-[var(--store-card-radius,16px)] border border-[var(--store-border,rgba(0,0,0,0.06))] bg-[var(--store-bg,#F8FAFC)] px-3 py-3.5 text-left">
            <p className="font-semibold text-[var(--store-text,#111827)]">
              Secure checkout
            </p>
            <p className="mt-0.5">Encrypted payment processing</p>
          </div>
        </div>
      </div>
    </div>
  );
}
