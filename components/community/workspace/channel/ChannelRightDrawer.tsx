"use client";

/**
 * Future right drawer slot (AI, details, threads).
 * Phase 1: structure only — not rendered until enabled.
 */
export function ChannelRightDrawer({
  open = false,
  children,
}: {
  open?: boolean;
  children?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <aside
      className="hidden w-[280px] shrink-0 border-l border-[var(--color-border)] bg-[var(--color-surface)] xl:flex xl:flex-col"
      aria-label="Channel details"
    >
      {children}
    </aside>
  );
}
