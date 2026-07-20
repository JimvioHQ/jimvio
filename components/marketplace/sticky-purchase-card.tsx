"use client";

import { ProductActionModule } from "@/components/marketplace/product-action-module";
import { LocalizedPrice } from "@/components/currency/localized-price";
import { cn } from "@/lib/utils";

type StickyPurchaseCardProps = {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    images: string[] | null;
    vendor_id: string;
    currency?: string | null;
    pricing_type?: string | null;
    button_text?: string | null;
    is_digital?: boolean;
  };
  vendor: {
    id: string;
    business_name: string | null;
    business_logo: string | null;
    business_slug: string | null;
  } | null;
  currentPath: string;
  activePrice: number;
  compareAt?: number | null;
  selectedVariantId?: string | null;
  selectedVariantOutOfStock?: boolean;
  requiresVariantSelection?: boolean;
  className?: string;
};

/** Desktop sticky purchase card — wraps existing ProductActionModule. */
export function StickyPurchaseCard({
  product,
  vendor,
  currentPath,
  activePrice,
  compareAt,
  selectedVariantId,
  selectedVariantOutOfStock,
  requiresVariantSelection,
  className,
}: StickyPurchaseCardProps) {
  const savings =
    compareAt && compareAt > activePrice
      ? Math.round(((compareAt - activePrice) / compareAt) * 100)
      : null;

  return (
    <div
      className={cn(
        "sticky top-24 space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm",
        className
      )}
    >
      <div>
        <p className="line-clamp-2 text-[13px] font-bold text-[var(--color-text-primary)]">
          {product.name}
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-black text-[#fd5000]">
            <LocalizedPrice amount={activePrice} currency={product.currency ?? "USD"} />
          </span>
          {compareAt && compareAt > activePrice && (
            <span className="text-[12px] text-[var(--color-text-muted)] line-through">
              <LocalizedPrice amount={compareAt} currency={product.currency ?? "USD"} />
            </span>
          )}
          {savings != null && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              −{savings}%
            </span>
          )}
        </div>
      </div>

      <ProductActionModule
        product={{ ...product, price: activePrice }}
        vendor={vendor}
        currentPath={currentPath}
        selectedVariantId={selectedVariantId}
        selectedVariantOutOfStock={selectedVariantOutOfStock}
        requiresVariantSelection={requiresVariantSelection}
      />
    </div>
  );
}
