"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";
import { OS_WORKSPACE_MODES } from "@/lib/jimvio-os/config";
import { getWorkspaceDefinition } from "@/lib/jimvio-os/workspaces";
import { useJimvioOsStore } from "@/lib/store/use-jimvio-os-store";
import type { OsWorkspaceMode } from "@/lib/jimvio-os/types";
import { cn } from "./os-ui";

/** Premium workspace switcher — Apple/Linear-style dropdown for the Creator OS sidebar. */
export function OsWorkspaceSwitcher() {
  const router = useRouter();
  const mode = useJimvioOsStore((s) => s.workspaceMode);
  const setMode = useJimvioOsStore((s) => s.setWorkspaceMode);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = OS_WORKSPACE_MODES.find((m) => m.id === mode) ?? OS_WORKSPACE_MODES[1];

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handleSelect(next: OsWorkspaceMode) {
    setMode(next);
    setOpen(false);
    const homeHref = getWorkspaceDefinition(next).homeHref;
    if (homeHref) router.push(homeHref);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 px-2.5 py-2 text-left transition-colors duration-150 hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
      >
        <span
          className="grid size-8 shrink-0 place-items-center rounded-xl text-[15px]"
          style={{ background: "color-mix(in srgb, var(--color-accent) 14%, transparent)" }}
        >
          {current.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Workspace
          </span>
          <span className="block truncate text-[13px] font-semibold text-[var(--color-text-primary)]">
            {current.label}
          </span>
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-[var(--color-text-muted)]" />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Workspace modes"
          className="absolute left-0 right-0 top-full z-20 mt-1.5 max-h-[min(70vh,420px)] overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-[0_12px_32px_rgba(16,24,40,0.12)]"
          style={{ animation: "jimvio-os-enter 160ms ease-out" }}
        >
          {OS_WORKSPACE_MODES.map((m) => {
            const active = mode === m.id;
            return (
              <li key={m.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => handleSelect(m.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-accent)]/40",
                    active ? "bg-[var(--color-accent)]/8" : "hover:bg-[var(--color-surface-secondary)]",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-lg text-[13px]",
                      active ? "bg-[var(--color-accent)]/15" : "bg-[var(--color-surface-secondary)]",
                    )}
                  >
                    {m.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-semibold text-[var(--color-text-primary)]">
                      {m.label}
                    </span>
                    <span className="block truncate text-[10.5px] text-[var(--color-text-muted)]">
                      {m.description}
                    </span>
                  </span>
                  {active && <Check className="size-3.5 shrink-0 text-[var(--color-accent)]" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
