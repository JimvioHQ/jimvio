export default function AdminUserDetailLoading() {
  return (
    <div className="space-y-4 px-1 py-2" aria-busy="true" aria-live="polite">
      <p className="text-[12px] text-[var(--color-text-muted)]">Loading user</p>
      <div className="h-24 animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="h-64 animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60" />
        <div className="h-64 animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60 lg:col-span-2" />
      </div>
    </div>
  );
}
