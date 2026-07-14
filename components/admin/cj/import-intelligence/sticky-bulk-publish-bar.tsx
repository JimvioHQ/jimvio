"use client";

import { Loader2, Rocket, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function StickyBulkPublishBar({
  selectedCount,
  publishing,
  onPublish,
  onClear,
  className,
}: {
  selectedCount: number;
  publishing?: boolean;
  onPublish: () => void;
  onClear: () => void;
  className?: string;
}) {
  if (selectedCount <= 0) return null;

  return (
    <div
      className={cn(
        "fixed z-50 flex items-center gap-2 rounded-[14px] border border-[#E5E7EB] bg-white/95 px-3 py-2 shadow-[0_8px_32px_rgba(17,24,39,0.12)] backdrop-blur-xl",
        className
      )}
      style={{ bottom: 16, right: 16 }}
    >
      <span className="text-[11px] font-medium tabular-nums text-[#374151]">
        {selectedCount} selected
      </span>
      <button
        type="button"
        onClick={onPublish}
        disabled={publishing}
        className="inline-flex h-8 items-center gap-1.5 rounded-[10px] bg-[var(--color-accent)] px-3 text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {publishing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Rocket className="h-3.5 w-3.5" />
        )}
        Publish selected
      </button>
      <button
        type="button"
        onClick={onClear}
        disabled={publishing}
        className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
        title="Clear selection"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
