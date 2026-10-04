import type { Metadata } from "next";
import { TermsDocument } from "@/components/legal";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("terms");

export default function TermsPage() {
  return <TermsDocument />;
}
