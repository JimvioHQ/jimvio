"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, AudioLines, BarChart3, Box, ChevronRight,
  FileCheck2, FileImage, FileUp, Globe2, Instagram,
  Link2, Loader2, Search, Shield, ShieldCheck,
  UploadCloud, X, Youtube, Music2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TrustReportView } from "./TrustReportView";
import type { ScanReport } from "@/lib/trust/types";

type Mode = "url" | "file" | "both";
type Platform = "YouTube" | "TikTok" | "Instagram" | "X" | "Website" | "Digital product" | "Media file" | "Unknown";
const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPT = "image/*,video/*,audio/*,.pdf,.zip,.epub,.docx,.xlsx,.pptx,.doc,.xls,.ppt,.txt,.md,.csv,.json,.html,.exe,.apk,.dmg";

const PLATFORMS: { name: Platform; icon: typeof Globe2; tone: string; note: string }[] = [
  { name: "YouTube", icon: Youtube, tone: "text-red-600 bg-red-50", note: "Video details and public engagement signals" },
  { name: "TikTok", icon: Music2, tone: "text-slate-900 bg-slate-100", note: "Available public post and creator signals" },
  { name: "Instagram", icon: Instagram, tone: "text-pink-600 bg-pink-50", note: "Available public post and profile signals" },
  { name: "X", icon: Globe2, tone: "text-slate-900 bg-slate-100", note: "Available public post signals" },
  { name: "Website", icon: Globe2, tone: "text-blue-700 bg-blue-50", note: "Domain, redirect and website safety signals" },
  { name: "Digital product", icon: Box, tone: "text-violet-700 bg-violet-50", note: "Product page and seller signals" },
  { name: "Media file", icon: FileImage, tone: "text-amber-700 bg-amber-50", note: "File metadata and provenance signals" },
  { name: "Unknown", icon: Link2, tone: "text-slate-600 bg-slate-100", note: "Platform will be identified where possible" },
];

const CAPABILITIES = [
  { icon: ShieldCheck, title: "Link safety", text: "Phishing, suspicious redirects, domain and SSL signals", tone: "bg-orange-50 text-[#F15A24]" },
  { icon: BarChart3, title: "Engagement signals", text: "Public views, likes, comments and available post data", tone: "bg-blue-50 text-blue-700" },
  { icon: Box, title: "Product checks", text: "File structure, repeat fingerprints and seller details", tone: "bg-violet-50 text-violet-700" },
  { icon: AudioLines, title: "Media provenance", text: "Metadata, dimensions and available provenance markers", tone: "bg-emerald-50 text-emerald-700" },
];

