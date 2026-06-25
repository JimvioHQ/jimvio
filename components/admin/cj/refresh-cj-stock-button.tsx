"use client";

import { useState } from "react";
import { Loader2, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { appConfirm } from "@/lib/app-dialog";

type Props = {
  disabled?: boolean;
  className?: string;
  variant?: "default" | "compact";
};

export function RefreshCJStockButton({
  disabled,
  className,
  variant = "default",
}: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  async function handleClick() {
    if (refreshing) return;

    const confirmed = await appConfirm({
      title: "Refresh inventory",
      description:
        "Fetch live stock levels for all imported catalog products? This may take a few minutes.",
      confirmLabel: "Refresh stock",
      cancelLabel: "Cancel",
    });
    if (!confirmed) return;

    setRefreshing(true);
    setProgress("Starting…");

    let offset = 0;
    let totalProducts = 0;
    let totalVariants = 0;
    let totalFailed = 0;
    let catalogTotal = 0;

    try {
      while (true) {
        const res = await fetch("/api/admin/cj/refresh-stock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offset, limit: 8 }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Refresh failed");

        catalogTotal = json.totalProducts ?? catalogTotal;
        totalProducts += json.productsProcessed ?? 0;
        totalVariants += json.variantsUpdated ?? 0;
        totalFailed += json.variantsFailed ?? 0;
        offset = json.nextOffset ?? offset;

        setProgress(`${Math.min(offset, catalogTotal)} / ${catalogTotal} products`);

        if (json.done) break;
      }

      toast.success(
        `Stock refreshed — ${totalProducts} product${totalProducts === 1 ? "" : "s"}, ${totalVariants} variant update${totalVariants === 1 ? "" : "s"}` +
          (totalFailed ? ` (${totalFailed} failed)` : "")
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Stock refresh failed");
    } finally {
      setRefreshing(false);
      setProgress(null);
    }
  }

  const label =
    refreshing
      ? progress ?? "Refreshing…"
      : variant === "compact"
        ? "Refresh stock"
        : "Refresh all stock";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || refreshing}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] disabled:opacity-50 transition-colors",
        variant === "compact" ? "h-9 px-3 text-[12.5px]" : "h-9 px-3.5 text-[12.5px] shrink-0",
        className
      )}
    >
      {refreshing ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Warehouse className="h-3.5 w-3.5" />
      )}
      {label}
    </button>
  );
}
