import type { Metadata } from "next";
import { PrivacyDocument } from "@/components/legal";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("privacy");

export default function PrivacyPolicyPage() {
  return <PrivacyDocument />;
}
