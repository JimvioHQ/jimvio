import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { marketplaceIndexHref, type MarketplaceQueryRecord } from "@/lib/marketplace/experience";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("marketplace");

/** Public catalog HTML can be briefly cached; data fetchers also use unstable_cache. */
export const revalidate = 60;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<MarketplaceQueryRecord>;
}) {
  const params = await searchParams;
  // One marketplace implementation. Physical and Digital each have a canonical path.
  permanentRedirect(marketplaceIndexHref(params));
}
