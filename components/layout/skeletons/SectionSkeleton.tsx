/**
 * Instant placeholders shown the moment someone moves between Jimvio sections.
 * They also let Next.js prefetch each section ahead of the click.
 */
const box = "animate-pulse rounded-xl bg-[var(--color-surface-secondary,#F3F4F6)]";

export function GridSkeleton({ withSidebar = false, label }: { withSidebar?: boolean; label: string }) {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6" role="status" aria-label={label}>
      <div className={withSidebar ? "grid gap-5 lg:grid-cols-[240px_1fr]" : ""}>
        {withSidebar ? (
          <div className="hidden space-y-3 lg:block">
            <div className={`h-28 ${box}`} />
            <div className={`h-64 ${box}`} />
          </div>
        ) : null}
        <div className="space-y-5">
          <div className={`h-12 ${box}`} />
          <div className={`h-48 sm:h-64 ${box} rounded-2xl`} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className={`aspect-square ${box}`} />
                <div className={`h-3 w-4/5 ${box}`} />
                <div className={`h-3 w-1/2 ${box}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function FeedSkeleton({ label }: { label: string }) {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-5 sm:px-6" role="status" aria-label={label}>
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className={`h-12 ${box}`} />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`h-16 w-16 shrink-0 rounded-full ${box}`} />
            ))}
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`h-44 ${box} rounded-2xl`} />
          ))}
        </div>
        <div className="hidden space-y-4 lg:block">
          <div className={`h-56 ${box} rounded-2xl`} />
          <div className={`h-40 ${box} rounded-2xl`} />
        </div>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
