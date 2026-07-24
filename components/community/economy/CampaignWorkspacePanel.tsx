"use client";

import { cn } from "@/lib/utils";
import type { CampaignWorkspace, CreatorOpportunity } from "@/lib/community/economy";

export function CampaignWorkspacePanel({
  opportunity,
  workspace,
  onApprove,
  onRequestChanges,
  onReleasePayout,
  className,
}: {
  opportunity: CreatorOpportunity | null;
  workspace: CampaignWorkspace | null;
  onApprove?: () => void;
  onRequestChanges?: () => void;
  onReleasePayout?: () => void;
  className?: string;
}) {
  if (!opportunity || !workspace) {
    return (
      <section
        className={cn(
          "rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-4",
          className
        )}
      >
        <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          Campaign workspace
        </h3>
        <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">
          Open an opportunity workspace to manage tasks, deliverables, approval, and payouts.
        </p>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5",
        className
      )}
      aria-label="Campaign workspace"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            Campaign workspace
          </h3>
          <p className="mt-1 text-[14px] font-bold text-[var(--color-text-primary)]">
            {opportunity.title}
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Status {workspace.status} · Approval {workspace.approval} · Payout{" "}
            {workspace.payoutStatus}
          </p>
        </div>
        <div className="min-w-[120px]">
          <p className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">
            Progress
          </p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
            <div
              className="h-full rounded-full bg-[var(--color-accent)]"
              style={{ width: `${workspace.progress}%` }}
            />
          </div>
          <p className="mt-0.5 text-[11px] font-semibold">{workspace.progress}%</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {(
          [
            ["Overview", [opportunity.reward, `Due ${opportunity.deadline}`, opportunity.brand ?? ""]],
            ["Tasks", workspace.tasks],
            ["Deliverables", workspace.deliverables],
            ["Timeline", workspace.timeline],
            ["Files", workspace.files],
            ["Messages", workspace.messages],
            ["Feedback", workspace.feedback.length ? workspace.feedback : ["No feedback yet"]],
          ] as const
        ).map(([label, rows]) => (
          <div
            key={label}
            className="rounded-xl border border-[var(--color-border)] px-3 py-2.5"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              {label}
            </p>
            <ul className="mt-1 space-y-0.5">
              {rows.filter(Boolean).map((row) => (
                <li
                  key={row}
                  className="truncate text-[12px] text-[var(--color-text-secondary)]"
                >
                  · {row}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onApprove}
          className="rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white"
        >
          Approve work
        </button>
        <button
          type="button"
          onClick={onRequestChanges}
          className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-secondary)]"
        >
          Request changes
        </button>
        <button
          type="button"
          onClick={onReleasePayout}
          className="rounded-full bg-[var(--color-accent)] px-3 py-1.5 text-[11px] font-semibold text-white"
        >
          Release payout
        </button>
      </div>
    </section>
  );
}
