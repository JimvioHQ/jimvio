"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ChevronRight, CircleCheck, CircleHelp, CircleX, Copy, Download, ExternalLink, House, Info, Search, Share2, ShieldCheck, TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssessmentSections, Banner, CheckRow, InfoRow, Pill, Score, Tile, Tone } from "@/lib/trust/result-model";

export const ORANGE = "#FF5A1F";

const PILL: Record<Tone, { cls: string; icon: LucideIcon | null }> = {
  good: { cls: "bg-[#E7F7EC] text-[#15803D]", icon: CircleCheck },
  warn: { cls: "bg-[#FEF3D7] text-[#C2410C]", icon: TriangleAlert },
  bad: { cls: "bg-[#FDE8E8] text-[#DC2626]", icon: CircleX },
  neutral: { cls: "bg-[#EEF1F5] text-[#475569]", icon: null },
  info: { cls: "bg-[#E8F0FE] text-[#1D4ED8]", icon: null },
  ai: { cls: "bg-[#ECEBFF] text-[#4F46E5]", icon: null },
};

export function StatusPill({ pill, size = "md", className }: { pill: Pill; size?: "sm" | "md" | "lg"; className?: string }) {
  const p = PILL[pill.tone];
  const Icon = p.icon;
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-bold",
        size === "sm" ? "px-3 py-1 text-[13px]" : size === "lg" ? "px-5 py-2 text-[16px]" : "px-4 py-[7px] text-[14.5px]",
        p.cls,
        className,
      )}
    >
      {Icon ? <Icon className={cn("shrink-0 fill-current stroke-white", size === "lg" ? "h-[18px] w-[18px]" : "h-4 w-4")} strokeWidth={2.4} /> : null}
      <span className="truncate">{pill.label}</span>
    </span>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("min-w-0 rounded-[20px] border border-[#ECEEF2] bg-white shadow-[0_6px_24px_rgba(15,23,42,0.045)]", className)}>{children}</section>;
}

export function CardTitle({ icon, children, iconClass, right, compact = false }: { icon: ReactNode; children: ReactNode; iconClass?: string; right?: ReactNode; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3 px-5 sm:px-6", compact ? "pb-1 pt-4" : "pb-2 pt-5")}>
      <span className={cn("shrink-0 [&>svg]:h-6 [&>svg]:w-6", iconClass ?? "text-[#FF5A1F]")}>{icon}</span>
      <h3 className="min-w-0 flex-1 text-[19px] font-extrabold tracking-[-0.01em] text-[#111827] sm:text-[21px]">{children}</h3>
      {right}
    </div>
  );
}

export function IconBubble({ icon: Icon, tone = "orange", size = "md" }: { icon: LucideIcon; tone?: "orange" | "good" | "bad" | "warn" | "neutral" | "ai" | "red"; size?: "sm" | "md" | "lg" }) {
  const cls = {
    orange: "bg-[#FFF1EA] text-[#FF5A1F]",
    good: "bg-[#E7F7EC] text-[#16A34A]",
    bad: "bg-[#FDE8E8] text-[#DC2626]",
    red: "bg-[#FDE8E8] text-[#DC2626]",
    warn: "bg-[#FEF3D7] text-[#D97706]",
    neutral: "bg-[#EEF1F5] text-[#64748B]",
    ai: "bg-[#ECEBFF] text-[#5B4FE0]",
  }[tone];
  const box = size === "sm" ? "h-9 w-9" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const ic = size === "sm" ? "h-[18px] w-[18px]" : size === "lg" ? "h-7 w-7" : "h-[22px] w-[22px]";
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-full", box, cls)}>
      <Icon className={ic} strokeWidth={2} />
    </span>
  );
}

export function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  return {
    copied,
    copy: (value: string, key = value) => {
      void navigator.clipboard?.writeText(value).then(() => {
        setCopied(key);
        window.setTimeout(() => setCopied((k) => (k === key ? null : k)), 1600);
      });
    },
  };
}

export function CopyButton({ value, label }: { value: string; label: string }) {
  const { copied, copy } = useCopy();
  return (
    <button type="button" onClick={() => copy(value)} aria-label={label} title={copied ? "Copied" : label} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#334155] transition hover:bg-slate-100">
      {copied ? <CircleCheck className="h-[18px] w-[18px] text-[#16A34A]" /> : <Copy className="h-[18px] w-[18px]" />}
    </button>
  );
}

