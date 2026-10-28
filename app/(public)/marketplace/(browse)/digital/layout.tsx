import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("marketplaceDigital");

export default function MarketplaceDigitalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
