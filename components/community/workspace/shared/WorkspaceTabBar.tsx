"use client";

import { cn } from "@/lib/utils";

export type WorkspaceTabDef = { id: string; label: string };

/**
 * Shared premium tab chrome for Group + Channel workspaces.
 */
export function WorkspaceTabBar({
  tabs,
  active,
  onChange,
  ariaLabel,
  idPrefix,
  className,
}: {
  tabs: readonly WorkspaceTabDef[];
  active: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  idPrefix: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex gap-0.5 overflow-x-auto border-b border-[var(--color-border)] px-2 scrollbar-hide sm:gap-1 sm:px-4",
        "bg-[var(--color-surface)]/80 backdrop-blur-sm",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            id={`${idPrefix}-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative shrink-0 px-2.5 py-2.5 text-[12px] font-semibold transition-colors duration-200 sm:px-3 sm:text-[13px]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1",
              isActive
                ? "text-[var(--color-accent)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            )}
          >
            {tab.label}
            <span
              className={cn(
                "absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[var(--color-accent)] transition-transform duration-200 origin-center",
                isActive ? "scale-x-100" : "scale-x-0"
              )}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}
