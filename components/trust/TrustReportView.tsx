"use client";

import {
  AlertTriangle,
  BarChart3,
  Box,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileCheck2,
  ImageIcon,
  Info,
  Link2,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CHECKER_LABELS,
  type CheckerId,
  type CheckerResult,
  type CheckerStatus,
  type FindingTone,
  type OverallLevel,
  type ScanReport,
} from "@/lib/trust/types";

const ICONS: Record<CheckerId, React.ComponentType<{ className?: string }>> = {
  links: Link2,
  engagement: BarChart3,
  product: Box,
  media: ImageIcon,
};

const LEVEL: Record<OverallLevel, {
  label: string;
  description: string;
  cls: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  known_threat: {
    label: "Known threat detected",
    description: "A threat match was returned by an available source. Do not open, download or pay.",
    cls: "border-rose-200 bg-rose-50 text-rose-950",
    icon: ShieldX,
  },
  high_risk: {
    label: "High risk",
    description: "The scan returned strong warning signals. Review the evidence before taking action.",
    cls: "border-rose-200 bg-rose-50 text-rose-950",
    icon: ShieldX,
  },
  suspicious: {
    label: "Suspicious signals found",
    description: "Some evidence needs attention. This is not a definitive finding of malicious activity.",
    cls: "border-amber-200 bg-amber-50 text-amber-950",
    icon: ShieldAlert,
  },
  low_risk: {
    label: "Low risk signals",
    description: "The checks that ran did not return known threats or strong warnings. This is not a guarantee of safety.",
    cls: "border-emerald-200 bg-emerald-50 text-emerald-950",
    icon: ShieldCheck,
  },
  inconclusive: {
    label: "Inconclusive",
    description: "There was not enough evidence to reach a reliable assessment. Do not treat missing data as a clean result.",
    cls: "border-slate-200 bg-slate-50 text-slate-900",
    icon: Info,
  },
};

