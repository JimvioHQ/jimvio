import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  loadPublishedStoreByHandle,
  loadStoreProducts,
} from "@/lib/commerce-os";
import { StorefrontFeaturedProducts } from "@/components/commerce-os/storefront-sections";
import { isRequestOnStoreHost } from "@/lib/commerce-os/storefront-request";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ q?: string }>;
};

export default async function StorefrontSearchPage({ params, searchParams }: Props) {
  const { handle } = await params;
  const { q } = await searchParams;
  const onStoreHost = await isRequestOnStoreHost();
  const supabase = await createClient();
  const store = await loadPublishedStoreByHandle(supabase, handle);
  if (!store) notFound();

  const query = (q || "").trim();
  const products = query
    ? await loadStoreProducts(supabase, store.id, { search: query, limit: 48 })
    : [];

  return (
    <div className="py-8">
      <div className="mx-auto max-w-5xl px-4">
        <h1 className="text-2xl font-semibold">Search</h1>
        <form className="mt-4" method="get">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search products"
            className="h-11 w-full max-w-md rounded-[var(--store-radius,12px)] border border-black/10 bg-white px-3 text-sm"
          />
        </form>
        {query ? (
          <p className="mt-3 text-sm opacity-60">
            Results for “{query}” ({products.length})
          </p>
        ) : (
          <p className="mt-3 text-sm opacity-60">Enter a search term.</p>
        )}
      </div>
      {query ? (
        <StorefrontFeaturedProducts
          handle={store.handle}
          onStoreHost={onStoreHost}
          title=""
          products={products as Array<{
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
          }>}
        />
      ) : null}
    </div>
  );
}
