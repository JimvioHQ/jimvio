import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("influencersBrowse");

export default function InfluencersBrowseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
