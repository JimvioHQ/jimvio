/** Shared admin control styles — rounded-md per admin UI spec */
export const adminInputClass =
  "h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20";

export const adminBtnSecondary =
  "inline-flex h-9 items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3.5 text-[12px] font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]";

export const adminBtnPrimary =
  "inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--color-accent)] px-4 text-[12px] font-semibold text-white transition-opacity hover:opacity-90";

export const adminBtnGhost =
  "inline-flex h-9 items-center gap-1.5 rounded-md border border-[var(--color-border)] px-3 text-[12px] font-medium text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]";

export const adminTableShell =
  "overflow-hidden rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]";