/** Breadcrumb, category title and the three page actions. */
export function ResultHeader({
  icon: Icon, title, subtitle, onNewCheck, onShare, onDownload, newIcon: NewIcon, compact = false,
}: {
  icon: LucideIcon; title: string; subtitle: string; onNewCheck?: () => void; onShare: () => Promise<string | null>; onDownload: () => void; newIcon: LucideIcon; compact?: boolean;
}) {
  const [shareNote, setShareNote] = useState<string | null>(null);
  const btn = cn("tc-press inline-flex h-11 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[#E5E7EB] bg-white px-3 text-[13.5px] font-bold text-[#111827] shadow-[0_3px_10px_rgba(15,23,42,0.06)] transition duration-300 ease-out hover:-translate-y-0.5 hover:border-[#FFC9B3] hover:bg-[#FFF8F4] hover:shadow-[0_8px_18px_rgba(255,90,31,0.12)] active:translate-y-0 active:scale-[0.98] sm:px-5 sm:text-[15px]", compact ? "sm:h-11" : "sm:h-12");
  return (
    <div>
      <nav aria-label="Breadcrumb" data-bc="" className={cn("flex items-center gap-2 text-[13px] text-[#334155]", compact ? "mb-3" : "mb-4")}>
        <Link href="/" aria-label="Home" className="text-[#111827] hover:text-[#FF5A1F]"><House className="h-4 w-4 fill-current" /></Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        {onNewCheck ? <button type="button" onClick={onNewCheck} className="hover:text-[#FF5A1F]">Trust Checker</button> : <Link href="/trust-checker" className="hover:text-[#FF5A1F]">Trust Checker</Link>}
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <span className="font-bold text-[#111827]">Scan Result</span>
      </nav>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className={cn("tc-pop grid h-14 w-14 shrink-0 place-items-center rounded-[18px] bg-[linear-gradient(160deg,#FFF6F1,#FFE9DC)] text-[#FF5A1F] shadow-[0_8px_20px_rgba(255,90,31,0.14)]", compact ? "sm:h-[64px] sm:w-[64px]" : "sm:h-[76px] sm:w-[76px]")}>
            <Icon className={cn("h-8 w-8", compact ? "sm:h-9 sm:w-9" : "sm:h-10 sm:w-10")} strokeWidth={2.1} />
          </span>
          <div className="min-w-0">
            <h1 className={cn("text-[23px] font-black leading-tight tracking-[-0.025em] text-[#111827] min-[400px]:text-[26px]", compact ? "sm:text-[30px]" : "sm:text-[33px]")}>{title}</h1>
            <p className={cn("mt-0.5 text-[13.5px] text-[#334155]", compact ? "sm:text-[16px]" : "sm:text-[17px]")}>{subtitle}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
          {onNewCheck ? <button type="button" onClick={onNewCheck} className={btn}><NewIcon className="h-5 w-5" strokeWidth={2.2} /> New Check</button> : null}
          <button
            type="button"
            className={btn}
            onClick={() => {
              void onShare().then((note) => {
                if (note) {
                  setShareNote(note);
                  window.setTimeout(() => setShareNote(null), 2200);
                }
              });
            }}
          >
            <Share2 className="h-5 w-5" strokeWidth={2.2} /> {shareNote ?? "Share"}
          </button>
          <button type="button" onClick={onDownload} className={btn}><Download className="h-5 w-5" strokeWidth={2.2} /> Download Report</button>
        </div>
      </div>
    </div>
  );
}

