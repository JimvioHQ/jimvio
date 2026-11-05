"use client";

import {
  BadgeCheck, BookOpen, BrainCircuit, Bug, CalendarDays, CircleCheck, CircleX, Copyright, Database, FileText, Info, Layers,
  PenTool, RotateCw, Search, ShieldCheck, TriangleAlert, User, Bot,
  type LucideIcon,
} from "lucide-react";
import type { CheckerResult, ProductDetails, ScanReport } from "@/lib/trust/types";
import { productModel } from "@/lib/trust/result-model";
import { rowsFromChecks, rowsFromInfo, rowsFromTiles, type ReportDoc } from "@/lib/trust/report-doc";
import { Card, CardTitle, CheckRowItem, InfoLine, Limits, ResultHeader, ScoreCard, StatTile, VerdictBanner } from "./ui";
import { useReportActions } from "./actions";

const CHECK_ICON: Record<string, LucideIcon> = { authenticity: Layers, safety: Bug, seller: BadgeCheck, authorship: BrainCircuit, copyright: Copyright, quality: FileText };
const INFO_ICON: Record<string, LucideIcon> = { name: FileText, type: Layers, basis: Search, format: FileText, size: Database, pages: BookOpen, author: User, authorship: BrainCircuit, date: CalendarDays, tool: PenTool, license: Copyright, description: FileText };

function PdfArt({ label }: { label: string }) {
  return (
    <div className="relative grid aspect-[3/2] w-full place-items-center overflow-hidden rounded-[14px] bg-[linear-gradient(135deg,#FBD9DD_0%,#F7C3CA_100%)] sm:w-[250px]">
      <div className="relative h-[72%] w-[46%] rounded-[8px] bg-white shadow-[0_10px_24px_rgba(190,40,60,0.22)]">
        <span className="absolute right-0 top-0 h-[22%] w-[26%] rounded-bl-[8px] bg-[#EEF1F5]" />
        <span className="absolute left-[16%] top-[22%] h-[5%] w-[52%] rounded bg-[#D7DCE3]" />
        <span className="absolute left-[16%] top-[34%] h-[5%] w-[64%] rounded bg-[#D7DCE3]" />
        <span className="absolute left-[16%] top-[46%] h-[5%] w-[44%] rounded bg-[#D7DCE3]" />
        <span className="absolute -left-[22%] bottom-[14%] rounded-[6px] bg-[#E11D2E] px-3 py-1 text-[22px] font-black tracking-wide text-white shadow-md sm:text-[26px]">{label}</span>
      </div>
    </div>
  );
}

function BookArt({ title, author }: { title: string; author: string | null }) {
  return (
    <div className="relative grid aspect-[3/2] w-full place-items-center overflow-hidden rounded-[14px] bg-[linear-gradient(135deg,#E9E4FB_0%,#D9D2F6_100%)] sm:w-[250px]">
      <div className="flex h-[88%] w-[46%] flex-col justify-between rounded-[4px] border-l-[6px] border-[#0B1430] bg-[linear-gradient(160deg,#16244B_0%,#0B1430_100%)] p-2.5 text-center shadow-[0_12px_26px_rgba(20,20,60,0.35)]">
        <p className="line-clamp-4 break-normal text-[12px] font-black leading-tight text-white [overflow-wrap:normal] sm:text-[13px]">{title}</p>
        <BookOpen className="mx-auto h-7 w-7 text-[#F5B70A]" />
        <p className="truncate text-[9px] font-semibold text-white/85">{author ?? ""}</p>
      </div>
    </div>
  );
}

