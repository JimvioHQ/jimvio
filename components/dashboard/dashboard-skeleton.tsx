export function DashboardStatSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-[108px] animate-pulse rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]"
        />
      ))}
    </div>
  );
}

export function DashboardChartSkeleton() {
  return (
    <div className="h-[360px] animate-pulse rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]" />
  );
}

export function DashboardPanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3 last:border-b-0"
        >
          <div className="size-9 shrink-0 animate-pulse rounded-full bg-[var(--color-surface-secondary)]" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-2/5 animate-pulse rounded bg-[var(--color-surface-secondary)]" />
            <div className="h-2.5 w-3/5 animate-pulse rounded bg-[var(--color-surface-secondary)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardGridSkeleton() {
  return (
    <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-12">
      <div className="flex flex-col gap-5 xl:col-span-8">
        <DashboardChartSkeleton />
        <DashboardPanelSkeleton rows={5} />
      </div>
      <div className="flex flex-col gap-5 xl:col-span-4">
        <DashboardPanelSkeleton rows={3} />
        <DashboardPanelSkeleton rows={4} />
        <DashboardPanelSkeleton rows={3} />
      </div>
    </div>
  );
}
