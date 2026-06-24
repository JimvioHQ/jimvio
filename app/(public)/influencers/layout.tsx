import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("influencers");

export default function InfluencersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
