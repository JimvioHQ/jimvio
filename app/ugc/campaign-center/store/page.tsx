"use client";

/**
 * Legacy UGC Campaign Center store path.
 * Canonical seller inventory is /seller/products — this route stays for
 * Seller Hub / UGC deep links and remounts the same inventory UI.
 */
import { SellerProductsPage } from "@/components/seller/SellerProductsPage";

export default function UgcCampaignCenterStorePage() {
  return <SellerProductsPage />;
}
