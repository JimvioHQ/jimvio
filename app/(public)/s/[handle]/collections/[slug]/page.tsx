import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  loadPublishedStoreByHandle,
  loadStoreProducts,
} from "@/lib/commerce-os";
import { cosTable } from "@/lib/commerce-os/db";
import { StorefrontFeaturedProducts } from "@/components/commerce-os/storefront-sections";
import { storefrontHref } from "@/lib/commerce-os/storefront-url";
import { isRequestOnStoreHost } from "@/lib/commerce-os/storefront-request";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string; slug: string }> };

type CollectionProduct = {
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

export default async function StorefrontCollectionPage({ params }: Props) {
  const { handle, slug } = await params;
  const onStoreHost = await isRequestOnStoreHost();
  const supabase = await createClient();
  const store = await loadPublishedStoreByHandle(supabase, handle);
  if (!store) notFound();

  if (slug === "all") {
    const products = await loadStoreProducts(supabase, store.id, { limit: 48 });
    return (
      <div className="py-8">
        <div className="mx-auto max-w-[var(--store-max-width,72rem)] px-4 sm:px-6">
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ fontFamily: "var(--store-heading-font, inherit)" }}
          >
            All products
          </h1>
          <p className="mt-1 text-sm text-[var(--store-muted,#6B7280)]">
            Discover everything available in this store.
          </p>
        </div>
        <StorefrontFeaturedProducts
          handle={store.handle}
          onStoreHost={onStoreHost}
          title=""
          products={products as CollectionProduct[]}
        />
      </div>
    );
  }

  const { data: collection } = await cosTable(supabase, "jimvio_store_collections")
    .select("id, title, handle, description")
    .eq("store_id", store.id)
    .eq("handle", slug)
    .eq("published", true)
    .maybeSingle();

  if (!collection) notFound();

  const { data: links } = await cosTable(supabase, "jimvio_store_collection_products")
    .select("product_id, position")
    .eq("collection_id", collection.id)
    .order("position", { ascending: true });

  const ids = (links ?? []).map((l) => l.product_id);
  let products: CollectionProduct[] = [];

  if (ids.length) {
    const { data } = await supabase
      .from("products")
      .select(
        "id, name, slug, price, compare_at_price, currency, images, short_description, inventory_quantity, track_inventory, status"
      )
      .in("id", ids)
      .eq("status", "active");
    const byId = new Map((data ?? []).map((p) => [p.id, p]));
    products = ids
      .map((id) => byId.get(id))
      .filter(Boolean) as CollectionProduct[];
  }

  return (
    <div className="py-8">
      <div className="mx-auto max-w-[var(--store-max-width,72rem)] px-4 sm:px-6">
        <p className="text-xs uppercase tracking-wide text-[var(--store-muted,#6B7280)]">
          <Link href={storefrontHref(handle, "/collections/all", { onStoreHost })}>
            Collections
          </Link>
        </p>
        <h1
          className="mt-1 text-2xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--store-heading-font, inherit)" }}
        >
          {collection.title}
        </h1>
        {collection.description ? (
          <p className="mt-2 text-sm text-[var(--store-muted,#6B7280)]">
            {collection.description}
          </p>
        ) : null}
      </div>
      <StorefrontFeaturedProducts
        handle={store.handle}
        onStoreHost={onStoreHost}
        title=""
        products={products}
      />
    </div>
  );
}
