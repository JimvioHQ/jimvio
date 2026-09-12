import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  loadPublishedStoreByHandle,
  loadStoreProductBySlug,
} from "@/lib/commerce-os";
import { StorefrontAddToCartButton } from "@/components/commerce-os/storefront-add-to-cart";
import {
  buildMissingStorefrontMetadata,
  buildStorefrontMetadata,
} from "@/lib/commerce-os/storefront-metadata";
import { formatStoreMoney, salePercent } from "@/lib/commerce-os/storefront/money";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string; slug: string }> };

function imageUrls(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  return images
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "url" in item) {
        const url = (item as { url?: unknown }).url;
        return typeof url === "string" ? url : null;
      }
      return null;
    })
    .filter((u): u is string => Boolean(u));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle, slug } = await params;
  const supabase = await createClient();
  const store = await loadPublishedStoreByHandle(supabase, handle);
  if (!store) return buildMissingStorefrontMetadata();
  const loaded = await loadStoreProductBySlug(supabase, store.id, slug);
  if (!loaded) {
    return buildStorefrontMetadata(store, { path: `/product/${slug}` });
  }
  const img = imageUrls(loaded.product.images)[0] || null;
  return buildStorefrontMetadata(store, {
    path: `/product/${slug}`,
    title: `${loaded.product.name} | ${store.name}`,
    description:
      loaded.product.short_description ||
      store.description ||
      `Shop ${loaded.product.name} at ${store.name}`,
    image: img,
  });
}

export default async function StorefrontProductPage({ params }: Props) {
  const { handle, slug } = await params;
  const supabase = await createClient();
  const store = await loadPublishedStoreByHandle(supabase, handle);
  if (!store) notFound();

  const loaded = await loadStoreProductBySlug(supabase, store.id, slug);
  if (!loaded) notFound();

  const { product, variants } = loaded;
  const gallery = imageUrls(product.images);
  const primary = gallery[0] || null;
  const currency = (product.currency || store.default_currency || "USD").toUpperCase();
  const pct = salePercent(product.price, product.compare_at_price);
  const inStock =
    product.track_inventory !== true ||
    (typeof product.inventory_quantity === "number" &&
      product.inventory_quantity > 0);

  return (
    <div className="mx-auto grid max-w-[var(--store-max-width,72rem)] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-12">
      <div className="space-y-3">
        <div
          className="overflow-hidden rounded-[var(--store-card-radius,16px)] border border-[var(--store-border,rgba(0,0,0,0.06))] bg-[var(--store-surface,#fff)]"
          style={{ aspectRatio: "var(--store-image-ratio, 4 / 3)" }}
        >
          {primary ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={primary} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-sm text-[var(--store-muted,#6B7280)]">
              No image
            </div>
          )}
        </div>
        {gallery.length > 1 ? (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {gallery.slice(0, 5).map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src}
                src={src}
                alt=""
                className="aspect-square rounded-lg border border-[var(--store-border,rgba(0,0,0,0.06))] object-cover"
              />
            ))}
          </div>
        ) : null}
      </div>

      <div>
        <h1
          className="text-2xl font-semibold tracking-tight text-[var(--store-text,#111827)] sm:text-3xl"
          style={{ fontFamily: "var(--store-heading-font, inherit)" }}
        >
          {product.name}
        </h1>
        <div className="mt-3 flex flex-wrap items-baseline gap-2">
          <p className="text-2xl font-bold text-[var(--store-primary,#FF5A1F)]">
            {formatStoreMoney(product.price, currency)}
          </p>
          {pct != null ? (
            <>
              <p className="text-sm text-[var(--store-muted,#6B7280)] line-through">
                {formatStoreMoney(product.compare_at_price, currency)}
              </p>
              <span className="rounded-full bg-[var(--store-primary,#FF5A1F)] px-2 py-0.5 text-[10px] font-bold text-white">
                -{pct}%
              </span>
            </>
          ) : null}
        </div>
        <p className="mt-3 text-sm font-medium">
          <span
            className={`mr-1.5 inline-block h-2 w-2 rounded-full ${
              inStock ? "bg-emerald-500" : "bg-rose-500"
            }`}
            aria-hidden
          />
          {inStock
            ? product.track_inventory === true &&
              typeof product.inventory_quantity === "number"
              ? `In stock — ${product.inventory_quantity} left`
              : "In stock"
            : "Sold out"}
        </p>
        {product.short_description ? (
          <p className="mt-4 text-sm leading-relaxed text-[var(--store-muted,#6B7280)]">
            {product.short_description}
          </p>
        ) : null}
        {product.description ? (
          <div
            className="prose prose-sm mt-6 max-w-none opacity-90"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        ) : null}
        <div className="mt-8">
          <StorefrontAddToCartButton
            productId={product.id}
            vendorId={product.vendor_id || store.vendor_id}
            variants={variants.map((v) => ({
              id: v.id,
              name: (v as { name?: string | null }).name,
              price: v.price,
              options: (v as { options?: unknown }).options,
              inventory_quantity: v.inventory_quantity,
            }))}
            storeHandle={store.handle}
            storeId={store.id}
            currency={currency}
          />
        </div>
        <div className="mt-8 grid grid-cols-3 gap-3 border-t border-[var(--store-border,rgba(0,0,0,0.06))] pt-6 text-center text-[11px] text-[var(--store-muted,#6B7280)]">
          <div>
            <p className="font-semibold text-[var(--store-text,#111827)]">Free shipping</p>
            <p className="mt-0.5">On qualifying orders</p>
          </div>
          <div>
            <p className="font-semibold text-[var(--store-text,#111827)]">Easy returns</p>
            <p className="mt-0.5">Merchant policy applies</p>
          </div>
          <div>
            <p className="font-semibold text-[var(--store-text,#111827)]">Secure payments</p>
            <p className="mt-0.5">Protected checkout</p>
          </div>
        </div>
      </div>
    </div>
  );
}
