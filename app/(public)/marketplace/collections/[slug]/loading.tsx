export default function MarketplaceCollectionLoading() {
  return (
    <div className="mx-auto w-full max-w-8xl px-4 py-6 sm:px-6">
      <div className="mb-6 h-4 w-28 animate-pulse rounded bg-[var(--color-surface-secondary)]" />
      <div className="mb-2 h-8 w-64 max-w-full animate-pulse rounded bg-[var(--color-surface-secondary)]" />
      <div className="mb-6 h-4 w-96 max-w-full animate-pulse rounded bg-[var(--color-surface-secondary)]" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
          >
            <div className="aspect-square animate-pulse bg-[var(--color-surface-secondary)]" />
            <div className="space-y-2 p-3">
              <div className="h-3 w-full animate-pulse rounded bg-[var(--color-surface-secondary)]" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--color-surface-secondary)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
