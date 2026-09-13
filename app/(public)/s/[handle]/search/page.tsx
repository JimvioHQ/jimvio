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
      <div className="mx-auto max-w-[var(--store-max-width,80rem)] px-4 sm:px-6">
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--store-heading-font, inherit)" }}
        >
          Search
        </h1>
        <form className="mt-4" method="get" role="search">
          <label className="sr-only" htmlFor="store-search-page">
            Search products
          </label>
          <input
            id="store-search-page"
            name="q"
            defaultValue={query}
            placeholder="Search products"
            className="h-12 w-full max-w-xl border border-[var(--store-border,rgba(0,0,0,0.1))] bg-[var(--store-surface,#fff)] px-4 text-sm outline-none"
            style={{ borderRadius: "var(--store-input-radius,9999px)" }}
          />
        </form>
        {query ? (
          <p className="mt-3 text-sm text-[var(--store-muted,#6B7280)]">
            Results for “{query}” ({products.length})
          </p>
        ) : (
          <p className="mt-3 text-sm text-[var(--store-muted,#6B7280)]">
            Enter a search term.
          </p>
        )}
      </div>
      {query ? (
        <StorefrontFeaturedProducts
          handle={store.handle}
          onStoreHost={onStoreHost}
          storeId={store.id}
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
            vendor_id?: string | null;
          }>}
        />
      ) : null}
    </div>
  );
}
