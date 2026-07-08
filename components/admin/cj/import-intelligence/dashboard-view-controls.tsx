"use client";

import { LayoutGrid, PanelTop } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  applyProductsOnlyMode,
  applyShowDashboardMode,
  type CjDashboardLayoutPrefs,
} from "@/lib/cj/import-intelligence/dashboard-layout-prefs";

export function DashboardViewControls({
  prefs,
  onChange,
  className,
}: {
  prefs: CjDashboardLayoutPrefs;
  onChange: (prefs: CjDashboardLayoutPrefs) => void;
  className?: string;
}) {
  const toggle = (key: keyof CjDashboardLayoutPrefs) => {
    if (key === "productsOnly") return;
    onChange({ ...prefs, [key]: !prefs[key], productsOnly: false });
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 rounded-[12px] border border-[#E5E7EB] bg-white px-2 py-1.5",
        className
      )}
    >
      <span className="mr-1 text-[10px] font-medium text-[#9CA3AF]">View</span>
      {(
        [
          ["hideIntelligenceMonitor", "Hide Intelligence Monitor"],
          ["hideJimvioIntelligence", "Hide Jimvio Intelligence"],
          ["hideFilters", "Hide Filters"],
          ["hideAutoPublishAnalytics", "Hide Auto Publish Analytics"],
          ["hideCatalogHealth", "Hide Catalog Health"],
        ] as const
      ).map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => toggle(key)}
          className={cn(
            "rounded-full border px-2 py-0.5 text-[9px] font-medium transition-colors",
            prefs[key]
              ? "border-[#FF5A1F] bg-[#FFF7F3] text-[#FF5A1F]"
              : "border-[#E5E7EB] text-[#6B7280] hover:border-[#FF5A1F]/40"
          )}
        >
          {label}
        </button>
      ))}
      <span className="mx-1 h-4 w-px bg-[#E5E7EB]" />
      <button
        type="button"
        onClick={() => onChange(applyProductsOnlyMode())}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[9px] font-semibold",
          prefs.productsOnly
            ? "border-[#FF5A1F] bg-[#FF5A1F] text-white"
            : "border-[#E5E7EB] text-[#374151] hover:border-[#FF5A1F]/40"
        )}
      >
        <LayoutGrid className="h-3 w-3" />
        Products Only
      </button>
      <button
        type="button"
        onClick={() => onChange(applyShowDashboardMode())}
        className="inline-flex items-center gap-1 rounded-full border border-[#E5E7EB] px-2.5 py-0.5 text-[9px] font-medium text-[#374151] hover:border-[#FF5A1F]/40"
      >
        <PanelTop className="h-3 w-3" />
        Show Dashboard
      </button>
    </div>
  );
}
