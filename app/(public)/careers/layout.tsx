import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("careers");

export default function CareersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
