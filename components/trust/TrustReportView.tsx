"use client";

import {
  AlertTriangle, BarChart3, Box, CheckCircle2, Clock3, ExternalLink,
  FileCheck2, ImageIcon, Info, Link2, RotateCcw, ShieldAlert,
  ShieldCheck, ShieldX, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CHECKER_LABELS, type CheckerId, type CheckerResult, type CheckerStatus,
  type FindingTone, type OverallLevel, type ScanReport,
} from "@/lib/trust/types";

const ICONS: Record<CheckerId, React.ComponentType<{ className?: string }>> = {
  links: Link2, engagement: BarChart3, product: Box, media: ImageIcon,
};

const LEVEL: Record<OverallLevel, {
  label: string; description: string; surface: string; accent: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  known_threat: { label: "Known threat detected", description: "A threat match was returned by an available source. Do not open, download or pay.", surface: "border-rose-200 bg-rose-50", accent: "text-rose-800", icon: ShieldX },
  high_risk: { label: "High risk", description: "Strong warning signals were found. Avoid interacting until the evidence has been reviewed.", surface: "border-rose-200 bg-rose-50", accent: "text-rose-800", icon: ShieldX },
  suspicious: { label: "Suspicious signals", description: "Some signals need attention. This is not, by itself, proof of malicious activity.", surface: "border-amber-200 bg-amber-50", accent: "text-amber-900", icon: ShieldAlert },
  low_risk: { label: "Low risk signals", description: "The checks completed did not return known threats or strong warnings. This is not a guarantee of safety.", surface: "border-emerald-200 bg-emerald-50", accent: "text-emerald-900", icon: ShieldCheck },
  inconclusive: { label: "Not enough evidence", description: "Jimvio could not gather enough evidence for a reliable assessment. Do not interpret missing data as safe.", surface: "border-slate-200 bg-slate-50", accent: "text-slate-800", icon: Info },
};

