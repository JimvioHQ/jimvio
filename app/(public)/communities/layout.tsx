import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("communities");

export default function CommunitiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}

