import type { Metadata } from "next";
import { MarketplacePage } from "@/components/marketplace/new/Marketplacepage ";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("marketplace");

export default function Page() {
  return <MarketplacePage />;
}
