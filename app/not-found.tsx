import type { Metadata } from "next";
import { noIndexMetadata } from "@/lib/seo";
import { NotFoundPageClient } from "@/components/empty-states/not-found-page-client";

export const metadata: Metadata = noIndexMetadata(
  "Page not found",
  "The page you are looking for does not exist on Jimvio.",
);

export default function NotFound() {
  return <NotFoundPageClient />;
}
