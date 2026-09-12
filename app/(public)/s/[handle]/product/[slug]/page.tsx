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

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string; slug: string }> };

function firstImage(images: unknown): string | null {
  if (!Array.isArray(images) || !images.length) return null;
  const first = images[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && "url" in first) {
    const url = (first as { url?: unknown }).url;
    return typeof url === "string" ? url : null;
  }
  return null;
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
  const img = firstImage(loaded.product.images);
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
  const img = firstImage(product.images);

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 lg:grid-cols-2">
      <div className="aspect-square overflow-hidden rounded-[var(--store-radius,12px)] bg-white">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-sm opacity-50">
            No image
          </div>
        )}
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
        <p className="mt-2 text-lg">
          {(product.currency || store.default_currency || "USD").toUpperCase()}{" "}
          {Number(product.price).toFixed(2)}
        </p>
        {product.short_description ? (
          <p className="mt-4 text-sm opacity-70">{product.short_description}</p>
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
            currency={(product.currency || store.default_currency || "USD").toUpperCase()}
          />
        </div>
      </div>
    </div>
  );
}
