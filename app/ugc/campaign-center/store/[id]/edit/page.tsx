"use client";

import { ProductFormShell } from "@/components/product/ProductFormShell";
import { useParams } from "next/navigation";

export default function EditSellerProductPage() {
  const params = useParams();
  const productId = params?.id as string;
  return (
    <ProductFormShell
      title="Edit product"
      isEdit
      productId={productId}
      mode="vendor"
      returnHref="/ugc/campaign-center/store"
    />
  );
}
