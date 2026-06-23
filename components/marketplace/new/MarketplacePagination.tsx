"use client";

type Props = {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export function MarketplacePagination({
  currentPage,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: Props) {
  if (totalPages <= 1 || total === 0) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);

  return (
    <div className="flex flex-col items-center gap-3 pt-4">
      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        Showing {start}–{end} of {total.toLocaleString()} products
      </p>
      <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-1.5">
        {currentPage > 1 && (
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            className="h-9 rounded-xl px-4 text-xs font-semibold transition-all"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-muted)",
            }}
            aria-label="Previous page"
          >
            Previous
          </button>
        )}
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const pg = Math.max(1, currentPage - 2) + i;
          if (pg > totalPages) return null;
          const isActive = pg === currentPage;
          return (
            <button
              key={pg}
              type="button"
              onClick={() => !isActive && onPageChange(pg)}
              aria-label={`Page ${pg}`}
              aria-current={isActive ? "page" : undefined}
              disabled={isActive}
              className="h-9 min-w-[36px] rounded-xl px-3 text-xs font-semibold transition-all"
              style={
                isActive
                  ? {
                      background: "var(--color-accent)",
                      color: "#fff",
                      border: "1px solid transparent",
                      boxShadow: "0 4px 12px rgba(253,80,0,0.25)",
                    }
                  : {
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text-muted)",
                    }
              }
            >
              {pg}
            </button>
          );
        })}
        {currentPage < totalPages && (
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            className="h-9 rounded-xl px-4 text-xs font-semibold transition-all"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-muted)",
            }}
            aria-label="Next page"
          >
            Next
          </button>
        )}
      </nav>
    </div>
  );
}
