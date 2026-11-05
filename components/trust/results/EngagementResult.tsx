"use client";

import {
  BadgeCheck, BarChart3, Bot, CalendarDays, CircleCheck, Clock, ExternalLink, Eye, Globe, Heart, Layers, MessageCircle,
  RotateCw, SquarePlay, ThumbsUp, TriangleAlert, User, Users, Play,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CheckerResult, EngagementDetails, ScanReport, SocialPlatform } from "@/lib/trust/types";
import { engagementModel, type EngagementModel } from "@/lib/trust/result-model";
import { rowsFromChecks, rowsFromInfo, rowsFromTiles, type ReportDoc } from "@/lib/trust/report-doc";
import { Card, CardTitle, IconBubble, InfoLine, InfoTip, Limits, ResultHeader, StatusPill } from "./ui";
import { useReportActions } from "./actions";

export function PlatformMark({ platform, className }: { platform: SocialPlatform; className?: string }) {
  const c = cn("shrink-0", className ?? "h-7 w-7");
  if (platform === "youtube")
    return (
      <svg viewBox="0 0 28 20" className={c} aria-label="YouTube"><rect width="28" height="20" rx="5.5" fill="#FF0000" /><path d="M11.2 5.6v8.8l7.4-4.4z" fill="#fff" /></svg>
    );
  if (platform === "tiktok")
    return (
      <svg viewBox="0 0 28 28" className={c} aria-label="TikTok"><rect width="28" height="28" rx="7" fill="#111" />
        <g transform="translate(5.5 4.5) scale(0.72)"><path d="M12.53.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" fill="#25F4EE" transform="translate(-0.6 -0.5)" /><path d="M12.53.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" fill="#FE2C55" transform="translate(0.6 0.5)" /><path d="M12.53.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" fill="#fff" /></g>
      </svg>
    );
  if (platform === "instagram")
    return (
      <svg viewBox="0 0 28 28" className={c} aria-label="Instagram">
        <defs><radialGradient id="igg" cx="30%" cy="107%" r="150%"><stop offset="0" stopColor="#fdf497" /><stop offset=".05" stopColor="#fdf497" /><stop offset=".45" stopColor="#fd5949" /><stop offset=".6" stopColor="#d6249f" /><stop offset=".9" stopColor="#285AEB" /></radialGradient></defs>
        <rect width="28" height="28" rx="8" fill="url(#igg)" /><rect x="6.5" y="6.5" width="15" height="15" rx="4.5" fill="none" stroke="#fff" strokeWidth="2" /><circle cx="14" cy="14" r="3.6" fill="none" stroke="#fff" strokeWidth="2" /><circle cx="18.7" cy="9.3" r="1.1" fill="#fff" />
      </svg>
    );
  const letter = platform === "x" ? "X" : platform === "facebook" ? "f" : "@";
  const bg = platform === "facebook" ? "#1877F2" : "#111";
  return (
    <svg viewBox="0 0 28 28" className={c} aria-label={platform}><rect width="28" height="28" rx="7" fill={bg} /><text x="14" y="19.5" textAnchor="middle" fontSize="15" fontWeight="800" fill="#fff" fontFamily="Arial, sans-serif">{letter}</text></svg>
  );
}

function Gauge({ level, label, color }: { level: EngagementModel["quality"]["level"]; label: string; color: string }) {
  const frac = level === "high" ? 0.85 : level === "moderate" ? 0.55 : level === "low" ? 0.22 : level === "early" ? 0.1 : 0;
  const r = 70;
  const cx = 90;
  const cy = 88;
  const pt = (f: number, rr = r) => [cx - rr * Math.cos(Math.PI * f), cy - rr * Math.sin(Math.PI * f)] as const;
  const arc = (to: number) => {
    const [x0, y0] = pt(0);
    const [x1, y1] = pt(to);
    return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
  };
  const [n0x, n0y] = pt(frac, r - 36);
  const [n1x, n1y] = pt(frac, r - 18);
  return (
    <div className="relative h-[112px] w-[180px]">
      <svg viewBox="0 0 180 100" className="h-[100px] w-[180px]" aria-hidden>
        <defs><linearGradient id="gq" x1="0" x2="1"><stop offset="0" stopColor="#F59E0B" /><stop offset="1" stopColor="#FF5A1F" /></linearGradient></defs>
        <path d={arc(1)} fill="none" stroke="#FAD9C4" strokeWidth="20" />
        {frac > 0 ? <path d={arc(frac)} fill="none" stroke="url(#gq)" strokeWidth="20" /> : null}
        {frac > 0 ? <line x1={n0x} y1={n0y} x2={n1x} y2={n1y} stroke="#E2561B" strokeWidth="4" strokeLinecap="round" /> : null}
      </svg>
      <p className={cn("absolute inset-x-0 bottom-0 text-center text-[22px] font-black leading-none", color)}>{label}</p>
    </div>
  );
}

