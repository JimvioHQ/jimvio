"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  RISK_LABELS,
  type OwnerReportListItem,
} from "@/lib/community/owner-console/moderation";

const RISK_TONE: Record<string, string> = {
  low: "bg-slate-500/10 text-slate-700",
  medium: "bg-amber-500/10 text-amber-700",
  high: "bg-orange-500/10 text-orange-700",
  critical: "bg-rose-500/10 text-rose-700",
};

export function ModerationQueue({
  reports,
  selectedId,
  selectedIds,
  onSelect,
  onToggle,
}: {
  reports: OwnerReportListItem[];
  selectedId: string | null;
  selectedIds: string[];
  onSelect: (report: OwnerReportListItem) => void;
  onToggle: (id: string) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: reports.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 76,
    overscan: 8,
  });

  if (reports.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-12 text-center">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
          Queue is clear
        </p>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          No items match the current filters.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-[min(70vh,640px)] overflow-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
    >
      <div
        style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const report = reports[virtualRow.index];
          const selected = report.id === selectedId;
          const checked = selectedIds.includes(report.id);
          return (
            <div
              key={report.id}
              className={`absolute left-0 top-0 flex w-full items-start gap-3 border-b border-[var(--color-border)] px-4 py-3 ${
                selected ? "bg-[var(--color-surface-secondary)]" : ""
              }`}
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <input
                type="checkbox"
                className="mt-1.5"
                checked={checked}
                onChange={() => onToggle(report.id)}
                aria-label={`Select report ${report.id}`}
              />
              <button
                type="button"
                onClick={() => onSelect(report)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {report.reason}
                  </span>
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      RISK_TONE[report.riskLevel] ?? RISK_TONE.medium
                    }`}
                  >
                    {RISK_LABELS[report.riskLevel]}
                  </span>
                  <span className="rounded-md bg-[var(--color-surface-secondary)] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[var(--color-text-muted)]">
                    {report.targetType}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[12px] text-[var(--color-text-muted)]">
                  {report.contentPreview ||
                    report.details ||
                    `${report.reporterName ?? "Reporter"} → ${report.reportedUserName ?? "Unknown"}`}
                </p>
              </button>
              <time className="shrink-0 text-[11px] text-[var(--color-text-muted)]">
                {new Date(report.createdAt).toLocaleDateString()}
              </time>
            </div>
          );
        })}
      </div>
    </div>
  );
}
