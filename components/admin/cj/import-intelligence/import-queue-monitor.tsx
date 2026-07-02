"use client";

import { cn } from "@/lib/utils";
import type { ImportQueueState } from "@/lib/cj/import-intelligence/publish-rules";
import {
  estimateEtaSeconds,
  formatEta,
  queueProgress,
} from "@/lib/cj/import-intelligence/publish-rules";

export function ImportQueueMonitor({
  queue,
  className,
}: {
  queue: ImportQueueState;
  className?: string;
}) {
  if (!queue.active) return null;

  const progress = queueProgress(queue);
  const eta = formatEta(estimateEtaSeconds(queue));
  const barFilled = Math.round(progress / 10);

  return (
    <div
      className={cn(
        "rounded-sm border border-[#FF5A1F]/30 bg-[#FF5A1F]/5 backdrop-blur-xl p-3 space-y-2",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">
            Importing: {queue.completed} / {queue.total}
          </p>
          {queue.currentName && (
            <p className="text-[10px] text-[var(--color-text-muted)] truncate max-w-[280px]">
              {queue.currentName}
            </p>
          )}
        </div>
        <p className="text-[11px] font-medium text-[#FF5A1F] tabular-nums">
          ETA: {eta}
        </p>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
          <span>Progress</span>
          <span className="tabular-nums font-semibold">{progress}%</span>
        </div>
        <div className="font-mono text-[11px] tracking-wider text-[#FF5A1F]">
          {"█".repeat(barFilled)}
          {"░".repeat(10 - barFilled)} {progress}%
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-[10px] tabular-nums">
        <span className="text-emerald-600">✓ {queue.succeeded} ok</span>
        <span className="text-rose-600">✗ {queue.failed} failed</span>
        <span className="text-[#FF5A1F]">↑ {queue.published} published</span>
        <span className="text-[var(--color-text-muted)]">📝 {queue.drafted} draft</span>
        {queue.skipped > 0 && (
          <span className="text-amber-600">⊘ {queue.skipped} skipped</span>
        )}
      </div>
    </div>
  );
}
