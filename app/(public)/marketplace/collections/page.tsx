import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchFeaturedCollections } from "@/lib/marketplace/collections";
import { CollectionsSection } from "@/components/marketplace/new/CollectionsSection";
import { ChevronLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Collections | Jimvio Marketplace",
  description: "Curated product collections for creators and buyers.",
};

export default async function MarketplaceCollectionsPage() {
  const supabase = await createClient();
  const collections = await fetchFeaturedCollections(supabase, 24);

  return (
    <div className="mx-auto w-full max-w-8xl px-4 py-6 sm:px-6">
      <Link
        href="/marketplace"
        className="mb-4 inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-text-muted)] hover:text-[#fd5000]"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back to marketplace
      </Link>
      <CollectionsSection collections={collections} />
    </div>
  );
}
