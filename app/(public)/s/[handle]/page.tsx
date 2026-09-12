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
  return buildStorefrontMetadata(store);
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
    />
  );
}
