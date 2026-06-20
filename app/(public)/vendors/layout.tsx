import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("vendors");

export default function VendorsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
