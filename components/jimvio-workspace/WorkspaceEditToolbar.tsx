"use client";

import { LayoutGrid, RotateCcw, Pencil, Check } from "lucide-react";
import { useWorkspaceStore } from "@/lib/store/use-workspace-store";

export function WorkspaceEditToolbar() {
  const editMode = useWorkspaceStore((s) => s.editMode);
  const toggleEditMode = useWorkspaceStore((s) => s.toggleEditMode);
  const resetLayout = useWorkspaceStore((s) => s.resetLayout);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={toggleEditMode}
        aria-pressed={editMode}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] font-semibold text-[var(--color-text-secondary)] transition-[transform,background-color] duration-200 hover:scale-[1.02] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
        style={{ willChange: "transform" }}
      >
        {editMode ? <Check className="size-3.5" /> : <Pencil className="size-3.5" />}
        {editMode ? "Done editing" : "Customize layout"}
      </button>
      {editMode && (
        <button
          type="button"
          onClick={resetLayout}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] font-semibold text-[var(--color-text-muted)] transition-[transform,background-color] duration-200 hover:scale-[1.02] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
          style={{ willChange: "transform" }}
        >
          <RotateCcw className="size-3.5" />
          Reset layout
        </button>
      )}
      {editMode && (
        <p className="inline-flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
          <LayoutGrid className="size-3.5" />
          Drag to swap · Resize · Pin · Hide
        </p>
      )}
    </div>
  );
}
