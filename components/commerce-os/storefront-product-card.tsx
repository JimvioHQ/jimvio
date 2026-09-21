import Link from "next/link";
import { storefrontHref } from "@/lib/commerce-os/storefront-url";
import {
  formatStoreMoney,
  formatStorefrontMoney,
  salePercent,
} from "@/lib/commerce-os/storefront/money";
import { productImageAt } from "@/lib/commerce-os/storefront/product-media";
import { StorefrontCardAddToCart } from "@/components/commerce-os/storefront-card-add-to-cart";
import {
  StorefrontCartGlyph,
  storefrontCardActionClass,
} from "@/components/commerce-os/storefront-card-chrome";

export type StorefrontProductCardData = {
  id: string;
  name: string;
  slug: string;
  price: number | string | null;
  compare_at_price?: number | string | null;
  currency?: string | null;
  images?: unknown;
  short_description?: string | null;
  inventory_quantity?: number | null;
  track_inventory?: boolean | null;
  vendor_id?: string | null;
};

export { formatStoreMoney, formatStorefrontMoney, salePercent };

function cardSubtitle(name: string, shortDescription?: string | null): string | null {
  const blurb = shortDescription?.trim() || "";
  if (!blurb) return null;
  if (blurb.toLowerCase() === name.trim().toLowerCase()) return null;
  return blurb;
}

/**
 * Compact reference-style product card — shared across storefront + builder.
 * Sale badge only from real compare-at. No fake ratings/wishlist/New badges.
 */
export function StorefrontProductCard({
  product,
  handle,
  onStoreHost = false,
  storeId,
  displayCurrency,
}: {
  product: StorefrontProductCardData;
  handle: string;
  onStoreHost?: boolean;
  storeId?: string;
  /** Merchant store currency (e.g. USD). Converts from product.currency when needed. */
  displayCurrency?: string | null;
}) {
  const linkOpts = { onStoreHost };
  const href = storefrontHref(handle, `/product/${product.slug}`, linkOpts);
  const primary = productImageAt(product.images, 0);
  const hover = productImageAt(product.images, 1);
  const pct = salePercent(product.price, product.compare_at_price);
  const subtitle = cardSubtitle(product.name, product.short_description);
  const soldOut =
    product.track_inventory === true &&
    typeof product.inventory_quantity === "number" &&
    product.inventory_quantity <= 0;
  const canAdd = Boolean(storeId && product.vendor_id && !soldOut);
  const storeCurrency = displayCurrency || "USD";

  return (
    <article
      className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-[var(--store-card-radius,16px)] border border-[var(--store-border,rgba(0,0,0,0.06))] bg-[var(--store-surface,#fff)] shadow-[var(--store-shadow,0_2px_10px_rgba(15,23,42,0.05))] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.1)]"
      data-storefront-chrome="product-card"
    >
      <Link href={href} className="relative block min-w-0 p-2 pb-0 sm:p-2.5 sm:pb-0">
        <div
          className="relative overflow-hidden rounded-[calc(var(--store-card-radius,16px)-4px)] bg-[color-mix(in_srgb,var(--store-muted,#6B7280)_7%,white)]"
          style={{ aspectRatio: "var(--store-image-ratio, 1 / 1)" }}
        >
          {primary ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={primary}
                alt={product.name}
                loading="lazy"
                decoding="async"
                className={`h-full w-full object-contain p-3 transition duration-300 sm:p-3.5 ${
                  hover ? "group-hover:opacity-0" : "group-hover:scale-[1.03]"
                }`}
              />
              {hover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={hover}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-contain p-3 opacity-0 transition duration-300 group-hover:opacity-100 sm:p-3.5"
                />
              ) : null}
            </>
          ) : (
            <div className="grid h-full place-items-center px-2 text-center text-[11px] text-[var(--store-muted,#6B7280)]">
              No image
            </div>
          )}
          {pct != null ? (
            <span className="absolute left-2 top-2 rounded-md bg-[var(--store-error,#DC2626)] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm">
              -{pct}%
            </span>
          ) : null}
          {soldOut ? (
            <span className="absolute right-2 top-2 rounded-md bg-[var(--store-text)]/85 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[var(--store-surface)]">
              Sold out
            </span>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-1 px-2.5 pb-2.5 pt-2 sm:px-3 sm:pb-3 sm:pt-2.5">
        <Link href={href} className="min-w-0">
          <h3 className="line-clamp-2 min-h-[2.4em] text-[12px] font-semibold leading-snug tracking-tight text-[var(--store-text,#111827)] sm:text-[13px]">
            {product.name}
          </h3>
          {subtitle ? (
            <p className="mt-0.5 line-clamp-1 text-[11px] leading-snug text-[var(--store-muted,#6B7280)]">
              {subtitle}
            </p>
          ) : null}
        </Link>

        <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0">
              <p className="truncate text-[13px] font-bold text-[var(--store-primary,#FF5A1F)] sm:text-sm">
                {formatStorefrontMoney(
                  product.price,
                  product.currency,
                  storeCurrency,
                )}
              </p>
              {pct != null ? (
                <p className="truncate text-[11px] text-[var(--store-muted,#6B7280)] line-through">
                  {formatStorefrontMoney(
                    product.compare_at_price,
                    product.currency,
                    storeCurrency,
                  )}
                </p>
              ) : null}
            </div>
          </div>
          {canAdd ? (
            <StorefrontCardAddToCart
              productId={product.id}
              vendorId={product.vendor_id!}
              storeId={storeId!}
              storeHandle={handle}
              productName={product.name}
              productHref={href}
              disabled={soldOut}
            />
          ) : (
            <Link
              href={href}
              className={storefrontCardActionClass}
              style={{ background: "var(--store-btn, var(--store-primary,#FF5A1F))" }}
              aria-label={`View ${product.name}`}
            >
              <StorefrontCartGlyph />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
