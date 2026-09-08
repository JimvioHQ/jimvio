"use client";

import dynamic from "next/dynamic";

const ProductFormShell = dynamic(
  () =>
    import("@/components/product/ProductFormShell").then((m) => m.ProductFormShell),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-stone-500">
        Loading product form…
      </div>
    ),
  },
);

/**
 * Canonical seller product create route.
 * Client-only mount avoids SSR crashes from the heavy form shell under public layout.
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
