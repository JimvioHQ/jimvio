"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  AudioLines,
  BarChart3,
  Box,
  Check,
  Chrome,
  Compass,
  Facebook,
  FileArchive,
  FileText,
  FileUp,
  Globe,
  ImageIcon,
  Images,
  Instagram,
  Link2,
  Loader2,
  Music2,
  Search,
  ShieldCheck,
  Twitter,
  UploadCloud,
  X,
  Youtube,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TrustCheckerArt } from "./TrustCheckerArt";
import { TrustReportView } from "./TrustReportView";
import { TrustScanHistory } from "./TrustScanHistory";
import type { ScanReport } from "@/lib/trust/types";

type Mode = "url" | "file" | "both";
const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPT = "image/*,video/*,audio/*,.pdf,.zip,.epub,.docx,.xlsx,.pptx,.doc,.xls,.ppt,.txt,.md,.csv,.json,.html,.exe,.apk,.dmg";

const FEATURES = [
  { icon: Link2, title: "Links & Websites", sub: "Scam & Malware" },
  { icon: BarChart3, title: "Social Media", sub: "Public Engagement Signals" },
  { icon: Box, title: "Digital Products", sub: "Originality & Safety" },
  { icon: ImageIcon, title: "Images, Videos & Audio", sub: "Metadata & Provenance Signals" },
];

const CARDS = [
  {
    icon: Link2,
    title: "Scam & Malicious Link Detection",
    body: "Detect scams, phishing, malware, suspicious redirects, fake websites, impersonation, and unsafe downloads.",
    logos: [
      { icon: Chrome, color: "#1A73E8" },
      { icon: Compass, color: "#0EA5E9" },
      { icon: Globe, color: "#F97316" },
      { icon: Search, color: "#0284C7" },
    ],
    tag: "Websites",
    items: ["Phishing & Scam Detection", "Malware & Unsafe Downloads", "Suspicious Redirects", "Fake Websites & Impersonation", "Domain & SSL Analysis"],
  },
  {
    icon: BarChart3,
    title: "Engagement & Traffic Detection",
    body: "Read available public engagement signals. YouTube statistics are checked when API access is available; TikTok and X provide limited post metadata. Private reach and website traffic are not publicly verifiable.",
    logos: [
      { icon: Youtube, color: "#FF0000" },
      { icon: Music2, color: "#111111" },
      { icon: Instagram, color: "#D6295C" },
      { icon: Facebook, color: "#1877F2" },
      { icon: Twitter, color: "#111111" },
    ],
    tag: "Websites",
    items: ["YouTube public views, likes & comments", "YouTube public channel statistics", "TikTok & X public post metadata", "Signals of repetitive comments", "Private reach and website traffic unavailable"],
  },
  {
    icon: Box,
    title: "Digital Product Verification",
    body: "Inspect file structure, repeat fingerprints seen on Jimvio, product-page claims and visible seller details. This is not a full antivirus, legal copyright or ownership verification.",
    logos: [
      { icon: FileText, color: "#DC2626" },
      { icon: FileText, color: "#2563EB" },
      { icon: FileText, color: "#16A34A" },
      { icon: FileText, color: "#EA580C" },
      { icon: FileArchive, color: "#7C3AED" },
    ],
    tag: "Digital Products",
    items: ["Duplicate fingerprints within Jimvio", "Basic file-structure risk indicators", "Product-page claims and visible details", "Seller contact and refund-policy signals", "Ownership and licensing require documents"],
  },
  {
    icon: ImageIcon,
    title: "Media Metadata & Provenance Signals",
    body: "Inspect image metadata and available AI/provenance markers, plus duplicate fingerprints previously seen on Jimvio. Video and audio deepfake detection and global copyright matching are not currently available.",
    logos: [
      { icon: Images, color: "#2563EB" },
      { icon: Youtube, color: "#FF0000" },
      { icon: AudioLines, color: "#7C3AED" },
      { icon: FileText, color: "#9333EA" },
    ],
    tag: "Images, Videos & Audio",
    items: ["AI/provenance metadata markers", "Image metadata and dimensions", "Duplicate image fingerprints on Jimvio", "Video/audio metadata only", "No deepfake or global copyright verdict"],
  },
];

