"use client";

import React from "react";
import { LocalizedPrice } from "@/components/currency/localized-price";
import { cn } from "@/lib/utils";

interface ProductPriceDisplayProps {
  price: number;
  compareAtPrice?: number | null;
  currency?: string | null;
  savings?: number | null;
  /** Size variant: "lg" = product hero (3xl), "sm" = sidebar buybox (also 3xl), defaults to "lg" */
  size?: "lg" | "sm";
  className?: string;
}

/**
 * Fully reactive price block for product detail pages.
 * Subscribes to the global CurrencyContext so the displayed price updates
 * instantly when the user changes their preferred currency in the header.
 */
export function ProductPriceDisplay({
  price,
  compareAtPrice,
  currency,
  savings,
  size = "lg",
  className,
}: ProductPriceDisplayProps) {
  const hasDiscount = Boolean(compareAtPrice && compareAtPrice > price);

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-baseline gap-2.5 flex-wrap">
        <LocalizedPrice
          amount={price}
          currency={currency}
          className="text-3xl font-black text-[var(--color-accent)] tracking-tight"
        />
        {hasDiscount && (
          <LocalizedPrice
            amount={compareAtPrice!}
            currency={currency}
            className="text-sm text-zinc-300 line-through font-semibold"
          />
        )}
        {savings && savings > 0 && (
          <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-sm">
            âˆ’{savings}%
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Compact variant for the sidebar Buy Box — no tagline, just the price row.
 */
export function ProductBuyBoxPrice({
  price,
  compareAtPrice,
  currency,
  savings,
  className,
}: Omit<ProductPriceDisplayProps, "size">) {
  const hasDiscount = Boolean(compareAtPrice && compareAtPrice > price);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline gap-2.5">
        <LocalizedPrice
          amount={price}
          currency={currency}
          className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight"
        />
        {hasDiscount && (
          <LocalizedPrice
            amount={compareAtPrice!}
            currency={currency}
            className="text-sm text-zinc-300 line-through font-semibold"
          />
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm bg-green-50 text-green-600 border border-green-100">
          In Stock
        </span>
        {savings && savings > 0 && (
          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm bg-red-50 text-red-500">
            Save {savings}%
          </span>
        )}
      </div>
    </div>
  );
}

