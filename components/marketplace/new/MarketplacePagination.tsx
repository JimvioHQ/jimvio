"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
  loading?: boolean;
};

const ELLIPSIS = "ellipsis" as const;

function buildPageItems(current: number, total: number, maxVisible: number): (number | typeof ELLIPSIS)[] {
  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const items: (number | typeof ELLIPSIS)[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const page = sorted[i];
    const prev = sorted[i - 1];
    if (i > 0 && page - prev > 1) items.push(ELLIPSIS);
    items.push(page);
  }

  if (items.length > maxVisible) {
    const first = items[0] as number;
    const last = items[items.length - 1] as number;
    const result: (number | typeof ELLIPSIS)[] = [first];
    if (current > 3) result.push(ELLIPSIS);
    result.push(current);
    if (current < total - 2) result.push(ELLIPSIS);
    result.push(last);
    if (result.length <= maxVisible) return result;
    return [first, ELLIPSIS, current, ELLIPSIS, last];
  }

  return items;
}

function NavButton({
  children,
  onClick,
  disabled,
  ariaLabel,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-full px-2 text-xs font-semibold transition-all sm:px-3",
        "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]",
        "hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40",
        "disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}

function PageButton({
  page,
  isActive,
  onClick,
  loading,
}: {
  page: number;
  isActive: boolean;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isActive || loading}
      aria-label={`Page ${page}`}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold tabular-nums transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40",
        isActive
          ? "bg-[var(--color-accent)] text-white shadow-[0_4px_14px_rgba(253,80,0,0.35)] scale-105"
          : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
      )}
    >
      {loading && isActive ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        page
      )}
    </button>
  );
}

export function MarketplacePagination({
  hasMore,
  loading,
  onLoadMore,
  total,
  pageSize,
  onPageChange,
  itemLabel = "products",
  loading = false,
}: Props) {
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const mqRef = useRef<MediaQueryList | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    mqRef.current = window.matchMedia("(max-width: 479px)");
    const update = () => setIsSmallScreen(Boolean(mqRef.current?.matches));
    update();
    mqRef.current.addEventListener("change", update);
    return () => mqRef.current?.removeEventListener("change", update);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft" && currentPage > 1) {
        e.preventDefault();
        onPageChange(currentPage - 1);
      }
      if (e.key === "ArrowRight" && currentPage < totalPages) {
        e.preventDefault();
        onPageChange(currentPage + 1);
      }
    },
    [currentPage, totalPages, onPageChange],
  );

  if (totalPages <= 1 || total === 0) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);
  const maxVisible = isSmallScreen ? 5 : 7;
  const pages = buildPageItems(currentPage, totalPages, maxVisible);

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 border-t border-[var(--color-border)] pt-6 pb-2 sm:pt-10",
        loading && "pointer-events-none opacity-70",
      )}
      onKeyDown={handleKeyDown}
    >
      <p className="text-center text-[12px] font-medium text-[var(--color-text-muted)] sm:text-[13px]">
        Showing{" "}
        <span className="font-semibold text-[var(--color-text-primary)] tabular-nums">
          {start.toLocaleString()}–{end.toLocaleString()}
        </span>{" "}
        of{" "}
        <span className="font-semibold text-[var(--color-text-primary)] tabular-nums">
          {total.toLocaleString()}
        </span>{" "}
        {itemLabel}
      </p>

      <nav
        aria-label="Pagination"
        className="flex items-center justify-center gap-1 sm:gap-2"
        role="navigation"
      >
        <NavButton
          ariaLabel="Previous page"
          disabled={currentPage <= 1 || loading}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="size-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">Prev</span>
        </NavButton>

        <div className="flex items-center gap-1 sm:gap-1.5">
          {pages.map((item, index) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                className="flex h-9 w-5 items-center justify-center text-sm font-medium text-[var(--color-text-muted)] sm:w-6"
                aria-hidden
              >
                …
              </span>
            ) : (
              <PageButton
                key={item}
                page={item}
                isActive={item === currentPage}
                onClick={() => onPageChange(item)}
                loading={loading}
              />
            ),
          )}
        </button>
      </div>
    );
  }

        <NavButton
          ariaLabel="Next page"
          disabled={currentPage >= totalPages || loading}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="size-4 shrink-0" aria-hidden />
        </NavButton>
      </nav>

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
