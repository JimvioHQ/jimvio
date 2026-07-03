"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BUILT_IN_PRESETS,
  getAllPresets,
  type SourcingPreset,
} from "@/lib/cj/import-intelligence/presets";

export function SavedPresetsBar({
  activePresetIds,
  onTogglePreset,
  onSaveCurrent,
  className,
}: {
  activePresetIds: string[];
  onTogglePreset: (id: string) => void;
  onSaveCurrent?: () => void;
  className?: string;
}) {
  const presets = getAllPresets();

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5",
        className
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mr-1">
        Presets
      </span>
      {presets.map((preset) => (
        <PresetChip
          key={preset.id}
          preset={preset}
          active={activePresetIds.includes(preset.id)}
          onClick={() => onTogglePreset(preset.id)}
        />
      ))}
      {onSaveCurrent && (
        <button
          type="button"
          onClick={onSaveCurrent}
          className="h-6 px-2 rounded-sm border border-dashed border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)] hover:border-[#FF5A1F]/40 hover:text-[#FF5A1F] inline-flex items-center gap-1"
        >
          <Plus className="h-3 w-3" />
          Save
        </button>
      )}
    </div>
  );
}

function PresetChip({
  preset,
  active,
  onClick,
}: {
  preset: SourcingPreset;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-7 rounded-full border px-2.5 text-[10.5px] font-medium transition-all",
        active
          ? "border-[#FF5A1F] bg-[#FF5A1F]/10 text-[#FF5A1F]"
          : "border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#FF5A1F]/30"
      )}
    >
      {preset.emoji} {preset.label}
    </button>
  );
}

/** Re-export for convenience */
export { BUILT_IN_PRESETS };
