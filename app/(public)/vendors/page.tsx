import type { Metadata } from "next";
import { SupplierDirectory, type SupplierRecord } from "@/components/vendors/supplier-directory";
import { pageMetadata } from "@/lib/seo";
import { getTopVendors } from "@/services/db";

export const metadata: Metadata = pageMetadata("vendors");

export default async function VendorsPage() {
  const vendors = await getTopVendors(48).catch(() => []);

  return <SupplierDirectory suppliers={(vendors ?? []) as SupplierRecord[]} />;
}
