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
        "flex flex-wrap items-center gap-2 px-3 py-2 rounded-sm border border-[var(--color-border)]",
        "bg-[var(--color-surface)]/85 backdrop-blur-xl",
        className
      )}
    >
      <button
        type="button"
        onClick={onSelectAll}
        className="h-7 px-2.5 rounded-sm border border-[var(--color-border)] text-[11px] font-medium hover:bg-[var(--color-surface-secondary)] inline-flex items-center gap-1"
      >
        <CheckSquare className="h-3.5 w-3.5" />
        All ({totalVisible})
      </button>

      {selectedCount > 0 && (
        <>
          <span className="text-[10px] text-[var(--color-text-muted)] tabular-nums font-medium">
            {selectedCount} selected
          </span>
          <div className="h-4 w-px bg-[var(--color-border)]" />

          <div className="inline-flex items-center gap-2 text-[10px]">
            <span className="text-[var(--color-text-muted)] font-medium">Mode</span>
            <label className="inline-flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                checked={importMode === "draft"}
                onChange={() => onImportModeChange("draft")}
                className="accent-[#FF5A1F]"
              />
              Draft
            </label>
            <label className="inline-flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                checked={importMode === "publish"}
                onChange={() => onImportModeChange("publish")}
                className="accent-[#FF5A1F]"
              />
              Publish
            </label>
            <label className="inline-flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                checked={importMode === "auto"}
                onChange={() => onImportModeChange("auto")}
                className="accent-[#FF5A1F]"
              />
              Auto
            </label>
          </div>

          <div className="h-4 w-px bg-[var(--color-border)]" />

          <BulkBtn
            icon={<Package className="h-3.5 w-3.5" />}
            label="Import Draft"
            onClick={onImportDraft}
            loading={bulkImporting}
          />
          <BulkBtn
            icon={<Rocket className="h-3.5 w-3.5" />}
            label="Import & Publish"
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
        "h-7 px-2.5 rounded-sm text-[10.5px] font-semibold inline-flex items-center gap-1 disabled:opacity-60",
        primary
          ? "bg-[#FF5A1F] text-white hover:opacity-90"
          : "border border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]"
      )}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {label}
    </button>
  );
}
