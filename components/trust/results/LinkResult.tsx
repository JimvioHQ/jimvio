"use client";

import { useState } from "react";
import {
  ArrowRightLeft, Ban, Biohazard, CalendarDays, CirclePlus, Clock, CodeXml, Database, FileText, Fish, Gauge, Globe,
  IdCard, Layers, Link2, Lock, MapPin, Network, Search, Server, ShieldCheck, TriangleAlert, User, Info, ShieldX, CircleCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CheckerResult, LinkDetails, ScanReport } from "@/lib/trust/types";
import { linkModel } from "@/lib/trust/result-model";
import { rowsFromChecks, rowsFromInfo, rowsFromTiles, type ReportDoc } from "@/lib/trust/report-doc";
import { Card, CardTitle, CheckRowItem, CopyButton, InfoLine, InfoTip, Limits, ResultHeader, ScoreRing, StatTile, StatusPill } from "./ui";
import { useReportActions } from "./actions";

const CHECK_ICON: Record<string, LucideIcon> = { code: CodeXml, redirects: ArrowRightLeft, phishing: Fish, reputation: Globe, blocklist: Ban, tls: Lock, whois: IdCard, content: FileText };
const INFO_ICON: Record<string, LucideIcon> = { url: Link2, domain: Globe, age: CalendarDays, registrar: User, host: Server, location: MapPin, ip: Network, tls: ShieldCheck, redirects: Link2, type: CodeXml, db: Database, checked: Clock };
const TILE_ICON: Record<string, LucideIcon> = { result: Gauge, threat: Biohazard, category: Fish, redirects: ArrowRightLeft, issues: Layers, db: Globe };

const BANNER_STYLE = {
  danger: { wrap: "border-[#F6C9C6] bg-[linear-gradient(110deg,#FFF5F4_0%,#FFEDEB_100%)]", title: "text-[#D92D20]", circle: "bg-[#FDE2E0]", icon: ShieldX, iconCls: "text-[#D92D20]" },
  bad: { wrap: "border-[#F9D9A9] bg-[linear-gradient(110deg,#FFF8EE_0%,#FFF1E2_100%)]", title: "text-[#E2561B]", circle: "bg-[#FFEFD0]", icon: TriangleAlert, iconCls: "fill-[#F5B70A] text-white" },
  warn: { wrap: "border-[#F9D9A9] bg-[linear-gradient(110deg,#FFF8EE_0%,#FFF1E2_100%)]", title: "text-[#E2561B]", circle: "bg-[#FFEFD0]", icon: TriangleAlert, iconCls: "fill-[#F5B70A] text-white" },
  good: { wrap: "border-[#CDEFD6] bg-[linear-gradient(110deg,#F2FBF4_0%,#EAF8EE_100%)]", title: "text-[#1E8E3E]", circle: "bg-[#DDF3E3]", icon: CircleCheck, iconCls: "fill-[#1E8E3E] text-white" },
  neutral: { wrap: "border-[#E2E8F0] bg-[linear-gradient(110deg,#F8FAFC_0%,#F1F5F9_100%)]", title: "text-[#334155]", circle: "bg-[#E2E8F0]", icon: Info, iconCls: "text-[#475569]" },
} as const;