const STATUS: Record<CheckerStatus, { label: string; cls: string }> = {
  known_threat: { label: "Threat found", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
  high_risk: { label: "High risk", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
  suspicious: { label: "Suspicious", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
  evidence_found: { label: "Evidence found", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
  low_risk: { label: "Low risk", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  inconclusive: { label: "Inconclusive", cls: "bg-slate-100 text-slate-700 ring-slate-200" },
  unavailable: { label: "Unavailable", cls: "bg-slate-100 text-slate-600 ring-slate-200" },
  not_applicable: { label: "Not checked", cls: "bg-slate-50 text-slate-500 ring-slate-200" },
};

const TONE: Record<FindingTone, { cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  good: { cls: "text-emerald-700", icon: CheckCircle2 },
  info: { cls: "text-slate-600", icon: Info },
  warn: { cls: "text-amber-700", icon: AlertTriangle },
  bad: { cls: "text-rose-700", icon: XCircle },
};

function CheckerCard({ checker }: { checker: CheckerResult }) {
  const Icon = ICONS[checker.id];
  const status = STATUS[checker.status];
  const muted = checker.status === "unavailable";
  return (
    <article className={cn("min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.035)] sm:p-6", muted && "bg-slate-50/70")}>
      <div className="flex items-start gap-3">
        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", muted ? "bg-slate-100 text-slate-500" : "bg-orange-50 text-[#F15A24]")}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-extrabold text-slate-900">{CHECKER_LABELS[checker.id]}</h3>
            <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset", status.cls)}>{status.label}</span>
          </div>
          <p className="mt-1.5 text-xs leading-5 text-slate-600">{checker.summary}</p>
        </div>
      </div>

      {checker.metrics.length > 0 ? (
        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {checker.metrics.map((metric) => (
            <div key={metric.label} className="min-w-0 rounded-xl bg-slate-50 px-3 py-2.5">
              <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">{metric.label}</dt>
              <dd className="mt-1 break-words text-[13px] font-bold text-slate-900" title={metric.value}>{metric.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {checker.findings.length > 0 ? (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Key findings</h4>
          <ul className="mt-3 space-y-3">
            {checker.findings.map((finding, index) => {
              const tone = TONE[finding.tone];
              return (
                <li key={`${finding.source}-${finding.title}-${index}`} className="flex gap-2.5">
                  <tone.icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone.cls)} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className={cn("text-xs font-bold", finding.tone === "info" ? "text-slate-800" : tone.cls)}>{finding.title}</p>
                    {finding.detail ? <p className="mt-1 break-words text-xs leading-5 text-slate-600">{finding.detail}</p> : null}
                    <p className="mt-1 text-[10px] text-slate-400">Source: {finding.source}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {checker.nextSteps.length > 0 ? (
        <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50/60 p-3.5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#D94B16]">What to do next</p>
          <ul className="mt-2 space-y-1.5 pl-4 text-xs leading-5 text-slate-700 marker:text-[#FF5A1F]">
            {checker.nextSteps.map((step) => <li key={step} className="list-disc">{step}</li>)}
          </ul>
        </div>
      ) : null}

      {(checker.limits.length > 0 || checker.sources.length > 0) ? (
        <details className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <summary className="cursor-pointer font-semibold text-slate-600">Verification details and limitations</summary>
          {checker.limits.length > 0 ? <div className="mt-3"><p className="font-bold text-slate-700">Could not verify</p><ul className="mt-1 list-disc space-y-1 pl-4">{checker.limits.map((limit) => <li key={limit}>{limit}</li>)}</ul></div> : null}
          {checker.sources.length > 0 ? <p className="mt-3 leading-5"><span className="font-bold text-slate-700">Sources:</span> {checker.sources.join(" · ")}</p> : null}
        </details>
      ) : null}
    </article>
  );
}

export function TrustReportView({ report, onRunAnother }: { report: ScanReport; onRunAnother?: () => void }) {
  const level = LEVEL[report.overall.level];
  const LevelIcon = level.icon;
  const ran = report.checkers.filter((checker) => checker.status !== "not_applicable");
  const skipped = report.checkers.filter((checker) => checker.status === "not_applicable");
  const checkedAt = new Date(report.createdAt);
  const checkedAtLabel = Number.isNaN(checkedAt.getTime()) ? "Time unavailable" : checkedAt.toLocaleString();

  return (
    <section className="mt-8 space-y-5" aria-label="Trust check results">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#F15A24]">Trust report</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Scan result</h2>
        </div>
        {onRunAnother ? <button type="button" onClick={onRunAnother} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50"><RotateCcw className="h-4 w-4" /> New scan</button> : null}
      </div>

      <div className={cn("rounded-2xl border p-5 sm:p-7", level.surface)}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white shadow-sm"><LevelIcon className={cn("h-6 w-6", level.accent)} /></span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">Overall assessment</p>
              <h3 className={cn("mt-1 text-2xl font-black tracking-tight sm:text-[28px]", level.accent)}>{level.label}</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">{report.overall.headline}</p>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600">{level.description}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:w-[210px]">
            <div className="rounded-xl border border-white/80 bg-white/80 p-3"><p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Checks run</p><p className="mt-1 text-xl font-black text-slate-900">{ran.length}</p></div>
            <div className="rounded-xl border border-white/80 bg-white/80 p-3"><p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Duration</p><p className="mt-1 text-xl font-black text-slate-900">{Number.isFinite(report.durationMs) ? `${(report.durationMs / 1000).toFixed(1)}s` : "—"}</p></div>
            <div className="col-span-2 rounded-xl bg-white/70 px-3 py-2.5"><p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-500"><Clock3 className="h-3 w-3" /> Checked</p><p className="mt-1 text-xs font-semibold text-slate-800">{checkedAtLabel}</p></div>
          </div>
        </div>
      </div>

      {(report.input.url || report.input.file) ? (
        <div className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-[#F15A24]" />
          <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Checked item</p>
            {report.input.url ? (() => {
              let safeHref: string | null = null;
              try { const parsed = new URL(report.input.url!); if (parsed.protocol === "http:" || parsed.protocol === "https:") safeHref = parsed.toString(); } catch { /* Keep malformed input as plain text. */ }
              return safeHref ? <a href={safeHref} target="_blank" rel="noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 break-all text-xs font-semibold text-slate-800 underline decoration-orange-200 underline-offset-2 hover:text-[#E84B16]">{report.input.url} <ExternalLink className="h-3 w-3 shrink-0" /></a> : <p className="mt-1 break-all text-xs font-semibold text-slate-800">{report.input.url}</p>;
            })() : null}
            {report.input.file ? <p className="mt-1 break-words text-xs font-semibold text-slate-800">{report.input.file.name} <span className="font-normal text-slate-500">· {report.input.file.type} · {report.input.file.size.toLocaleString()} bytes</span></p> : null}
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3"><h3 className="text-base font-extrabold text-slate-900">Verification findings</h3><span className="text-[11px] font-medium text-slate-500">{ran.length} applicable {ran.length === 1 ? "check" : "checks"}</span></div>
      <div className="grid gap-4 xl:grid-cols-2">{ran.map((checker) => <CheckerCard key={checker.id} checker={checker} />)}</div>

      {skipped.length > 0 ? (
        <details className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
          <summary className="cursor-pointer font-semibold text-slate-700">Checks not applicable to this item ({skipped.length})</summary>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {skipped.map((checker) => { const Icon = ICONS[checker.id]; return <li key={checker.id} className="flex gap-2 rounded-lg bg-slate-50 p-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><span><strong className="text-slate-700">{CHECKER_LABELS[checker.id]}</strong><span className="mt-0.5 block leading-5">{checker.summary}</span></span></li>; })}
          </ul>
        </details>
      ) : null}
      <p className="text-center text-[11px] leading-5 text-slate-400">This assessment reflects evidence available at scan time. Low risk does not guarantee safety.</p>
    </section>
  );
}
