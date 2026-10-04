"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import type { AboutSectionId } from "@/lib/about/content";
import { AboutSidebar } from "./AboutSidebar";

export function AboutMobileNav({ activeId }: { activeId: AboutSectionId }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[var(--color-border)] bg-white px-3 text-sm font-semibold text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] xl:hidden dark:bg-[var(--color-surface)]"
      >
        <Menu className="h-4 w-4 text-[#FF5A1F]" aria-hidden="true" />
        About menu
      </button>

      {open ? (
        <div className="fixed inset-0 z-[10050] xl:hidden">
          <button
            type="button"
            aria-label="Close About navigation"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="About Jimvio navigation"
            className="absolute inset-y-0 left-0 flex w-[min(100%,22rem)] flex-col bg-[#F8FAFC] p-3 shadow-xl dark:bg-[var(--color-bg)]"
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-sm font-bold text-[var(--color-text-primary)]">About Jimvio</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-2 text-[var(--color-text-muted)] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <AboutSidebar
              activeId={activeId}
              className="min-h-0 flex-1"
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
