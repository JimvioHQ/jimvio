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
    if (f.size > MAX_BYTES) {
      setError("Files can be up to 4 MB.");
      return;
    }
    setFile(f);
    setMode((m) => (m === "url" ? (url.trim() ? "both" : "file") : m));
  }, [url]);

  const showUrl = mode !== "file";
  const showFile = mode !== "url";
  const canRun = (showUrl && url.trim().length > 3) || (showFile && file != null);

  async function run() {
    if (!canRun || busy) return;
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
      setReport(json.report as ScanReport);
      setHistoryRefresh((value) => value + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The check could not finish. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-[#FFFAF7] pb-20">
      <div className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-6">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(110deg,#FFFFFF_0%,#FFF6F0_45%,#FFE2D0_75%,#FFC9A8_100%)] px-5 pb-8 pt-6 sm:px-10 sm:pt-8">
          <div className="grid items-center gap-6 lg:grid-cols-[1.35fr_1fr]">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#FFD9C4] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#E8430F] shadow-sm">
                <ShieldCheck className="h-4 w-4" /> All-in-One Verification Tool
              </span>
              <h1 className="mt-4 text-[40px] font-extrabold leading-[1.02] tracking-[-0.03em] text-[#0F172A] sm:text-[64px]">
                Jimvio <span className="text-[#FF5A1F]">Trust Checker</span>
              </h1>
              <p className="mt-4 max-w-[760px] text-[16px] font-medium leading-snug text-[#0F172A] sm:text-[19px]">
                Check links, public engagement signals, digital product files, and media metadata — with clear evidence, limits, and next steps in one place.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-4">
                {FEATURES.map((f, i) => (
                  <div key={f.title} className={cn("flex items-center gap-2.5", i > 0 && "lg:border-l lg:border-[#FFD9C4] lg:pl-4")}>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#FFF1EA] text-[#FF5A1F]">
                      <f.icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-semibold leading-tight text-[#0F172A]">{f.title}</span>
                      <span className="block text-[12.5px] text-[#64748B]">{f.sub}</span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-5 max-w-[760px] text-[15px] leading-relaxed text-[#475569] sm:text-[16px]">
                Paste a URL, upload a file, or both, and get a complete trust analysis across websites, social media, digital
                products, and media content with evidence-based results that clearly explain what Jimvio can and cannot verify.
              </p>
            </div>
            <div className="hidden justify-center lg:flex">
              <TrustCheckerArt />
            </div>
          </div>

          {/* Unified input */}
          <div className="relative mt-6 rounded-[22px] border border-[#F1E4DC] bg-white p-4 shadow-[0_10px_40px_rgba(15,23,42,0.06)] sm:p-5">
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
                    "inline-flex h-11 items-center gap-2 rounded-xl px-5 text-[14px] font-semibold transition",
                    mode === m ? "bg-[#FF5A1F] text-white shadow-[0_6px_16px_rgba(255,90,31,0.35)]" : "bg-[#F4F5F7] text-[#0F172A] hover:bg-[#ECEEF1]",
                  )}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_300px]">
              <div className="space-y-3">
                {showUrl ? (
                  <label className="flex h-14 items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white px-4 focus-within:border-[#FF5A1F] focus-within:ring-2 focus-within:ring-[#FF5A1F]/15">
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
                      "flex flex-col gap-3 rounded-xl border border-dashed px-4 py-4 sm:flex-row sm:items-center",
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
                  className="inline-flex h-14 items-center justify-center gap-3 rounded-xl bg-[#FF5A1F] px-5 text-[18px] font-bold text-white shadow-[0_10px_24px_rgba(255,90,31,0.35)] transition hover:bg-[#F04E14] disabled:cursor-not-allowed disabled:opacity-60"
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
        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="What Jimvio checks">
          {CARDS.map((c) => (
            <article key={c.title} className="flex flex-col rounded-[20px] border border-[#F1E4DC] bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-3">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#FFF1EA] text-[#FF5A1F]">
                  <c.icon className="h-7 w-7" />
                </span>
                <h2 className="text-[18px] font-bold leading-tight text-[#0F172A]">{c.title}</h2>
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-[#64748B]">{c.body}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2.5 border-b border-[#F1F5F9] pb-4">
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