const BANNER: Record<Banner["tone"], { wrap: string; title: string; circle: string; ring: string; icon: string; divider: string }> = {
  good: { wrap: "border-[#CDEFD6] bg-[linear-gradient(100deg,#F2FBF4_0%,#ECF9EF_100%)]", title: "text-[#1E8E3E]", circle: "bg-[#DDF3E3]", ring: "bg-[#EAF8EE]", icon: "text-[#1E8E3E]", divider: "bg-[#BFE5C9]" },
  warn: { wrap: "border-[#FBD9A5] bg-[linear-gradient(100deg,#FFF8EC_0%,#FFF3E2_100%)]", title: "text-[#E2561B]", circle: "bg-[#FFE7B8]", ring: "bg-[#FFF1D6]", icon: "text-[#F59E0B]", divider: "bg-[#F6CF94]" },
  bad: { wrap: "border-[#F9D0CF] bg-[linear-gradient(100deg,#FFF3F2_0%,#FDECEC_100%)]", title: "text-[#E5352B]", circle: "bg-[#FCDCDA]", ring: "bg-[#FEE9E8]", icon: "text-[#E5352B]", divider: "bg-[#F4B9B6]" },
  danger: { wrap: "border-[#F9D0CF] bg-[linear-gradient(100deg,#FFF3F2_0%,#FDECEC_100%)]", title: "text-[#D92D20]", circle: "bg-[#FCDCDA]", ring: "bg-[#FEE9E8]", icon: "text-[#D92D20]", divider: "bg-[#F4B9B6]" },
  neutral: { wrap: "border-[#E2E8F0] bg-[linear-gradient(100deg,#F8FAFC_0%,#F1F5F9_100%)]", title: "text-[#334155]", circle: "bg-[#E2E8F0]", ring: "bg-[#EEF2F6]", icon: "text-[#475569]", divider: "bg-[#CBD5E1]" },
};

/** Full-width verdict banner with the outlined result pill on the right. */
export function VerdictBanner({ banner, icon: Icon }: { banner: Banner; icon: LucideIcon }) {
  const t = BANNER[banner.tone];
  const outline = banner.result.tone === "good" ? "border-[#2BA24C] text-[#1E8E3E]" : banner.result.tone === "bad" ? "border-[#E5352B] text-[#E5352B]" : banner.result.tone === "warn" ? "border-[#F59E0B] text-[#C2410C]" : "border-[#94A3B8] text-[#475569]";
  const ResIcon = banner.result.tone === "good" ? CircleCheck : banner.result.tone === "bad" ? CircleX : banner.result.tone === "warn" ? TriangleAlert : Info;
  return (
    <div className={cn("flex flex-col gap-4 rounded-[20px] border px-5 py-5 sm:flex-row sm:items-center sm:gap-6 sm:px-8", t.wrap)}>
      <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-7">
        <span className={cn("grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full sm:h-[92px] sm:w-[92px]", t.ring)}>
          <span className={cn("grid h-[58px] w-[58px] place-items-center rounded-full sm:h-[74px] sm:w-[74px]", t.circle)}>
            <Icon className={cn("h-9 w-9 sm:h-11 sm:w-11", t.icon)} strokeWidth={2.2} />
          </span>
        </span>
        <div className="min-w-0">
          <h2 className={cn("text-[22px] font-black leading-tight tracking-[-0.02em] sm:text-[31px]", t.title)}>{banner.title}</h2>
          <p className="mt-1.5 text-[14px] leading-6 text-[#1F2937] sm:text-[16.5px]">{banner.text}</p>
        </div>
      </div>
      <span className={cn("hidden h-16 w-px sm:block", t.divider)} />
      <div className="flex shrink-0 flex-row items-center gap-3 sm:flex-col sm:gap-2 sm:px-6">
        <span className={cn("inline-flex items-center gap-2 rounded-full border-2 bg-white/70 px-5 py-2 text-[16px] font-extrabold sm:text-[19px]", outline)}>
          <ResIcon className="h-5 w-5 fill-current stroke-white sm:h-6 sm:w-6" strokeWidth={2.4} /> {banner.result.label}
        </span>
        <span className="text-[14px] text-[#334155] sm:text-[16px]">Verification Result</span>
      </div>
    </div>
  );
}

/** Ring with "NN/100", or an honest "—" when there is no score. */
export function ScoreRing({ value, tone, size = 132 }: { value: number | null; tone: Tone; size?: number }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const color = tone === "good" ? "#16A34A" : tone === "bad" ? "#E5352B" : tone === "warn" ? "#F97316" : "#94A3B8";
  const frac = value == null ? 0 : Math.max(0.02, Math.min(1, value / 100));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E7EAEE" strokeWidth={12} />
        {value != null ? <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={12} strokeLinecap="round" pathLength={1} strokeDasharray={`${frac} 1`} className="tc-ring" style={{ ["--tc-ring" as string]: frac }} /> : null}
      </svg>
      <span className="absolute inset-0 grid place-items-center text-center">
        {value == null ? <span className="text-[15px] font-extrabold leading-tight text-[#64748B]">No<br />score</span> : <span className={cn("font-black tracking-[-0.03em] text-[#111827]", value >= 100 ? "text-[23px]" : "text-[27px]")}>{value}/100</span>}
      </span>
    </div>
  );
}

