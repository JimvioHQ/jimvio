"use client";

import {
  Aperture, AudioLines, BarChart3, Bot, CalendarDays, Camera, CircleCheck, CircleX, Clock, Copyright, Cpu, Database, Expand,
  ExternalLink, FileCode, FileText, Film, Focus, ImageIcon, Info, Layers, MapPin, Maximize2, Palette, PenTool, PencilLine,
  Quote, RotateCw, Ruler, ScanEye, ShieldCheck, Sparkles, Timer, TriangleAlert, User, Video, Volume2, WandSparkles,
  Search, CircleHelp, Fingerprint, Tags, BadgeCheck, KeyRound, Microscope, Gauge, Globe, Clapperboard, Sun, Zap, Binary, Shrink, Navigation,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CheckerResult, MediaDetails, ScanReport } from "@/lib/trust/types";
import { mediaModel } from "@/lib/trust/result-model";
import { rowsFromChecks, rowsFromInfo, rowsFromTiles, sectionDocs, type ReportDoc } from "@/lib/trust/report-doc";
import { Card, CardTitle, CheckRowItem, CoverageCard, InfoLine, Limits, ResultHeader, ScoreCard, StatTile, StatusPill, SummaryCards, VerdictBanner } from "./ui";
import { useReportActions } from "./actions";

export type LocalPreview = { url: string; kind: "image" | "video" | "audio" };

const CHECK_ICON: Record<string, LucideIcon> = {
  integrity: FileText, exif: Camera, iptc: Tags, xmp: FileCode, c2pa: BadgeCheck, c2pa_sig: KeyRound, origin: ScanEye, ai: Cpu, ai_tool: WandSparkles, ai_model: Cpu,
  camera: Camera, date: Clock, gps: MapPin, software: PenTool, manipulation: PencilLine, forensic: Microscope, duplicate: Fingerprint, copyright: Copyright,
  source: Globe, quality: Gauge, frames: Clapperboard, audio: Volume2, video_prov: BadgeCheck,
};
const CREATION_ICON: Record<string, LucideIcon> = { ai: Bot, tool: WandSparkles, model: Cpu, prompt: Quote, capture: Camera, camera: Camera, source: ScanEye, c2pa: BadgeCheck, edit: PencilLine, location: MapPin, date: Clock, confidence: Gauge };
const TECH_ICON: Record<string, LucideIcon> = {
  name: FileText, format: Layers, size: Database, dims: Expand, exif: FileCode, camera: Camera, lens: Aperture, exposure: Aperture, aperture: Aperture,
  shutter: Timer, iso: Focus, focal: Ruler, date: CalendarDays, gps: MapPin, color: Palette, generated: CalendarDays, vcodec: Film, acodec: Volume2,
  res: Expand, fps: Timer, bitrate: BarChart3, duration: Clock, aspect: Ruler, device: Camera, software: PenTool, meta: FileCode,
  iptc: Tags, xmp: FileCode, flash: Zap, wb: Sun, depth: Binary, compression: Shrink, orientation: Navigation, modified: CalendarDays, c2pa: BadgeCheck, dst: Cpu, created: CalendarDays,
};
const TILE_ICON: Record<string, LucideIcon> = { method: Sparkles, prov: ScanEye, type: Video, format: ImageIcon, size: Database, res: Expand, duration: Timer, tool: Bot, camera: Camera, date: CalendarDays, gps: MapPin };

