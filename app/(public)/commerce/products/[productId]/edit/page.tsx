"use client";

import { useParams, useSearchParams } from "next/navigation";
import { ProductFormShell } from "@/components/product/ProductFormShell";

export default function CommerceProductEditPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const productId = params?.productId as string;
  const storeId = searchParams?.get("storeId");
  const returnHref = storeId
    ? `/commerce/products?storeId=${storeId}`
    : "/commerce/products";

  return (
    <ProductFormShell
      title="Edit product"
      isEdit
      productId={productId}
      mode="vendor"
      returnHref={returnHref}
    />
  );
}