/**
 * Explanation bubble. Rendered in a portal at a viewport-clamped position so
 * neighbouring cards (which create their own stacking contexts) never cover it;
 * opens on hover, keyboard focus, or tap.
 */
export function InfoTip({ text, label = "How this is worked out" }: { text: string; label?: string }) {
  const btn = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{
    left: number;
    top: number;
    above: boolean;
  } | null>(null);
  const place = useCallback(() => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const w = Math.min(288, window.innerWidth - 24);
    const left = Math.max(12, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 12));
    const above = r.bottom + 160 > window.innerHeight && r.top > 180;
    setPos({ left, top: above ? r.top - 8 : r.bottom + 8, above });
  }, []);
  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e.type === "keydown" && (e as KeyboardEvent).key !== "Escape") return;
      if (e.type === "pointerdown" && btn.current?.contains(e.target as Node)) return;
      if (e.type === "scroll") {
        // Follow the button while it stays on screen (focus can scroll a clipped parent).
        const r = btn.current?.getBoundingClientRect();
        if (r && r.bottom > 0 && r.top < window.innerHeight) return place();
      }
      setOpen(false);
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", close);
    window.addEventListener("pointerdown", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", close);
      window.removeEventListener("pointerdown", close);
    };
  }, [open, place]);
  if (!text) return null;
  return (
    <span className="inline-flex align-middle">
      <button
        ref={btn}
        type="button"
        aria-label={label}
        aria-expanded={open}
        onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen(true)}
        className="rounded-full text-[#111827] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5A1F]"
      >
        <Info className="h-[17px] w-[17px]" strokeWidth={2.2} />
      </button>
      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <span
              role="tooltip"
              style={{
                left: pos.left,
                top: pos.top,
                width: Math.min(288, window.innerWidth - 24),
                transform: pos.above ? "translateY(-100%)" : undefined,
              }}
              className="pointer-events-none fixed z-[1000] rounded-xl bg-[#111827] p-3 text-[12.5px] font-medium normal-case leading-5 tracking-normal text-white shadow-2xl"
            >
              {text}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}

const CONF_TONE = {
  HIGH: "text-[#15803D]",
  MEDIUM: "text-[#C2410C]",
  LOW: "text-[#B91C1C]",
} as const;

