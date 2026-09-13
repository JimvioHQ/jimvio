import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  loadPublishedStoreByHandle,
  loadStoreProductBySlug,
  loadStoreProducts,
} from "@/lib/commerce-os";
import { StorefrontAddToCartButton } from "@/components/commerce-os/storefront-add-to-cart";
import { StorefrontProductGallery } from "@/components/commerce-os/storefront-product-gallery";
import { StorefrontFeaturedProducts } from "@/components/commerce-os/storefront-sections";
import {
  buildMissingStorefrontMetadata,
  buildStorefrontMetadata,
} from "@/lib/commerce-os/storefront-metadata";
import { formatStoreMoney, salePercent } from "@/lib/commerce-os/storefront/money";
import { productImageUrls } from "@/lib/commerce-os/storefront/product-media";
import { storefrontHref } from "@/lib/commerce-os/storefront-url";
import { isRequestOnStoreHost } from "@/lib/commerce-os/storefront-request";
import Link from "next/link";
import { relatedStoreProducts } from "@/lib/commerce-os/storefront/related-products";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle, slug } = await params;
  const supabase = await createClient();
  const store = await loadPublishedStoreByHandle(supabase, handle);
  if (!store) return buildMissingStorefrontMetadata();
  const loaded = await loadStoreProductBySlug(supabase, store.id, slug);
  if (!loaded) {
    return buildStorefrontMetadata(store, {
      path: `/product/${slug}`,
      themeLogoUrl: store.theme_settings?.logoUrl ?? null,
    });
  }
  const img = productImageUrls(loaded.product.images)[0] || null;
  return buildStorefrontMetadata(store, {
    path: `/product/${slug}`,
    title: `${loaded.product.name} | ${store.name}`,
    description:
      loaded.product.short_description ||
      store.description ||
      `Shop ${loaded.product.name} at ${store.name}`,
    image: img,
    themeLogoUrl: store.theme_settings?.logoUrl ?? null,
  });
}

export default async function StorefrontProductPage({ params }: Props) {
  const { handle, slug } = await params;
  const onStoreHost = await isRequestOnStoreHost();
  const supabase = await createClient();
  const store = await loadPublishedStoreByHandle(supabase, handle);
  if (!store) notFound();

  const loaded = await loadStoreProductBySlug(supabase, store.id, slug);
  if (!loaded) notFound();

  const { product, variants } = loaded;
  const gallery = productImageUrls(product.images);
  const currency = (product.currency || store.default_currency || "USD").toUpperCase();
  const pct = salePercent(product.price, product.compare_at_price);
  const inStock =
    product.track_inventory !== true ||
    (typeof product.inventory_quantity === "number" &&
      product.inventory_quantity > 0);
  const related = relatedStoreProducts(
    await loadStoreProducts(supabase, store.id, { limit: 12 }),
    product.id,
    8
  );

  return (
    <div className="pb-24 lg:pb-10">
      <div className="mx-auto grid max-w-[var(--store-max-width,80rem)] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:py-10">
        <StorefrontProductGallery images={gallery} alt={product.name} />

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
                typeof product.inventory_quantity === "number" &&
                product.inventory_quantity <= 99
                ? `In stock — ${product.inventory_quantity} left`
                : "In stock"
              : "Sold out"}
          </p>
          {product.short_description &&
          product.short_description.trim().toLowerCase() !==
            String(product.name || "").trim().toLowerCase() ? (
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
                image_url: (v as { image_url?: string | null }).image_url,
              }))}
              storeHandle={store.handle}
              storeId={store.id}
              currency={currency}
              price={product.price}
              soldOut={!inStock}
              sticky
            />
          </div>
          <div className="mt-8 grid grid-cols-1 gap-3 border-t border-[var(--store-border,rgba(0,0,0,0.06))] pt-6 text-center text-[11px] text-[var(--store-muted,#6B7280)] sm:grid-cols-3">
            <Link href={storefrontHref(handle, onStoreHost ? "/shipping-policy" : "/pages/shipping-policy", { onStoreHost })} className="rounded-[var(--store-card-radius,16px)] bg-[var(--store-bg,#F8FAFC)] px-3 py-4">
              <p className="font-semibold text-[var(--store-text,#111827)]">Shipping</p>
              <p className="mt-0.5">See store policy</p>
            </Link>
            <Link href={storefrontHref(handle, onStoreHost ? "/refund-policy" : "/pages/refund-policy", { onStoreHost })} className="rounded-[var(--store-card-radius,16px)] bg-[var(--store-bg,#F8FAFC)] px-3 py-4">
              <p className="font-semibold text-[var(--store-text,#111827)]">Returns</p>
              <p className="mt-0.5">Merchant policy applies</p>
            </Link>
            <Link href={storefrontHref(handle, onStoreHost ? "/contact" : "/pages/contact", { onStoreHost })} className="rounded-[var(--store-card-radius,16px)] bg-[var(--store-bg)] px-3 py-4">
              <p className="font-semibold text-[var(--store-text)]">Contact</p>
              <p className="mt-0.5">Ask the merchant</p>
            </Link>
          </div>
        </div>
      </div>
      {related.length ? (
        <StorefrontFeaturedProducts
          handle={store.handle}
          onStoreHost={onStoreHost}
          storeId={store.id}
          title="You may also like"
          products={related}
        />
      ) : null}
    </div>
  );
}
