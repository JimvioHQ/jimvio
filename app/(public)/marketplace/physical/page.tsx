import type { Metadata } from "next";
import { MarketplacePage } from "@/components/marketplace/new/Marketplacepage ";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("marketplacePhysical");

/** Canonical Physical Marketplace — same experience as the former ?type=physical hub. */
export const revalidate = 60;

export default async function MarketplacePhysicalPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; q?: string }>;
}) {
  const params = await searchParams;
  return (
    <MarketplacePage
      searchParams={{ type: "physical", page: params.page }}
    />
  );
}