export function ProductResult({ report, checker, onNewCheck }: { report: ScanReport; checker: CheckerResult; onNewCheck?: () => void }) {
  const d = checker.details as ProductDetails;
  const m = productModel(checker, d);
  const doc: ReportDoc = {
    scanId: report.id,
    category: "Digital Product Verification",
    item: `${m.typeLabel}: ${m.title}${d.fileName ? ` (${d.fileName})` : ""}`,
    checkedAt: new Date(report.createdAt).toUTCString(),
    banner: m.banner,
    score: { title: "Trust Score", score: m.score },
    sections: [
      { title: "Summary", rows: rowsFromTiles(m.tiles) },
      { title: "Verification Checks", rows: rowsFromChecks(m.checks) },
      { title: "Product Information", rows: rowsFromInfo(m.info) },
    ],
    limits: m.limits,
  };
  const actions = useReportActions(doc);
  const bannerIcon = m.banner.tone === "good" ? ShieldCheck : m.banner.tone === "neutral" ? Info : TriangleAlert;
  const scoreTone = m.score.value == null ? "neutral" : m.score.value >= 80 ? "good" : m.score.value >= 50 ? "warn" : "bad";

  return (
    <div className="space-y-5">
      <ResultHeader icon={Layers} newIcon={RotateCw} title="Digital Product Verification" subtitle="Verification of digital product legitimacy, authorship, and quality." onNewCheck={onNewCheck} {...actions} />
      <VerdictBanner banner={m.banner} icon={bannerIcon} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <Card className="flex flex-col gap-5 p-4 sm:flex-row sm:items-center sm:p-5">
          {m.isBook ? <BookArt title={m.title} author={m.author} /> : <PdfArt label={m.formatShort} />}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[15px] text-[#111827] sm:text-[16px]">
              <FileText className="h-6 w-6 text-[#FF5A1F]" strokeWidth={2} /> {m.typeLabel}
            </div>
            <div className="mt-2 flex items-start justify-between gap-3">
              <h2 className="break-words text-[21px] font-extrabold leading-snug text-[#111827] sm:text-[26px]">{m.title}</h2>
              {m.isTemplate ? <span className="mt-1 shrink-0 rounded-full bg-[#ECEBFF] px-4 py-1.5 text-[14px] font-semibold text-[#4338CA]">Template</span> : null}
            </div>
            {m.description ? <p className="mt-1 text-[15px] text-[#1F2937] sm:text-[17px]">{m.description}</p> : null}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-[#111827] sm:text-[15.5px]">
              <span className="flex items-center gap-2"><User className="h-5 w-5" /> {m.author ? `By ${m.author}` : "Author: Not verified"}</span>
              <span className="hidden h-6 w-px bg-[#E5E7EB] sm:block" />
              <span className="flex items-center gap-2"><CalendarDays className="h-5 w-5" /> {m.dateLabel}: {m.date ?? "Unknown"}</span>
              <span className="hidden h-6 w-px bg-[#E5E7EB] sm:block" />
              <span className="flex items-center gap-2"><FileText className="h-5 w-5" /> {m.formatShort} • {m.size ?? "—"}</span>
            </div>
          </div>
        </Card>
        <ScoreCard title="Trust Score" score={m.score} tone={scoreTone} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {m.tiles.map((t) => {
          const icon = t.key === "status" ? (t.tone === "good" ? CircleCheck : t.tone === "bad" ? CircleX : t.tone === "warn" ? TriangleAlert : Info) : t.key === "type" ? (m.isBook ? BookOpen : FileText) : t.key === "size" ? Database : t.key === "format" ? FileText : t.key === "authorship" ? (d.aiToolInMetadata ? Bot : User) : CalendarDays;
          const bubble = t.key === "status" ? (t.tone === "good" ? "good" : t.tone === "bad" ? "bad" : t.tone === "warn" ? "warn" : "neutral") : t.key === "authorship" && d.aiToolInMetadata ? "bad" : "orange";
          return <StatTile key={t.key} tile={t} icon={icon} bubble={bubble} />;
        })}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <Card>
          <CardTitle icon={<ShieldCheck strokeWidth={2.2} />}>Verification Checks</CardTitle>
          <ul className="px-5 pb-3 sm:px-6">{m.checks.map((r) => <CheckRowItem key={r.key} row={r} icon={CHECK_ICON[r.key]} />)}</ul>
        </Card>
        <Card>
          <CardTitle icon={<Info className="text-[#111827]" strokeWidth={2.4} />}>Product Information</CardTitle>
          <dl className="px-5 pb-4 sm:px-6">{m.info.map((r) => <InfoLine key={r.key} row={r} icon={INFO_ICON[r.key]} />)}</dl>
        </Card>
      </div>
      <Limits items={m.limits} />
    </div>
  );
}
