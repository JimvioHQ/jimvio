import { Suspense } from "react";
import { MarketplaceSearchResultsClient } from "@/components/marketplace/new/MarketplaceSearchResultsClient";

export default async function MarketplaceSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const params = await searchParams;
  const initialType = params.type === "digital" ? "digital" : "physical";

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1440px] px-4 py-10 text-sm text-[var(--color-text-muted)]">
          Loading search results...
        </div>
      }
    >
      <MarketplaceSearchResultsClient initialType={initialType} />
    </Suspense>
  );
}
