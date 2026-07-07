"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  total: number;
  pageSize: number;
};

export function MarketplacePagination({
  hasMore,
  loading,
  onLoadMore,
  total,
  pageSize,
}: Props) {
  if (total === 0) return null;

  if (hasMore) {
    return (
      <div className="flex justify-center border-t border-[var(--color-border)] pt-8 pb-2">
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loading}
          aria-busy={loading}
          aria-label={loading ? "Loading more products" : "View more products"}
          className={cn(
            "inline-flex h-12 min-w-[168px] items-center justify-center gap-2.5 rounded-full px-8",
            "text-sm font-bold text-white tracking-wide",
            "bg-gradient-to-r from-[#ff7a45] via-[#fd5000] to-[#e04700]",
            "shadow-[0_6px_24px_rgba(253,80,0,0.35)]",
            "transition-[transform,box-shadow,opacity] duration-300 ease-out will-change-transform",
            "hover:shadow-[0_8px_32px_rgba(253,80,0,0.45)] hover:scale-[1.02] active:scale-[0.98]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/50 focus-visible:ring-offset-2",
            "disabled:pointer-events-none disabled:opacity-70",
            "[@media(hover:hover)]:hover:-translate-y-0.5",
          )}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              <span>Loading…</span>
            </>
          ) : (
            <span>View More</span>
          )}
        </button>
      </div>
    );
  }

  if (total <= pageSize) return null;

  return (
    <div className="flex justify-center border-t border-[var(--color-border)] pt-8 pb-2">
      <p className="flex items-center gap-2 text-center text-sm font-medium text-[var(--color-text-muted)]">
        <span className="text-[var(--color-accent)]" aria-hidden>
          ✓
        </span>
        You&apos;ve reached the end of the marketplace.
      </p>
    </div>
  );
}
