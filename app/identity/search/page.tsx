import type { Metadata } from "next";
import { IdentitySearchClient } from "@/components/identity/IdentitySearchClient";

export const metadata: Metadata = { title: "Search" };

export default function IdentitySearchPage() {
  return <IdentitySearchClient />;
}
