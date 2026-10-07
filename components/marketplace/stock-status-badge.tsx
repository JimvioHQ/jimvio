"use client";

import { cn } from "@/lib/utils";
import {
  resolveStockStatus,
  type StockInput,
  type StockStatus,
} from "@/lib/marketplace/stock-status";

const DOT: Record<Exclude<StockStatus, "unknown">, string> = {
  in_stock: "bg-emerald-500",
  low_stock: "bg-amber-500",
  out_of_stock: "bg-rose-500",
};

const TEXT: Record<Exclude<StockStatus, "unknown">, string> = {
  in_stock: "text-emerald-700 dark:text-emerald-400",
  low_stock: "text-amber-700 dark:text-amber-400",
  out_of_stock: "text-rose-600 dark:text-rose-400",
};

export function StockStatusBadge({
  input,
  className,
  size = "md",
}: {
  input: StockInput;
  className?: string;
  size?: "sm" | "md";
}) {
  const stock = resolveStockStatus(input);
  if (stock.status === "unknown" || !stock.label) return null;

  return (
    <p
      className={cn(
        "inline-flex items-center gap-1.5 font-medium",
        size === "sm" ? "text-[10px]" : "text-[11px]",
        TEXT[stock.status],
        className,
      )}
    >
      {stock.status !== "out_of_stock" && (
        <span
          className={cn(
            "inline-block rounded-full shrink-0",
            size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
            DOT[stock.status],
          )}
          aria-hidden
        />
      )}
      <span>{stock.label}</span>
    </p>
  );
}
