"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import {
  ArrowRight, BadgeCheck, ChartColumnIncreasing, ChevronRight, House, ImageIcon, Info, Layers, Link2, Loader2,
  RefreshCw, ShieldCheck, Sparkles, Target, Upload, UserRoundCheck, X, Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TrustResult } from "./results/TrustResult";
import type { LocalPreview } from "./results/MediaResult";
import { EngagementArt, Laurel, MediaArt, ProductArt, ScamArt } from "./TrustLandingArt";
import type { ScanReport } from "@/lib/trust/types";

type Mode = "url" | "file";
const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPT = "image/*,video/*,audio/*,.pdf,.zip,.epub,.docx,.xlsx,.pptx,.doc,.xls,.ppt,.txt,.md,.csv,.json,.html,.exe,.apk,.dmg";

const SOCIAL = /(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com|tiktok\.com|instagram\.com|facebook\.com|fb\.watch|x\.com|twitter\.com|threads\.net|threads\.com)$/i;
const PLATFORM_NAME: [RegExp, string][] = [
  [/(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/i, "YouTube"], [/(^|\.)tiktok\.com$/i, "TikTok"], [/(^|\.)instagram\.com$/i, "Instagram"],
  [/(^|\.)(x\.com|twitter\.com)$/i, "X"], [/(^|\.)(facebook\.com|fb\.watch)$/i, "Facebook"], [/(^|\.)(threads\.net|threads\.com)$/i, "Threads"],
];

/** What the engine will most likely run, shown before the check (the server decides from the real content). */
function linkHint(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    const host = u.hostname.toLowerCase();
    if (SOCIAL.test(host)) return `${PLATFORM_NAME.find(([re]) => re.test(host))?.[1] ?? "Social"} link → Engagement & Traffic Detection`;
    if (/\.(pdf|epub)$/i.test(u.pathname)) return "Document link → Digital Product Verification";
    if (/\.(jpe?g|png|webp|gif|mp4|mov|webm)$/i.test(u.pathname)) return "Media link → Media Metadata & Provenance";
    return "Website → Scam & Malicious Link Detection";
  } catch {
    return null;
  }
}