const STATUS: Record<CheckerStatus, { label: string; cls: string }> = {
  known_threat: { label: "Known threat", cls: "bg-rose-100 text-rose-800 ring-rose-200" },
  high_risk: { label: "High risk", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
  suspicious: { label: "Suspicious", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
  evidence_found: { label: "Evidence found", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
  low_risk: { label: "Low risk", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  inconclusive: { label: "Inconclusive", cls: "bg-slate-100 text-slate-700 ring-slate-200" },
  unavailable: { label: "Unavailable", cls: "bg-slate-100 text-slate-600 ring-slate-200" },
  not_applicable: { label: "Not checked", cls: "bg-slate-50 text-slate-500 ring-slate-200" },
};

const TONE: Record<FindingTone, {
  cls: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  good: { cls: "text-emerald-700", icon: CheckCircle2 },
  info: { cls: "text-slate-600", icon: Info },
  warn: { cls: "text-amber-700", icon: AlertTriangle },
  bad: { cls: "text-rose-700", icon: XCircle },
};

function CheckerCard({ checker }: { checker: CheckerResult }) {
  const Icon = ICONS[checker.id];
  const status = STATUS[checker.status];
  const notRun = checker.status === "not_applicable" || checker.status === "unavailable";

  return (
    <article className={cn(
      "min-w-0 rounded-[22px] border bg-white p-5 sm:p-6",
      notRun ? "border-dashed border-[#DCE3ED]" : "border-[#E8EAF0] shadow-[0_8px_28px_rgba(15,23,42,0.045)]",
    )}>
      <div className="flex items-start gap-3">
        <span className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
          notRun ? "bg-slate-100 text-slate-500" : "bg-[#FFF0E8] text-[#F0521A]",
        )}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-extrabold leading-snug text-[#101B38]">{CHECKER_LABELS[checker.id]}</h3>
            <span className={cn("rounded-full px-2.5 py-1 text-[10.5px] font-bold ring-1 ring-inset", status.cls)}>{status.label}</span>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-[#596780]">{checker.summary}</p>
        </div>
      </div>

      {checker.metrics.length > 0 ? (
        <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {checker.metrics.map((metric) => (
            <div key={metric.label} className="min-w-0 rounded-xl border border-[#E9EDF3] bg-[#F8FAFC] px-3 py-2.5">
              <dt className="text-[10px] font-extrabold uppercase tracking-[0.09em] text-[#8490A4]">{metric.label}</dt>
              <dd className="mt-1 break-words text-[13px] font-bold text-[#182541]" title={metric.value}>{metric.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {checker.findings.length > 0 ? (
        <div className="mt-5">
          <h4 className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#8A95A8]">Evidence & findings</h4>
          <ul className="mt-3 space-y-3">
            {checker.findings.map((finding, index) => {
              const tone = TONE[finding.tone];
              return (
                <li key={`${finding.source}-${finding.title}-${index}`} className="flex gap-2.5">
                  <tone.icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone.cls)} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className={cn("text-[13px] font-bold", finding.tone === "info" ? "text-[#1D2943]" : tone.cls)}>{finding.title}</p>
                    {finding.detail ? <p className="mt-0.5 break-words text-[12px] leading-relaxed text-[#64748B]">{finding.detail}</p> : null}
                    <p className="mt-1 text-[10.5px] font-semibold text-[#98A2B3]">Evidence source: {finding.source}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {checker.nextSteps.length > 0 ? (
        <div className="mt-5 rounded-xl border border-[#FFE1D2] bg-[#FFFAF7] p-3.5">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-[#E84B16]">Recommended next steps</p>
          <ul className="mt-2 space-y-1.5 pl-4 text-[12px] leading-relaxed text-[#71391F] marker:text-[#FF5A1F]">
            {checker.nextSteps.map((step) => <li key={step} className="list-disc">{step}</li>)}
          </ul>
        </div>
      ) : null}

      {checker.limits.length > 0 ? (
        <details className="mt-4 rounded-xl border border-[#E9EDF3] bg-[#FAFBFD] px-3.5 py-3 text-[12px] text-[#64748B]">
          <summary className="cursor-pointer font-bold text-[#47546C]">What this check could not verify</summary>
          <ul className="mt-2 space-y-1 pl-4">
            {checker.limits.map((limit) => <li key={limit} className="list-disc leading-relaxed">{limit}</li>)}
          </ul>
        </details>
      ) : null}

      {checker.sources.length > 0 ? (
        <p className="mt-4 border-t border-[#F0F2F5] pt-3 text-[10.5px] leading-relaxed text-[#98A2B3]">
          Data sources: {checker.sources.join(" · ")}
        </p>
      ) : null}
    </article>
  );
}

export function TrustReportView({
  report,
  onRunAnother,
}: {
  report: ScanReport;
  onRunAnother?: () => void;
}) {
  const level = LEVEL[report.overall.level];
  const LevelIcon = level.icon;
  const ran = report.checkers.filter((checker) => checker.status !== "not_applicable");
  const skipped = report.checkers.filter((checker) => checker.status === "not_applicable");
  const checkedAt = new Date(report.createdAt);
  const checkedAtLabel = Number.isNaN(checkedAt.getTime()) ? "Time unavailable" : checkedAt.toLocaleString();

  return (
    <section className="mt-8 space-y-5" aria-label="Trust check results">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#F0521A]">Verification report</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-[#101B38] sm:text-[30px]">Your scan results</h2>
        </div>
        {onRunAnother ? (
          <button type="button" onClick={onRunAnother} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E0E5ED] bg-white px-4 text-xs font-bold text-[#34415B] shadow-sm transition hover:border-[#FFC5A9] hover:bg-[#FFFAF7]">
            <RotateCcw className="h-4 w-4" /> Run another check
          </button>
        ) : null}
      </div>

      <div className={cn("overflow-hidden rounded-[24px] border p-5 sm:p-7", level.cls)}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/80 shadow-sm">
              <LevelIcon className="h-7 w-7" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] opacity-70">Overall assessment</p>
              <h3 className="mt-1 text-[23px] font-black leading-tight tracking-tight sm:text-[30px]">{level.label}</h3>
              <p className="mt-2 max-w-3xl text-[13px] leading-relaxed opacity-85">{report.overall.headline}</p>
              <p className="mt-2 max-w-3xl text-[11px] leading-relaxed opacity-75">{level.description}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:min-w-[270px]">
            <div className="rounded-xl bg-white/70 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-65">Checks run</p>
              <p className="mt-1 text-xl font-black">{ran.length}</p>
            </div>
            <div className="rounded-xl bg-white/70 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-65">Duration</p>
              <p className="mt-1 text-xl font-black">{Number.isFinite(report.durationMs) ? `${(report.durationMs / 1000).toFixed(1)}s` : "—"}</p>
            </div>
            <div className="col-span-2 rounded-xl bg-white/70 p-3">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide opacity-65"><Clock3 className="h-3 w-3" /> Scanned</p>
              <p className="mt-1 text-xs font-bold">{checkedAtLabel}</p>
              <p className="mt-1 break-all font-mono text-[10px] opacity-70">Scan ID: {report.id}</p>
            </div>
          </div>
        </div>
      </div>

      {(report.input.url || report.input.file) ? (
        <div className="rounded-2xl border border-[#E5E9F0] bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#8490A4]"><FileCheck2 className="h-4 w-4 text-[#FF5A1F]" /> Submitted for verification</p>
          <div className="mt-2 space-y-2 text-[13px] text-[#24314D]">
            {report.input.url ? (
              <p className="flex min-w-0 items-start gap-2">
                <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-[#FF5A1F]" />
                {(() => {
                  let safeHref: string | null = null;
                  try {
                    const parsed = new URL(report.input.url!);
                    if (parsed.protocol === "http:" || parsed.protocol === "https:") safeHref = parsed.toString();
                  } catch { /* Keep malformed input as plain text; never make it clickable. */ }
                  return safeHref ? (
                    <a href={safeHref} target="_blank" rel="noreferrer" className="min-w-0 break-all font-semibold underline decoration-[#F8B99C] underline-offset-2 hover:text-[#E84B16]">
                      {report.input.url} <ExternalLink className="inline h-3 w-3" />
                    </a>
                  ) : <span className="min-w-0 break-all font-semibold text-[#53627E]">{report.input.url}</span>;
                })()}
              </p>
            ) : null}
            {report.input.file ? (
              <p className="flex min-w-0 items-start gap-2">
                <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-[#FF5A1F]" />
                <span className="min-w-0 break-words font-semibold">{report.input.file.name} <span className="font-normal text-[#8490A4]">· {report.input.file.type} · {report.input.file.size.toLocaleString()} bytes</span></span>
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {ran.map((checker) => <CheckerCard key={checker.id} checker={checker} />)}
      </div>

      {skipped.length > 0 ? (
        <div className="rounded-2xl border border-dashed border-[#DCE3ED] bg-[#F9FAFC] p-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#8490A4]">Not applicable to this input</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {skipped.map((checker) => {
              const Icon = ICONS[checker.id];
              return (
                <div key={checker.id} className="flex min-w-0 gap-2.5 rounded-xl bg-white p-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#98A2B3]" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#46536C]">{CHECKER_LABELS[checker.id]}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#8490A4]">{checker.summary}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      <p className="text-center text-[11px] leading-relaxed text-[#8A95A8]">
        This report reflects the evidence and provider responses available at scan time. A low-risk or inconclusive result is not a guarantee of safety.
      </p>
    </section>
  );
}