export function LinkResult({ report, checker, onNewCheck }: { report: ScanReport; checker: CheckerResult; onNewCheck?: () => void }) {
  const d = checker.details?.kind === "links" ? (checker.details as LinkDetails) : null;
  const url = report.input.url ?? d?.submittedUrl ?? "";
  const m = linkModel(checker, d, url, report.createdAt);
  const [showHops, setShowHops] = useState(false);
  const [showDbs, setShowDbs] = useState(false);
  const b = BANNER_STYLE[m.banner.tone];
  const BIcon = b.icon;
  const riskTone = m.risk.value == null ? "neutral" : m.risk.value >= 70 ? "bad" : m.risk.value >= 35 ? "warn" : "good";

  const doc: ReportDoc = {
    scanId: report.id,
    category: "Scam & Malicious Link Detection",
    item: url,
    checkedAt: new Date(report.createdAt).toUTCString(),
    banner: m.banner,
    score: { title: "Overall Risk Score", score: m.risk },
    sections: [
      { title: "Summary", rows: rowsFromTiles(m.tiles) },
      { title: "Detailed Scan Results", rows: rowsFromChecks(m.checks) },
      { title: "Link Information", rows: rowsFromInfo(m.info) },
      ...(m.redirects.length ? [{ title: "Redirect Path", rows: m.redirects.map((h, i) => ({ label: `${i + 1}. HTTP ${h.status}`, value: h.url })) }] : []),
    ],
    limits: m.limits,
  };
  const actions = useReportActions(doc);

  return (
    <div className="space-y-5">
      <ResultHeader icon={ShieldCheck} newIcon={CirclePlus} title="Scam & Malicious Link Detection" subtitle="Comprehensive security, reputation, and risk analysis for the provided link." onNewCheck={onNewCheck} {...actions} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className={cn("rounded-[20px] border px-5 py-5 sm:px-7", b.wrap)}>
          <div className="flex items-center gap-4 sm:gap-6">
            <span className={cn("grid h-[78px] w-[78px] shrink-0 place-items-center rounded-full sm:h-[100px] sm:w-[100px]", b.circle)}>
              <BIcon className={cn("h-11 w-11 sm:h-14 sm:w-14", b.iconCls)} strokeWidth={m.banner.tone === "neutral" ? 2.2 : 1.6} />
            </span>
            <span className="hidden h-20 w-px bg-[#F1C38B] sm:block" />
            <div className="min-w-0">
              <h2 className={cn("text-[23px] font-black leading-tight tracking-[-0.02em] sm:text-[34px]", b.title)}>{m.banner.title}</h2>
              <p className="mt-1.5 text-[14px] leading-6 text-[#111827] sm:text-[17px]">{m.banner.text}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-[14px] border border-[#E5E7EB] bg-white px-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            <Link2 className="h-6 w-6 shrink-0 text-[#111827]" strokeWidth={2.2} />
            <span className="min-w-0 flex-1 break-all text-[15px] font-extrabold text-[#111827] sm:text-[18px]">{url}</span>
            {url ? <CopyButton value={url} label="Copy link" /> : null}
          </div>
        </div>

        <Card className="flex flex-col justify-center px-5 py-5 sm:px-7">
          <h3 className="flex items-center gap-2 text-[19px] font-extrabold text-[#111827] sm:text-[21px]">Overall Risk Score <InfoTip text={m.risk.basis} /></h3>
          <div className="mt-3 flex items-center gap-5">
            <ScoreRing value={m.risk.value} tone={riskTone} size={150} />
            <div className="min-w-0">
              <StatusPill pill={m.risk.badge} size="lg" />
              <p className="mt-3 text-[14px] leading-6 text-[#1F2937] sm:text-[16px]">{m.risk.text}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {m.tiles.map((t) => (
          <StatTile key={t.key} tile={t} icon={TILE_ICON[t.key]} bubble={t.key === "db" ? (t.tone === "bad" ? "bad" : t.tone === "good" ? "good" : "neutral") : "orange"} />
        ))}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <Card>
          <CardTitle icon={<Search className="text-[#111827]" strokeWidth={2.6} />}>Detailed Scan Results</CardTitle>
          <ul className="px-5 pb-3 sm:px-6">
            {m.checks.map((r) => <CheckRowItem key={r.key} row={r} icon={CHECK_ICON[r.key]} />)}
          </ul>
        </Card>
        <Card>
          <CardTitle icon={<Info className="text-[#111827]" strokeWidth={2.4} />}>Link Information</CardTitle>
          <dl className="px-5 pb-4 sm:px-6">
            {m.info.map((r) => (
              <div key={r.key}>
                <InfoLine
                  row={r}
                  icon={INFO_ICON[r.key]}
                  action={
                    r.key === "redirects" && m.redirects.length ? (
                      <button type="button" onClick={() => setShowHops((v) => !v)} className="ml-2 whitespace-nowrap text-[14px] font-semibold text-[#1D4ED8] hover:underline">{showHops ? "Hide details" : "View details"}</button>
                    ) : r.key === "db" && d ? (
                      <button type="button" onClick={() => setShowDbs((v) => !v)} className="ml-2 whitespace-nowrap text-[14px] font-semibold text-[#1D4ED8] hover:underline">{showDbs ? "Hide report" : "View report"}</button>
                    ) : null
                  }
                />
                {r.key === "redirects" && showHops ? (
                  <ol className="mb-2 ml-8 space-y-1 rounded-xl bg-[#F8FAFC] p-3 text-[12.5px] text-[#334155]">
                    {m.redirects.map((h, i) => <li key={`${h.url}-${i}`} className="break-all"><b>{h.status}</b> → {h.url}</li>)}
                    {d?.finalUrl ? <li className="break-all"><b>Final</b> → {d.finalUrl}</li> : null}
                  </ol>
                ) : null}
                {r.key === "db" && showDbs && d ? (
                  <ul className="mb-2 ml-8 space-y-1 rounded-xl bg-[#F8FAFC] p-3 text-[12.5px] text-[#334155]">
                    <li>Google Web Risk: <b>{d.webRisk.status === "match" ? `Listed (${d.webRisk.threats.join(", ").toLowerCase().replace(/_/g, " ")})` : d.webRisk.status === "clean" ? "Not listed" : "Not checked"}</b></li>
                    <li>Phishing.Database: <b>{d.phishingList.status === "match" ? `Listed (${d.phishingList.match})` : d.phishingList.status === "clean" ? "Not listed" : "Not checked"}</b></li>
                  </ul>
                ) : null}
              </div>
            ))}
          </dl>
        </Card>
      </div>
      <Limits items={m.limits} />
    </div>
  );
}
