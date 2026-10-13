import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { loadCjCatalogOperations } from "@/lib/cj/catalog-operations";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "CJ catalog operations · Admin",
};

function percent(value: number | null): string {
  if (value == null) return "No eligible published products";
  return `${(value * 100).toFixed(1)}%`;
}

export default async function CjCatalogOperationsPage() {
  let snapshot: Awaited<ReturnType<typeof loadCjCatalogOperations>> | null = null;
  let errorMessage: string | null = null;
  try {
    snapshot = await loadCjCatalogOperations(createServiceRoleClient());
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Catalog snapshot failed";
  }

  const cards = snapshot
    ? [
        { label: "CJ products scanned", value: String(snapshot.scanned) },
        { label: "Eligible published", value: String(snapshot.eligiblePublished) },
        { label: "Valid video coverage", value: percent(snapshot.videoCoverage) },
        { label: "Video target", value: "50%" },
        { label: "Missing images", value: String(snapshot.missingImages) },
        { label: "Missing supplier cost", value: String(snapshot.missingSupplierCost) },
        { label: "Admin price locks", value: String(snapshot.priceLocked) },
        { label: "Locked prices off policy", value: String(snapshot.priceConflicts) },
        { label: "Flagged for review", value: String(snapshot.flaggedForReview) },
      ]
    : [];

  return (
    <div className="space-y-6 p-1">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">CJ catalog operations</h1>
        <p className="mt-1 max-w-3xl text-sm text-[#6B7280]">
          Counts come from Jimvio product records. Video coverage is eligible published CJ products
          with a playable video URL divided by eligible published CJ products. A supplier trending
          flag is separate from CJ order counts. Shipping is not included in the Jimvio base price.
        </p>
        <p className="mt-2 text-sm">
          <Link href="/admin/products/import/cj" className="text-[#FF5A1F] underline">
            Open import intelligence
          </Link>
        </p>
      </div>

      {errorMessage ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {snapshot?.partial ? (
        <p className="text-sm text-amber-700">
          This snapshot stopped after 16,000 products. Run the catalog audit script for the remainder.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-[#E5E7EB] bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-[#111827]">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
