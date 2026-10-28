import type { Metadata } from "next";
import { redirectIfMarketplaceLocationNeedsNormalization } from "@/lib/marketplace/experience-server";
import type { MarketplaceQueryRecord } from "@/lib/marketplace/experience";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("marketplacePhysical");

/** Canonical Physical Marketplace. Product type comes from this pathname. */
export const revalidate = 60;

export default async function MarketplacePhysicalPage({
  searchParams,
}: {
  searchParams: Promise<MarketplaceQueryRecord>;
}) {
  const params = await searchParams;
  await redirectIfMarketplaceLocationNeedsNormalization("physical", params);
  return null;
}
