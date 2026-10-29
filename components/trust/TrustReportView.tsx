"use client";

import { AlertTriangle, BarChart3, Box, CheckCircle2, ImageIcon, Info, Link2, ShieldAlert, ShieldCheck, ShieldX, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHECKER_LABELS, type CheckerId, type CheckerResult, type CheckerStatus, type FindingTone, type OverallLevel, type ScanReport } from "@/lib/trust/types";

const ICONS: Record<CheckerId, React.ComponentType<{ className?: string }>> = { links: Link2, engagement: BarChart3, product: Box, media: ImageIcon };

const LEVEL: Record<OverallLevel, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  known_threat: { label: "Known Threat Detected", cls: "bg-[#B91C1C] text-white", icon: ShieldX },
  high_risk: { label: "High Risk", cls: "bg-[#DC2626] text-white", icon: ShieldX },
  suspicious: { label: "Suspicious", cls: "bg-[#F59E0B] text-white", icon: ShieldAlert },
  low_risk: { label: "Low Risk", cls: "bg-[#059669] text-white", icon: ShieldCheck },
  inconclusive: { label: "Inconclusive", cls: "bg-[#475569] text-white", icon: Info },
};

const STATUS: Record<CheckerStatus, { label: string; cls: string }> = {
  known_threat: { label: "Known Threat Detected", cls: "bg-rose-100 text-rose-800 ring-rose-200" },
  high_risk: { label: "High Risk", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
  suspicious: { label: "Suspicious", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
  evidence_found: { label: "Evidence Found", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
  low_risk: { label: "Low Risk", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
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

function CheckerCard({ c }: { c: CheckerResult }) {
  const Icon = ICONS[c.id];
  const s = STATUS[c.status];
  const muted = c.status === "not_applicable";
  return (
    <article className={cn("rounded-[20px] border bg-white p-5", muted ? "border-dashed border-[#E2E8F0]" : "border-[#F1E4DC] shadow-[0_4px_20px_rgba(15,23,42,0.04)]")}>
      <div className="flex items-start gap-3">
        <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-full", muted ? "bg-slate-100 text-slate-400" : "bg-[#FFF1EA] text-[#FF5A1F]")}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[16px] font-bold text-[#0F172A]">{CHECKER_LABELS[c.id]}</h3>
            <span className={cn("rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ring-1", s.cls)}>{s.label}</span>
          </div>
          <p className="mt-1 text-[13.5px] text-[#475569]">{c.summary}</p>
        </div>
      </div>

      {c.metrics.length ? (
        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {c.metrics.map((m) => (
            <div key={m.label} className="min-w-0 rounded-xl bg-[#F8FAFC] px-3 py-2">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">{m.label}</dt>
              <dd className="truncate text-[13.5px] font-semibold text-[#0F172A]" title={m.value}>
                {m.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {c.findings.length ? (
        <ul className="mt-4 space-y-2">
          {c.findings.map((f, i) => {
            const t = TONE[f.tone];
            return (
              <li key={i} className="flex gap-2.5 text-[13.5px]">
                <t.icon className={cn("mt-0.5 h-4 w-4 shrink-0", t.cls)} aria-hidden="true" />
                <div className="min-w-0">
                  <p className={cn("font-semibold", f.tone === "info" ? "text-[#0F172A]" : t.cls)}>{f.title}</p>
                  {f.detail ? <p className="break-words text-[12.5px] text-[#64748B]">{f.detail}</p> : null}
                  <p className="text-[11px] text-[#94A3B8]">Source: {f.source}</p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {c.nextSteps.length ? (
        <div className="mt-4 rounded-xl bg-[#FFF6F1] px-3 py-2.5">
          <p className="text-[11.5px] font-bold uppercase tracking-wide text-[#E8430F]">What to do</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[13px] text-[#7C2D12]">
            {c.nextSteps.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {c.limits.length ? (
        <details className="mt-3 text-[12.5px] text-[#64748B]">
          <summary className="cursor-pointer font-semibold text-[#475569]">Limits of this check</summary>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {c.limits.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </details>
      ) : null}
      {c.sources.length ? <p className="mt-2 text-[11.5px] text-[#94A3B8]">Data from: {c.sources.join(" · ")}</p> : null}
    </article>
  );
}

/** Full Trust Checker report: overall result first, then each checker with its evidence. */
export function TrustReportView({ report }: { report: ScanReport }) {
  const lvl = LEVEL[report.overall.level];
  const ran = report.checkers.filter((c) => c.status !== "not_applicable");
  const skipped = report.checkers.filter((c) => c.status === "not_applicable");
  return (
    <section className="mt-6 space-y-4" aria-live="polite" aria-label="Trust check results">
      <div className={cn("flex flex-col gap-3 rounded-[22px] p-5 sm:flex-row sm:items-center", lvl.cls)}>
        <lvl.icon className="h-10 w-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold uppercase tracking-wide opacity-90">Overall assessment</p>
          <p className="text-[24px] font-extrabold leading-tight">{lvl.label}</p>
          <p className="text-[14px] opacity-95">{report.overall.headline}</p>
        </div>
        <div className="text-[12px] opacity-90 sm:text-right">
          <p>{new Date(report.createdAt).toLocaleString()}</p>
          <p>
            {ran.length} check{ran.length === 1 ? "" : "s"} ran · {(report.durationMs / 1000).toFixed(1)}s
          </p>
          <p className="truncate">Scan {report.id.slice(0, 8)}</p>
        </div>
      </div>
      {report.input.url || report.input.file ? (
        <p className="text-[12.5px] text-[#64748B]">
          Checked: {report.input.url ? <span className="font-medium text-[#0F172A] [overflow-wrap:anywhere]">{report.input.url}</span> : null}
          {report.input.url && report.input.file ? " + " : ""}
          {report.input.file ? (
            <span className="font-medium text-[#0F172A]">
              {report.input.file.name} ({report.input.file.type})
            </span>
          ) : null}
        </p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {ran.map((c) => (
          <CheckerCard key={c.id} c={c} />
        ))}
      </div>
      {skipped.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {skipped.map((c) => {
            const Icon = ICONS[c.id];
            return (
              <div key={c.id} className="flex gap-2.5 rounded-2xl border border-dashed border-[#E2E8F0] bg-white p-3 text-[12.5px] text-[#64748B]">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span>
                  <span className="block font-semibold text-[#475569]">{CHECKER_LABELS[c.id]}</span>
                  {c.summary}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
