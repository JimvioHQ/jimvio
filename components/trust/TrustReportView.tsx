"use client";

import {
  AlertTriangle, BarChart3, Bot, CheckCircle2, Clock3,
  CalendarDays, ExternalLink, Eye, FileCheck2, ImageIcon, Info, Link2, MessageCircle,
  RotateCcw, ShieldAlert, ShieldCheck, ShieldX, ThumbsUp, Users, Video, Globe2,
  XCircle, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CHECKER_LABELS, type CheckerId, type CheckerResult, type CheckerStatus,
  type FindingTone, type OverallLevel, type ScanReport,
} from "@/lib/trust/types";

const ICONS: Record<CheckerId, LucideIcon> = {
  links: Link2, engagement: BarChart3, product: FileCheck2, media: ImageIcon,
};

const LEVEL: Record<OverallLevel, {
  label: string; description: string; surface: string; accent: string;
  icon: LucideIcon; mark: string;
}> = {
  known_threat: { label: "Known threat detected", description: "A threat match was returned by an available source. Do not open, download or pay.", surface: "border-rose-200 bg-rose-50", accent: "text-rose-800", icon: ShieldX, mark: "bg-rose-100 text-rose-700" },
  high_risk: { label: "High risk", description: "Strong warning signals were found. Avoid interacting until the evidence has been reviewed.", surface: "border-rose-200 bg-rose-50", accent: "text-rose-800", icon: ShieldX, mark: "bg-rose-100 text-rose-700" },
  suspicious: { label: "Suspicious signals", description: "Some signals need attention. This is not, by itself, proof of malicious activity.", surface: "border-amber-200 bg-amber-50", accent: "text-amber-900", icon: ShieldAlert, mark: "bg-amber-100 text-amber-800" },
  low_risk: { label: "Likely low risk", description: "No known threats or strong warning signals were returned by the checks completed. This is not a guarantee of safety.", surface: "border-emerald-200 bg-emerald-50", accent: "text-emerald-800", icon: ShieldCheck, mark: "bg-emerald-100 text-emerald-700" },
  inconclusive: { label: "Not enough evidence", description: "Jimvio could not gather enough evidence for a reliable assessment. Missing data is not proof of safety.", surface: "border-slate-200 bg-slate-50", accent: "text-slate-800", icon: Info, mark: "bg-slate-100 text-slate-600" },
};

const STATUS: Record<CheckerStatus, { label: string; cls: string; icon: LucideIcon }> = {
  known_threat: { label: "Threat found", cls: "bg-rose-50 text-rose-700", icon: ShieldX },
  high_risk: { label: "High risk", cls: "bg-rose-50 text-rose-700", icon: ShieldX },
  suspicious: { label: "Suspicious", cls: "bg-amber-50 text-amber-800", icon: AlertTriangle },
  evidence_found: { label: "Evidence found", cls: "bg-amber-50 text-amber-800", icon: Info },
  low_risk: { label: "Low risk", cls: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  inconclusive: { label: "Inconclusive", cls: "bg-slate-100 text-slate-700", icon: Info },
  unavailable: { label: "Unavailable", cls: "bg-slate-100 text-slate-600", icon: Info },
  not_applicable: { label: "Not checked", cls: "bg-slate-100 text-slate-500", icon: Info },
};

const TONE: Record<FindingTone, { cls: string; icon: LucideIcon }> = {
  good: { cls: "text-emerald-700", icon: CheckCircle2 },
  info: { cls: "text-slate-600", icon: Info },
  warn: { cls: "text-amber-700", icon: AlertTriangle },
  bad: { cls: "text-rose-700", icon: XCircle },
};

type Metric = { label: string; value: string };
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function getMetric(metrics: Metric[], aliases: string[]): string | null {
  const match = metrics.find((metric) => aliases.includes(normalize(metric.label)));
  return match?.value ?? null;
}

function available(value: string | null): value is string {
  return Boolean(value && value.trim() && !/^(—|-|not available(?: from .*)?|not provided|not public|unavailable|hidden(?: \/ unavailable)?)$/i.test(value.trim()));
}

function MetricTile({ label, value, icon: Icon, tone, note }: {
  label: string; value: string | null; icon: LucideIcon; tone: string; note?: string;
}) {
  const hasValue = available(value);
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white px-3 py-3 shadow-[0_2px_10px_rgba(15,23,42,0.025)] sm:px-4">
      <div className="flex items-center gap-2">
        <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-xl", tone)}><Icon className="h-4 w-4" /></span>
        <p className="min-w-0 truncate text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      </div>
      <p className={cn("mt-2 truncate text-lg font-black tracking-tight sm:text-xl", hasValue ? "text-slate-950" : "text-slate-400")} title={value ?? "Not available"}>
        {hasValue ? value : "Not available"}
      </p>
      {note ? <p className="mt-0.5 text-[10px] text-slate-400">{note}</p> : null}
    </div>
  );
}

