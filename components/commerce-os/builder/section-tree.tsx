"use client";

import { useState } from "react";
import {
  groupSectionsByZone,
  humanSectionLabel,
  SECTION_ZONES,
} from "@/lib/commerce-os/builder/section-zones";
import type { ThemeSection } from "@/lib/commerce-os/themes/registry";

export function SectionTree({
  sections,
  selectedId,
  onSelect,
  onMove,
  onToggle,
  onDuplicate,
  onRemove,
  onAddInZone,
}: {
  sections: ThemeSection[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (index: number, dir: -1 | 1) => void;
  onToggle: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  onAddInZone: (zone: "header" | "template" | "footer") => void;
}) {
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const grouped = groupSectionsByZone(sections);
  const q = query.trim().toLowerCase();

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="sr-only">Search sections</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sections"
          className="h-8 w-full rounded-md border border-[#E5E7EB] px-2 text-xs"
        />
      </label>
      {SECTION_ZONES.map((zone) => {
        const rows = grouped[zone.id].filter(({ section: s }) =>
          q ? humanSectionLabel(s.type).toLowerCase().includes(q) : true
        );
        return (
          <div key={zone.id}>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                {zone.label}
              </p>
              {zone.id === "template" || zone.id === "header" ? (
                <button
                  type="button"
                  onClick={() => onAddInZone(zone.id)}
                  className="text-[11px] font-semibold text-[#2563EB] hover:underline"
                >
                  + Add section
                </button>
              ) : null}
            </div>
            <div className="space-y-1">
              {grouped[zone.id].length === 0 ? (
                <p className="rounded-lg border border-dashed border-[#E5E7EB] px-2 py-3 text-[11px] text-[#9CA3AF]">
                  No sections in {zone.label.toLowerCase()}
                </p>
              ) : rows.length === 0 ? (
                <p className="px-2 py-2 text-[11px] text-[#9CA3AF]">No matches</p>
              ) : (
                rows.map(({ section: s, index: i }) => (
                  <div
                    key={s.id}
                    className={
                      selectedId === s.id
                        ? "rounded-lg border border-[#2563EB]/40 bg-[#EFF6FF] p-2"
                        : "rounded-lg border border-[#E5E7EB] bg-white p-2 hover:border-[#D1D5DB]"
                    }
                  >
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 text-left"
                      onClick={() => onSelect(s.id)}
                    >
                      <span className="text-[#D1D5DB]" aria-hidden>
                        ⋮⋮
                      </span>
                      <span
                        className={
                          s.enabled
                            ? "text-xs font-semibold capitalize text-[#111827]"
                            : "text-xs font-semibold capitalize text-[#9CA3AF] line-through"
                        }
                      >
                        {humanSectionLabel(s.type)}
                      </span>
                    </button>
                    <div className="mt-1.5 flex flex-wrap gap-1 pl-5">
                      <button
                        type="button"
                        className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-[#6B7280] hover:bg-[#F3F4F6]"
                        onClick={() => onMove(i, -1)}
                        aria-label="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-[#6B7280] hover:bg-[#F3F4F6]"
                        onClick={() => onMove(i, 1)}
                        aria-label="Move down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-[#6B7280] hover:bg-[#F3F4F6]"
                        onClick={() => onToggle(s.id)}
                      >
                        {s.enabled ? "Hide" : "Show"}
                      </button>
                      <button
                        type="button"
                        className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-[#6B7280] hover:bg-[#F3F4F6]"
                        onClick={() => onDuplicate(s.id)}
                      >
                        Duplicate
                      </button>
                      {s.type !== "header" && s.type !== "footer" ? (
                        pendingDelete === s.id ? (
                          <span className="flex items-center gap-1">
                            <button
                              type="button"
                              className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-red-700 hover:bg-red-50"
                              onClick={() => {
                                onRemove(s.id);
                                setPendingDelete(null);
                              }}
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-[#6B7280]"
                              onClick={() => setPendingDelete(null)}
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-50"
                            onClick={() => setPendingDelete(s.id)}
                          >
                            Delete
                          </button>
                        )
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
