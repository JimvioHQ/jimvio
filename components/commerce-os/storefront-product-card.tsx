import Link from "next/link";
import { storefrontHref } from "@/lib/commerce-os/storefront-url";
import {
  formatStoreMoney,
  salePercent,
} from "@/lib/commerce-os/storefront/money";

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
};

function imageUrlAt(images: unknown, index: number): string | null {
  if (!Array.isArray(images) || !images[index]) return null;
  const item = images[index];
  if (typeof item === "string") return item;
  if (item && typeof item === "object" && "url" in item) {
    const u = (item as { url?: unknown }).url;
    return typeof u === "string" ? u : null;
  }
  return null;
}

export { formatStoreMoney, salePercent };

/**
 * Premium reusable product card — shared by home grids, collections, search.
 * No fake ratings/wishlist. Sale badge only when compare_at_price is real.
 */
export function StorefrontProductCard({
  product,
  handle,
  onStoreHost = false,
}: {
  product: StorefrontProductCardData;
  handle: string;
  onStoreHost?: boolean;
}) {
  const linkOpts = { onStoreHost };
  const primary = imageUrlAt(product.images, 0);
  const hover = imageUrlAt(product.images, 1);
  const pct = salePercent(product.price, product.compare_at_price);
  const soldOut =
    product.track_inventory === true &&
    typeof product.inventory_quantity === "number" &&
    product.inventory_quantity <= 0;

  return (
    <Link
      href={storefrontHref(handle, `/product/${product.slug}`, linkOpts)}
      className="group relative flex flex-col overflow-hidden rounded-[var(--store-card-radius,16px)] border border-[var(--store-border,rgba(0,0,0,0.08))] bg-[var(--store-surface,#fff)] shadow-[var(--store-shadow,0_1px_2px_rgba(15,23,42,0.04))] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
    >
      <div
        className="relative overflow-hidden bg-[color-mix(in_srgb,var(--store-muted,#6B7280)_8%,white)]"
        style={{ aspectRatio: "var(--store-image-ratio, 4 / 3)" }}
      >
        {primary ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={primary}
              alt=""
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
          <span className="absolute right-2.5 top-2.5 rounded-full bg-[#111827]/85 px-2 py-0.5 text-[10px] font-semibold text-white">
            Sold out
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--store-text,#111827)]">
          {product.name}
        </p>
        {product.short_description ? (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--store-muted,#6B7280)]">
            {product.short_description}
          </p>
        ) : null}
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
          <span
            className="grid h-8 w-8 place-items-center rounded-full text-sm font-bold text-[var(--store-btn-text,#fff)] shadow-sm transition group-hover:scale-105"
            style={{ background: "var(--store-btn, var(--store-primary,#FF5A1F))" }}
            aria-hidden
          >
            +
          </span>
        </div>
      </div>
    </Link>
  );
}
