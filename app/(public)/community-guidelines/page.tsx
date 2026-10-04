import type { Metadata } from "next";
import { CommunityGuidelinesDocument } from "@/components/legal";
import { constructMetadata } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Community Guidelines",
  description:
    "Jimvio community standards, prohibited behavior, and enforcement levels.",
  path: "/community-guidelines",
});

export default function CommunityGuidelinesPage() {
  return <CommunityGuidelinesDocument />;
}
