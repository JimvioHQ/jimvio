import Link from "next/link";
import { storefrontHref } from "@/lib/commerce-os/storefront-url";
import {
  formatStoreMoney,
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

export { formatStoreMoney, salePercent };

/**
 * Compact storefront product card — shared by home, collections, search, related.
 * Sale badge only from real compare-at. No fake ratings, wishlist, or New badges.
 */
export function StorefrontProductCard({
  product,
  handle,
  onStoreHost = false,
  storeId,
}: {
  product: StorefrontProductCardData;
  handle: string;
  onStoreHost?: boolean;
  storeId?: string;
}) {
  const linkOpts = { onStoreHost };
  const href = storefrontHref(handle, `/product/${product.slug}`, linkOpts);
  const primary = productImageAt(product.images, 0);
  const hover = productImageAt(product.images, 1);
  const pct = salePercent(product.price, product.compare_at_price);
  const soldOut =
    product.track_inventory === true &&
    typeof product.inventory_quantity === "number" &&
    product.inventory_quantity <= 0;
  const canAdd = Boolean(storeId && product.vendor_id && !soldOut);

  return (
    <article
      className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-[var(--store-card-radius,16px)] border border-[var(--store-border,rgba(0,0,0,0.08))] bg-[var(--store-surface,#fff)] shadow-[var(--store-shadow,0_1px_2px_rgba(15,23,42,0.04))] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
      data-storefront-chrome="product-card"
    >
      <Link href={href} className="min-w-0">
        <div
          className="relative overflow-hidden bg-[color-mix(in_srgb,var(--store-muted,#6B7280)_6%,white)]"
          style={{ aspectRatio: "var(--store-image-ratio, 4 / 3)" }}
        >
          {primary ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={primary}
                alt={product.name}
                loading="lazy"
                decoding="async"
                className={`h-full w-full object-contain p-2.5 sm:p-3 transition duration-300 ${
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
                  className="absolute inset-0 h-full w-full object-contain p-2.5 opacity-0 transition duration-300 group-hover:opacity-100 sm:p-3"
                />
              ) : null}
            </>
          ) : (
            <div className="grid h-full place-items-center px-2 text-center text-[11px] text-[var(--store-muted,#6B7280)]">
              No image
            </div>
          )}
          {pct != null ? (
            <span className="absolute left-2 top-2 rounded-full bg-[var(--store-primary,#FF5A1F)] px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
              -{pct}%
            </span>
          ) : null}
          {soldOut ? (
            <span className="absolute right-2 top-2 rounded-full bg-[var(--store-text)]/85 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--store-surface)]">
              Sold out
            </span>
          ) : null}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 px-2.5 pb-2.5 pt-2 sm:gap-2 sm:px-3 sm:pb-3">
        <Link href={href} className="min-w-0">
          <h3 className="line-clamp-2 min-h-[2.5em] text-[12px] font-semibold leading-snug text-[var(--store-text,#111827)] sm:text-[13px]">
            {product.name}
          </h3>
        </Link>
        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold text-[var(--store-primary,#FF5A1F)] sm:text-sm">
              {formatStoreMoney(product.price, product.currency)}
            </p>
            {pct != null ? (
              <p className="truncate text-[11px] text-[var(--store-muted,#6B7280)] line-through">
                {formatStoreMoney(product.compare_at_price, product.currency)}
              </p>
            ) : null}
          </div>
          {canAdd ? (
            <StorefrontCardAddToCart
              productId={product.id}
              vendorId={product.vendor_id!}
              storeId={storeId!}
              storeHandle={handle}
              productName={product.name}
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
