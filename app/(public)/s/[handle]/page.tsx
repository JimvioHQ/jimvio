import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  loadPublishedStoreByHandle,
  loadStoreProducts,
  loadStoreCollections,
} from "@/lib/commerce-os";
import {
  buildMissingStorefrontMetadata,
  buildStorefrontMetadata,
} from "@/lib/commerce-os/storefront-metadata";
import { isRequestOnStoreHost } from "@/lib/commerce-os/storefront-request";
import { StorefrontHomeSections } from "@/components/commerce-os/storefront-home-sections";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const supabase = await createClient();
  const store = await loadPublishedStoreByHandle(supabase, handle);
  if (!store) return buildMissingStorefrontMetadata();
  return buildStorefrontMetadata(store, {
    themeLogoUrl: store.theme_settings?.logoUrl ?? null,
  });
}

export default async function StorefrontHomePage({ params }: Props) {
  const { handle } = await params;
  const onStoreHost = await isRequestOnStoreHost();
  const supabase = await createClient();
  const store = await loadPublishedStoreByHandle(supabase, handle);
  if (!store) notFound();

  const [products, collections] = await Promise.all([
    loadStoreProducts(supabase, store.id, {
      limit: 24,
      sort: "manual",
    }),
    loadStoreCollections(supabase, store.id, { limit: 12 }),
  ]);

  return (
    <>
      {products.length === 0 ? (
        <div className="border-b border-[var(--store-border,rgba(0,0,0,0.06))] bg-[color-mix(in_srgb,var(--store-primary,#FF5A1F)_8%,white)]">
          <div className="mx-auto flex max-w-[var(--store-max-width,80rem)] flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
            <p className="text-sm text-[var(--store-text,#111827)]">
              <span className="font-semibold">Online</span>
              <span className="text-[var(--store-muted,#6B7280)]">
                {" "}
                · Not ready to sell yet — add products to start taking orders.
              </span>
            </p>
          </div>
        </div>
      ) : null}
      <StorefrontHomeSections
        sections={store.published_sections.home}
        products={
          products as Array<{
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
          }>
        }
        collections={collections}
        handle={store.handle}
        storeName={store.name}
        storeDescription={store.description}
        themeSettings={store.theme_settings}
        onStoreHost={onStoreHost}
        storeId={store.id}
      />
    </>
  );
}
