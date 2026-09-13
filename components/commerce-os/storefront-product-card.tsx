import Link from "next/link";
import { storefrontHref } from "@/lib/commerce-os/storefront-url";
import {
  formatStoreMoney,
  salePercent,
} from "@/lib/commerce-os/storefront/money";
import { productImageAt } from "@/lib/commerce-os/storefront/product-media";
import { StorefrontCardAddToCart } from "@/components/commerce-os/storefront-card-add-to-cart";

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
 * Premium reusable product card — shared by home grids, collections, search.
 * No fake ratings/wishlist. Sale badge only when compare_at_price is real.
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
  const blurb = product.short_description?.trim() || "";
  const showBlurb =
    blurb.length > 0 &&
    blurb.toLowerCase() !== String(product.name || "").trim().toLowerCase();

  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-[var(--store-card-radius,16px)] border border-[var(--store-border,rgba(0,0,0,0.08))] bg-[var(--store-surface,#fff)] shadow-[var(--store-shadow,0_1px_2px_rgba(15,23,42,0.04))] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
      <Link href={href} className="min-w-0">
        <div
          className="relative overflow-hidden bg-[color-mix(in_srgb,var(--store-muted,#6B7280)_8%,white)]"
          style={{ aspectRatio: "var(--store-image-ratio, 4 / 3)" }}
        >
          {primary ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={primary}
                alt={product.name}
                className={`h-full w-full object-cover transition duration-500 ${
                  hover ? "group-hover:opacity-0" : "group-hover:scale-[1.03]"
                }`}
              />
              {hover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={hover}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-500 group-hover:opacity-100"
                />
              ) : null}
            </>
          ) : (
            <div className="grid h-full place-items-center text-xs text-[var(--store-muted,#6B7280)]">
              No image
            </div>
          )}
          {pct != null ? (
            <span className="absolute left-2.5 top-2.5 rounded-full bg-[var(--store-primary,#FF5A1F)] px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
              -{pct}%
            </span>
          ) : null}
          {soldOut ? (
            <span className="absolute right-2.5 top-2.5 rounded-full bg-[var(--store-text)]/85 px-2 py-0.5 text-[10px] font-semibold text-[var(--store-surface)]">
              Sold out
            </span>
          ) : null}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-3 sm:p-3.5">
        <Link href={href} className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--store-text,#111827)]">
            {product.name}
          </h3>
          {showBlurb ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--store-muted,#6B7280)]">
              {blurb}
            </p>
          ) : null}
        </Link>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div>
            <p className="text-sm font-bold text-[var(--store-primary,#FF5A1F)]">
              {formatStoreMoney(product.price, product.currency)}
            </p>
            {pct != null ? (
              <p className="text-xs text-[var(--store-muted,#6B7280)] line-through">
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
              disabled={soldOut}
            />
          ) : (
            <Link
              href={href}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-[var(--store-btn-text,#fff)] shadow-sm"
              style={{ background: "var(--store-btn, var(--store-primary,#FF5A1F))" }}
              aria-label={`View ${product.name}`}
            >
              +
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
