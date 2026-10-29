/** Shown the moment a product is tapped, while the page data loads. */
export default function ProductDetailLoading() {
  const block = "animate-pulse rounded bg-[var(--color-surface-secondary)]";
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6" role="status" aria-label="Loading product">
      <div className={`mb-5 h-4 w-48 max-w-full ${block}`} />
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
        <div>
          <div className="aspect-square w-full animate-pulse rounded-2xl bg-[var(--color-surface-secondary)]" />
          <div className="mt-3 flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="size-16 animate-pulse rounded-xl bg-[var(--color-surface-secondary)]" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className={`h-7 w-11/12 ${block}`} />
          <div className={`h-7 w-2/3 ${block}`} />
          <div className={`h-4 w-40 ${block}`} />
          <div className={`h-9 w-36 ${block}`} />
          <div className="space-y-2 pt-2">
            <div className={`h-3 w-full ${block}`} />
            <div className={`h-3 w-full ${block}`} />
            <div className={`h-3 w-3/4 ${block}`} />
          </div>
          <div className="flex gap-3 pt-4">
            <div className="h-12 flex-1 animate-pulse rounded-xl bg-[var(--color-surface-secondary)]" />
            <div className="h-12 flex-1 animate-pulse rounded-xl bg-[var(--color-surface-secondary)]" />
          </div>
        </div>
      </div>
      <span className="sr-only">Loading product…</span>
    </div>
  );
}