function detectPlatform(raw: string): Platform {
  if (!raw.trim()) return "Unknown";
  try {
    const value = /^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`;
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    if (host === "youtu.be" || host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) return "YouTube";
    if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "TikTok";
    if (host === "instagram.com" || host.endsWith(".instagram.com")) return "Instagram";
    if (host === "x.com" || host === "twitter.com" || host.endsWith(".x.com")) return "X";
    if (/\.(pdf|zip|epub|docx?|xlsx?|pptx?|mp4|mov|mp3|png|jpe?g|webp)(?:$|\/)/i.test(new URL(value).pathname)) {
      return "Digital product";
    }
    return "Website";
  } catch {
    return "Unknown";
  }
}

function formatBytes(size: number) {
  return size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`;
}

export function TrustCheckerPage() {
  const [mode, setMode] = useState<Mode>("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ScanReport | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const showUrl = mode !== "file";
  const showFile = mode !== "url";
  const platform = useMemo(() => detectPlatform(url), [url]);
  const platformInfo = PLATFORMS.find((item) => item.name === platform) ?? PLATFORMS[7];
  const PlatformIcon = platformInfo.icon;

  useEffect(() => {
    if (report) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [report]);

  const pickFile = useCallback((next: File | null) => {
    setError(null);
    if (!next) { setFile(null); return; }
    if (next.size === 0) { setError("This file is empty. Choose a file that contains data."); return; }
    if (next.size > MAX_BYTES) { setError("Files can be up to 4 MB."); return; }
    setFile(next);
    setMode((current) => current === "url" ? (url.trim() ? "both" : "file") : current);
  }, [url]);

  const validUrl = (() => {
    if (!showUrl || !url.trim()) return false;
    try {
      const parsed = new URL(/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`);
      return (parsed.protocol === "http:" || parsed.protocol === "https:") && !parsed.username && !parsed.password && ["", "80", "443"].includes(parsed.port);
    } catch { return false; }
  })();
  const canRun = (showUrl && validUrl) || (showFile && file !== null);

  async function run() {
    if (!canRun || busy) return;
    if (showUrl && url.trim() && !validUrl) {
      setError("Enter a valid URL, such as youtube.com/watch?v=… or example.com.");
      return;
    }
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      const form = new FormData();
      if (showUrl && url.trim()) form.set("url", url.trim());
      if (showFile && file) form.set("file", file);
      const response = await fetch("/api/trust-checker/scan", { method: "POST", body: form });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "The check could not finish. Try again.");
      if (!payload.report || !Array.isArray(payload.report.checkers) || !payload.report.overall) {
        throw new Error("The scan returned an incomplete report. No safety verdict was assumed.");
      }
      setReport(payload.report as ScanReport);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The check could not finish. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function resetScanner() {
    setReport(null);
    setError(null);
    setUrl("");
    setFile(null);
    setMode("url");
  }

  return (
    <main className="min-h-screen bg-[#F7F8FA] pb-16">
      <div className="mx-auto max-w-[1440px] px-4 pb-8 pt-5 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#FFF0E8] text-[#F15A24]"><Shield className="h-4 w-4" /></span>
            <span>Trust &amp; Safety</span><ChevronRight className="h-3.5 w-3.5" /><span className="text-slate-900">Trust Checker</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Evidence-led verification
          </div>
        </div>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.055)]">
          <div className="relative isolate overflow-hidden border-b border-slate-100 bg-[radial-gradient(ellipse_at_88%_0%,rgba(255,90,31,0.13),transparent_36%),linear-gradient(115deg,#FFFFFF_0%,#FFFCFA_60%,#FFF3EC_100%)] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
            <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full border border-orange-100/80" />
            <div className="pointer-events-none absolute -right-5 -top-12 h-64 w-64 rounded-full border border-orange-100/70" />
            <div className="relative max-w-4xl">
              <h1 className="max-w-4xl text-4xl font-black leading-[1.02] tracking-[-0.055em] text-[#111827] sm:text-5xl lg:text-[60px]">
                Know what you can <span className="text-[#FF5A1F]">trust.</span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                Check a link or file with the right verification tools. Get clear findings, real public signals and transparent limits — all in one place.
              </p>
            </div>
          </div>

          <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:p-8">
            <div className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#F15A24]">Start a verification</p>
                  <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">What would you like to check?</h2>
                </div>
                {report ? <button type="button" onClick={resetScanner} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><RefreshCw className="h-3.5 w-3.5" /> New check</button> : null}
              </div>

              <div className="mb-4 inline-flex flex-wrap rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Input type">
                {([
                  ["url", "Paste a link", Link2],
                  ["file", "Upload a file", FileUp],
                  ["both", "Link + file", FileCheck2],
                ] as const).map(([value, label, Icon]) => (
                  <button key={value} type="button" role="tab" aria-selected={mode === value} onClick={() => setMode(value)}
                    className={cn("inline-flex h-10 items-center gap-2 rounded-lg px-4 text-xs font-bold transition", mode === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}>
                    <Icon className="h-4 w-4" />{label}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {showUrl ? (
                  <label className="flex min-h-[58px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 transition focus-within:border-[#FF8B61] focus-within:ring-4 focus-within:ring-orange-100">
                    <Link2 className="h-5 w-5 shrink-0 text-slate-400" />
                    <input value={url} onChange={(event) => setUrl(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void run()}
                      placeholder="Paste a YouTube, TikTok, Instagram, X or website URL…"
                      aria-label="URL to verify" inputMode="url" className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400" />
                    {url ? <button type="button" onClick={() => setUrl("")} aria-label="Clear URL" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button> : null}
                  </label>
                ) : null}

                {showFile ? (
                  <div onDragOver={(event) => { event.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
                    onDrop={(event) => { event.preventDefault(); setDrag(false); pickFile(event.dataTransfer.files?.[0] ?? null); }}
                    className={cn("rounded-2xl border border-dashed p-4 transition sm:p-5", drag ? "border-[#FF5A1F] bg-orange-50" : "border-slate-300 bg-slate-50/80")}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#F15A24] shadow-sm"><UploadCloud className="h-5 w-5" /></span>
                      <div className="min-w-0 flex-1">
                        {file ? <><p className="truncate text-sm font-bold text-slate-900">{file.name}</p><p className="mt-1 text-xs text-slate-500">{file.type || "Unknown file type"} · {formatBytes(file.size)} · Ready to scan</p></> :
                          <><p className="text-sm font-bold text-slate-800">Drop your file here or browse</p><p className="mt-1 text-xs leading-5 text-slate-500">Images, video, audio, documents and archives · Maximum 4 MB</p></>}
                      </div>
                      <div className="flex items-center gap-2">
                        {file ? <button type="button" onClick={() => pickFile(null)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">Remove</button> : null}
                        <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 shadow-sm hover:border-orange-200"><FileUp className="h-4 w-4" />{file ? "Replace file" : "Choose file"}</button>
                      </div>
                    </div>
                    <input ref={fileRef} type="file" hidden accept={ACCEPT} onChange={(event) => { pickFile(event.target.files?.[0] ?? null); event.target.value = ""; }} />
                  </div>
                ) : null}
              </div>

              {url.trim() && showUrl ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-start gap-3">
                    <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", platformInfo.tone)}><PlatformIcon className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-extrabold text-slate-900">{platform === "Unknown" ? "Identifying source" : `${platform} detected`}</p>
                        {validUrl ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Valid link format</span> : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">Check URL format</span>}
                      </div>
                      <p className="mt-1 break-all text-xs text-slate-500">{url}</p>
                      <p className="mt-1.5 text-xs leading-5 text-slate-600">{platformInfo.note}. The report will show only details returned by the available verification sources.</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {file && showFile ? (
                <div className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-violet-50 text-violet-700"><FileImage className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-800">{file.name}</p><p className="text-[11px] text-slate-500">{formatBytes(file.size)} · File selected</p></div>
                  <span className="text-[10px] font-bold text-emerald-700">Ready</span>
                </div>
              ) : null}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button type="button" disabled={!canRun || busy} onClick={() => void run()}
                  className="inline-flex h-12 items-center justify-center gap-2.5 rounded-xl bg-[#FF5A1F] px-6 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(255,90,31,0.22)] transition hover:-translate-y-0.5 hover:bg-[#ED4D16] disabled:cursor-not-allowed disabled:opacity-45">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}{busy ? "Verifying…" : "Run verification"}{!busy ? <ArrowRight className="h-4 w-4" /> : null}
                </button>
                <p className="text-xs leading-5 text-slate-500">{busy ? "Running the checks that apply to this input…" : "Only relevant checks run for the content you submit."}</p>
              </div>
              {error ? <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs font-semibold text-rose-700" role="alert">{error}</p> : null}
            </div>

            <aside className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-[#FBFCFD] p-4">
                <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-orange-50 text-[#F15A24]"><ShieldCheck className="h-4 w-4" /></span><h3 className="text-sm font-extrabold text-slate-900">What Jimvio checks</h3></div>
                <div className="mt-4 space-y-4">
                  {CAPABILITIES.map((item) => <div key={item.title} className="flex gap-3"><span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", item.tone)}><item.icon className="h-4 w-4" /></span><div><p className="text-xs font-bold text-slate-800">{item.title}</p><p className="mt-1 text-[11px] leading-5 text-slate-500">{item.text}</p></div></div>)}
                </div>
              </div>
            </aside>
          </div>
        </section>

        <div id="trust-checker-results" ref={resultRef} className="scroll-mt-24">
          {report ? <TrustReportView report={report} onRunAnother={resetScanner} /> : null}
        </div>

        <p className="mt-7 text-center text-[11px] leading-5 text-slate-400">Jimvio reports evidence-based signals, not legal judgments. Uploaded files are checked in memory and are not stored.</p>
      </div>
    </main>
  );
}