function fileHint(f: File): string {
  if (/^(image|video|audio)\//.test(f.type)) return "Media file → Media Metadata & Provenance";
  return "File → Digital Product Verification (confirmed from its contents)";
}

function formatBytes(size: number) {
  return size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`;
}

const FEATURES: { icon: LucideIcon; label: string }[] = [
  { icon: ShieldCheck, label: "Trusted & Secure" },
  { icon: Target, label: "Accurate Results" },
  { icon: Zap, label: "Fast Analysis" },
  { icon: Layers, label: "Multi-Format Support" },
  { icon: UserRoundCheck, label: "Trusted Platform" },
];

const CATEGORIES = [
  { key: "links", title: "Scam & Malicious Link Detection", text: "Check websites and links for threats, phishing, and security risks.", icon: ShieldCheck, tile: "bg-[linear-gradient(135deg,#FF8A3D,#FF5A1F)]", bg: "bg-[linear-gradient(135deg,#FFF4EC_0%,#FFFFFF_70%)]", Art: ScamArt, mode: "url" as Mode },
  { key: "engagement", title: "Engagement & Traffic Detection", text: "Analyze real engagement, audience quality, and traffic authenticity.", icon: ChartColumnIncreasing, tile: "bg-[linear-gradient(135deg,#A77BFF,#7C3AED)]", bg: "bg-[linear-gradient(135deg,#F6F0FF_0%,#FFFFFF_70%)]", Art: EngagementArt, mode: "url" as Mode },
  { key: "product", title: "Digital Product Verification", text: "Verify e-books, PDFs, templates, and other digital products.", icon: Layers, tile: "bg-[linear-gradient(135deg,#4C9BFF,#1E6BF0)]", bg: "bg-[linear-gradient(135deg,#EFF5FF_0%,#FFFFFF_70%)]", Art: ProductArt, mode: "file" as Mode },
  { key: "media", title: "Media Metadata & Provenance", text: "Check images and videos for authenticity, origin, and AI generation.", icon: ImageIcon, tile: "bg-[linear-gradient(135deg,#43D16A,#16A34A)]", bg: "bg-[linear-gradient(135deg,#EEFAF1_0%,#FFFFFF_70%)]", Art: MediaArt, mode: "file" as Mode },
];

const STEPS = [
  { icon: Link2, title: "Add Content", text: "Paste a link or upload a file (PDF, image, video, etc.)." },
  { icon: Sparkles, title: "Run the Check", text: "Our AI analyzes the content using advanced detection tools." },
  { icon: ChartColumnIncreasing, title: "Get Results", text: "View a detailed report with trust score, findings, and key details." },
];

export function TrustCheckerPage() {
  const [mode, setMode] = useState<Mode>("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ScanReport | null>(null);
  const [preview, setPreview] = useState<LocalPreview | null>(null);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (report) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [report]);

  // Reopen a saved result from ?scan=<id> (only the person who ran it can load it).
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("scan");
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return;
    setLoadingSaved(true);
    fetch(`/api/trust-checker/scan/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (r) => {
        const p = await r.json().catch(() => ({}));
        if (!r.ok || !p.report) throw new Error(r.status === 404 ? "This result is private to the person who ran the check, or it no longer exists." : "The saved result couldn't be loaded. Try again.");
        setReport(p.report as ScanReport);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "The saved result couldn't be loaded."))
      .finally(() => setLoadingSaved(false));
  }, []);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  const pickFile = useCallback((next: File | null) => {
    setError(null);
    if (!next) { setFile(null); return; }
    if (next.size === 0) { setError("This file is empty. Choose a file that contains data."); return; }
    if (next.size > MAX_BYTES) { setError("Files can be up to 4 MB."); return; }
    setFile(next);
    setMode("file");
  }, []);

  const validUrl = (() => {
    if (mode !== "url" || !url.trim()) return false;
    try {
      const parsed = new URL(/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`);
      return (parsed.protocol === "http:" || parsed.protocol === "https:") && !parsed.username && !parsed.password && ["", "80", "443"].includes(parsed.port) && parsed.hostname.includes(".");
    } catch { return false; }
  })();
  const canRun = mode === "url" ? validUrl : file !== null;
  const hint = mode === "url" ? linkHint(url) : file ? fileHint(file) : null;

  async function run() {
    if (busy) return;
    if (mode === "url" && !validUrl) {
      setError(url.trim() ? "Enter a valid URL, such as https://example.com or a YouTube, TikTok or Instagram link." : "Paste a link to check.");
      return;
    }
    if (mode === "file" && !file) {
      setError("Choose a file to check.");
      return;
    }
    setBusy(true);
    setError(null);
    setReport(null);
    setPreview(null);
    try {
      const form = new FormData();
      if (mode === "url") form.set("url", url.trim());
      if (mode === "file" && file) form.set("file", file);
      const response = await fetch("/api/trust-checker/scan", { method: "POST", body: form });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "The check could not finish. Try again.");
      if (!payload.report || !Array.isArray(payload.report.checkers) || !payload.report.overall) {
        throw new Error("The scan returned an incomplete report. No safety verdict was assumed.");
      }
      const next = payload.report as ScanReport;
      if (mode === "file" && file && /^(image|video|audio)\//.test(file.type)) {
        setPreview({ url: URL.createObjectURL(file), kind: file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "image" });
      }
      setReport(next);
      if (next.id) window.history.replaceState(null, "", `/trust-checker?scan=${encodeURIComponent(next.id)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The check could not finish. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function resetScanner() {
    setReport(null);
    setPreview(null);
    setError(null);
    setUrl("");
    setFile(null);
    setMode("url");
    window.history.replaceState(null, "", "/trust-checker");
    window.scrollTo({ top: 0 });
  }

  function chooseCategory(m: Mode) {
    setMode(m);
    setError(null);
    document.getElementById("trust-checker-input")?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (m === "url") window.setTimeout(() => urlRef.current?.focus(), 300);
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    pickFile(e.dataTransfer.files?.[0] ?? null);
  };

  if (report) {
    return (
      <main className="min-h-screen overflow-x-clip bg-[#F7F8FA] pb-16">
        <div className="mx-auto max-w-[1520px] px-4 pb-8 pt-5 sm:px-6 lg:px-8">
          <TrustResult report={report} preview={preview} onNewCheck={resetScanner} />
          <p className="mt-7 text-center text-[11px] leading-5 text-slate-400">Jimvio reports evidence-based signals, not legal judgments. Uploaded files are checked in memory and are not stored.</p>
        </div>
      </main>
    );
  }

  const checkBtn = (
    <button
      type="button"
      onClick={() => void run()}
      disabled={busy}
      className="inline-flex h-[52px] w-full shrink-0 items-center justify-center gap-2.5 rounded-full bg-[linear-gradient(90deg,#FF7A2F,#FF5A1F)] px-8 text-[17px] font-extrabold text-white shadow-[0_10px_24px_rgba(255,90,31,0.30)] transition hover:brightness-105 disabled:cursor-wait disabled:opacity-80 md:h-12 md:w-auto md:text-[16px]"
    >
      {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-6 w-6" strokeWidth={2} />}
      {busy ? "Checking…" : "Check Now"}
      {!busy ? <ArrowRight className="h-5 w-5" strokeWidth={2.4} /> : null}
    </button>
  );

  return (
    <main className="relative min-h-screen overflow-x-clip bg-[#FBFBFC] pb-16">
      <div aria-hidden className="pointer-events-none absolute -left-40 -top-24 h-[460px] w-[560px] rounded-full bg-[radial-gradient(closest-side,rgba(255,170,120,0.35),rgba(255,200,170,0.12)_60%,transparent)] blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute -right-44 top-10 h-[420px] w-[600px] rounded-full bg-[radial-gradient(closest-side,rgba(255,180,140,0.30),rgba(255,215,190,0.10)_60%,transparent)] blur-2xl" />

      <div className="relative mx-auto max-w-[1600px] px-4 pb-8 pt-4 sm:px-6 lg:px-10">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2.5 text-[15px] font-bold text-[#111827] sm:text-[14px]">
          <Link href="/" aria-label="Home" className="hover:text-[#FF5A1F]"><House className="h-5 w-5 fill-current" /></Link>
          <ChevronRight className="h-4 w-4 text-slate-400" />
          <span>Trust Checker</span>
        </nav>

        {/* Hero */}
        <header className="mx-auto mt-1 flex max-w-[1100px] flex-col items-center text-center">
          <span className="grid h-[84px] w-[84px] place-items-center rounded-[24px] border border-[#FFD9C5] bg-[linear-gradient(160deg,#FFFFFF_0%,#FFE8DA_100%)] shadow-[0_12px_30px_rgba(255,90,31,0.18)] sm:h-[96px] sm:w-[96px]">
            <ShieldCheck className="h-12 w-12 text-[#FF5A1F] sm:h-14 sm:w-14" strokeWidth={2} />
          </span>
          <div className="mt-3 flex items-center justify-center gap-2 sm:gap-6">
            <Laurel className="h-10 w-6 shrink-0 sm:h-16 sm:w-11" />
            <h1 className="whitespace-nowrap text-[25px] font-black leading-tight tracking-[-0.03em] text-[#111827] min-[430px]:text-[29px] sm:text-[44px] lg:text-[48px]">
              Jimvio <span className="text-[#FF5A1F]">Trust Checker</span>
            </h1>
            <Laurel flip className="h-10 w-6 shrink-0 sm:h-16 sm:w-11" />
          </div>
          <p className="mt-2 max-w-[1100px] text-[15px] leading-6 text-[#1F2937] sm:text-[16.5px]">
            Verify the authenticity, safety, and legitimacy of links, digital products, images, videos, and more with AI-powered analysis.
          </p>
          <span className="mt-4 inline-flex items-center gap-2.5 rounded-full bg-[#FFEBDF] px-6 py-2.5 text-[15px] font-extrabold text-[#111827] shadow-[0_4px_14px_rgba(255,90,31,0.10)]">
            <Sparkles className="h-5 w-5 fill-[#FF5A1F] text-[#FF5A1F]" /> AI-Powered Verification Engine
          </span>
        </header>

        {/* Checker */}
        <section
          id="trust-checker-input"
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          className={cn(
            "mx-auto mt-6 max-w-[1360px] rounded-[24px] border bg-white px-4 py-5 shadow-[0_14px_40px_rgba(15,23,42,0.07)] sm:px-8 lg:px-16",
            drag ? "border-[#FF8A5B] ring-4 ring-orange-100" : "border-[#EEF0F3]",
          )}
        >
          <div role="tablist" aria-label="What would you like to check?" className="grid grid-cols-2 gap-3">
            {([
              ["url", "Paste a Link", Link2],
              ["file", "Upload a File", Upload],
            ] as const).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => { setMode(value); setError(null); }}
                className={cn(
                  "inline-flex h-[52px] items-center justify-center gap-3 rounded-[14px] text-[16px] font-extrabold transition sm:h-12 sm:text-[17px]",
                  mode === value ? "bg-[linear-gradient(90deg,#FF7A2F,#FF5A1F)] text-white shadow-[0_10px_22px_rgba(255,90,31,0.28)]" : "bg-[#F3F5F8] text-[#111827] hover:bg-[#ECEFF3]",
                )}
              >
                <Icon className="h-6 w-6" strokeWidth={2.1} /> {label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
            {mode === "url" ? (
              <label className="flex h-[52px] w-full min-w-0 items-center md:flex-1 gap-3 rounded-full border border-[#E1E5EB] bg-white px-5 transition focus-within:border-[#FF8B61] focus-within:ring-4 focus-within:ring-orange-100 md:h-12">
                <Link2 className="h-6 w-6 shrink-0 text-[#64748B]" strokeWidth={2} />
                <input
                  ref={urlRef}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void run()}
                  placeholder="Paste a URL here (e.g., https://example.com)"
                  aria-label="Link to check"
                  inputMode="url"
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent text-[16px] font-medium text-[#111827] outline-none placeholder:font-normal placeholder:text-[#64748B]"
                />
                {url ? <button type="button" onClick={() => setUrl("")} aria-label="Clear link" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button> : null}
              </label>
            ) : (
              <div className="flex h-[52px] w-full min-w-0 items-center gap-3 rounded-full border border-dashed md:flex-1 border-[#D5DAE1] bg-white px-5 md:h-12">
                <Upload className="h-6 w-6 shrink-0 text-[#64748B]" strokeWidth={2} />
                {file ? (
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[#111827]">{file.name} <span className="font-normal text-[#64748B]">· {formatBytes(file.size)}</span></span>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()} className="min-w-0 flex-1 truncate text-left text-[16px] text-[#64748B]">Choose a file or drag it here (max 4 MB)</button>
                )}
                {file ? (
                  <button type="button" onClick={() => pickFile(null)} aria-label="Remove file" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
                ) : null}
                <button type="button" onClick={() => fileRef.current?.click()} className="shrink-0 rounded-full bg-[#F3F5F8] px-4 py-1.5 text-[13px] font-bold text-[#111827] hover:bg-[#ECEFF3]">{file ? "Replace" : "Browse"}</button>
                <input ref={fileRef} type="file" hidden accept={ACCEPT} onChange={(e) => { pickFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
              </div>
            )}
            {checkBtn}
          </div>

          {hint ? <p className="mt-3 flex items-center justify-center gap-2 text-center text-[13px] font-semibold text-[#C2410C]"><BadgeCheck className="h-4 w-4 shrink-0" /> {hint}</p> : null}
          {loadingSaved ? <p className="mt-3 flex items-center justify-center gap-2 text-[13px] font-semibold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Opening your saved result…</p> : null}
          {error ? (
            <div className="mx-auto mt-3 flex max-w-[900px] flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3" role="alert">
              <p className="text-[13px] font-semibold text-rose-700">{error}</p>
              {canRun ? <button type="button" onClick={() => void run()} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"><RefreshCw className="h-3.5 w-3.5" /> Try again</button> : null}
            </div>
          ) : null}
          <p className="mx-auto mt-4 flex max-w-[760px] items-start justify-center gap-2 text-center text-[13.5px] leading-5 text-[#1F2937] sm:text-[13px]">
            <Info className="mt-0.5 h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            <span><b>Supports:</b> Websites (URLs), PDFs, Images (JPG/PNG), Videos (MP4/MOV), e-books, and other digital files.</span>
          </p>
        </section>

        {/* Features */}
        <ul className="mx-auto mt-6 grid max-w-[1380px] grid-cols-5 gap-1.5 sm:flex sm:items-center sm:justify-center sm:gap-0">
          {FEATURES.map((f, i) => (
            <li key={f.label} className="flex min-w-0 items-center">
              {i > 0 ? <span aria-hidden className="hidden h-8 w-px bg-[#E2E5EA] sm:mx-6 sm:block lg:mx-8" /> : null}
              <span className="flex w-full flex-col items-center gap-1 rounded-[16px] bg-white px-1 py-2 text-center text-[10.5px] font-extrabold leading-tight text-[#111827] shadow-[0_6px_18px_rgba(15,23,42,0.07)] min-[440px]:text-[12px] sm:w-auto sm:flex-row sm:text-left sm:gap-2.5 sm:rounded-full sm:px-6 sm:py-3 sm:text-[15px]">
                <f.icon className="h-5 w-5 shrink-0 min-[440px]:h-6 min-[440px]:w-6 sm:h-7 sm:w-7" strokeWidth={1.9} /> <span className="min-w-0 sm:whitespace-nowrap">{f.label}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* Categories */}
        <div className="mx-auto mt-6 grid max-w-[1600px] grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => chooseCategory(c.mode)}
              className={cn("group relative flex min-h-[190px] min-w-0 flex-col overflow-hidden rounded-[22px] border border-[#EEF0F3] p-3.5 text-left shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(15,23,42,0.09)] sm:min-h-[210px] sm:p-7", c.bg)}
            >
              <span className={cn("grid h-9 w-9 place-items-center rounded-[10px] text-white shadow-md sm:h-[34px] sm:w-[34px]", c.tile)}><c.icon className="h-5 w-5" strokeWidth={2.2} /></span>
              <div className="relative z-10 mt-3 sm:max-w-[58%]">
                <h2 className="text-[15px] font-black leading-[1.18] tracking-[-0.01em] text-[#111827] sm:text-[20px]">{c.title}</h2>
                <p className="mt-1.5 text-[12.5px] leading-[1.35] text-[#1F2937] sm:mt-2 sm:text-[14.5px]">{c.text}</p>
              </div>
              <c.Art className="absolute right-1.5 top-2 h-[58px] w-[74px] sm:right-4 sm:top-1/2 sm:h-[118px] sm:w-[148px] sm:-translate-y-1/3" />
            </button>
          ))}
        </div>

        {/* How it works */}
        <section className="mx-auto mt-6 flex max-w-[1600px] flex-col gap-5 rounded-[22px] border border-[#F6E3D7] bg-[linear-gradient(100deg,#FFF6F0_0%,#FFF2EA_100%)] p-5 shadow-[0_8px_26px_rgba(255,90,31,0.06)] min-[440px]:flex-row min-[440px]:items-center min-[440px]:gap-5 sm:gap-8 sm:px-10 sm:py-6">
          <div className="flex shrink-0 flex-col items-start gap-3 min-[440px]:w-[36%] sm:w-[30%] sm:flex-row sm:items-center sm:gap-5 lg:w-[26%]">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white shadow-[0_6px_16px_rgba(255,90,31,0.12)]"><Layers className="h-9 w-9 text-[#FF5A1F]" strokeWidth={2} /></span>
            <span className="hidden h-16 w-0.5 bg-[#F2A57B] lg:block" />
            <div>
              <h2 className="text-[24px] font-black tracking-[-0.01em] text-[#111827]">How It Works</h2>
              <p className="mt-1 text-[15px] leading-6 text-[#1F2937]">A simple, fast, and reliable process in three easy steps.</p>
            </div>
          </div>
          <span className="hidden h-24 w-0.5 shrink-0 bg-[#F2A57B] min-[440px]:block lg:hidden" />
          <ol className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-2">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex flex-col lg:flex-row lg:items-center">
                <div className="flex items-start gap-3">
                  <span className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#FF8A3D,#FF5A1F)] text-[15px] font-black text-white shadow-[0_6px_14px_rgba(255,90,31,0.30)]">{i + 1}</span>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#FF5A1F] shadow-[0_4px_12px_rgba(255,90,31,0.10)]"><s.icon className="h-6 w-6" strokeWidth={2.1} /></span>
                  <div className="min-w-0">
                    <p className="text-[16px] font-extrabold text-[#111827]">{s.title}</p>
                    <p className="max-w-[230px] text-[13.5px] leading-5 text-[#1F2937]">{s.text}</p>
                  </div>
                </div>
                {i < STEPS.length - 1 ? <ArrowRight aria-hidden className="ml-[70px] mt-1 h-5 w-5 rotate-90 text-[#64748B] lg:mx-4 lg:mt-0 lg:rotate-0" /> : null}
              </li>
            ))}
          </ol>
        </section>

        <p className="mt-7 text-center text-[11px] leading-5 text-slate-400">Jimvio reports evidence-based signals, not legal judgments. Uploaded files are checked in memory and are not stored.</p>
      </div>
    </main>
  );
}
