"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { SUPER_APP_WORKSPACE_MODES } from "@/lib/jimvio-super-app";
import { useSuperAppStore } from "@/lib/store/use-super-app-store";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function SuperAppWorkspaceSwitcher({ compact = false }: { compact?: boolean }) {
  const mode = useSuperAppStore((s) => s.workspaceMode);
  const setMode = useSuperAppStore((s) => s.setWorkspaceMode);
  const [open, setOpen] = useState(false);
  const current = SUPER_APP_WORKSPACE_MODES.find((m) => m.id === mode) ?? SUPER_APP_WORKSPACE_MODES[0];

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-[transform,border-color] hover:border-[var(--color-accent)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40",
          compact ? "px-2.5 py-2" : "w-full justify-between px-3 py-2.5",
        )}
        style={{ willChange: "transform" }}
      >
        <span className={compact ? "text-[11px] font-bold" : "text-left"}>
          {!compact && (
            <span className="block text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Workspace</span>
          )}
          <span className="text-[var(--color-text-primary)]">{current.label}</span>
        </span>
        <ChevronDown className={cn("size-4 text-[var(--color-text-muted)] transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute bottom-full left-0 right-0 z-20 mb-1 max-h-[280px] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl"
        >
          {SUPER_APP_WORKSPACE_MODES.map((m) => (
            <li key={m.id} role="option" aria-selected={mode === m.id}>
              <button
                type="button"
                onClick={() => {
                  setMode(m.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full px-3 py-2.5 text-left hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-accent)]/40",
                  mode === m.id && "bg-[var(--color-accent)]/10",
                )}
              >
                <span className="block text-[12px] font-semibold">{m.label}</span>
                <span className="text-[10px] text-[var(--color-text-muted)]">{m.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
