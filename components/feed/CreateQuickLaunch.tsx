"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { CreateMenuPanel } from "@/components/feed/CreateMenuPanel";
import { cn } from "@/lib/utils";

type CreateMenuDropdownProps = {
  /** Full-width orange button for the feed right rail */
  variant?: "rail" | "compact" | "inline";
  className?: string;
};

export function CreateMenuDropdown({ variant = "rail", className }: CreateMenuDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const triggerClass =
    variant === "rail"
      ? "flex w-full items-center justify-center gap-1.5 rounded-sm bg-orange-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
      : variant === "inline"
        ? "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600"
        : "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[var(--color-accent)] px-4 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[#e04800]";

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((prev) => !prev)}
        className={triggerClass}
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        <span className={variant === "compact" ? "hidden sm:inline" : undefined}>Create</span>
        {variant === "rail" ? (
          open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-[calc(100%+8px)] z-50",
            variant === "rail" ? "left-0 right-0" : "right-0 w-[280px]"
          )}
        >
          <CreateMenuPanel onItemClick={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

/** Feed right-rail wrapper — button only until opened */
export function CreateQuickLaunch() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white ">
      <CreateMenuDropdown variant="rail" />
    </div>
  );
}
