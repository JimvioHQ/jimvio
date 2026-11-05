"use client";

import { FileQuestion, RotateCw, ShieldCheck } from "lucide-react";
import type { ScanReport } from "@/lib/trust/types";
import { primaryChecker, reportCategory, fmtBytes } from "@/lib/trust/result-model";
import { LegacyReportView } from "../TrustReportView";
import { LinkResult } from "./LinkResult";
import { EngagementResult } from "./EngagementResult";
import { ProductResult } from "./ProductResult";
import { MediaResult, type LocalPreview } from "./MediaResult";
import { Card } from "./ui";

function UnsupportedResult({ report, onNewCheck }: { report: ScanReport; onNewCheck?: () => void }) {
  const f = report.input.file;
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[18px] bg-[#FFF1EA] text-[#FF5A1F]"><ShieldCheck className="h-9 w-9" /></span>
        <div>
          <h1 className="text-[26px] font-black tracking-[-0.025em] text-[#111827] sm:text-[33px]">Unsupported File Format</h1>
          <p className="mt-1 text-[14px] text-[#334155] sm:text-[17px]">No verification was run, so nothing is marked safe or unsafe.</p>
        </div>
      </div>
      <Card className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-[#EEF1F5] text-[#475569]"><FileQuestion className="h-10 w-10" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] leading-7 text-[#1F2937]">{report.unsupportedReason ?? "This file's format isn't supported."}</p>
          {f ? <p className="mt-2 break-all text-[14px] text-[#475569]"><b className="text-[#111827]">{f.name}</b> · {f.type} · {fmtBytes(f.size)}</p> : null}
        </div>
        {onNewCheck ? (
          <button type="button" onClick={onNewCheck} className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-[#FF5A1F] px-6 text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(255,90,31,0.25)] hover:bg-[#ED4D16]"><RotateCw className="h-5 w-5" /> Check another file</button>
        ) : null}
      </Card>
    </div>
  );
}

/** Opens exactly one result experience: the category the scan was routed to. */
export function TrustResult({ report, preview, onNewCheck }: { report: ScanReport; preview?: LocalPreview | null; onNewCheck?: () => void }) {
  const category = reportCategory(report);
  if (category === "unsupported") return <UnsupportedResult report={report} onNewCheck={onNewCheck} />;
  const checker = primaryChecker(report);
  if (!checker) return <LegacyReportView report={report} onRunAnother={onNewCheck} />;
  if (category === "links") return <LinkResult report={report} checker={checker} onNewCheck={onNewCheck} />;
  if (category === "engagement" && checker.details?.kind === "engagement") return <EngagementResult report={report} checker={checker} onNewCheck={onNewCheck} />;
  if (category === "product" && checker.details?.kind === "product") return <ProductResult report={report} checker={checker} onNewCheck={onNewCheck} />;
  if (category === "media" && checker.details?.kind === "media") return <MediaResult report={report} checker={checker} preview={preview} onNewCheck={onNewCheck} />;
  // Reports saved before structured results existed.
  return <LegacyReportView report={report} onRunAnother={onNewCheck} />;
}
