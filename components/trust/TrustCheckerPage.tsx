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
import { TrustScanHistory } from "./TrustScanHistory";
import type { LocalPreview } from "./results/MediaResult";
import { EngagementArt, HeroWave, MediaArt, ProductArt, ScamArt } from "./TrustLandingArt";
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
  { key: "links", title: "Scam & Malicious Link Detection", text: "Check websites and links for threats, phishing, and security risks.", icon: ShieldCheck, tile: "bg-[linear-gradient(135deg,#FF8A4C,#FF5A1F)]", bg: "bg-[linear-gradient(140deg,#FFF6F0_0%,#FFFFFF_62%)]", Art: ScamArt, mode: "url" as Mode },
  { key: "engagement", title: "Engagement & Traffic Detection", text: "Review available public engagement signals and platform metadata. Private reach and website traffic cannot be verified.", icon: ChartColumnIncreasing, tile: "bg-[linear-gradient(135deg,#FF8A4C,#FF5A1F)]", bg: "bg-[linear-gradient(140deg,#FFF6F0_0%,#FFFFFF_62%)]", Art: EngagementArt, mode: "url" as Mode },
  { key: "product", title: "Digital Product Verification", text: "Verify e-books, PDFs, templates, and other digital products.", icon: Layers, tile: "bg-[linear-gradient(135deg,#FF8A4C,#FF5A1F)]", bg: "bg-[linear-gradient(140deg,#FFF6F0_0%,#FFFFFF_62%)]", Art: ProductArt, mode: "file" as Mode },
  { key: "media", title: "Media Metadata & Provenance", text: "Inspect available media metadata and provenance markers. This is not a deepfake detector or global copyright search.", icon: ImageIcon, tile: "bg-[linear-gradient(135deg,#FF8A4C,#FF5A1F)]", bg: "bg-[linear-gradient(140deg,#FFF6F0_0%,#FFFFFF_62%)]", Art: MediaArt, mode: "file" as Mode },
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
  const [sharedUntil, setSharedUntil] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (report) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [report]);

  // Reopen a saved result from ?scan=<id> (owner only), or a shared copy from ?scan=<id>&share=<token>.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const id = q.get("scan");
    const share = q.get("share");
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return;
    setLoadingSaved(true);
    fetch(`/api/trust-checker/scan/${encodeURIComponent(id)}${share ? `?share=${encodeURIComponent(share)}` : ""}`, { cache: "no-store" })
      .then(async (r) => {
        const p = await r.json().catch(() => ({}));
        if (!r.ok || !p.report) {
          throw new Error(
            share && typeof p.error === "string" ? p.error
              : r.status === 404 ? "This result is private to the person who ran the check, or it no longer exists. Ask them to use Share to send you a link."
              : "The saved result couldn't be loaded. Try again.",
          );
        }
        setSharedUntil(p.shared?.expiresAt ?? null);
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
    setSharedUntil(null);
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
    setSharedUntil(null);
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
      <main className="relative min-h-screen overflow-x-clip bg-[linear-gradient(180deg,#FFFAF6_0%,#F8F9FB_360px)] pb-16">
        <HeroWave side="right" className="tc-fade pointer-events-none absolute right-0 top-0 h-[160px] w-[220px] opacity-70 sm:h-[240px] sm:w-[380px]" />
        <div className="relative mx-auto max-w-[1600px] px-4 pb-8 pt-4 sm:px-6 lg:px-8 xl:px-10">
          {sharedUntil ? (
            <p role="status" className="mb-4 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-[13.5px] leading-5 text-[#334155]">
              <b className="text-[#111827]">Shared result.</b> Someone shared this read-only copy of their check with you. The link works until {new Date(sharedUntil).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}.
            </p>
          ) : null}
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
      className="tc-press group/btn inline-flex h-[52px] w-full shrink-0 items-center justify-center gap-2.5 rounded-full bg-[linear-gradient(90deg,#FF7A2F,#FF5A1F)] px-8 text-[17px] font-extrabold text-white shadow-[0_10px_24px_rgba(255,90,31,0.30)] transition duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(255,90,31,0.38)] active:translate-y-0 active:scale-[0.98] disabled:cursor-wait disabled:opacity-80 md:h-12 md:w-auto md:text-[16px]"
    >
      {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-6 w-6" strokeWidth={2} />}
      {busy ? "Checking…" : "Check Now"}
      {!busy ? <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover/btn:translate-x-1" strokeWidth={2.4} /> : null}
    </button>
  );

  return (
    <main className="relative min-h-screen overflow-x-clip bg-[linear-gradient(180deg,#FFFBF8_0%,#FBFBFC_420px)] pb-16">
      <HeroWave side="left" className="tc-fade pointer-events-none absolute left-0 top-10 h-[200px] w-[260px] sm:top-16 sm:h-[300px] sm:w-[480px]" />
      <HeroWave side="right" className="tc-fade pointer-events-none absolute right-0 top-0 h-[180px] w-[240px] sm:h-[280px] sm:w-[440px]" />
      <span aria-hidden className="tc-twinkle pointer-events-none absolute left-[26%] top-[150px] hidden h-1.5 w-1.5 rounded-full bg-[#FF9A66] sm:block" />
      <span aria-hidden className="tc-twinkle pointer-events-none absolute right-[27%] top-[165px] hidden h-1.5 w-1.5 rounded-full bg-[#FF9A66] [animation-delay:1.2s] sm:block" />
      <span aria-hidden className="tc-twinkle pointer-events-none absolute right-[9%] top-[235px] h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)] [animation-delay:2s]" />

      <div className="relative mx-auto max-w-[1600px] px-4 pb-8 pt-4 sm:px-6 lg:px-10">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2.5 text-[15px] font-bold text-[#111827] sm:text-[14px]">
          <Link href="/" aria-label="Home" className="hover:text-[#FF5A1F]"><House className="h-5 w-5 fill-current" /></Link>
          <ChevronRight className="h-4 w-4 text-slate-400" />
          <span>Trust Checker</span>
        </nav>

        {/* Hero */}
        <header className="mx-auto mt-1 flex max-w-[1100px] flex-col items-center text-center">
          <span className="tc-pop grid h-[84px] w-[84px] place-items-center rounded-[24px] border border-[#FFD9C5] bg-[linear-gradient(160deg,#FFFFFF_0%,#FFE8DA_100%)] shadow-[0_14px_34px_rgba(255,90,31,0.20)] sm:h-[100px] sm:w-[100px]">
            <ShieldCheck className="tc-float h-12 w-12 text-[#FF5A1F] sm:h-[60px] sm:w-[60px]" strokeWidth={2} />
          </span>
          <h1 className="tc-rise mt-3 whitespace-nowrap text-[28px] font-black leading-tight tracking-[-0.035em] text-[#111827] [animation-delay:80ms] min-[430px]:text-[32px] sm:text-[46px] lg:text-[52px]">
            Jimvio <span className="text-[#FF5A1F]">Trust Checker</span>
          </h1>
          <p className="tc-rise mt-2 max-w-[1100px] text-[15px] leading-6 text-[#1F2937] [animation-delay:160ms] sm:text-[17px]">
            Review links, public engagement signals, digital product files, and media metadata with evidence-based findings and clear verification limits.
          </p>
          <span className="tc-rise mt-4 inline-flex items-center gap-2.5 rounded-full border border-[#FFE0CF] bg-[#FFF1E9] px-6 py-2.5 text-[15px] font-extrabold text-[#FF5A1F] shadow-[0_4px_14px_rgba(255,90,31,0.10)] [animation-delay:240ms]">
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
            "tc-rise mx-auto mt-7 max-w-[1360px] rounded-[26px] border bg-white/95 px-4 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur [animation-delay:300ms] sm:px-8 sm:py-7 lg:px-16",
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
                  "tc-press inline-flex h-[52px] items-center justify-center gap-3 rounded-[16px] text-[16px] font-extrabold transition-all duration-300 ease-out active:scale-[0.98] sm:h-[52px] sm:text-[17px]",
                  mode === value ? "bg-[linear-gradient(90deg,#FF7A2F,#FF5A1F)] text-white shadow-[0_10px_22px_rgba(255,90,31,0.28)]" : "bg-[#F4F6F9] text-[#111827] hover:bg-[#FFF1E9] hover:text-[#C2410C]",
                )}
              >
                <Icon className="h-6 w-6 transition-transform duration-300" strokeWidth={2.1} /> {label}
              </button>
            ))}
          </div>

          <div key={mode} className="tc-swap mt-4 flex flex-col gap-3 md:flex-row md:items-center">
            {mode === "url" ? (
              <label className="flex h-[52px] w-full min-w-0 items-center md:flex-1 gap-3 rounded-full border border-[#E1E5EB] bg-white px-5 transition focus-within:border-[#FF8B61] focus-within:ring-4 focus-within:ring-orange-100 md:h-12">
                <Link2 className="h-6 w-6 shrink-0 text-[#FF5A1F]" strokeWidth={2} />
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
                <Upload className="h-6 w-6 shrink-0 text-[#FF5A1F]" strokeWidth={2} />
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
          <div className="mt-5 flex justify-center">
            <p className="inline-flex max-w-[820px] items-start gap-2 rounded-[14px] bg-[#FFF7F2] px-4 py-2.5 text-left text-[13px] leading-5 text-[#1F2937] sm:items-center sm:rounded-full sm:px-5 sm:text-[13.5px]">
              <Info className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#FF5A1F] sm:mt-0" strokeWidth={2.2} />
              <span><b>Supports:</b> Websites (URLs), PDFs, Images (JPG/PNG), Videos (MP4/MOV), e-books, and other digital files.</span>
            </p>
          </div>
        </section>

        {/* Features */}
        <ul className="mx-auto mt-10 grid max-w-[1400px] grid-cols-5 sm:mt-11 lg:flex lg:items-center lg:justify-between">
          {FEATURES.map((f, i) => (
            <li key={f.label} style={{ animationDelay: `${380 + i * 60}ms` }} className="tc-rise flex min-w-0 items-center justify-center lg:flex-1">
              {i > 0 ? <span aria-hidden className="h-10 w-px shrink-0 bg-[#E7E9ED] lg:h-8" /> : null}
              <span className="group/feat flex min-w-0 flex-1 flex-col items-center gap-1.5 px-1 text-center text-[11px] font-extrabold leading-tight text-[#111827] min-[440px]:text-[12.5px] sm:text-[14px] lg:flex-none lg:flex-row lg:gap-3 lg:rounded-full lg:border lg:border-[#F1F2F5] lg:bg-white lg:px-6 lg:py-3 lg:text-left lg:text-[15px] lg:shadow-[0_4px_14px_rgba(15,23,42,0.04)] lg:transition lg:duration-300 lg:hover:-translate-y-0.5 lg:hover:shadow-[0_8px_20px_rgba(255,90,31,0.10)]">
                <f.icon className="h-6 w-6 shrink-0 text-[#FF5A1F] transition-transform duration-300 group-hover/feat:scale-110 sm:h-7 sm:w-7" strokeWidth={2} /> <span className="min-w-0 lg:whitespace-nowrap">{f.label}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* Categories */}
        <div className="mx-auto mt-9 grid max-w-[1600px] grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
          {CATEGORIES.map((c, i) => (
            <button
              key={c.key}
              type="button"
              onClick={() => chooseCategory(c.mode)}
              style={{ animationDelay: `${520 + i * 80}ms` }}
              className={cn("tc-rise group relative flex h-full min-h-[190px] min-w-0 flex-col overflow-hidden rounded-[22px] border border-[#F1ECE8] p-3.5 text-left shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition duration-300 ease-out hover:-translate-y-1 hover:border-[#FFD9C5] hover:shadow-[0_18px_40px_rgba(255,90,31,0.12)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100 sm:min-h-[214px] sm:p-7", c.bg)}
            >
              <span className={cn("grid h-9 w-9 place-items-center rounded-[10px] text-white shadow-[0_6px_14px_rgba(255,90,31,0.28)] transition-transform duration-300 group-hover:scale-105 sm:h-[34px] sm:w-[34px]", c.tile)}><c.icon className="h-5 w-5" strokeWidth={2.2} /></span>
              <div className="relative z-10 mt-3 sm:max-w-[58%]">
                <h2 className="text-[15px] font-black leading-[1.18] tracking-[-0.01em] text-[#111827] sm:text-[20px]">{c.title}</h2>
                <p className="mt-1.5 text-[12.5px] leading-[1.35] text-[#1F2937] sm:mt-2 sm:text-[14.5px]">{c.text}</p>
              </div>
              <span className="absolute right-1.5 top-2 transition-transform duration-500 ease-out group-hover:-translate-y-1 group-hover:scale-[1.04] sm:right-4 sm:top-1/2 sm:-translate-y-1/3 sm:group-hover:-translate-y-[38%]"><c.Art className="h-[58px] w-[74px] sm:h-[118px] sm:w-[148px]" /></span>
            </button>
          ))}
        </div>

        {/* How it works */}
        <section className="tc-rise mx-auto mt-6 flex max-w-[1600px] flex-col gap-5 rounded-[24px] border border-[#F6E6DC] bg-[linear-gradient(100deg,#FFF8F3_0%,#FFFFFF_55%,#FFF6F0_100%)] p-5 shadow-[0_10px_30px_rgba(255,90,31,0.06)] [animation-delay:820ms] sm:p-7 lg:flex-row lg:items-center lg:gap-8 lg:px-10 lg:py-6">
          <div className="flex shrink-0 items-center gap-4 lg:w-[27%] lg:gap-5">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white shadow-[0_8px_20px_rgba(255,90,31,0.14)] sm:h-16 sm:w-16"><Layers className="h-8 w-8 text-[#FF5A1F] sm:h-9 sm:w-9" strokeWidth={2} /></span>
            <span className="h-14 w-0.5 shrink-0 rounded bg-[#FF8A5B]" />
            <div>
              <h2 className="text-[21px] font-black tracking-[-0.01em] text-[#111827] sm:text-[24px]">How It Works</h2>
              <p className="mt-0.5 text-[13.5px] leading-5 text-[#1F2937] sm:text-[15px] sm:leading-6">A simple, fast, and reliable process in three easy steps.</p>
            </div>
          </div>
          <span className="hidden h-16 w-px shrink-0 bg-[#F0D6C7] lg:block" />
          <ol className="grid flex-1 grid-cols-[1fr_auto_1fr_auto_1fr] items-start gap-1.5 sm:gap-3 lg:items-center">
            {STEPS.map((s, i) => (
              <li key={s.title} className="contents">
                <div className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-start sm:gap-3">
                  <div className="flex items-center gap-1.5 sm:gap-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#FF8A3D,#FF5A1F)] text-[14px] font-black text-white shadow-[0_6px_14px_rgba(255,90,31,0.30)] sm:h-9 sm:w-9 sm:text-[15px]">{i + 1}</span>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#FF5A1F] shadow-[0_4px_12px_rgba(255,90,31,0.12)] sm:h-11 sm:w-11"><s.icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.1} /></span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-extrabold text-[#111827] sm:text-[16px]">{s.title}</p>
                    <p className="text-[11.5px] leading-[1.35] text-[#1F2937] sm:max-w-[230px] sm:text-[13.5px] sm:leading-5">{s.text}</p>
                  </div>
                </div>
                {i < STEPS.length - 1 ? <ArrowRight aria-hidden className="mt-2.5 h-4 w-4 shrink-0 text-[#475569] sm:h-5 sm:w-5 lg:mt-0" strokeWidth={2.2} /> : null}
              </li>
            ))}
          </ol>
        </section>

        <div className="mx-auto mt-6 max-w-[1600px]">
          <TrustScanHistory
            refreshKey={0}
            onOpenReport={(saved) => {
              setError(null);
              setSharedUntil(null);
              setPreview(null);
              setReport(saved);
              if (saved.id) window.history.replaceState(null, "", `/trust-checker?scan=${encodeURIComponent(saved.id)}`);
              window.scrollTo({ top: 0 });
            }}
          />
        </div>

        <p className="mt-7 text-center text-[11px] leading-5 text-slate-400">Jimvio reports evidence-based signals, not legal judgments. Uploaded files are checked in memory and are not stored.</p>
      </div>
    </main>
  );
}
