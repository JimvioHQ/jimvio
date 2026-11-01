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
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileUp,
  Globe,
  ImageIcon,
  Instagram,
  Link2,
  Loader2,
  Search,
  ShieldCheck,
  UploadCloud,
  X,
  Youtube,
} from "lucide-react";
import { FaTiktok, FaXTwitter } from "react-icons/fa6";
import { cn } from "@/lib/utils";
import { TrustCheckerArt } from "./TrustCheckerArt";
import { TrustReportView } from "./TrustReportView";
import type { ScanReport } from "@/lib/trust/types";

type Mode = "url" | "file" | "both";
const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPT = "image/*,video/*,audio/*,.pdf,.zip,.epub,.docx,.xlsx,.pptx,.doc,.xls,.ppt,.txt,.md,.csv,.json,.html,.exe,.apk,.dmg";

const FEATURES = [
  { icon: Link2, title: "Links & Websites", sub: "Scam & malware signals" },
  { icon: BarChart3, title: "Social Media", sub: "Public engagement signals" },
  { icon: Box, title: "Digital Products", sub: "File & seller signals" },
  { icon: ImageIcon, title: "Images, Video & Audio", sub: "Metadata & provenance" },
];

const CARDS = [
  {
    icon: Link2,
    title: "Scam & Malicious Link Detection",
    body: "Inspect a website's domain, redirects, TLS and available threat-intelligence signals. Missing data is shown as inconclusive — never as proof that a site is safe.",
    logos: [{ icon: Chrome, color: "#1A73E8" }, { icon: Compass, color: "#0EA5E9" }, { icon: Globe, color: "#0F172A" }, { icon: Search, color: "#0284C7" }],
    tag: "Web links",
    items: ["Phishing and scam-list matches", "Malware and unsafe-download signals", "Redirect-chain inspection", "Domain and SSL signals", "Unavailable threat sources are disclosed"],
  },
  {
    icon: BarChart3,
    title: "Engagement & Traffic Detection",
    body: "Review public engagement signals available from supported platforms. Private reach, impressions and website analytics cannot be independently verified from a public post URL.",
    logos: [{ icon: Youtube, color: "#FF0000" }, { icon: FaTiktok, color: "#111111" }, { icon: Instagram, color: "#D6295C" }, { icon: Facebook, color: "#1877F2" }, { icon: FaXTwitter, color: "#111111" }],
    tag: "Public social signals",
    items: ["Public views, likes and comments when available", "Supported channel statistics", "Public post metadata", "Repetitive-comment indicators", "No invented or inferred view counts"],
  },
  {
    icon: Box,
    title: "Digital Product Verification",
    body: "Inspect uploaded digital files and product-page signals, including fingerprints previously seen on Jimvio. This is not a full antivirus or legal ownership verdict.",
    logos: [{ icon: FileText, color: "#DC2626" }, { icon: FileSpreadsheet, color: "#16A34A" }, { icon: FileCode, color: "#2563EB" }, { icon: FileArchive, color: "#7C3AED" }],
    tag: "Digital files",
    items: ["Duplicate fingerprints within Jimvio", "Basic file-structure risk indicators", "Visible product-page claims", "Seller and refund-policy signals", "Ownership and licensing need evidence"],
  },
  {
    icon: ImageIcon,
    title: "AI Media, Deepfake & Copyright",
    body: "Inspect image metadata, available AI/provenance markers and duplicate fingerprints seen on Jimvio. Video/audio metadata is not a deepfake verdict.",
    logos: [{ icon: FileImage, color: "#2563EB" }, { icon: Youtube, color: "#FF0000" }, { icon: AudioLines, color: "#7C3AED" }],
    tag: "Images, video & audio",
    items: ["Available AI/provenance metadata", "Image metadata and dimensions", "Known duplicate image fingerprints", "Video and audio metadata signals", "No global copyright or deepfake verdict"],
  },
];

