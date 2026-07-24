"use client";

import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

export type WorkspaceTabDef = { id: string; label: string };

/**
 * Shared premium tab chrome for Group + Channel workspaces.
 * Arrow-key navigation + aria-controls for a11y.
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
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const idx = tabs.findIndex((t) => t.id === active);
      if (idx < 0) return;
      let next = idx;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        next = (idx + 1) % tabs.length;
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        next = (idx - 1 + tabs.length) % tabs.length;
      } else if (e.key === "Home") {
        e.preventDefault();
        next = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        next = tabs.length - 1;
      } else {
        return;
      }
      onChange(tabs[next].id);
      const btn = listRef.current?.querySelector<HTMLButtonElement>(
        `#${idPrefix}-${tabs[next].id}`
      );
      btn?.focus();
    },
    [active, idPrefix, onChange, tabs]
  );

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn(
        "flex gap-0.5 overflow-x-auto border-b border-[var(--color-border)] px-2 scrollbar-hide sm:gap-1 sm:px-4",
        "bg-[var(--color-surface)]/80 backdrop-blur-sm scroll-smooth",
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
            aria-controls={`${idPrefix}-${tab.id}-panel`}
            id={`${idPrefix}-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative flex min-h-11 shrink-0 items-center px-2.5 text-[12px] font-semibold transition-colors duration-150 sm:px-3 sm:text-[13px]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-inset",
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
