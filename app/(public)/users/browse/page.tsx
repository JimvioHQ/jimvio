import type { Metadata } from "next";
import InfluencersBrowsePage from "@/app/(public)/influencers/browse/page";
import { constructMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = constructMetadata({
  title: "Creators on Jimvio",
  description: "Browse the creators who have joined Jimvio and open their profiles.",
  path: "/users/browse",
});

export default InfluencersBrowsePage;
