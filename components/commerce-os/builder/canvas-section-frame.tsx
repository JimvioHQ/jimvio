"use client";

import type { ReactNode } from "react";
import { humanSectionLabel } from "@/lib/commerce-os/builder/section-zones";

/** Preview-only selection chrome — does not affect production rendering. */
export function CanvasSectionFrame({
  sectionId,
  sectionType,
  selected,
  onSelect,
  children,
  showInsertBelow,
  onInsertBelow,
}: {
  sectionId: string;
  sectionType: string;
  selected: boolean;
  onSelect: (id: string) => void;
  children: ReactNode;
  showInsertBelow?: boolean;
  onInsertBelow?: () => void;
}) {
  return (
    <div className="relative">
      <div
        role="button"
        tabIndex={0}
        aria-label={`Edit ${humanSectionLabel(sectionType)}`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(sectionId);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(sectionId);
          }
        }}
        className={
          selected
            ? "relative outline outline-2 outline-[#2563EB] outline-offset-[-2px]"
            : "relative hover:outline hover:outline-1 hover:outline-[#93C5FD] hover:outline-offset-[-1px]"
        }
      >
        {selected ? (
          <span className="absolute left-0 top-0 z-10 rounded-br-md bg-[#2563EB] px-2 py-0.5 text-[10px] font-semibold capitalize text-white">
            {humanSectionLabel(sectionType)}
          </span>
        ) : null}
        <div className="pointer-events-none">{children}</div>
      </div>
      {showInsertBelow && onInsertBelow ? (
        <div className="group relative z-10 -my-1 flex h-4 items-center justify-center">
          <div className="absolute inset-x-8 h-px bg-transparent group-hover:bg-[#2563EB]/40" />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onInsertBelow();
            }}
            className="relative rounded-full bg-[#2563EB] px-2 py-0.5 text-[10px] font-bold text-white opacity-0 shadow group-hover:opacity-100"
            aria-label="Add section below"
          >
            +
          </button>
        </div>
      ) : null}
    </div>
  );
}
