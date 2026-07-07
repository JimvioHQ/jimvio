"use client";

import { ChevronDown } from "lucide-react";
import { OS_WORKSPACE_MODES } from "@/lib/jimvio-os";
import { useJimvioOsStore } from "@/lib/store/use-jimvio-os-store";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function OsWorkspaceSwitcher() {
  const mode = useJimvioOsStore((s) => s.workspaceMode);
  const setMode = useJimvioOsStore((s) => s.setWorkspaceMode);
  const [open, setOpen] = useState(false);
  const current = OS_WORKSPACE_MODES.find((m) => m.id === mode) ?? OS_WORKSPACE_MODES[1];

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 px-3 py-2.5 text-left transition-[transform,border-color] duration-200 hover:scale-[1.01] hover:border-[var(--color-accent)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
        style={{ willChange: "transform" }}
      >
        <span>
          <span className="block text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Workspace</span>
          <span className="text-[13px] font-bold text-[var(--color-text-primary)]">{current.label} Mode</span>
        </span>
        <ChevronDown className={cn("size-4 text-[var(--color-text-muted)] transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Workspace modes"
          className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg"
        >
          {OS_WORKSPACE_MODES.map((m) => (
            <li key={m.id} role="option" aria-selected={mode === m.id}>
              <button
                type="button"
                onClick={() => {
                  setMode(m.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-accent)]/40",
                  mode === m.id && "bg-[var(--color-accent)]/10",
                )}
              >
                <span className="block text-[12px] font-semibold text-[var(--color-text-primary)]">{m.label}</span>
                <span className="text-[10px] text-[var(--color-text-muted)]">{m.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
