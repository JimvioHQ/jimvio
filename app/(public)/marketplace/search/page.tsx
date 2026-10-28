import { Suspense } from "react";
import { MarketplaceSearchResultsClient } from "@/components/marketplace/new/MarketplaceSearchResultsClient";
import { parseMarketplacePage } from "@/lib/marketplace/constants";
import { readMarketplaceFlag, readMarketplaceFormat, readMarketplaceOffer } from "@/lib/marketplace/experience";
import { runMarketplaceSearch } from "@/lib/marketplace/run-marketplace-search";
import { createClient } from "@/lib/supabase/server";
import type { DbProduct } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MarketplaceSearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    page?: string;
    category?: string;
    minPrice?: string;
    maxPrice?: string;
    offer?: string;
    format?: string;
    arrivals?: string;
    purchased?: string;
    trending?: string;
    fast?: string;
    aipowered?: string;
  }>;
}) {
  const params = await searchParams;
  const initialType = params.type === "digital" ? "digital" : "physical";
  const page = parseMarketplacePage(params.page);
  const query = params.q ?? "";
  const minPrice = Number(params.minPrice);
  const maxPrice = Number(params.maxPrice);

  let products: DbProduct[] = [];
  let total = 0;
  let pageCount = 1;
  let resolvedPage = page;
  let error = false;

  if (query.trim()) {
    try {
      const supabase = await createClient();
      const payload = await runMarketplaceSearch(supabase, {
        query,
        type: initialType,
        page,
        constraints: {
          categorySlug: params.category,
          minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
          maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
          offer: readMarketplaceOffer(params.offer, initialType),
          format: readMarketplaceFormat(params.format, initialType),
          arrivals: readMarketplaceFlag(params.arrivals),
          trending: readMarketplaceFlag(params.trending) || readMarketplaceFlag(params.purchased),
          fastShipping: initialType === "physical" && readMarketplaceFlag(params.fast),
          aiPowered: initialType === "digital" && readMarketplaceFlag(params.aipowered),
        },
      });
      products = payload.products;
      total = payload.total;
      pageCount = payload.pageCount;
      resolvedPage = payload.page;
    } catch (searchError) {
      console.error("[marketplace] search page failed:", searchError);
      error = true;
    }
  }

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1440px] px-4 py-10 text-sm text-[var(--color-text-muted)]">
          Loading search results...
        </div>
      }
    >
      <MarketplaceSearchResultsClient
        key={`${query}:${initialType}:${resolvedPage}:${error ? "error" : "ok"}`}
        initialType={initialType}
        initialQuery={query}
        initialProducts={products}
        initialTotal={total}
        initialPage={resolvedPage}
        initialPageCount={pageCount}
        initialError={error}
      />
    </Suspense>
  );
}
