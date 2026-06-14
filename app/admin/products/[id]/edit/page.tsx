"use client";

import { ProductFormShell } from "@/components/product/ProductFormShell";
import { useParams } from "next/navigation";

export default function AdminEditProductPage() {
  const params = useParams();
  const productId = params?.id as string;

  return (
    <ProductFormShell
      title="Edit product"
      isEdit
      productId={productId}
      mode="admin"
      returnHref="/admin/products"
    />
  );
}
