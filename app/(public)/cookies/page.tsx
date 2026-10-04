import type { Metadata } from "next";
import { CookiesDocument } from "@/components/legal";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("cookies");

export default function CookiesPolicyPage() {
  return <CookiesDocument />;
}
