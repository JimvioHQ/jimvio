import type { Metadata } from "next";
import { LegalHubClient } from "@/components/legal";
import { constructMetadata } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Legal Center",
  description:
    "Jimvio Legal Center — terms, privacy, cookies, seller and buyer policies, community guidelines, and more.",
  path: "/legal",
});

export default function LegalCenterPage() {
  return <LegalHubClient />;
}
