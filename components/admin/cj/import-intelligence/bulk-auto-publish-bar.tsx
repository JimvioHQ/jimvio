"use client";

import { Loader2, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

export function BulkAutoPublishBar({
  readyCount,
  publishing,
  onAutoPublish,
  className,
}: {
  readyCount: number;
  publishing?: boolean;
  onAutoPublish: () => void;
  className?: string;
}) {
  if (readyCount <= 0) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-[12px] border border-emerald-200 bg-emerald-50/80 px-3 py-1.5",
        className
      )}
    >
      <span className="text-[10px] font-medium text-emerald-800">
        {readyCount} Auto Publish Ready
      </span>
      <button
        type="button"
        onClick={onAutoPublish}
        disabled={publishing}
        className="inline-flex h-7 items-center gap-1.5 rounded-[8px] bg-emerald-600 px-2.5 text-[10px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {publishing ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Rocket className="h-3 w-3" />
        )}
        Auto Publish Ready Products
      </button>
    </div>
  );
}
