"use client";

import {
  CheckSquare,
  Loader2,
  Package,
  RefreshCw,
  Rocket,
} from "lucide-react";
import type { ImportMode } from "@/lib/cj/import-intelligence/types";
import { cn } from "@/lib/utils";

export function BulkActionsBar({
  selectedCount,
  totalVisible,
  bulkImporting,
  importMode,
  onImportModeChange,
  onSelectAll,
  onImportDraft,
  onImportAndPublish,
  onSyncSelected,
  className,
}: {
  selectedCount: number;
  totalVisible: number;
  bulkImporting: boolean;
  importMode: ImportMode;
  onImportModeChange: (mode: ImportMode) => void;
  onSelectAll: () => void;
  onImportDraft: () => void;
  onImportAndPublish: () => void;
  onSyncSelected?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-[14px] border border-[#E5E7EB] bg-white/90 px-3 py-2 shadow-[0_1px_3px_rgba(17,24,39,0.04)] backdrop-blur-xl",
        className
      )}
    >
      <button
        type="button"
        onClick={onSelectAll}
        className="inline-flex h-7 items-center gap-1.5 rounded-[10px] border border-[#E5E7EB] px-2.5 text-[11px] font-medium text-[#374151] hover:bg-[#F9FAFB]"
      >
        <CheckSquare className="h-3.5 w-3.5" />
        All ({totalVisible})
      </button>

      {selectedCount > 0 && (
        <>
          <span className="text-[10px] font-medium tabular-nums text-[#9CA3AF]">
            {selectedCount} selected
          </span>
          <div className="h-4 w-px bg-[#E5E7EB]" />

          <div className="inline-flex items-center gap-1 rounded-[10px] bg-[#F9FAFB] p-0.5 text-[10px]">
            {(["draft", "publish", "auto"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onImportModeChange(mode)}
                className={cn(
                  "rounded-[8px] px-2 py-1 font-medium capitalize transition-colors",
                  importMode === mode
                    ? "bg-white text-[#111827] shadow-sm"
                    : "text-[#6B7280] hover:text-[#111827]"
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-[#E5E7EB]" />

          <BulkBtn
            icon={<Package className="h-3.5 w-3.5" />}
            label="Import"
            onClick={onImportDraft}
            loading={bulkImporting}
          />
          <BulkBtn
            icon={<Rocket className="h-3.5 w-3.5" />}
            label="Publish"
            onClick={onImportAndPublish}
            loading={bulkImporting}
            primary
          />
          {onSyncSelected && (
            <BulkBtn
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              label="Sync"
              onClick={onSyncSelected}
              loading={bulkImporting}
            />
          )}
        </>
      )}
    </div>
  );
}

function BulkBtn({
  icon,
  label,
  onClick,
  loading,
  primary,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  loading?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-[10px] px-2.5 text-[10.5px] font-semibold disabled:opacity-60",
        primary
          ? "bg-[var(--color-accent)] text-white shadow-sm hover:opacity-90"
          : "border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB]"
      )}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {label}
    </button>
  );
}
