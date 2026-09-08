"use client";

import { ProductFormShell } from "@/components/product/ProductFormShell";

/**
 * Canonical seller product create route.
 * Client page mirrors admin edit mounting of ProductFormShell.
 */
export default function UploadProductPage() {
  return (
    <ProductFormShell
      title="Upload Product"
      isEdit={false}
      mode="vendor"
      returnHref="/ugc/campaign-center/store"
    />
  );
}
