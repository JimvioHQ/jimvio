"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export function DsDrawer({
  open,
  onClose,
  title,
  children,
  side = "right",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  side?: "left" | "right";
}) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[var(--ds-z-modal)] bg-black/40 backdrop-blur-[1px]" aria-hidden onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Drawer"}
        className={cn(
          "fixed inset-y-0 z-[calc(var(--ds-z-modal)+10)] flex w-[min(100vw-2rem,400px)] flex-col border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-xl)] ds-motion-slide-up",
          side === "right" ? "right-0 border-l" : "left-0 border-r",
        )}
      >
        <header className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          {title && <h2 className="text-sm font-bold">{title}</h2>}
          <button type="button" onClick={onClose} aria-label="Close drawer" className="ds-focus-ring rounded-[var(--radius-sm)] p-1.5">
            <X className="size-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </>
  );
}

export function DsTooltip({
  content,
  children,
}: {
  content: string;
  children: React.ReactNode;
}) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-[var(--ds-z-popover)] mb-2 -translate-x-1/2 whitespace-nowrap rounded-[var(--radius-sm)] bg-[var(--color-text-primary)] px-2 py-1 text-[11px] font-medium text-[var(--color-bg)] opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {content}
      </span>
    </span>
  );
}
