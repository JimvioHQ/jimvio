import type { Metadata } from "next";
import { ProhibitedProductsDocument } from "@/components/legal";
import { constructMetadata } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Prohibited Products & Services",
  description:
    "Products and services that are not allowed on the Jimvio marketplace and campaigns.",
  path: "/prohibited-products",
});

export default function ProhibitedProductsPage() {
  return <ProhibitedProductsDocument />;
}
