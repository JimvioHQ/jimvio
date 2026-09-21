import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  loadPublishedStoreByHandle,
  loadStoreProductBySlug,
  loadStoreProducts,
} from "@/lib/commerce-os";
import { StorefrontProductBuyLayout } from "@/components/commerce-os/storefront-product-buy-layout";
import { StorefrontProductInfo } from "@/components/commerce-os/storefront-product-info";
import { StorefrontFeaturedProducts } from "@/components/commerce-os/storefront-sections";
import {
  buildMissingStorefrontMetadata,
  buildStorefrontMetadata,
} from "@/lib/commerce-os/storefront-metadata";
import { productImageUrls } from "@/lib/commerce-os/storefront/product-media";
import { storefrontHref } from "@/lib/commerce-os/storefront-url";
import { isRequestOnStoreHost } from "@/lib/commerce-os/storefront-request";
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
  const displayCurrency = (store.default_currency || "USD").toUpperCase();
  const sourceCurrency = (product.currency || displayCurrency).toUpperCase();
  const related = relatedStoreProducts(
    await loadStoreProducts(supabase, store.id, { limit: 12 }),
    product.id,
    8,
  );
  const theme = store.theme_settings;
  const showSpecs = theme?.productShowSpecs !== false;
  const showRelated = theme?.productShowRelated !== false;
  const stickyAtc = theme?.productStickyAtc !== false;
  const linkOpts = { onStoreHost };
  const collectionsHref = storefrontHref(handle, "/collections/all", linkOpts);
  const homeHref = storefrontHref(handle, "/", linkOpts);

  return (
    <div className="pb-24 lg:pb-10">
      <nav
        aria-label="Breadcrumb"
        className="mx-auto max-w-[var(--store-max-width,80rem)] px-4 pt-6 text-[12px] text-[var(--store-muted,#6B7280)] sm:px-6"
      >
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href={homeHref} className="hover:text-[var(--store-text)]">
              Home
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link
              href={collectionsHref}
              className="hover:text-[var(--store-text)]"
            >
              All products
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="max-w-[14rem] truncate font-medium text-[var(--store-text,#111827)] sm:max-w-none">
            {product.name}
          </li>
        </ol>
      </nav>

      <StorefrontProductBuyLayout
        handle={handle}
        storeHandle={store.handle}
        storeId={store.id}
        storeVendorId={store.vendor_id}
        product={{
          id: product.id,
          name: product.name,
          price: product.price,
          compare_at_price: product.compare_at_price,
          vendor_id: product.vendor_id,
          short_description: product.short_description,
          inventory_quantity: product.inventory_quantity,
          track_inventory: product.track_inventory,
          sku: (product as { sku?: string | null }).sku,
        }}
        variants={variants.map((v) => ({
          id: v.id,
          name: (v as { name?: string | null }).name,
          price: v.price,
          options: (v as { options?: unknown }).options,
          inventory_quantity: v.inventory_quantity,
          image_url: (v as { image_url?: string | null }).image_url,
          is_active: (v as { is_active?: boolean | null }).is_active,
        }))}
        gallery={gallery}
        displayCurrency={displayCurrency}
        sourceCurrency={sourceCurrency}
        stickyAtc={stickyAtc}
        onStoreHost={onStoreHost}
      />

      <StorefrontProductInfo
        description={product.description}
        sku={(product as { sku?: string | null }).sku}
        showSpecs={showSpecs}
      />

      {showRelated && related.length ? (
        <StorefrontFeaturedProducts
          handle={store.handle}
          onStoreHost={onStoreHost}
          storeId={store.id}
          displayCurrency={displayCurrency}
          title="You may also like"
          products={related}
          layout="grid"
        />
      ) : null}
    </div>
  );
}
