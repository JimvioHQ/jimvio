"use client";

import { useMemo, useState } from "react";
import {
  BUILDER_SECTION_CATALOG,
  type SectionType,
} from "@/lib/commerce-os/themes/registry";

const GROUP_LABELS: Record<string, string> = {
  core: "Layout & hero",
  commerce: "Products & promotions",
  trust: "Trust & conversion",
  content: "Content & forms",
};

export function SectionPickerModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (type: SectionType) => void;
}) {
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const query = q.trim().toLowerCase();
    const items = BUILDER_SECTION_CATALOG.filter(
      (c) => c.type !== "header" && c.type !== "footer"
    ).filter((c) => {
      if (!query) return true;
      return (
        c.label.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        c.group.includes(query)
      );
    });
    const map = new Map<string, typeof items>();
    for (const item of items) {
      const list = map.get(item.group) || [];
      list.push(item);
      map.set(item.group, list);
    }
    return Array.from(map.entries());
  }, [q]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Add section"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-xl overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-[#111827]">Add section</p>
            <p className="text-[11px] text-[#6B7280]">
              Choose a storefront block. Settings appear after you add it.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-xs font-semibold text-[#6B7280] hover:bg-[#F3F4F6]"
          >
            Close
          </button>
        </div>
        <div className="border-b border-[#E5E7EB] px-4 py-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search sections…"
            className="h-9 w-full rounded-lg border border-[#E5E7EB] px-3 text-sm"
            autoFocus
          />
        </div>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto p-4">
          {groups.length === 0 ? (
            <p className="text-sm text-[#6B7280]">No sections match your search.</p>
          ) : (
            groups.map(([group, items]) => (
              <div key={group}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                  {GROUP_LABELS[group] || group}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {items.map((c) => (
                    <button
                      key={c.type}
                      type="button"
                      onClick={() => {
                        onPick(c.type);
                        onClose();
                      }}
                      className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3 text-left transition hover:border-[#FF5A1F]/50 hover:bg-white"
                    >
                      <span className="block text-xs font-semibold text-[#111827]">
                        {c.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-[#6B7280]">
                        {c.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
