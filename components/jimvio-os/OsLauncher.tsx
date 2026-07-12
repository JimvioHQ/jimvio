"use client";

import { LayoutGrid } from "lucide-react";
import { useJimvioOsStore } from "@/lib/store/use-jimvio-os-store";

export function OsLauncher() {
  const isOpen = useJimvioOsStore((s) => s.isOpen);
  const openOs = useJimvioOsStore((s) => s.openOs);

  if (isOpen) return null;

  return (
    <button
      type="button"
      onClick={openOs}
      aria-label="Open Jimvio OS"
      className="fixed bottom-6 left-6 z-[9995] hidden items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[12px] font-bold text-[var(--color-text-primary)] shadow-lg transition-[transform,opacity] duration-300 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50 md:inline-flex"
      style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.12)", willChange: "transform" }}
    >
      <LayoutGrid className="size-4 text-[var(--color-accent)]" />
      Jimvio OS
      <kbd className="rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)]">⌘.</kbd>
    </button>
  );
}