function bytes(n: number) {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

/** Jimvio Trust Checker: one input for links, files or both; four real checks. */
export function TrustCheckerPage() {
  const [mode, setMode] = useState<Mode>("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ScanReport | null>(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (report) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [report]);

  const pickFile = useCallback((f: File | null) => {
    setError(null);
    if (!f) return setFile(null);
    if (f.size === 0) {
      setError("This file is empty. Choose a file that contains data.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("Files can be up to 4 MB.");
      return;
    }
    setFile(f);
    setMode((m) => (m === "url" ? (url.trim() ? "both" : "file") : m));
  }, [url]);

  const showUrl = mode !== "file";
  const showFile = mode !== "url";
  const validUrl = (() => {
    if (!showUrl || !url.trim()) return false;
    const value = url.trim();
    if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !/^https?:\/\//i.test(value)) return false;
    try {
      const parsed = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
      return (parsed.protocol === "http:" || parsed.protocol === "https:")
        && !parsed.username && !parsed.password && ["", "80", "443"].includes(parsed.port);
    } catch {
      return false;
    }
  })();
  const canRun = (showUrl && validUrl) || (showFile && file !== null);

  async function run() {
    if (!canRun || busy) return;
    if (showUrl && url.trim() && !validUrl) {
      setError("Enter a valid website URL, such as example.com or https://example.com.");
      return;
    }
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      const form = new FormData();
      if (showUrl && url.trim()) form.set("url", url.trim());
      if (showFile && file) form.set("file", file);
      const res = await fetch("/api/trust-checker/scan", { method: "POST", body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "The check could not finish. Try again.");
      if (!json.report || !Array.isArray(json.report.checkers) || !json.report.overall) {
        throw new Error("The scan returned an incomplete report. No safety verdict was assumed.");
      }
      setReport(json.report as ScanReport);
      setHistoryRefresh((value) => value + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The check could not finish. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#FFF8F3_0%,#FFFFFF_52%,#FFF9F5_100%)] pb-20">
      <div className="mx-auto max-w-[1488px] px-4 pt-4 sm:px-6 lg:px-6">
        {/* Hero */}
        <section className="relative isolate overflow-hidden rounded-[30px] border border-[#FFE4D6] bg-[radial-gradient(ellipse_at_88%_18%,rgba(255,116,53,0.28),transparent_34%),linear-gradient(112deg,#FFFFFF_0%,#FFF8F4_40%,#FFE9DD_72%,#FFD0B7_100%)] px-5 pb-6 pt-6 shadow-[0_18px_60px_rgba(186,79,34,0.08)] sm:px-8 sm:pb-8 sm:pt-8 lg:px-10">
          <div className="grid items-center gap-5 lg:grid-cols-[1.45fr_0.9fr] xl:gap-8">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#FFD8C4] bg-white/90 px-4 py-2 text-[13px] font-bold text-[#E8430F] shadow-[0_5px_18px_rgba(255,90,31,0.08)]">
                <ShieldCheck className="h-4 w-4" /> All-in-One Verification Tool
              </span>
              <h1 className="mt-4 text-[43px] font-black leading-[0.98] tracking-[-0.055em] text-[#0B1738] sm:text-[68px] xl:text-[76px]">
                Jimvio <span className="text-[#FF5A1F]">Trust Checker</span>
              </h1>
              <p className="mt-4 max-w-[850px] text-[16px] font-semibold leading-[1.38] text-[#101B38] sm:text-[19px] xl:text-[20px]">
                Check links, public engagement signals, digital product files, and media metadata — with clear evidence, limits, and next steps in one place.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 lg:grid-cols-4">
                {FEATURES.map((f, i) => (
                  <div key={f.title} className={cn("flex min-w-0 items-center gap-2.5", i > 0 && "lg:border-l lg:border-[#FFCDB5] lg:pl-4")}>
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#FFE9DE] text-[#F0440C] shadow-[inset_0_0_0_1px_rgba(255,90,31,0.05)]">
                      <f.icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-semibold leading-tight text-[#0F172A]">{f.title}</span>
                      <span className="block text-[12.5px] text-[#64748B]">{f.sub}</span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-5 max-w-[850px] text-[15px] leading-[1.5] text-[#52627F] sm:text-[16px]">
                Paste a URL, upload a file, or both, and get a complete trust analysis across websites, social media, digital
                products, and media content with evidence-based results that clearly explain what Jimvio can and cannot verify.
              </p>
            </div>
            <div className="hidden min-h-[300px] items-center justify-center lg:flex xl:min-h-[330px]">
              <TrustCheckerArt />
            </div>
          </div>

          {/* Unified input */}
          <div className="relative mt-6 rounded-[24px] border border-[#FFE0D0] bg-white/95 p-4 shadow-[0_16px_44px_rgba(32,45,75,0.07)] backdrop-blur-sm sm:p-5 lg:p-6">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="What to check">
              {(
                [
                  ["url", "Paste URL", Link2],
                  ["file", "Upload File", FileUp],
                  ["both", "Paste & Upload", Images],
                ] as const
              ).map(([m, label, Icon]) => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={mode === m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-xl px-5 text-[14px] font-bold transition sm:min-w-[176px] sm:justify-center",
                    mode === m ? "bg-gradient-to-r from-[#FF5A1F] to-[#F0440C] text-white shadow-[0_7px_18px_rgba(255,90,31,0.28)]" : "bg-[#F4F5F7] text-[#0F172A] hover:bg-[#ECEEF1]",
                  )}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_300px]">
              <div className="space-y-3">
                {showUrl ? (
                  <label className="flex h-14 items-center gap-3 rounded-xl border border-[#D7DFEC] bg-white px-4 shadow-[inset_0_1px_2px_rgba(15,23,42,0.025)] transition focus-within:border-[#FF5A1F] focus-within:ring-4 focus-within:ring-[#FF5A1F]/10">
                    <Link2 className="h-5 w-5 shrink-0 text-[#334155]" aria-hidden="true" />
                    <input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && void run()}
                      placeholder="Paste any URL here (website, social media post, product page, image, video, etc.)"
                      className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-[#0F172A] outline-none placeholder:text-[#64748B]"
                      inputMode="url"
                      aria-label="Link to check"
                    />
                    {url ? (
                      <button type="button" onClick={() => setUrl("")} aria-label="Clear link" className="rounded-lg p-1 text-[#0F172A] hover:bg-black/5">
                        <X className="h-5 w-5" />
                      </button>
                    ) : null}
                  </label>
                ) : null}
                {showFile ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDrag(true);
                    }}
                    onDragLeave={() => setDrag(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDrag(false);
                      pickFile(e.dataTransfer.files?.[0] ?? null);
                    }}
                    className={cn(
                      "flex flex-col gap-3 rounded-xl border border-dashed px-4 py-4 transition sm:flex-row sm:items-center sm:px-5",
                      drag ? "border-[#FF5A1F] bg-[#FFF6F1]" : "border-[#CBD5E1] bg-[#F8FAFC]",
                    )}
                  >
                    <UploadCloud className="h-8 w-8 shrink-0 text-[#334155]" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      {file ? (
                        <>
                          <p className="truncate text-[15px] font-semibold text-[#0F172A]">{file.name}</p>
                          <p className="text-[12.5px] text-[#64748B]">
                            {file.type || "Unknown type"} · {bytes(file.size)} · ready to check
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-[15px] font-semibold text-[#0F172A]">Or drag &amp; drop files here</p>
                          <p className="text-[12.5px] text-[#64748B]">
                            Upload image, video, audio, document, or any file (JPG, PNG, MP4, MOV, MP3, PDF, ZIP, etc.) — up to 4 MB
                          </p>
                        </>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {file ? (
                        <button type="button" onClick={() => pickFile(null)} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-3 text-[13px] font-semibold">
                          <X className="h-4 w-4" /> Remove
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-4 text-[14px] font-semibold text-[#0F172A] shadow-sm"
                      >
                        <FileUp className="h-4 w-4" /> {file ? "Replace" : "Choose File"}
                      </button>
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      hidden
                      accept={ACCEPT}
                      onChange={(e) => {
                        pickFile(e.target.files?.[0] ?? null);
                        e.target.value = "";
                      }}
                    />
                  </div>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={!canRun || busy}
                  onClick={() => void run()}
                  className="inline-flex h-14 items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#FF5A1F] to-[#F0440C] px-5 text-[18px] font-extrabold text-white shadow-[0_12px_26px_rgba(255,90,31,0.30)] transition hover:-translate-y-0.5 hover:shadow-[0_15px_30px_rgba(255,90,31,0.34)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                  {busy ? "Checking…" : "Run Full Check"}
                  {!busy ? <ArrowRight className="h-5 w-5" /> : null}
                </button>
                <p className="text-center text-[13px] leading-snug text-[#64748B]">
                  {busy ? "Running every check that applies — usually 5 to 20 seconds." : "Jimvio will automatically run all checks on your link, file, or both."}
                </p>
                {error ? (
                  <p className="rounded-lg bg-rose-50 px-3 py-2 text-center text-[13px] font-medium text-rose-700" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <div ref={resultRef} className="scroll-mt-24">
          {report ? <TrustReportView report={report} /> : null}
        </div>

        <TrustScanHistory refreshKey={historyRefresh} onOpenReport={setReport} />

        {/* Four checkers */}
        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="What Jimvio checks">
          {CARDS.map((c) => (
            <article key={c.title} className="group flex flex-col rounded-[22px] border border-[#F3E5DE] bg-white p-5 shadow-[0_8px_28px_rgba(24,39,75,0.045)] transition duration-200 hover:-translate-y-1 hover:border-[#FFD0B8] hover:shadow-[0_16px_34px_rgba(24,39,75,0.08)] xl:p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#FFF0E7] to-[#FFE1D2] text-[#F0440C] shadow-[inset_0_0_0_1px_rgba(255,90,31,0.05)]">
                  <c.icon className="h-7 w-7" />
                </span>
                <h2 className="text-[18px] font-bold leading-tight text-[#0F172A]">{c.title}</h2>
              </div>
              <p className="mt-3 text-[14px] leading-[1.55] text-[#5B6982]">{c.body}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2.5 border-b border-[#FCE4D8] pb-4">
                {c.logos.map((l, i) => (
                  <l.icon key={i} className="h-6 w-6" style={{ color: l.color }} aria-hidden="true" />
                ))}
                <span className="text-[12px] text-[#64748B]">{c.tag}</span>
              </div>
              <ul className="mt-4 space-y-2.5">
                {c.items.map((it) => (
                  <li key={it} className="flex items-center gap-2.5 text-[14px] text-[#0F172A]">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#FF5A1F] text-white">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {it}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <p className="mt-6 text-center text-[12.5px] text-[#94A3B8]">
          Results are evidence-based signals, not legal judgments. Uploaded files are checked in memory and not stored.
        </p>
      </div>
    </div>
  );
}
