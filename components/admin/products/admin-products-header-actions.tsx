"use client";

import { RefreshCJStockButton } from "@/components/admin/cj/refresh-cj-stock-button";

export function AdminProductsHeaderActions({
  cjProductCount,
}: {
  cjProductCount: number;
}) {
  return (
    <RefreshCJStockButton
      variant="compact"
      disabled={cjProductCount === 0}
    />
  );
}