function bytes(n: number) {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
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

  useEffect(() => {
    if (report) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [report]);

  const pickFile = useCallback((next: File | null) => {
    setError(null);
    if (!next) {
      setFile(null);
      return;
    }
    if (next.size > MAX_BYTES) {
      setError("Files can be up to 4 MB. Choose a smaller file to continue.");
      return;
    }
    if (next.size === 0) {
      setError("This file is empty. Choose a file that contains data.");
      return;
    }
    setFile(next);
    setMode((current) => current === "url" ? (url.trim() ? "both" : "file") : current);
  }, [url]);

  const showUrl = mode !== "file";
  const showFile = mode !== "url";
  const validUrl = (() => {
    if (!showUrl || !url.trim()) return false;
    try {
      const parsed = new URL(url.trim());
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  })();
  const canRun = (showUrl && validUrl) || (showFile && file !== null);

  async function run() {
    if (!canRun || busy) return;
    if (showUrl && url.trim() && !validUrl) {
      setError("Enter a complete http:// or https:// URL.");
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

  function resetScan() {
    setReport(null);
    setError(null);
    setUrl("");
    setFile(null);
    setMode("url");
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="min-h-screen bg-[#FFFAF7] pb-16 text-[#111827]">
      <div className="mx-auto max-w-[1440px] px-4 pt-4 sm:px-6 lg:px-8">
        <section className="relative isolate overflow-hidden rounded-[30px] border border-[#FFE1D2] bg-[linear-gradient(112deg,#FFFFFF_0%,#FFF8F4_42%,#FFE9DC_72%,#FFD0B5_100%)] shadow-[0_18px_60px_rgba(124,45,18,0.07)]">
          <div className="pointer-events-none absolute -right-24 -top-24 -z-10 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(255,90,31,0.24),transparent_68%)]" />
          <div className="grid items-center gap-2 px-5 pb-7 pt-7 sm:px-8 sm:pt-9 lg:grid-cols-[1.25fr_0.75fr] lg:px-12 lg:pb-8">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#FFD7C4] bg-white/90 px-3.5 py-2 text-xs font-bold tracking-wide text-[#E8430F] shadow-sm">
                <ShieldCheck className="h-4 w-4" /> ALL-IN-ONE VERIFICATION TOOL
              </span>
              <h1 className="mt-5 max-w-[850px] text-[42px] font-black leading-[0.98] tracking-[-0.055em] text-[#0B1738] sm:text-[58px] xl:text-[72px]">
                Jimvio <span className="text-[#FF4F1A]">Trust Checker</span>
              </h1>
              <p className="mt-5 max-w-[790px] text-[16px] font-medium leading-[1.55] text-[#17233F] sm:text-[18px]">
                Check links, social media, digital products, images, videos and audio — detect scams, suspicious engagement, unsafe files, duplicates and available AI or provenance signals, with clear evidence and limitations.
              </p>
              <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-4 lg:grid-cols-4">
                {FEATURES.map((feature, index) => (
                  <div key={feature.title} className={cn("flex min-w-0 items-center gap-3", index > 0 && "lg:border-l lg:border-[#FFCDB6] lg:pl-4")}>
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-[#FF5A1F] shadow-[0_5px_18px_rgba(255,90,31,0.12)]">
                      <feature.icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-bold leading-tight text-[#101B38] sm:text-sm">{feature.title}</span>
                      <span className="mt-1 block text-[11px] leading-snug text-[#64748B] sm:text-xs">{feature.sub}</span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-7 max-w-[760px] text-[14px] leading-relaxed text-[#53627E] sm:text-[15px]">
                Paste a URL, upload a file, or combine both. Jimvio runs the checks that apply and explains what was found, what could not be verified, and what to do next.
              </p>
            </div>
            <div className="hidden min-h-[300px] items-center justify-center lg:flex">
              <TrustCheckerArt />
            </div>
          </div>

          <div className="mx-4 mb-4 rounded-[24px] border border-[#F5D9CB] bg-white/95 p-4 shadow-[0_16px_44px_rgba(15,23,42,0.08)] backdrop-blur sm:mx-6 sm:mb-6 sm:p-5 lg:mx-7 lg:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#111B37]">Start a trust check</p>
                <p className="mt-1 text-xs text-[#64748B]">Choose what you want to inspect. You can submit a link, a file, or both.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF3EC] px-3 py-1.5 text-[11px] font-semibold text-[#D94714]">
                <ShieldCheck className="h-3.5 w-3.5" /> Evidence-led results
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Verification input mode">
              {([
                ["url", "Paste URL", Link2],
                ["file", "Upload File", FileUp],
                ["both", "Paste & Upload", ImageIcon],
              ] as const).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={mode === value}
                  onClick={() => { setMode(value); setError(null); }}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2",
                    mode === value ? "bg-[#FF4F1A] text-white shadow-[0_7px_18px_rgba(255,79,26,0.25)]" : "bg-[#F2F4F8] text-[#182440] hover:bg-[#E9EDF4]",
                  )}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
              <div className="min-w-0 space-y-3">
                {showUrl ? (
                  <label className="flex min-h-[58px] items-center gap-3 rounded-xl border border-[#D8DFEA] bg-white px-4 transition focus-within:border-[#FF5A1F] focus-within:ring-4 focus-within:ring-[#FF5A1F]/10">
                    <Link2 className="h-5 w-5 shrink-0 text-[#1B2A4A]" aria-hidden="true" />
                    <input
                      value={url}
                      onChange={(event) => { setUrl(event.target.value); setError(null); }}
                      onKeyDown={(event) => { if (event.key === "Enter") void run(); }}
                      placeholder="Paste a website, social post, product page or direct media URL"
                      className="h-full min-w-0 flex-1 bg-transparent py-3 text-sm text-[#111B37] outline-none placeholder:text-[#8290A8] sm:text-[15px]"
                      inputMode="url"
                      autoComplete="url"
                      aria-label="URL to verify"
                    />
                    {url ? (
                      <button type="button" onClick={() => { setUrl(""); setError(null); }} aria-label="Clear URL" className="rounded-lg p-2 text-[#5D6A82] transition hover:bg-[#F1F4F8] hover:text-[#101B38]">
                        <X className="h-5 w-5" />
                      </button>
                    ) : null}
                  </label>
                ) : null}

                {showFile ? (
                  <div
                    onDragOver={(event) => { event.preventDefault(); setDrag(true); }}
                    onDragLeave={(event) => { event.preventDefault(); setDrag(false); }}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDrag(false);
                      pickFile(event.dataTransfer.files?.[0] ?? null);
                    }}
                    className={cn(
                      "flex min-h-[76px] flex-col gap-3 rounded-xl border border-dashed px-4 py-3 transition sm:flex-row sm:items-center",
                      drag ? "border-[#FF5A1F] bg-[#FFF2EA]" : "border-[#CCD5E3] bg-[#F8FAFC]",
                    )}
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#17264A] shadow-sm">
                      <UploadCloud className="h-6 w-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      {file ? (
                        <>
                          <p className="truncate text-sm font-bold text-[#101B38]">{file.name}</p>
                          <p className="mt-1 text-xs text-[#64748B]">{file.type || "File type will be inspected"} · {bytes(file.size)} · Ready to scan</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-[#101B38]">Drag and drop a file here, or browse</p>
                          <p className="mt-1 text-xs leading-relaxed text-[#64748B]">Images, video, audio, PDF, Office, ZIP and supported documents · Maximum 4 MB</p>
                        </>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {file ? (
                        <button type="button" onClick={() => pickFile(null)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#DCE3ED] bg-white px-3 text-xs font-bold text-[#4B5871] hover:bg-[#F8FAFC]">
                          <X className="h-4 w-4" /> Remove
                        </button>
                      ) : null}
                      <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#DCE3ED] bg-white px-4 text-sm font-bold text-[#14203D] shadow-sm hover:border-[#FFB99A] hover:bg-[#FFFAF7]">
                        <FileUp className="h-4 w-4" /> {file ? "Replace file" : "Choose file"}
                      </button>
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      hidden
                      accept={ACCEPT}
                      onChange={(event) => {
                        pickFile(event.target.files?.[0] ?? null);
                        event.target.value = "";
                      }}
                    />
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col justify-center gap-3">
                <button
                  type="button"
                  disabled={!canRun || busy}
                  onClick={() => void run()}
                  className="inline-flex min-h-[58px] items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#FF5A1F] to-[#F04412] px-5 text-base font-extrabold text-white shadow-[0_10px_24px_rgba(255,79,26,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(255,79,26,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Search className="h-5 w-5" aria-hidden="true" />}
                  {busy ? "Checking…" : "Run Full Check"}
                  {!busy ? <ArrowRight className="h-5 w-5" aria-hidden="true" /> : null}
                </button>
                <p className="text-center text-xs leading-relaxed text-[#64748B]" aria-live="polite">
                  {busy ? "The verification engine is checking the submitted input. Results will appear when the scan finishes." : "Only applicable checks run. Results reflect the evidence actually returned."}
                </p>
                {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-center text-xs font-semibold text-rose-700" role="alert">{error}</p> : null}
              </div>
            </div>
          </div>
        </section>

        <div ref={resultRef} className="scroll-mt-24" aria-live="polite">
          {report ? <TrustReportView report={report} onRunAnother={resetScan} /> : null}
        </div>

        <section className="mt-10" aria-labelledby="trust-capabilities-heading">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#F0521A]">One place. Four checkers.</p>
              <h2 id="trust-capabilities-heading" className="mt-1 text-2xl font-black tracking-tight text-[#101B38] sm:text-[30px]">What Jimvio can verify</h2>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-[#64748B]">Capabilities depend on public data, supported formats and available providers. We show unavailable checks instead of guessing.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {CARDS.map((card) => (
              <article key={card.title} className="group flex h-full flex-col rounded-[22px] border border-[#F2E1D8] bg-white p-5 shadow-[0_5px_24px_rgba(15,23,42,0.035)] transition duration-200 hover:-translate-y-1 hover:border-[#FFC6AC] hover:shadow-[0_16px_36px_rgba(124,45,18,0.09)]">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#FFF0E8] text-[#FF5A1F] transition group-hover:bg-[#FFE4D6]">
                    <card.icon className="h-6 w-6" />
                  </span>
                  <h3 className="text-[16px] font-extrabold leading-tight text-[#101B38]">{card.title}</h3>
                </div>
                <p className="mt-4 min-h-[92px] text-[13px] leading-[1.65] text-[#5C6982]">{card.body}</p>
                <div className="mt-3 flex min-h-10 flex-wrap items-center gap-3 border-b border-[#F1E7E1] pb-4">
                  {card.logos.map((logo, index) => (
                    <logo.icon key={index} className="h-5 w-5" style={{ color: logo.color }} aria-hidden="true" />
                  ))}
                  <span className="text-[11px] font-medium text-[#7A879C]">{card.tag}</span>
                </div>
                <ul className="mt-4 space-y-2.5">
                  {card.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[12.5px] leading-snug text-[#26334E]">
                      <span className="mt-px grid h-[17px] w-[17px] shrink-0 place-items-center rounded-full bg-[#FF5A1F] text-white">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-8 flex flex-col items-center gap-2 border-t border-[#F1E2D9] pt-5 text-center">
          <span className="inline-flex items-center gap-2 text-xs font-bold text-[#47546C]"><ShieldCheck className="h-4 w-4 text-[#FF5A1F]" /> Privacy-conscious, evidence-led checks</span>
          <p className="max-w-3xl text-[11.5px] leading-relaxed text-[#8A95A8]">Results are signals based on available evidence, not legal, antivirus or ownership certifications. Uploaded files are processed in memory and are not stored as downloadable files.</p>
        </div>
      </div>
    </main>
  );
}
