import type { Metadata } from "next";
import { ProductFormShell } from "@/components/product/ProductFormShell";

export const metadata: Metadata = {
  title: "Upload Product | Jimvio",
  description: "Add a product to your Jimvio store",
};

export const dynamic = "force-dynamic";

/**
 * Canonical seller product create route.
 * Linked from Create menu, command center, and Seller Hub.
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
