"use client";

import { useSearchParams } from "next/navigation";
import { ProductFormShell } from "@/components/product/ProductFormShell";

export default function CommerceProductNewPage() {
  const searchParams = useSearchParams();
  const storeId = searchParams?.get("storeId");
  const returnHref = storeId
    ? `/commerce/products?storeId=${storeId}`
    : "/commerce/products";

  return (
    <ProductFormShell
      title="Add product"
      isEdit={false}
      mode="vendor"
      returnHref={returnHref}
    />
  );
}
