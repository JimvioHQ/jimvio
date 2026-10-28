import type { Metadata } from "next";
import { redirectIfMarketplaceLocationNeedsNormalization } from "@/lib/marketplace/experience-server";
import type { MarketplaceQueryRecord } from "@/lib/marketplace/experience";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("marketplaceDigital");

/** Canonical Digital Marketplace. Same shell as Physical, with digital data and copy. */
export const revalidate = 60;

export default async function MarketplaceDigitalPage({
  searchParams,
}: {
  searchParams: Promise<MarketplaceQueryRecord>;
}) {
  const params = await searchParams;
  await redirectIfMarketplaceLocationNeedsNormalization("digital", params);
  return null;
}
