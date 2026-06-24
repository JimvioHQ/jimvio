import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("content");

export default function ContentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
