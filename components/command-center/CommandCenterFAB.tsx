"use client";

import { Command } from "lucide-react";
import { useCommandCenterStore } from "@/lib/store/use-command-center-store";

/** Mobile FAB — opens the universal command center (desktop uses ⌘K). */
export function CommandCenterFAB() {
  const openCommandCenter = useCommandCenterStore((s) => s.openCommandCenter);
  const isOpen = useCommandCenterStore((s) => s.isOpen);

  if (isOpen) return null;

  return (
    <button
      type="button"
      onClick={() => openCommandCenter()}
      aria-label="Open command center"
      className="fixed bottom-5 left-5 z-[9998] grid size-14 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-lg transition-[transform,opacity] duration-300 hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50 md:hidden"
      style={{
        boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
        willChange: "transform",
      }}
    >
      <Command className="size-5 text-[var(--color-accent)]" />
    </button>
  );
}
