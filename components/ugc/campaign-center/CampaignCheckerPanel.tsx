"use client";

import { useCallback, useState } from "react";
import { Loader2, RefreshCw, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CampaignActivationReport,
  CheckerFinding,
  CheckerSeverity,
} from "@/lib/ugc/campaign-activation-checker";

const SEVERITY_STYLES: Record<
  CheckerSeverity,
  { wrap: string; label: string; Icon: typeof ShieldCheck }
> = {
  passed: {
    wrap: "border-emerald-200 bg-emerald-50 text-emerald-800",
    label: "Passed",
    Icon: ShieldCheck,
  },
  warning: {
    wrap: "border-amber-200 bg-amber-50 text-amber-900",
    label: "Warning",
    Icon: ShieldQuestion,
  },
  failed: {
    wrap: "border-rose-200 bg-rose-50 text-rose-900",
    label: "Failed",
    Icon: ShieldAlert,
  },
  needs_review: {
    wrap: "border-violet-200 bg-violet-50 text-violet-900",
    label: "Needs review",
    Icon: ShieldQuestion,
  },
};

export function CampaignCheckerPanel({
  campaignId,
  initial,
  className,
}: {
  campaignId: string;
  initial?: CampaignActivationReport | null;
  className?: string;
}) {
  const [report, setReport] = useState<CampaignActivationReport | null>(initial ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recheck = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ugc/campaigns/${campaignId}/checker`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Checker failed");
        return;
      }
      setReport(json.report as CampaignActivationReport);
    } catch {
      setError("Could not reach the campaign checker.");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const status = report?.status ?? "warning";
  const meta = SEVERITY_STYLES[status];
  const Icon = meta.Icon;

  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Automatic campaign checker</h3>
          <p className="mt-0.5 text-[12px] text-slate-500">
            Completeness, funding minimum ($100 USD), escrow, and safety checks. Trust scores are
            separate from verification badges.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void recheck()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Recheck
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

      {!report && !loading ? (
        <button
          type="button"
          onClick={() => void recheck()}
          className="mt-4 text-sm font-medium text-[#1D9BF0] hover:underline"
        >
          Run first check
        </button>
      ) : null}

      {report ? (
        <div className="mt-4 space-y-3">
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-semibold",
              meta.wrap,
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {meta.label}
            <span className="font-normal opacity-80">
              · {report.summary.passed} passed · {report.summary.warnings} warnings ·{" "}
              {report.summary.failed} failed
            </span>
          </div>
          <p className="text-[12px] text-slate-600">
            {report.canActivate
              ? "Ready to activate — funding confirmed and mandatory checks passed."
              : report.canFund
                ? "Ready to fund. Activation waits for confirmed escrow covering the full budget."
                : "Fix failed items before funding or activation."}
          </p>
          <ul className="space-y-2">
            {report.findings.map((f) => (
              <FindingRow key={f.id} finding={f} />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function FindingRow({ finding }: { finding: CheckerFinding }) {
  const meta = SEVERITY_STYLES[finding.severity];
  return (
    <li className={cn("rounded-xl border px-3 py-2.5", meta.wrap)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide">{meta.label}</span>
        <span className="text-[10px] uppercase tracking-wide opacity-70">{finding.category}</span>
      </div>
      <p className="mt-1 text-sm font-semibold">{finding.title}</p>
      <p className="mt-0.5 text-[12px] opacity-90">{finding.reason}</p>
      {finding.severity !== "passed" ? (
        <p className="mt-1 text-[12px] font-medium">Fix: {finding.fix}</p>
      ) : null}
    </li>
  );
}