export function MediaResult({ report, checker, preview, onNewCheck }: { report: ScanReport; checker: CheckerResult; preview?: LocalPreview | null; onNewCheck?: () => void }) {
  const d = checker.details as MediaDetails;
  const m = mediaModel(checker, d);
  const doc: ReportDoc = {
    scanId: report.id,
    category: "Media Metadata & Provenance",
    item: `${m.typeLabel}: ${d.fileName}`,
    checkedAt: new Date(report.createdAt).toUTCString(),
    banner: m.banner,
    score: { title: "Provenance Confidence", score: m.score },
    sections: [
      { title: "Assessment", rows: [{ label: "Coverage", value: `${m.coverage}% of applicable checks completed` }, { label: "Confidence", value: m.confidence }] },
      { title: "Summary", rows: rowsFromTiles(m.tiles) },
      { title: "Verification Checks", rows: rowsFromChecks(m.checks) },
      { title: "Creation & Origin Analysis", rows: [{ label: "Creation Method", value: m.creation.headline.label }, ...rowsFromInfo(m.creation.rows)] },
      { title: m.technicalTitle, rows: rowsFromInfo(m.technical) },
      ...sectionDocs(m.sections),
    ],
    limits: m.limits,
  };
  const actions = useReportActions(doc);
  const HeaderIcon = m.isVideo ? Video : m.isAudio ? AudioLines : ImageIcon;
  const bannerIcon = m.aiEvidence ? Cpu : m.banner.tone === "good" ? ShieldCheck : m.banner.tone === "neutral" ? CircleHelp : TriangleAlert;
  const scoreTone = m.score.value == null ? "neutral" : m.score.badge.tone === "good" ? "good" : m.score.badge.tone === "bad" ? "bad" : "warn";
  const showPreview = preview && preview.kind === d.mediaType ? preview : null;
  const creationGood = m.creation.headline.tone === "good";
  const creationBad = m.creation.headline.tone === "bad";

  return (
    <div className="tc-stagger space-y-4 xl:space-y-5">
      <ResultHeader icon={HeaderIcon} newIcon={RotateCw} title="Media Metadata & Provenance" subtitle="Verification of media authenticity, origin, creation method, and technical details." onNewCheck={onNewCheck} compact {...actions} />
      <VerdictBanner banner={m.banner} icon={bannerIcon} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <Card className="tc-lift flex flex-col gap-5 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="relative aspect-[3/2] w-full shrink-0 overflow-hidden rounded-[14px] bg-[#0F172A] sm:w-[300px] xl:w-[330px]">
            {showPreview?.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={showPreview.url} alt={`Preview of ${d.fileName}`} className="h-full w-full object-cover" />
            ) : showPreview?.kind === "video" ? (
              <video src={showPreview.url} controls playsInline preload="metadata" className="h-full w-full bg-black object-contain" />
            ) : showPreview?.kind === "audio" ? (
              <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#1E293B,#0F172A)] p-4"><AudioLines className="h-12 w-12 text-[#FF8A5B]" /><audio src={showPreview.url} controls className="w-full" /></div>
            ) : (
              <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#1E293B,#334155)] p-4 text-center text-[12px] text-white/75">
                <span><HeaderIcon className="mx-auto mb-2 h-10 w-10 text-white/60" />Preview isn&apos;t kept: files are checked in memory and never stored.</span>
              </div>
            )}
            <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-black/55 px-2.5 py-1 text-[13px] font-bold text-white">
              {m.isVideo ? <Video className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />} {m.formatShort}
            </span>
            {showPreview && showPreview.kind === "image" ? (
              <a href={showPreview.url} target="_blank" rel="noopener noreferrer" aria-label="Open full size" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg bg-black/55 text-white hover:bg-black/70"><Maximize2 className="h-5 w-5" /></a>
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[15px] text-[#111827] sm:text-[16px]">
              <HeaderIcon className="h-6 w-6 text-[#FF5A1F]" strokeWidth={2} /> {m.typeLabel}
            </div>
            <h2 className="mt-2 break-words text-[21px] font-extrabold leading-snug text-[#111827] sm:text-[26px]">{m.title}</h2>
            {m.description ? <p className="mt-1 text-[14.5px] text-[#1F2937] sm:text-[16.5px]">{m.description}</p> : null}
            <div className="mt-3 grid gap-x-5 gap-y-2 text-[14px] text-[#111827] sm:grid-cols-2 sm:text-[15px]">
              <span className="flex min-w-0 items-center gap-2"><User className="h-5 w-5 shrink-0" /><span className="truncate">{m.aiEvidence ? "Created with" : "Captured by"}: {m.byLine ?? "Unavailable"}</span></span>
              <span className="flex min-w-0 items-center gap-2"><CalendarDays className="h-5 w-5 shrink-0" /><span className="truncate">{m.dateLabel}: {m.date ?? "Unavailable"}</span></span>
              {m.location ? (
                <span className="flex min-w-0 items-center gap-2"><MapPin className="h-5 w-5 shrink-0" /><span className="truncate">Location: {m.location}</span>{m.mapHref ? <a href={m.mapHref} target="_blank" rel="noopener noreferrer nofollow" aria-label="Open location map" className="text-[#1D4ED8]"><ExternalLink className="h-4 w-4" /></a> : null}</span>
              ) : null}
              <span className="flex min-w-0 items-center gap-2"><FileText className="h-5 w-5 shrink-0" />{m.formatShort} • {m.size ?? "—"}</span>
              <span className="flex items-center sm:col-span-2"><StatusPill pill={m.creationChip} size="sm" /></span>
            </div>
          </div>
        </Card>
        <div className="flex flex-col gap-3">
          <ScoreCard title="Provenance Confidence" score={m.score} tone={scoreTone} />
          <Card className="px-5 py-3.5">
            <CoverageCard coverage={m.coverage} confidence={m.confidence} />
          </Card>
        </div>
      </div>

      <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-4", m.tiles.length >= 8 ? "xl:grid-cols-8" : "xl:grid-cols-7")}>
        {m.tiles.map((t) => {
          const icon = t.key === "status" ? (t.tone === "good" ? CircleCheck : t.tone === "bad" ? CircleX : t.tone === "warn" ? TriangleAlert : Info) : TILE_ICON[t.key] ?? Info;
          const bubble = t.key === "status" ? (t.tone === "good" ? "good" : t.tone === "bad" ? "bad" : t.tone === "warn" ? "warn" : t.tone === "ai" ? "ai" : "neutral") : (t.key === "method" && m.aiEvidence) || t.key === "tool" ? "ai" : "orange";
          return <StatTile key={t.key} tile={t} icon={icon} bubble={bubble} />;
        })}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-[1.1fr_1fr] xl:gap-5">
        <Card className="tc-lift">
          <CardTitle icon={<ShieldCheck strokeWidth={2.2} />}>Verification Checks</CardTitle>
          <ul className="px-5 pb-3 sm:px-6">{m.checks.map((r) => <CheckRowItem key={r.key} row={r} icon={CHECK_ICON[r.key] ?? Info} compact />)}</ul>
        </Card>
        <div className="flex min-w-0 flex-col gap-4 xl:gap-5">
        <Card className="tc-lift">
          <CardTitle icon={<Layers strokeWidth={2.2} />}>Creation &amp; Origin Analysis</CardTitle>
          <div className="px-5 pb-4 sm:px-6">
            <div className={cn("mb-2 flex items-center gap-3 rounded-[14px] px-4 py-3", creationGood ? "bg-[#EAF8EE]" : creationBad ? "bg-[#FDECEC]" : "bg-[#F1F5F9]")}>
              {m.aiEvidence ? <Bot className="h-9 w-9 shrink-0 text-[#4F46E5]" /> : <Camera className={cn("h-9 w-9 shrink-0", creationGood ? "text-[#1E8E3E]" : "text-[#64748B]")} />}
              <div className="min-w-0">
                <p className="text-[15px] font-extrabold text-[#111827] sm:text-[16px]">Creation Method: <span className={creationGood ? "text-[#1E8E3E]" : creationBad ? "text-[#E5352B]" : "text-[#475569]"}>{m.creation.headline.label}</span></p>
                <p className="text-[13px] leading-snug text-[#1F2937]">{m.creation.text}</p>
              </div>
            </div>
            <dl>{m.creation.rows.map((r) => <InfoLine key={r.key} row={r} icon={CREATION_ICON[r.key] ?? Info} compact />)}</dl>
          </div>
        </Card>
        <Card className="tc-lift">
          <CardTitle icon={<Info className="text-[#111827]" strokeWidth={2.4} />}>{m.technicalTitle}</CardTitle>
          <dl className="px-5 pb-4 sm:px-6">{m.technical.map((r) => <InfoLine key={r.key} row={r} icon={TECH_ICON[r.key] ?? Info} compact />)}</dl>
        </Card>
        </div>
      </div>

      <SummaryCards sections={m.sections} />
      <Limits items={m.limits} />
    </div>
  );
}