function CheckerRow({ checker }: { checker: CheckerResult }) {
  const Icon = ICONS[checker.id];
  const status = STATUS[checker.status];
  const StatusIcon = status.icon;
  const primaryFinding = checker.findings[0];
  const moreFindings = checker.findings.slice(1);
  return (
    <details className="group border-b border-slate-100 last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 transition hover:bg-slate-50/80 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", checker.status === "unavailable" || checker.status === "inconclusive" ? "bg-slate-100 text-slate-500" : "bg-orange-50 text-[#F15A24]")}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-extrabold text-slate-900">{CHECKER_LABELS[checker.id]}</span>
            <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold", status.cls)}>{status.label}</span>
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">{checker.summary}</span>
        </span>
        <span className="ml-1 text-slate-400 transition group-open:rotate-90"><span className="text-lg">›</span></span>
      </summary>
      <div className="space-y-4 bg-slate-50/60 px-4 pb-4 pt-1 sm:px-5">
        {checker.metrics.length > 0 ? (
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {checker.metrics.map((metric) => <div key={metric.label} className="min-w-0 rounded-xl border border-slate-100 bg-white px-3 py-2"><dt className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{metric.label}</dt><dd className="mt-1 break-words text-xs font-bold text-slate-800">{metric.value}</dd></div>)}
          </dl>
        ) : null}
        {checker.findings.length > 0 ? (
          <div>
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400">Evidence</p>
            <ul className="space-y-3">
              {[primaryFinding, ...moreFindings].map((finding, index) => {
                const tone = TONE[finding.tone]; const FindingIcon = tone.icon;
                return <li key={`${finding.source}-${finding.title}-${index}`} className="flex gap-2.5"><FindingIcon className={cn("mt-0.5 h-4 w-4 shrink-0", tone.cls)} /><div className="min-w-0"><p className={cn("text-xs font-bold", tone.cls)}>{finding.title}</p>{finding.detail ? <p className="mt-1 text-xs leading-5 text-slate-600">{finding.detail}</p> : null}<p className="mt-1 text-[10px] text-slate-400">Source: {finding.source}</p></div></li>;
              })}
            </ul>
          </div>
        ) : null}
        {checker.limits.length > 0 ? <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">What could not be verified</p><ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-slate-600">{checker.limits.map((limit) => <li key={limit}>{limit}</li>)}</ul></div> : null}
        {checker.sources.length > 0 ? <p className="text-[10px] text-slate-400">Sources: {checker.sources.join(" · ")}</p> : null}
      </div>
    </details>
  );
}

function platformName(url: string | null): string {
  if (!url) return "Uploaded file";
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    if (host === "youtu.be" || host.endsWith("youtube.com")) return "YouTube video";
    if (host.endsWith("tiktok.com")) return "TikTok post";
    if (host.endsWith("instagram.com")) return "Instagram post";
    if (host === "x.com" || host.endsWith("twitter.com")) return "X post";
    if (host === "facebook.com" || host === "fb.watch") return "Facebook post";
    if (host === "threads.net" || host === "threads.com") return "Threads post";
    return "Website";
  } catch { return "Submitted link"; }
}

function isSocialMediaUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    const domains = [
      "youtube.com", "youtu.be", "tiktok.com", "instagram.com", "facebook.com", "fb.watch",
      "x.com", "twitter.com", "threads.net", "threads.com",
    ];
    return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch { return false; }
}

function safeExternalUrl(url: string | null): string | null {
  if (!url) return null;
  try { const parsed = new URL(url); return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null; }
  catch { return null; }
}


