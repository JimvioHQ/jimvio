"use client";

import { GripVertical, Eye, EyeOff, Pin, PinOff, ChevronUp, ChevronDown } from "lucide-react";
import { WORKSPACE_WIDGET_META } from "@/lib/jimvio-workspace";
import type { WorkspaceWidgetLayout } from "@/lib/jimvio-workspace/types";
import { cn } from "@/lib/utils";

type WorkspaceWidgetShellProps = {
  layout: WorkspaceWidgetLayout;
  editMode: boolean;
  onToggleHidden: () => void;
  onTogglePinned: () => void;
  onResize: (size: 3 | 4 | 6 | 12) => void;
  onReorder: (direction: "up" | "down") => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  children: React.ReactNode;
};

export function WorkspaceWidgetShell({
  layout,
  editMode,
  onToggleHidden,
  onTogglePinned,
  onResize,
  onReorder,
  onDragStart,
  onDragOver,
  onDrop,
  children,
}: WorkspaceWidgetShellProps) {
  const meta = WORKSPACE_WIDGET_META[layout.widgetId];

  return (
    <div
      draggable={editMode}
      onDragStart={(e) => {
        if (!editMode) return;
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragOver={(e) => {
        if (!editMode) return;
        e.preventDefault();
        onDragOver(e);
      }}
      onDrop={(e) => {
        if (!editMode) return;
        e.preventDefault();
        onDrop();
      }}
      className={cn(
        "flex h-full min-h-[140px] flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-[transform,box-shadow,border-color,opacity] duration-300",
        editMode && "ring-1 ring-[var(--color-accent)]/20",
        layout.hidden && editMode && "opacity-50",
      )}
      style={{
        gridColumn: `span ${layout.colSpan}`,
        gridRow: layout.rowSpan > 1 ? `span ${layout.rowSpan}` : undefined,
        willChange: "transform",
        minHeight: layout.rowSpan > 1 ? 280 : 140,
      }}
      role="region"
      aria-label={meta.label}
    >
      <header className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {editMode && (
            <GripVertical className="size-4 shrink-0 cursor-grab text-[var(--color-text-muted)]" aria-hidden />
          )}
          <div className="min-w-0">
            <h3 className="truncate text-[12px] font-bold text-[var(--color-text-primary)]">{meta.label}</h3>
            <p className="truncate text-[10px] text-[var(--color-text-muted)]">{meta.description}</p>
          </div>
          {layout.pinned && (
            <Pin className="size-3 shrink-0 text-[var(--color-accent)]" aria-label="Pinned" />
          )}
        </div>

        {editMode && (
          <div className="flex shrink-0 items-center gap-0.5">
            {([3, 4, 6, 12] as const).map((size) => (
              <button
                key={size}
                type="button"
                aria-label={`Resize to ${size} columns`}
                onClick={() => onResize(size)}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[9px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40",
                  layout.colSpan === size
                    ? "bg-[var(--color-accent)] text-white"
                    : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]",
                )}
              >
                {size}
              </button>
            ))}
            <button type="button" aria-label="Move up" onClick={() => onReorder("up")} className="rounded p-1 hover:bg-[var(--color-surface-secondary)]">
              <ChevronUp className="size-3.5" />
            </button>
            <button type="button" aria-label="Move down" onClick={() => onReorder("down")} className="rounded p-1 hover:bg-[var(--color-surface-secondary)]">
              <ChevronDown className="size-3.5" />
            </button>
            <button type="button" aria-label={layout.pinned ? "Unpin" : "Pin"} onClick={onTogglePinned} className="rounded p-1 hover:bg-[var(--color-surface-secondary)]">
              {layout.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
            </button>
            <button type="button" aria-label={layout.hidden ? "Show" : "Hide"} onClick={onToggleHidden} className="rounded p-1 hover:bg-[var(--color-surface-secondary)]">
              {layout.hidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            </button>
          </div>
        )}
      </header>

      <div className="flex flex-1 flex-col overflow-hidden p-3">{children}</div>
    </div>
  );
}

export function WorkspaceWidgetSkeleton({ colSpan = 3 }: { colSpan?: number }) {
  return (
    <div
      className="min-h-[140px] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
      style={{ gridColumn: `span ${colSpan}` }}
      aria-hidden
    >
      <div className="h-10 animate-pulse bg-[var(--color-surface-secondary)]" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--color-surface-secondary)]" />
        <div className="h-8 w-full animate-pulse rounded bg-[var(--color-surface-secondary)]" />
      </div>
    </div>
  );
}
