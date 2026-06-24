import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("marketplacePhysical");

export default function MarketplacePhysicalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