function MaliciousLinkReport({ report, checker, onRunAnother }: { report: ScanReport; checker: CheckerResult; onRunAnother?: () => void }) {
  const url = report.input.url;
  const checkedAt = new Date(report.createdAt);
  const checkedAtLabel = Number.isNaN(checkedAt.getTime()) ? "Time unavailable" : checkedAt.toLocaleString();
  const metric = (label: string) => checker.metrics.find((item) => normalize(item.label) === normalize(label))?.value ?? null;
  const hasSource = (name: string) => checker.sources.some((source) => source.toLowerCase().includes(name.toLowerCase()));
  const hasFinding = (pattern: RegExp) => checker.findings.some((finding) => pattern.test(finding.title + " " + (finding.detail ?? "")));
  const webRiskMatch = checker.findings.some((finding) => finding.source === "Google Web Risk" && finding.tone === "bad");
  const webRiskClean = checker.findings.some((finding) => finding.source === "Google Web Risk" && finding.tone === "good");
  const phishingMatch = checker.findings.some((finding) => finding.source.toLowerCase().includes("phishing.database") && finding.tone === "bad");
  const domainAge = metric("Domain age");
  const registrar = metric("Registrar");
  const serverIp = metric("Server IP");
  const finalAddress = metric("Final address") ?? url;
  const redirectCount = metric("Redirects");
  const certificate = checker.findings.find((finding) => /certificate/i.test(finding.title));
  const pageFetchFailed = checker.findings.some((finding) => finding.title === "Could not open the page");
  const pageContentFindings = checker.findings.filter((finding) => /page content|content analysis|http headers/i.test(finding.source));
  const threatLabel = checker.status === "known_threat" ? "Known threat" : "High risk";
  const statusFor = (state: "detected" | "clean" | "review" | "available" | "unavailable") => ({
    detected: { label: "Detected", cls: "bg-rose-50 text-rose-700" },
    clean: { label: "No issue found", cls: "bg-emerald-50 text-emerald-700" },
    review: { label: "Review", cls: "bg-amber-50 text-amber-800" },
    available: { label: "Info available", cls: "bg-blue-50 text-blue-700" },
    unavailable: { label: "Not available", cls: "bg-slate-100 text-slate-600" },
  })[state];
  const checks = [
    { title: "URL & domain structure", description: "Checks the submitted address for deceptive patterns, unusual formatting and risky domain signals.", state: (hasFinding(/suspicious|deceptive|look.?alike|ip address|url shortener|unusual/i) ? "detected" : checker.findings.some((finding) => finding.source === "URL analysis" && (finding.tone === "warn" || finding.tone === "info")) ? "review" : "clean") as "detected" | "clean" | "review", evidence: checker.findings.filter((finding) => finding.source === "URL analysis"), source: "URL analysis" },
    { title: "Malware & unsafe-site reputation", description: "Looks for malware, unwanted software and unsafe-site matches in connected threat intelligence.", state: (webRiskMatch || checker.findings.some((finding) => /downloads a program/i.test(finding.title)) ? "detected" : webRiskClean ? "clean" : "unavailable") as "detected" | "clean" | "unavailable", evidence: checker.findings.filter((finding) => finding.source === "Google Web Risk"), source: "Google Web Risk" },
    { title: "Phishing & blacklist status", description: "Checks the domain against the active phishing list and available social-engineering threat signals.", state: (phishingMatch || checker.findings.some((finding) => finding.source === "Google Web Risk" && /social engineering/i.test(finding.detail ?? "")) ? "detected" : hasSource("Phishing.Database") ? "clean" : "unavailable") as "detected" | "clean" | "unavailable", evidence: checker.findings.filter((finding) => /phishing|social engineering|unsafe list/i.test(finding.title + " " + (finding.detail ?? ""))), source: "Phishing.Database · Google Web Risk" },
    { title: "Redirect analysis", description: "Inspects the redirect path observed while safely requesting the submitted URL.", state: (hasFinding(/redirect/i) ? "review" : hasSource("Safe page fetch") && !pageFetchFailed ? "clean" : "unavailable") as "review" | "clean" | "unavailable", evidence: checker.findings.filter((finding) => /redirect/i.test(finding.title + " " + (finding.detail ?? ""))), source: "Safe page fetch" },
    { title: "Domain age & registration", description: "Uses public RDAP registration data where the domain registry makes it available.", state: (domainAge || registrar ? hasFinding(/registered .* days ago/i) ? "review" : "available" : "unavailable") as "review" | "available" | "unavailable", evidence: checker.findings.filter((finding) => finding.source === "RDAP"), source: "RDAP" },
    { title: "HTTPS & TLS certificate", description: "Checks certificate trust for the final HTTPS destination when a safe connection is available.", state: (certificate ? certificate.tone === "good" ? "clean" : "detected" : "unavailable") as "clean" | "detected" | "unavailable", evidence: certificate ? [certificate] : [], source: "TLS certificate" },
    { title: "Website content signals", description: "Reviews safely fetched page content for suspicious patterns. Jimvio does not execute page scripts.", state: (pageContentFindings.some((finding) => finding.tone === "bad") ? "detected" : pageContentFindings.length ? "review" : "unavailable") as "detected" | "review" | "unavailable", evidence: pageContentFindings, source: "Safe page fetch · page heuristics" },
    { title: "DNS & hosting information", description: "Shows the destination IP observed during the safe fetch. Hosting location and full DNS records are not inferred.", state: (serverIp ? "available" : "unavailable") as "available" | "unavailable", evidence: [], source: "Safe page fetch" },
  ];
  const findingCount = checker.findings.filter((finding) => finding.tone === "bad" || finding.tone === "warn").length;
  const redirectValue = redirectCount ?? (hasSource("Safe page fetch") && !pageFetchFailed ? "0 recorded" : null);
  const actions = checker.nextSteps.length ? checker.nextSteps : ["Do not enter passwords, verification codes or payment information until the link is independently verified."];

  return (
    <section className="mt-8 space-y-4 sm:space-y-5" aria-label="Scam and malicious link detection report">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600"><ShieldAlert className="h-7 w-7" /></span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">Scam &amp; Malicious Link Detection</h2><span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-extrabold text-rose-700">Detected</span></div>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">Security, reputation and risk analysis based on evidence available for this scan.</p>
          </div>
        </div>
        {onRunAnother ? <button type="button" onClick={onRunAnother} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-800 shadow-sm transition hover:border-orange-200 hover:bg-orange-50"><RotateCcw className="h-4 w-4" /> New check</button> : null}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(260px,0.8fr)]">
        <div className="rounded-[24px] border border-rose-100 bg-[linear-gradient(120deg,#fff7f7,#fff0f1)] p-5 sm:p-6">
          <div className="flex items-start gap-4"><span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-600"><AlertTriangle className="h-8 w-8" /></span><div className="min-w-0"><h3 className="text-2xl font-black tracking-tight text-red-600 sm:text-3xl">Malicious Link Detected</h3><p className="mt-2 text-sm leading-6 text-slate-800">{checker.summary} Avoid opening this link or sharing sensitive information.</p></div></div>
          <div className="mt-5 flex min-w-0 items-center gap-3 rounded-2xl border border-rose-100 bg-white px-4 py-3"><Link2 className="h-5 w-5 shrink-0 text-slate-500" /><span className="min-w-0 flex-1 break-all text-sm font-bold text-slate-900">{url}</span>{url ? <button type="button" onClick={() => { void navigator.clipboard?.writeText(url); }} className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Copy submitted link"><Link2 className="h-4 w-4" /></button> : null}</div>
        </div>
        <div className="flex flex-col justify-center rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,0.025)]"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Overall risk assessment</p><div className="mt-3 flex items-center gap-3"><span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600"><ShieldX className="h-8 w-8" /></span><div><p className="text-xl font-black text-slate-950">{threatLabel}</p><span className="mt-1 inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-extrabold text-rose-700">{checker.status === "known_threat" ? "Confirmed source match" : "Strong warning signals"}</span></div></div><p className="mt-4 text-xs leading-5 text-slate-500">No numeric score is shown because this scan does not calculate a calibrated risk score.</p></div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Risk level", value: threatLabel, icon: ShieldAlert, tone: "text-rose-600 bg-rose-50" },
          { label: "Risk signals", value: String(findingCount), icon: AlertTriangle, tone: "text-rose-600 bg-rose-50" },
          { label: "Redirects", value: redirectValue ?? "Not available", icon: RotateCcw, tone: "text-orange-600 bg-orange-50" },
          { label: "Evidence sources", value: String(checker.sources.length), icon: FileCheck2, tone: "text-slate-700 bg-slate-100" },
        ].map((item) => <div key={item.label} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"><div className="flex items-center gap-2"><span className={"grid h-9 w-9 shrink-0 place-items-center rounded-xl " + item.tone}><item.icon className="h-4 w-4" /></span><span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{item.label}</span></div><p className="mt-2 break-words text-base font-black text-slate-950">{item.value}</p></div>)}
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.9fr)]">
        <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-5"><h3 className="text-lg font-black tracking-tight text-slate-950">Detailed scan results</h3><p className="mt-1 text-xs text-slate-500">Each result reflects a check actually completed by Jimvio.</p></div>
          <div className="divide-y divide-slate-100">{checks.map((check) => { const badge = statusFor(check.state); return <details key={check.title} className="group"><summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition hover:bg-slate-50 sm:px-5 [&::-webkit-details-marker]:hidden"><span className={"grid h-9 w-9 shrink-0 place-items-center rounded-xl " + (check.state === "detected" ? "bg-rose-50 text-rose-600" : check.state === "clean" ? "bg-emerald-50 text-emerald-600" : check.state === "available" ? "bg-blue-50 text-blue-600" : check.state === "review" ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500")}><FileCheck2 className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-slate-900">{check.title}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{check.description}</span></span><span className={"shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold " + badge.cls}>{badge.label}</span></summary><div className="space-y-2 bg-slate-50/70 px-4 pb-4 pt-1 sm:px-5">{check.evidence.length ? check.evidence.map((finding, index) => <div key={finding.title + index} className="rounded-xl border border-slate-200 bg-white p-3"><p className={"text-xs font-bold " + (finding.tone === "bad" ? "text-rose-700" : finding.tone === "good" ? "text-emerald-700" : finding.tone === "warn" ? "text-amber-800" : "text-slate-700")}>{finding.title}</p>{finding.detail ? <p className="mt-1 text-xs leading-5 text-slate-600">{finding.detail}</p> : null}<p className="mt-1 text-[10px] text-slate-400">Source: {finding.source}</p></div>) : <p className="text-xs leading-5 text-slate-500">{check.state === "unavailable" ? "This check could not be completed with the sources or access available during this scan." : check.state === "clean" ? "The check completed and did not return a matching warning signal. This is not a guarantee that the site is safe." : "Review this result carefully before interacting with the site."}</p>}<p className="text-[10px] text-slate-400">Check source: {check.source}</p></div></details>; })}</div>
          {checker.limits.length ? <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-4 sm:px-5"><h4 className="text-xs font-extrabold text-slate-800">Checks Jimvio could not complete</h4><ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-slate-600">{checker.limits.map((limit) => <li key={limit}>{limit}</li>)}</ul></div> : null}
        </section>
        <div className="space-y-4">
          <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center gap-2"><Info className="h-5 w-5 text-slate-700" /><h3 className="text-base font-black text-slate-950">Link information</h3></div><dl className="mt-3 divide-y divide-slate-100">{[["Submitted URL", url], ["Final address", finalAddress], ["Domain age", domainAge], ["Registrar", registrar], ["Destination IP", serverIp], ["Redirects recorded", redirectValue], ["TLS certificate", certificate?.title ?? null]].filter((entry): entry is [string, string] => Boolean(entry[1])).map(([label, value]) => <div key={label} className="flex items-start justify-between gap-3 py-2"><dt className="text-xs text-slate-500">{label}</dt><dd className="max-w-[65%] break-all text-right text-xs font-bold text-slate-800">{value}</dd></div>)}<div className="flex items-start justify-between gap-3 py-2"><dt className="text-xs text-slate-500">Scan time</dt><dd className="text-right text-xs font-bold text-slate-800">{checkedAtLabel}</dd></div></dl></section>
          <section className="rounded-[22px] border border-orange-100 bg-[linear-gradient(145deg,#FFFAF6,#FFF2E9)] p-4 sm:p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#FF5A1F] text-white"><Info className="h-5 w-5" /></span><div><h3 className="text-base font-black text-[#C94712]">Recommended actions</h3><p className="mt-0.5 text-[11px] text-slate-500">Protect your accounts and devices</p></div></div><ol className="mt-4 space-y-3">{actions.map((action, index) => <li key={action} className="flex gap-2.5 text-xs leading-5 text-slate-700"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-[10px] font-extrabold text-[#E6531B] ring-1 ring-orange-100">{index + 1}</span><span>{action}</span></li>)}</ol></section>
          <p className="px-1 text-[10px] leading-5 text-slate-400">A clean result from an individual source does not prove a website is safe. Jimvio only reports data it could verify at scan time.</p>
        </div>
      </div>
    </section>
  );
}

export function LegacyReportView({ report, onRunAnother }: { report: ScanReport; onRunAnother?: () => void }) {
  const level = LEVEL[report.overall.level];
  const LevelIcon = level.icon;
  const ran = report.checkers.filter((checker) => checker.status !== "not_applicable");
  const skipped = report.checkers.filter((checker) => checker.status === "not_applicable");
  const engagement = report.checkers.find((checker) => checker.id === "engagement");
  const metrics = engagement?.metrics ?? [];
  const checkedAt = new Date(report.createdAt);
  const checkedAtLabel = Number.isNaN(checkedAt.getTime()) ? "Time unavailable" : checkedAt.toLocaleString();
  const title = getMetric(metrics, ["video"]);
  const channel = getMetric(metrics, ["channel", "author"]);
  const subscribers = getMetric(metrics, ["subscribers"]);
  const views = getMetric(metrics, ["public views youtube", "public views", "total views"]);
  const realViews = getMetric(metrics, ["verified real views", "real views"]);
  const botViews = getMetric(metrics, ["detected fake bot views", "bot fake views", "fake views", "bot views"]);
  const likes = getMetric(metrics, ["likes"]);
  const comments = getMetric(metrics, ["comments"]);
  const engagementRate = getMetric(metrics, ["engagement"]);
  const allSteps = report.checkers.flatMap((checker) => checker.nextSteps);
  const uniqueSteps = [...new Set(allSteps)].filter((step) => !(/address bar/i.test(step) && Boolean(report.input.url && /youtube|tiktok|instagram|x\.com|twitter/i.test(report.input.url))));
  const steps = uniqueSteps.slice(0, 4);
  const submittedUrl = report.input.url;
  const socialMediaLink = isSocialMediaUrl(submittedUrl);
  const SourceIcon = socialMediaLink ? Video : Globe2;
  const externalUrl = safeExternalUrl(submittedUrl);
  const itemName = title && available(title) ? title : report.input.file?.name ?? platformName(submittedUrl);
  const metricMap = new Map(metrics.map((metric) => [normalize(metric.label), metric.value]));
  const published = metricMap.get("published");
  const category = metricMap.get("category");
  const duration = metricMap.get("duration");
  const channelId = metricMap.get("channel id");
  const videoId = (() => {
    if (!submittedUrl) return null;
    try {
      const parsed = new URL(submittedUrl);
      const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
      if (host === "youtu.be") return parsed.pathname.split("/").filter(Boolean)[0] ?? null;
      if (host === "youtube.com" || host.endsWith(".youtube.com")) {
        return parsed.searchParams.get("v") ?? parsed.pathname.match(/\/(?:shorts|embed|live)\/([^/?#]+)/)?.[1] ?? null;
      }
      return null;
    } catch { return null; }
  })();
  const thumbnail = videoId && /^[A-Za-z0-9_-]{6,20}$/.test(videoId) ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;

  if (submittedUrl && (report.overall.level === "known_threat" || report.overall.level === "high_risk") && report.checkers.some((checker) => checker.id === "links" && (checker.status === "known_threat" || checker.status === "high_risk"))) {
    const linkChecker = report.checkers.find((checker) => checker.id === "links")!;
    return <MaliciousLinkReport report={report} checker={linkChecker} onRunAnother={onRunAnother} />;
  }

  return (
    <section className="mt-8 space-y-4 sm:space-y-5" aria-label="Trust check results">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-orange-50 text-[#F15A24]"><ShieldCheck className="h-4 w-4" /></span>
          <span>Trust Checker</span><span className="text-slate-300">/</span><span className="text-slate-900">Scan result</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] text-slate-400 sm:inline">{checkedAtLabel}</span>
          {onRunAnother ? <button type="button" onClick={onRunAnother} className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-800 shadow-sm transition hover:border-orange-200 hover:bg-orange-50"><RotateCcw className="h-4 w-4" /> New check</button> : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.035)]">
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(250px,0.8fr)] lg:items-center lg:gap-7">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
            {thumbnail ? <a href={externalUrl ?? undefined} target="_blank" rel="noreferrer" className="group relative block aspect-video w-full max-w-[220px] shrink-0 overflow-hidden rounded-2xl bg-slate-100 bg-cover bg-center transition duration-300 hover:brightness-95" style={{ backgroundImage: `url("${thumbnail}")` }} aria-label="Open source video"><span className="absolute inset-0 grid place-items-center bg-slate-950/10 text-white"><span className="grid h-11 w-11 place-items-center rounded-full bg-slate-950/65"><Video className="h-5 w-5" /></span></span>{duration && available(duration) ? <span className="absolute bottom-2 right-2 rounded bg-slate-950/85 px-2 py-1 text-[10px] font-bold text-white">{duration}</span> : null}</a> : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-orange-50 text-[#F15A24] sm:h-16 sm:w-16"><SourceIcon className="h-7 w-7" /></span>}
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#F15A24]"><span className="h-1.5 w-1.5 rounded-full bg-[#FF5A1F]" /> {platformName(submittedUrl)} detected</p>
              <h2 className="mt-1 line-clamp-2 break-words text-lg font-black leading-snug tracking-tight text-slate-950 sm:text-xl">{itemName}</h2>
              {channel && available(channel) ? <p className="mt-1 text-xs font-semibold text-slate-700">{channel}{subscribers && available(subscribers) ? <span className="font-normal text-slate-500"> · {subscribers} subscribers</span> : null}</p> : null}
              {published && available(published) ? <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500"><CalendarDays className="h-3 w-3" /> Published {published}{category && available(category) ? <span> · Category ID {category}</span> : null}</p> : null}
              {externalUrl ? <a href={externalUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex max-w-full items-center gap-1 break-all text-[11px] font-medium text-blue-700 hover:underline">{submittedUrl} <ExternalLink className="h-3 w-3 shrink-0" /></a> : report.input.file ? <p className="mt-2 text-[11px] text-slate-500">{report.input.file.type || "File"} · {(report.input.file.size / 1024).toFixed(0)} KB</p> : null}
            </div>
          </div>
          <div className={cn("flex min-w-0 items-center gap-4 rounded-2xl border p-4", level.surface)}>
            <span className={cn("grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/90 shadow-sm", level.accent)}><LevelIcon className="h-7 w-7" /></span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">Trust assessment</p>
              <h3 className={cn("mt-1 text-xl font-black tracking-tight sm:text-2xl", level.accent)}>{level.label}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-600">{report.overall.headline}</p>
            </div>
          </div>
        </div>
      </div>

      {engagement && socialMediaLink ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <MetricTile label="Total views" value={views} icon={Eye} tone="bg-blue-50 text-blue-700" />
          <MetricTile label="Real views" value={realViews} icon={Users} tone="bg-emerald-50 text-emerald-700" note="Verified only" />
          <MetricTile label="Bot / fake views" value={botViews} icon={Bot} tone="bg-rose-50 text-rose-700" note="Detected only" />
          <MetricTile label="Likes" value={likes} icon={ThumbsUp} tone="bg-emerald-50 text-emerald-700" />
          <MetricTile label="Comments" value={comments} icon={MessageCircle} tone="bg-blue-50 text-blue-700" />
          <MetricTile label="Engagement" value={engagementRate} icon={BarChart3} tone="bg-orange-50 text-[#F15A24]" />
        </div>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.9fr)]">
        <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.025)]">
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-50 text-[#F15A24]"><ShieldCheck className="h-5 w-5" /></span>
            <div><h3 className="text-base font-black tracking-tight text-slate-950">Verification results</h3><p className="mt-0.5 text-[11px] text-slate-500">{ran.length} applicable checks</p></div>
          </div>
          <div>{ran.map((checker) => <CheckerRow key={checker.id} checker={checker} />)}</div>
          {skipped.length > 0 ? <div className="border-t border-slate-100 px-4 py-3 sm:px-5"><details className="text-xs text-slate-500"><summary className="cursor-pointer font-semibold text-slate-600">Checks not applicable ({skipped.length})</summary><ul className="mt-2 space-y-2">{skipped.map((checker) => <li key={checker.id}><strong className="text-slate-700">{CHECKER_LABELS[checker.id]}:</strong> {checker.summary}</li>)}</ul></details></div> : null}
        </section>

        <div className="space-y-4">
          <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.025)] sm:p-5">
            <div className="flex items-center gap-2"><Info className="h-5 w-5 text-slate-700" /><h3 className="text-base font-black tracking-tight text-slate-950">Item information</h3></div>
            <dl className="mt-3 divide-y divide-slate-100">
              <div className="flex items-center justify-between gap-3 py-2"><dt className="text-xs text-slate-500">Platform</dt><dd className="text-right text-xs font-bold text-slate-800">{platformName(submittedUrl)}</dd></div>
              {channel && available(channel) ? <div className="flex items-center justify-between gap-3 py-2"><dt className="text-xs text-slate-500">Channel / creator</dt><dd className="max-w-[65%] truncate text-right text-xs font-bold text-slate-800">{channel}</dd></div> : null}
              {subscribers && available(subscribers) ? <div className="flex items-center justify-between gap-3 py-2"><dt className="text-xs text-slate-500">Subscribers</dt><dd className="text-right text-xs font-bold text-slate-800">{subscribers}</dd></div> : null}
              {published && available(published) ? <div className="flex items-center justify-between gap-3 py-2"><dt className="text-xs text-slate-500">Published</dt><dd className="text-right text-xs font-bold text-slate-800">{published}</dd></div> : null}
              {category && available(category) ? <div className="flex items-center justify-between gap-3 py-2"><dt className="text-xs text-slate-500">Category ID</dt><dd className="text-right text-xs font-bold text-slate-800">{category}</dd></div> : null}
              {duration && available(duration) ? <div className="flex items-center justify-between gap-3 py-2"><dt className="text-xs text-slate-500">Duration</dt><dd className="text-right text-xs font-bold text-slate-800">{duration}</dd></div> : null}
              {metricMap.get("channel total views") && available(metricMap.get("channel total views") ?? null) ? <div className="flex items-center justify-between gap-3 py-2"><dt className="text-xs text-slate-500">Channel total views</dt><dd className="text-right text-xs font-bold text-slate-800">{metricMap.get("channel total views")}</dd></div> : null}
              {metricMap.get("channel videos") && available(metricMap.get("channel videos") ?? null) ? <div className="flex items-center justify-between gap-3 py-2"><dt className="text-xs text-slate-500">Channel videos</dt><dd className="text-right text-xs font-bold text-slate-800">{metricMap.get("channel videos")}</dd></div> : null}
              {videoId ? <div className="flex items-center justify-between gap-3 py-2"><dt className="text-xs text-slate-500">Video ID</dt><dd className="max-w-[65%] truncate text-right text-xs font-bold text-slate-800">{videoId}</dd></div> : null}
              {channelId && available(channelId) ? <div className="flex items-center justify-between gap-3 py-2"><dt className="text-xs text-slate-500">Channel ID</dt><dd className="max-w-[65%] truncate text-right text-xs font-bold text-slate-800">{channelId}</dd></div> : null}
              {metricMap.get("channel handle") && available(metricMap.get("channel handle") ?? null) ? <div className="flex items-center justify-between gap-3 py-2"><dt className="text-xs text-slate-500">Channel handle</dt><dd className="text-right text-xs font-bold text-slate-800">{metricMap.get("channel handle")}</dd></div> : null}
              {metricMap.get("channel created") && available(metricMap.get("channel created") ?? null) ? <div className="flex items-center justify-between gap-3 py-2"><dt className="text-xs text-slate-500">Channel created</dt><dd className="text-right text-xs font-bold text-slate-800">{metricMap.get("channel created")}</dd></div> : null}
              {metricMap.get("channel country") && available(metricMap.get("channel country") ?? null) ? <div className="flex items-center justify-between gap-3 py-2"><dt className="text-xs text-slate-500">Channel country</dt><dd className="text-right text-xs font-bold text-slate-800">{metricMap.get("channel country")}</dd></div> : null}
              {metricMap.get("video visibility") && available(metricMap.get("video visibility") ?? null) ? <div className="flex items-center justify-between gap-3 py-2"><dt className="text-xs text-slate-500">Visibility</dt><dd className="text-right text-xs font-bold capitalize text-slate-800">{metricMap.get("video visibility")}</dd></div> : null}
              {metricMap.get("video description") && available(metricMap.get("video description") ?? null) ? <div className="border-t border-slate-100 py-3"><dt className="text-xs text-slate-500">Video description</dt><dd className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-700">{metricMap.get("video description")}</dd></div> : null}
              <div className="flex items-center justify-between gap-3 py-2"><dt className="text-xs text-slate-500">Checked</dt><dd className="text-right text-xs font-bold text-slate-800">{checkedAtLabel}</dd></div>
              <div className="flex items-center justify-between gap-3 py-2"><dt className="text-xs text-slate-500">Duration</dt><dd className="text-right text-xs font-bold text-slate-800">{Number.isFinite(report.durationMs) ? `${(report.durationMs / 1000).toFixed(1)}s` : "—"}</dd></div>
            </dl>
          </section>

          <section className="rounded-[22px] border border-orange-100 bg-[linear-gradient(145deg,#FFFAF6,#FFF2E9)] p-4 shadow-[0_4px_18px_rgba(15,23,42,0.025)] sm:p-5">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#FF5A1F] text-white shadow-sm"><Info className="h-5 w-5" /></span><div><h3 className="text-base font-black tracking-tight text-[#C94712]">Recommended actions</h3><p className="mt-0.5 text-[11px] text-slate-500">Based on the evidence collected in this scan</p></div></div>
            {steps.length > 0 ? <ol className="mt-4 space-y-3">{steps.map((step, index) => <li key={step} className="flex gap-3 text-xs leading-5 text-slate-700"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-[10px] font-extrabold text-[#E6531B] ring-1 ring-orange-100">{index + 1}</span><span>{step}</span></li>)}</ol> : <p className="mt-4 rounded-xl border border-orange-100 bg-white/80 p-3 text-xs leading-5 text-slate-700">No immediate action was generated from the available evidence. Review the verification details and any listed limitations before making a decision.</p>}
          </section>
        </div>
      </div>
      <p className="text-center text-[11px] leading-5 text-slate-400">{socialMediaLink ? "Results reflect evidence available at scan time. Real and bot-view counts are shown only when a trusted source provides them; unavailable data is never estimated." : "Website checks reflect publicly available safety signals. Visitor and traffic analytics remain private unless the site owner grants access."}</p>
    </section>
  );
}
