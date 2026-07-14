import type { Metadata } from "next";
import { MarketplacePage } from "@/components/marketplace/new/MarketplacePage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("marketplace");

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string }>;
}) {
  const params = await searchParams;
  return <MarketplacePage searchParams={params} />;
}
