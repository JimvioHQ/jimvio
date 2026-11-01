import type { Metadata } from "next";
import InfluencersBrowsePage from "@/app/(public)/influencers/browse/page";
import { constructMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = constructMetadata({
  title: "Users on Jimvio",
  description: "Browse people on Jimvio and open their public profiles.",
  path: "/users/browse",
});

export default InfluencersBrowsePage;
