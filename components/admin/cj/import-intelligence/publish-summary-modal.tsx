"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublishSummary } from "@/lib/cj/import-intelligence/publish-rules";

export function PublishSummaryModal({
  summary,
  onClose,
  className,
}: {
  summary: PublishSummary;
  onClose: () => void;
  className?: string;
}) {
  const reasonEntries = Object.entries(summary.skipReasons);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2",
          "rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl p-5",
          className
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-bold text-[var(--color-text-primary)]">
            Operation Complete
          </h3>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-sm hover:bg-[var(--color-surface-secondary)] inline-flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <dl className="space-y-3 text-[13px]">
          <SummaryRow label="Published" value={summary.published} accent />
          <SummaryRow label="Imported as Draft" value={summary.drafted} />
          <SummaryRow label="Skipped" value={summary.skipped} muted />
        </dl>

        {reasonEntries.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
              Skip Reasons
            </p>
            <ul className="space-y-1">
              {reasonEntries.map(([reason, count]) => (
                <li key={reason} className="flex justify-between text-[11px] text-[var(--color-text-secondary)]">
                  <span>{reason}</span>
                  <span className="tabular-nums font-medium">{count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full h-10 rounded-sm bg-[#111827] dark:bg-[var(--color-accent)] text-white text-[13px] font-semibold"
        >
          Done
        </button>
      </div>
    </>
  );
}

function SummaryRow({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: number;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className={cn("text-[var(--color-text-muted)]", muted && "opacity-70")}>{label}</dt>
      <dd className={cn("text-xl font-bold tabular-nums", accent && "text-[var(--color-accent)]")}>{value}</dd>
    </div>
  );
}

export function PublishSafetyDialog({
  open,
  qualifiedCount,
  unqualifiedCount,
  onPublishQualified,
  onDraftUnqualified,
  onCancel,
}: {
  open: boolean;
  qualifiedCount: number;
  unqualifiedCount: number;
  onPublishQualified: () => void;
  onDraftUnqualified: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onCancel} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-sm border border-amber-200 bg-[var(--color-surface)] shadow-2xl p-5">
        <h3 className="text-[14px] font-bold text-amber-800 dark:text-amber-400">
          Publishing Standards Warning
        </h3>
        <p className="mt-2 text-[12px] text-[var(--color-text-secondary)]">
          {unqualifiedCount} product{unqualifiedCount === 1 ? "" : "s"} do not meet publishing standards
          (health ≥80, images, description, stock, shipping).
        </p>
        <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
          {qualifiedCount} qualified · {unqualifiedCount} need review
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={onPublishQualified}
            disabled={qualifiedCount === 0}
            className="h-10 rounded-sm bg-[var(--color-accent)] text-white text-[12px] font-semibold disabled:opacity-50"
          >
            Publish qualified products only ({qualifiedCount})
          </button>
          <button
            type="button"
            onClick={onDraftUnqualified}
            className="h-10 rounded-sm border border-[var(--color-border)] text-[12px] font-medium"
          >
            Import all — low-quality as draft
          </button>
          <button type="button" onClick={onCancel} className="h-8 text-[11px] text-[var(--color-text-muted)]">
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
