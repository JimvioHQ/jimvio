import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("shorts");

export default function ShortsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
