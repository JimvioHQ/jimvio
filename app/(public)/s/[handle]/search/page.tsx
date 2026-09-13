import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  loadPublishedStoreByHandle,
  loadStoreProducts,
} from "@/lib/commerce-os";
import { StorefrontFeaturedProducts } from "@/components/commerce-os/storefront-sections";
import { isRequestOnStoreHost } from "@/lib/commerce-os/storefront-request";
import { storefrontHref } from "@/lib/commerce-os/storefront-url";

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
        <p className="text-xs font-semibold text-[var(--store-muted)]">
          <Link href={storefrontHref(handle, "", { onStoreHost })} className="hover:text-[var(--store-text)]">
            Home
          </Link>
          <span className="px-1.5 opacity-50">/</span>
          Search
        </p>
        <h1
          className="mt-3 text-2xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--store-heading-font, inherit)" }}
        >
          Search
        </h1>
        <form className="mt-4 flex max-w-xl items-center gap-2" method="get" role="search">
          <label className="sr-only" htmlFor="store-search-page">
            Search products
          </label>
          <input
            id="store-search-page"
            name="q"
            defaultValue={query}
            autoFocus={!query}
            placeholder="Search products"
            className="h-12 min-w-0 flex-1 border border-[var(--store-border)] bg-[var(--store-surface)] px-4 text-sm outline-none"
            style={{ borderRadius: "var(--store-input-radius,9999px)" }}
          />
          <button
            type="submit"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-white"
            style={{ background: "var(--store-btn)" }}
            aria-label="Search"
          >
            ⌕
          </button>
        </form>
        {query ? (
          <p className="mt-3 text-sm text-[var(--store-muted)]">
            Results for “{query}” ({products.length})
          </p>
        ) : (
          <p className="mt-3 text-sm text-[var(--store-muted)]">
            Enter a search term to find products in this store.
          </p>
        )}
      </div>
      {query ? (
        products.length ? (
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
        ) : (
          <p className="mx-auto mt-8 max-w-[var(--store-max-width,80rem)] px-4 text-sm text-[var(--store-muted)] sm:px-6">
            No products matched “{query}”.
          </p>
        )
      ) : null}
    </div>
  );
}
