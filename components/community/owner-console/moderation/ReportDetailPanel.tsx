"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ACTION_LABELS,
  MODERATION_ACTIONS,
  RISK_LABELS,
  type ModerationAction,
  type OwnerModerationLogItem,
  type OwnerReportListItem,
} from "@/lib/community/owner-console/moderation";

export function ReportDetailPanel({
  report,
  history,
  canManage,
  onAction,
}: {
  report: OwnerReportListItem;
  history: OwnerModerationLogItem[];
  canManage: boolean;
  onAction: (action: string, extra?: Record<string, unknown>) => void;
}) {
  const [note, setNote] = useState(report.internalNote ?? "");
  const [reason, setReason] = useState("");

  const primary: ModerationAction[] = [
    "approve",
    "dismiss",
    "warn",
    "mute",
    "timeout",
    "suspend",
    "ban",
  ];
  const secondary: ModerationAction[] = [
    "delete_content",
    "restore_content",
    "escalate",
    "assign_moderator",
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-border)] px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-bold text-[var(--color-text-primary)]">
            {report.reason}
          </h2>
          <span className="rounded-md bg-[var(--color-surface-secondary)] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[var(--color-text-muted)]">
            {report.status}
          </span>
          <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">
            {RISK_LABELS[report.riskLevel]}
          </span>
        </div>
        <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
          {report.queue} · {report.targetType} ·{" "}
          {new Date(report.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="space-y-4 p-4">
        <dl className="grid gap-3 sm:grid-cols-2 text-[13px]">
          <Field label="Reporter" value={report.reporterName ?? report.reporterId.slice(0, 8)} />
          <Field
            label="Reported user"
            value={
              report.reportedUserName ??
              report.reportedUserId?.slice(0, 8) ??
              "—"
            }
          />
          <Field label="Risk level" value={RISK_LABELS[report.riskLevel]} />
          <Field
            label="AI classification"
            value={
              Object.keys(report.aiClassification).length
                ? JSON.stringify(report.aiClassification)
                : "Pending / none"
            }
          />
        </dl>

        <section>
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
            Content preview
          </h3>
          <p className="mt-1 rounded-xl bg-[var(--color-surface-secondary)] px-3 py-2.5 text-[13px] text-[var(--color-text-primary)]">
            {report.contentPreview || report.details || "No preview available"}
          </p>
          {report.contentDeletedAt && (
            <p className="mt-1 text-[11px] text-rose-600">
              Content marked deleted {new Date(report.contentDeletedAt).toLocaleString()}
            </p>
          )}
        </section>

        {report.evidence.length > 0 && (
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              Evidence
            </h3>
            <pre className="mt-1 overflow-auto rounded-xl bg-[var(--color-surface-secondary)] p-3 text-[11px]">
              {JSON.stringify(report.evidence, null, 2)}
            </pre>
          </section>
        )}

        {canManage && (
          <>
            <label className="block space-y-1 text-[12px] font-semibold">
              Action reason
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Optional reason for the action log"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {primary.map((a) => (
                <Button
                  key={a}
                  type="button"
                  size="sm"
                  variant={a === "ban" ? "destructive" : a === "dismiss" ? "outline" : "default"}
                  onClick={() => onAction(a, { reason: reason || null })}
                >
                  {ACTION_LABELS[a]}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {secondary.map((a) => (
                <Button
                  key={a}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onAction(a, { reason: reason || null })}
                >
                  {ACTION_LABELS[a]}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Internal note"
                className="min-w-[200px] flex-1"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onAction("add_note", { note })}
              >
                {ACTION_LABELS.add_note}
              </Button>
            </div>
          </>
        )}

        <section>
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
            History
          </h3>
          <ul className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)]">
            {history.length === 0 ? (
              <li className="px-3 py-6 text-center text-[12px] text-[var(--color-text-muted)]">
                No prior actions
              </li>
            ) : (
              history.map((h) => (
                <li key={h.id} className="px-3 py-2.5 text-[12px]">
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {h.action.replace(/_/g, " ")}
                  </span>
                  {h.reason ? ` · ${h.reason}` : ""}
                  <span className="mt-0.5 block text-[11px] text-[var(--color-text-muted)]">
                    {new Date(h.createdAt).toLocaleString()}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>

        {/* ensure catalog is referenced for future action menus */}
        <span className="sr-only">{MODERATION_ACTIONS.join(",")}</span>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-[var(--color-text-primary)]">{value}</dd>
    </div>
  );
}
