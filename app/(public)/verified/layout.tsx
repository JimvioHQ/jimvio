import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("verified");

export default function VerifiedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