const TILE_ICON: Record<string, LucideIcon> = { views: Eye, real: Users, bot: Bot, likes: ThumbsUp, comments: MessageCircle, rate: BarChart3, posts: SquarePlay, reach: Layers };
const ACCOUNT_ICON: Record<string, LucideIcon> = { channel: User, handle: User, verified: BadgeCheck, created: CalendarDays, followers: Users, views: SquarePlay, likes: Heart, posts: SquarePlay, country: Globe, visibility: Eye };

export function EngagementResult({ report, checker, onNewCheck }: { report: ScanReport; checker: CheckerResult; onNewCheck?: () => void }) {
  const d = checker.details as EngagementDetails;
  const m = engagementModel(checker, d);
  const doc: ReportDoc = {
    scanId: report.id,
    category: "Engagement & Traffic Detection",
    item: `${m.itemLabel}: ${m.heading} — ${m.url}`,
    checkedAt: new Date(report.createdAt).toUTCString(),
    banner: { tone: m.quality.level === "high" ? "good" : m.quality.level === "moderate" ? "warn" : m.quality.level === "low" ? "bad" : "neutral", title: `Engagement Quality: ${m.quality.label}`, text: m.quality.text, result: { label: m.quality.label, tone: "neutral" } },
    score: null,
    sections: [
      { title: "Metrics", rows: rowsFromTiles(m.tiles) },
      { title: "Audience Quality", rows: rowsFromChecks(m.audience) },
      { title: m.accountTitle, rows: rowsFromInfo(m.account) },
    ],
    limits: [...(m.accessNote ? [m.accessNote] : []), ...m.limits],
  };
  const actions = useReportActions(doc);
  const qualityColor = m.quality.level === "high" ? "text-[#1E8E3E]" : m.quality.level === "low" ? "text-[#E5352B]" : m.quality.level === "moderate" ? "text-[#E2561B]" : "text-[#475569]";
  const isYt = m.platform === "youtube";

  return (
    <div className="space-y-5">
      <ResultHeader icon={BarChart3} newIcon={RotateCw} title="Engagement & Traffic Detection" subtitle="Analysis of public engagement, audience activity, and traffic signals." onNewCheck={onNewCheck} {...actions} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)]">
        <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
          <a href={m.url} target="_blank" rel="noopener noreferrer nofollow" className={cn("relative block shrink-0 overflow-hidden rounded-[14px] bg-[#F1F5F9]", isYt ? "aspect-video w-full sm:w-[300px]" : "aspect-[4/5] w-full max-w-[220px] sm:w-[190px]")} aria-label={`Open on ${m.platformName}`}>
            {m.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.thumbnail} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center text-[#94A3B8]"><PlatformMark platform={m.platform} className="h-12 w-12 opacity-70" /></span>
            )}
            {!isYt && m.thumbnail ? <span className="absolute inset-0 grid place-items-center"><span className="grid h-12 w-12 place-items-center rounded-full border-2 border-white/90 bg-black/30"><Play className="ml-0.5 h-5 w-5 fill-white text-white" /></span></span> : null}
            {m.duration ? <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-2 py-0.5 text-[13px] font-bold text-white">{m.duration}</span> : null}
          </a>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[14px] font-semibold text-[#111827] sm:text-[16px]"><PlatformMark platform={m.platform} className={isYt ? "h-5 w-7" : "h-7 w-7"} /> {m.itemLabel}</span>
              {!isYt ? <a href={m.url} target="_blank" rel="noopener noreferrer nofollow" aria-label={`Open on ${m.platformName}`} className="text-[#1D4ED8]"><ExternalLink className="h-5 w-5" /></a> : null}
            </div>
            <h2 className="mt-2 flex items-center gap-2 text-[18px] font-extrabold leading-snug text-[#111827] sm:text-[20px]">
              <span className="line-clamp-2 break-words">{m.heading}</span>
              {m.verified ? <BadgeCheck className="h-6 w-6 shrink-0 fill-[#1D9BF0] text-white" /> : null}
              {isYt ? <a href={m.url} target="_blank" rel="noopener noreferrer nofollow" aria-label="Open on YouTube" className="shrink-0 text-[#1D4ED8]"><ExternalLink className="h-5 w-5" /></a> : null}
            </h2>
            {m.subline ? <p className="mt-2 flex items-center gap-2 text-[15px] text-[#111827]"><User className="h-5 w-5" /> {m.subline}</p> : null}
            {m.caption ? <p className="mt-2 line-clamp-2 text-[15px] text-[#111827] sm:text-[17px]">{m.caption}</p> : null}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-[#111827] sm:text-[15.5px]">
              <span className="flex items-center gap-2"><CalendarDays className="h-5 w-5" /> {m.postedLabel}: {m.posted ?? "Not available"}</span>
              <span className="hidden h-6 w-px bg-[#E5E7EB] sm:block" />
              <span className="flex items-center gap-2"><Clock className="h-5 w-5" /> Duration: {m.duration ?? "Not available"}</span>
            </div>
          </div>
        </Card>

        <div className="flex flex-col items-center gap-5 rounded-[20px] border border-[#F8DCC8] bg-[linear-gradient(115deg,#FFF6EF_0%,#FFEFE4_100%)] px-5 py-5 sm:flex-row sm:px-7">
          <div className="flex shrink-0 flex-col items-center">
            <Gauge level={m.quality.level} label={m.quality.label} color={qualityColor} />
            <p className="mt-1 text-[14px] text-[#334155] sm:text-[15px]">Engagement Quality</p>
          </div>
          <span className="hidden h-24 w-0.5 bg-[#F0A97E] sm:block" />
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-[21px] font-black text-[#B42318] sm:text-[24px]">Analysis Summary <InfoTip text="From the platform's public counts only: views over time, likes and comments per view, and repeated comments. Signals, not proof." /></h3>
            <p className="mt-1.5 text-[15px] leading-6 text-[#111827] sm:text-[17px]">{m.quality.text}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:flex xl:flex-nowrap">
        {m.tiles.map((t) => {
          const Icon = t.key === "likes" && m.platform === "instagram" ? Heart : TILE_ICON[t.key];
          const has = t.value != null;
          return (
            <div key={t.key} className="flex min-w-0 items-center gap-2.5 rounded-[16px] border border-[#ECEEF2] bg-white px-3 py-3.5 shadow-[0_4px_14px_rgba(15,23,42,0.04)] xl:flex-auto" title={t.hint}>
              <IconBubble icon={Icon} tone={t.key === "bot" ? "red" : "orange"} size="sm" />
              <div className="min-w-0">
                <p className="flex items-center gap-1 whitespace-nowrap text-[12.5px] text-[#111827] sm:text-[13.5px]">{t.label}{t.key === "rate" ? <InfoTip text={t.hint ?? ""} /> : null}</p>
                <p className={cn("whitespace-nowrap font-extrabold leading-tight", has ? "text-[20px] text-[#111827] sm:text-[22px]" : "mt-0.5 text-[14px] text-[#94A3B8]")}>{has ? t.value : t.key === "real" || t.key === "bot" ? "Not public" : "Not available"}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <Card>
          <CardTitle icon={<Users strokeWidth={2.2} />} right={null}>
            <span className="flex items-center gap-2">Audience Quality <InfoTip text="Read from the public numbers. Bot and fake views can't be counted from outside the platform, so Jimvio doesn't estimate them." /></span>
          </CardTitle>
          <ul className="px-5 pb-3 sm:px-6">
            {m.audience.map((r) => {
              const Icon = r.key === "real" ? CircleCheck : r.key === "suspicious" ? TriangleAlert : Bot;
              const tone = r.key === "real" ? "good" : r.key === "suspicious" ? "orange" : "neutral";
              return (
                <li key={r.key} className="flex items-center gap-4 border-b border-[#EEF0F3] py-3.5 last:border-b-0">
                  <IconBubble icon={Icon} tone={tone} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[17px] font-extrabold text-[#111827] sm:text-[19px]">{r.title}</p>
                    <p className="text-[14px] leading-5 text-[#334155] sm:text-[15px]">{r.description}</p>
                    {r.note ? <p className="text-[12px] text-[#64748B]">{r.note}</p> : null}
                  </div>
                  <StatusPill pill={r.pill} size="lg" className="min-w-[120px]" />
                </li>
              );
            })}
          </ul>
        </Card>
        <Card>
          <CardTitle icon={<PlatformMark platform={m.platform} className={isYt ? "h-6 w-8" : "h-8 w-8"} />}>{m.accountTitle}</CardTitle>
          <dl className="px-5 pb-4 sm:px-6">
            {m.account.map((r) => <InfoLine key={r.key} row={r} icon={ACCOUNT_ICON[r.key] ?? User} />)}
          </dl>
        </Card>
      </div>
      {m.accessNote && m.quality.level !== "unknown" ? <p className="rounded-[16px] border border-[#E8EBF0] bg-white px-5 py-3 text-[13px] text-[#475569]">{m.accessNote}</p> : null}
      <Limits items={m.limits} />
    </div>
  );
}
