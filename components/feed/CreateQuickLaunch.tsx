"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { CreateMenuPanel } from "@/components/feed/CreateMenuPanel";
import type { CreateMenuContext } from "@/lib/navigation/create-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type CreateMenuDropdownProps = {
  /** Full-width orange button for the feed right rail */
  variant?: "rail" | "compact" | "inline" | "header";
  className?: string;
  context?: CreateMenuContext;
};

/**
 * Canonical global Create control.
 * Instant open — no API gating.
 * Portaled via Radix so header overflow / page stacking cannot trap the panel.
 * modal=true so mobile taps don't fall through to bottom nav / hero.
 */
export function CreateMenuDropdown({
  variant = "rail",
  className,
  context = "global",
}: CreateMenuDropdownProps) {
  const [open, setOpen] = useState(false);

  const triggerClass =
    variant === "rail"
      ? "flex w-full items-center justify-center gap-1.5 rounded-sm bg-orange-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
      : variant === "inline"
        ? "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600"
        : variant === "header"
          ? "inline-flex h-9 shrink-0 items-center gap-1 rounded-lg bg-[#FF5A1F] px-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#e64e18] sm:gap-1.5 sm:px-3"
          : "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#fd5000] px-4 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[#e04800]";

  const trigger = (
    <button
      type="button"
      aria-expanded={open}
      aria-haspopup="menu"
      aria-label="Create"
      className={triggerClass}
    >
      <Plus className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" strokeWidth={2.5} />
      <span
        className={cn(
          (variant === "compact" || variant === "header") && "hidden sm:inline",
        )}
      >
        Create
      </span>
      {variant === "rail" ? (
        open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
      ) : (
        <ChevronDown
          className={cn(
            "hidden h-3 w-3 shrink-0 opacity-80 transition-transform sm:block",
            open && "rotate-180",
          )}
        />
      )}
    </button>
  );

  return (
    <div className={cn(className)}>
      <DropdownMenu modal open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          {trigger}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={variant === "rail" ? "start" : "end"}
          side="bottom"
          sideOffset={8}
          collisionPadding={16}
          className={cn(
            "z-[10050] border-0 bg-transparent p-0 shadow-none",
            variant === "rail"
              ? "w-[var(--radix-dropdown-menu-trigger-width)] min-w-[240px]"
              : "w-[min(300px,calc(100vw-1.5rem))]",
          )}
        >
          <CreateMenuPanel context={context} onItemClick={() => setOpen(false)} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Feed right-rail wrapper — button only until opened */
export function CreateQuickLaunch() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <CreateMenuDropdown variant="rail" context="communities" />
    </div>
  );
}
