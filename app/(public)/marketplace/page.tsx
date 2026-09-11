import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { MarketplacePage } from "@/components/marketplace/new/Marketplacepage ";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("marketplace");

/** Public catalog HTML can be briefly cached; data fetchers also use unstable_cache. */
export const revalidate = 60;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string }>;
}) {
  const params = await searchParams;
  // Physical Marketplace is canonical at /marketplace/physical (one implementation).
  if (!params.type || params.type === "physical") {
    permanentRedirect("/marketplace/physical");
  }
  return <MarketplacePage searchParams={params} />;
}
