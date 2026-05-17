"use client";

import React from "react";
import { LocalizedPrice } from "@/components/currency/localized-price";
import { cn } from "@/lib/utils";

interface ProductPriceDisplayProps {
  price: number;
  compareAtPrice?: number | null;
  currency?: string | null;
  savings?: number | null;
  showPerUnit?: boolean;
  size?: "lg" | "sm";
  className?: string;
}

export function ProductPriceDisplay({
  price,
  compareAtPrice,
  currency,
  savings,
  showPerUnit = false,
  size = "lg",
  className,
}: ProductPriceDisplayProps) {
  const hasDiscount = Boolean(compareAtPrice && compareAtPrice > price);

  return (
    <div className={cn("space-y-1.5", className)}>
      {/* Price row */}
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
            className="text-base text-zinc-400 dark:text-zinc-500 line-through font-medium"
          />
        )}
        {savings && savings > 0 && (
          <span className="inline-flex items-center text-[10px] h-5 font-semibold
           bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md mt-2">
            Save {savings}%
          </span>
        )}
      </div>

      {/* Per-unit label */}
      {showPerUnit && (
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">
          Per unit · excl. tax
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface ProductBuyBoxPriceProps {
  price: number;
  compareAtPrice?: number | null;
  currency?: string | null;
  savings?: number | null;
  /**
   * Pass `false` to hide the stock badge — e.g. for out-of-stock states
   * managed by the parent. Defaults to `true`.
   */
  inStock?: boolean;
  className?: string;
}

export function ProductBuyBoxPrice({
  price,
  compareAtPrice,
  currency,
  savings,
  inStock = true,
  className,
}: ProductBuyBoxPriceProps) {
  const hasDiscount = Boolean(compareAtPrice && compareAtPrice > price);

  // Compute absolute saving so we can show "You save $X"
  const absoluteSaving =
    hasDiscount && compareAtPrice ? compareAtPrice - price : null;

  return (
    <div className={cn("space-y-3", className)}>
      {/* ── Price row ── */}
      <div className="flex items-baseline gap-2.5 flex-wrap">
        <LocalizedPrice
          amount={price}
          currency={currency}
          className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight"
        />
        {hasDiscount && (
          <LocalizedPrice
            amount={compareAtPrice!}
            currency={currency}
            className="text-base text-zinc-400 dark:text-zinc-500 line-through font-medium"
          />
        )}
      </div>

      {/* ── Badge row ── */}
      <div className="flex items-center gap-x-2 flex-row">
        {/* Stock indicator */}
        {inStock ? (
          <span className="inline-flex items-center gap-1.5 text-[10px] h-5 font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 px-2 py-0.5 rounded-md">
            {/* Live dot */}
            <span
              className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"
              aria-hidden="true"
            />
            In stock
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[10px] h-5 font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 rounded-md">
            Out of stock
          </span>
        )}

        {/* Savings badge */}
        {savings && savings > 0 && (
          <span className="inline-flex items-center text-[10px] h-5 font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md mt-2">
            Save {savings}%
          </span>
        )}
      </div>

      {absoluteSaving && absoluteSaving > 0 && (
        <>
          <div className="border-t border-stone-100 dark:border-zinc-800" />
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-green-700 dark:text-green-400">
            {/* Checkmark icon */}
            <svg
              className="h-3.5 w-3.5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            You save{" "}
            <LocalizedPrice
              amount={absoluteSaving}
              currency={currency}
              className="font-semibold"
            />{" "}
            on this order
          </p>
        </>
      )}
    </div>
  );
}