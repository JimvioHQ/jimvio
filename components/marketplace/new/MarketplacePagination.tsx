"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
};

function buildPageItems(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const items: (number | "ellipsis")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const page = sorted[i];
    const prev = sorted[i - 1];
    if (i > 0 && page - prev > 1) items.push("ellipsis");
    items.push(page);
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
        "inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-full px-3 text-xs font-semibold transition-all",
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
}: {
  page: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isActive}
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
      {page}
    </button>
  );
}

export function MarketplacePagination({
  currentPage,
  totalPages,
  total,
  pageSize,
  onPageChange,
  itemLabel = "products",
}: Props) {
  if (totalPages <= 1 || total === 0) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);
  const pages = buildPageItems(currentPage, totalPages);

  return (
    <div className="flex flex-col items-center gap-4 border-t border-[var(--color-border)] pt-8 pb-2">
      <p className="text-center text-[13px] font-medium text-[var(--color-text-muted)]">
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

      <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-2">
        <NavButton
          ariaLabel="Previous page"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">Previous</span>
        </NavButton>

        <div className="flex items-center gap-1.5 px-1">
          {pages.map((item, index) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                className="flex h-9 w-6 items-center justify-center text-sm font-medium text-[var(--color-text-muted)]"
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
              />
            ),
          )}
        </div>

        <NavButton
          ariaLabel="Next page"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
        </NavButton>
      </nav>

      <p className="text-[11px] font-medium text-[var(--color-text-muted)]/80 tabular-nums">
        Page {currentPage} of {totalPages}
      </p>
    </div>
  );
}