/** Coverage and confidence, always shown side by side and never merged into the score. */
export function CoverageCard({
  coverage,
  completed,
  total,
  confidence,
  className,
}: {
  coverage: number;
  completed?: number;
  total?: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-4", className)}>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold uppercase tracking-wide text-[#64748B]">
          Coverage <InfoTip label="What coverage means" text="The share of applicable checks that actually completed. Checks that couldn't run are never counted as passed." />
        </p>
        <p className="text-[18px] font-black tabular-nums text-[#111827]">
          {coverage}%
          {completed != null && total != null ? (
            <span className="ml-1 text-[13px] font-semibold text-[#475569]">
              ({completed}/{total} checks)
            </span>
          ) : null}
        </p>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#EEF0F3]" role="progressbar" aria-valuenow={coverage} aria-valuemin={0} aria-valuemax={100} aria-label="Check coverage">
          <div className="h-full rounded-full bg-[#FF5A1F]" style={{ width: `${coverage}%` }} />
        </div>
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold uppercase tracking-wide text-[#64748B]">
          Confidence <InfoTip label="What confidence means" text="How reliable this result is, given which independent sources and checks answered. Missing data never raises confidence." />
        </p>
        <p className={cn("text-[18px] font-black", CONF_TONE[confidence])}>{confidence[0] + confidence.slice(1).toLowerCase()}</p>
      </div>
    </div>
  );
}

/** What We Found / What We Could Not Verify / Recommended Action — placed after the detailed results. */
export function SummaryCards({ sections }: { sections: AssessmentSections }) {
  const col = (title: string, Icon: LucideIcon, iconCls: string, body: ReactNode, cls?: string) => (
    <section aria-label={title} className={cn("flex min-w-0 flex-col rounded-[18px] border border-[#ECEEF2] bg-white px-5 py-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)] sm:px-6", cls)}>
      <h3 className="flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.07em] text-[#111827]">
        <Icon className={cn("h-[18px] w-[18px] shrink-0", iconCls)} strokeWidth={2.4} />
        {title}
      </h3>
      <div className="mt-3 flex-1">{body}</div>
    </section>
  );
  const items = (list: AssessmentSections["found"], empty: string) =>
    list.length ? (
      <ul className="divide-y divide-[#F1F3F6]">
        {list.map((it) => (
          <li key={`${it.title}|${it.text}`} className="py-2.5 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <p className="text-[14px] font-bold text-[#111827]">{it.title}</p>
              {it.pill ? <StatusPill pill={it.pill} size="sm" /> : null}
            </div>
            <p className="mt-0.5 text-[13.5px] leading-[1.45] text-[#475569]">{it.text}</p>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-[13.5px] text-[#475569]">{empty}</p>
    );
  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] xl:gap-5">
      {col("What We Found", Search, "text-[#111827]", items(sections.found, "No findings to report."))}
      <div className="flex min-w-0 flex-col gap-4 xl:gap-5">
        {col("What We Could Not Verify", CircleHelp, "text-[#475569]", items(sections.couldNotVerify, "Every applicable check completed."))}
        {col(
          "Recommended Action",
          ShieldCheck,
          "text-[#FF5A1F]",
          <ol className="space-y-2.5">
            {sections.actions.map((t, i) => (
              <li key={t} className="flex gap-3 text-[14px] leading-[1.45] text-[#1F2937]">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#FFF1EA] text-[12px] font-black text-[#FF5A1F]">{i + 1}</span>
                <span className="pt-0.5">{t}</span>
              </li>
            ))}
          </ol>,
        )}
      </div>
    </div>
  );
}

/** "Trust Score" / "Overall Risk Score" card. */
export function ScoreCard({ title, score, tone }: { title: string; score: Score; tone: Tone }) {
  return (
    <Card className="flex flex-col justify-center px-5 py-5 sm:px-7">
      <h3 className="flex items-center gap-2 text-[19px] font-extrabold text-[#111827] sm:text-[21px]">{title} <InfoTip text={score.basis} /></h3>
      <div className="mt-3 flex items-center gap-5 sm:gap-6">
        <ScoreRing value={score.value} tone={tone} />
        <span className="hidden h-24 w-px bg-[#E5E7EB] sm:block" />
        <div className="min-w-0">
          <StatusPill pill={score.badge} size="lg" />
          <p className="mt-3 text-[14px] leading-6 text-[#1F2937] sm:text-[15.5px]">{score.text}</p>
        </div>
      </div>
    </Card>
  );
}

const TILE_TONE: Record<Tone, string> = {
  good: "text-[#1E8E3E]", bad: "text-[#E5352B]", warn: "text-[#E2561B]", neutral: "text-[#111827]", info: "text-[#1D4ED8]", ai: "text-[#4F46E5]",
};

export function StatTile({ tile, icon, bubble = "orange" }: { tile: Tile; icon: LucideIcon; bubble?: Parameters<typeof IconBubble>[0]["tone"] }) {
  const has = tile.value != null && tile.value !== "";
  return (
    <div className="tc-lift flex min-w-0 items-center gap-3 rounded-[16px] border border-[#ECEEF2] bg-white px-3.5 py-3 shadow-[0_4px_14px_rgba(15,23,42,0.04)]" title={tile.hint}>
      <IconBubble icon={icon} tone={bubble} />
      <div className="min-w-0">
        <p className={cn("line-clamp-2 break-words text-[15px] font-extrabold leading-tight sm:text-[16.5px]", has ? TILE_TONE[tile.tone ?? "neutral"] : "text-[#94A3B8]")}>{has ? tile.value : "Not Available"}</p>
        <p className="mt-0.5 text-[12.5px] leading-tight text-[#334155] sm:text-[13.5px]">{tile.label}</p>
      </div>
    </div>
  );
}

/** One verification row; expands to show the evidence behind its result. */
export function CheckRowItem({ row, icon, compact = false }: { row: CheckRow; icon: LucideIcon; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const fallback =
    row.points === null
      ? "This check couldn't run with the evidence available for this scan, so it doesn't count towards the score."
      : row.pill.tone === "good"
        ? "The check ran and found no matching warning sign. That isn't a guarantee."
        : "Review this result before you rely on the item.";
  const expandable = true;
  return (
    <li className="border-b border-[#EEF0F3] last:border-b-0">
      <button type="button" onClick={() => expandable && setOpen((v) => !v)} aria-expanded={expandable ? open : undefined} className={cn("flex w-full items-center gap-3.5 py-3 text-left sm:gap-4", expandable ? "cursor-pointer" : "cursor-default")}>
        <IconBubble icon={icon} size={compact ? "sm" : "md"} />
        <span className="min-w-0 flex-1">
          <span className={cn("block font-extrabold leading-tight text-[#111827]", compact ? "text-[14.5px]" : "text-[15px] sm:text-[16px]")}>{row.title}</span>
          <span className={cn("mt-0.5 block leading-snug text-[#334155]", compact ? "text-[12px]" : "text-[12.5px] sm:text-[13.5px]")}>{row.description}</span>
          <span className="mt-1.5 block sm:hidden"><StatusPill pill={row.pill} size="sm" /></span>
        </span>
        <StatusPill pill={row.pill} size={compact ? "sm" : "md"} className="hidden shrink-0 sm:inline-flex" />
        {expandable ? <ChevronRight className={cn("h-5 w-5 shrink-0 text-[#111827] transition", open && "rotate-90")} strokeWidth={2.4} /> : <span className="w-5 shrink-0" />}
      </button>
      {open ? (
        <div className="tc-swap mb-3 ml-[58px] space-y-2 rounded-xl bg-[#F8FAFC] p-3 text-[12.5px] leading-5 text-[#334155]">
          {row.evidence.map((e, i) => (
            <div key={`${e.title}-${i}`}>
              <p className={cn("font-bold", e.tone === "bad" ? "text-[#DC2626]" : e.tone === "warn" ? "text-[#C2410C]" : e.tone === "good" ? "text-[#15803D]" : "text-[#111827]")}>{e.title}</p>
              {e.detail ? <p className="break-words">{e.detail}</p> : null}
              <p className="text-[11px] text-[#64748B]">Source: {e.source}</p>
            </div>
          ))}
          {row.note ? <p className="text-[#475569]">{row.note}</p> : null}
          {!row.evidence.length && !row.note ? <p className="text-[#475569]">{fallback}</p> : null}
        </div>
      ) : null}
    </li>
  );
}

/** A label/value row in an information card. */
export function InfoLine({ row, icon: Icon, action, compact = false, dense = false }: { row: InfoRow; icon: LucideIcon; action?: ReactNode; compact?: boolean; dense?: boolean }) {
  const empty = row.value == null && !row.pill;
  return (
    <div className={cn("flex items-center gap-3 border-b border-[#EEF0F3] last:border-b-0", dense ? "tc-fit-line min-h-[34px] flex-1 py-1" : "min-h-[38px] py-1.5")}>
      <Icon className="h-5 w-5 shrink-0 text-[#111827]" strokeWidth={1.9} />
      <dt className={cn("shrink-0 text-[#111827]", compact ? "max-w-[46%] text-[13.5px]" : "w-[38%] text-[14px] sm:text-[15px]")}>{row.label}</dt>
      <dd className={cn("flex min-w-0 flex-1 items-center justify-end gap-2 text-right font-semibold text-[#111827]", compact ? "text-[13.5px]" : "text-[14px] sm:text-[15px]")}>
        {row.pill ? <StatusPill pill={row.pill} size={compact ? "sm" : "md"} /> : null}
        {row.value != null ? (
          row.href ? (
            <a href={row.href} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex min-w-0 items-center gap-1 text-[#1D4ED8] hover:underline">
              <span className="truncate">{row.value}</span> {row.copy ? null : <ExternalLink className="h-4 w-4 shrink-0" />}
            </a>
          ) : (
            <span className="min-w-0 break-words">{row.value}</span>
          )
        ) : empty ? (
          <span className="font-medium text-[#94A3B8]">Not Available</span>
        ) : null}
        {row.copy ? <CopyButton value={row.copy} label={`Copy ${row.label}`} /> : null}
        {action}
      </dd>
    </div>
  );
}

export function Limits({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <details className="rounded-[16px] border border-[#E8EBF0] bg-white px-5 py-3 text-[13px] text-[#475569]">
      <summary className="cursor-pointer font-bold text-[#334155]">What this check can't verify ({items.length})</summary>
      <ul className="mt-2 list-disc space-y-1 pl-5 leading-5">{items.map((l) => <li key={l}>{l}</li>)}</ul>
    </details>
  );
}
