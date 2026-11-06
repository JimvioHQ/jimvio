"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock3, FileText, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScanReport } from "@/lib/trust/types";

type HistoryItem = {
  id: string;
  input_url: string | null;
  file_name: string | null;
  overall_level: string;
  created_at: string;
};

const LEVEL: Record<string, string> = {
  known_threat: "Known threat",
  high_risk: "High risk",
  suspicious: "Suspicious",
  low_risk: "Low risk",
  inconclusive: "Inconclusive",
};

export function TrustScanHistory({
  refreshKey,
  onOpenReport,
}: {
  refreshKey: number;
  onOpenReport: (report: ScanReport) => void;
}) {
  const [scans, setScans] = useState<HistoryItem[]>([]);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch("/api/trust-checker/history", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Could not load recent checks.");
        return payload as { scans?: HistoryItem[]; authenticated?: boolean };
      })
      .then((payload) => {
        if (!active) return;
        setScans(Array.isArray(payload.scans) ? payload.scans : []);
        setAuthenticated(Boolean(payload.authenticated));
        setError(null);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load recent checks.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [refreshKey, reload]);

  async function openReport(id: string) {
    if (opening) return;
    setOpening(id);
    setError(null);
    try {
      const response = await fetch(`/api/trust-checker/scan/${encodeURIComponent(id)}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.report) throw new Error(payload.error || "This report could not be opened.");
      onOpenReport(payload.report as ScanReport);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This report could not be opened.");
    } finally {
      setOpening(null);
    }
  }

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_32px_rgba(15,23,42,0.04)] sm:p-6" aria-labelledby="trust-history-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#FF5A1F]">Your workspace</p>
          <h2 id="trust-history-heading" className="mt-1 text-xl font-black tracking-tight text-slate-950">Recent checks</h2>
          <p className="mt-1 text-xs text-[#64748B]">Open a previous report from your signed-in account.</p>
        </div>
        {authenticated ? <button type="button" onClick={() => setReload((value) => value + 1)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#E2E7EF] px-3 text-xs font-bold text-[#46536C] hover:bg-[#F8FAFC]" aria-label="Refresh recent checks">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button> : null}
      </div>
      {loading ? (
        <p className="mt-4 flex items-center gap-2 text-xs text-[#64748B]"><Loader2 className="h-4 w-4 animate-spin" /> Loading recent checks…</p>
      ) : !authenticated ? (
        <p className="mt-4 rounded-xl bg-[#F8FAFC] px-4 py-3 text-xs leading-relaxed text-[#64748B]"><Link href="/login?next=%2Ftrust-checker" className="font-bold text-[#FF5A1F] hover:underline">Sign in</Link> to keep and reopen your scan history. You can still run checks without an account.</p>
      ) : scans.length === 0 ? (
        <p className="mt-4 rounded-xl bg-[#F8FAFC] px-4 py-3 text-xs text-[#64748B]">Your saved checks will appear here after your first scan.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white px-3 sm:px-4">
          {scans.map((scan) => (
            <li key={scan.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-[#FF5A1F]"><FileText className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#1B2947]">{scan.input_url || scan.file_name || "File check"}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-[11px] text-[#8792A5]"><Clock3 className="h-3 w-3" />{new Date(scan.created_at).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pl-12 sm:pl-0">
                <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold", scan.overall_level === "known_threat" || scan.overall_level === "high_risk" ? "bg-rose-50 text-rose-700" : scan.overall_level === "low_risk" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800")}>{LEVEL[scan.overall_level] ?? "Inconclusive"}</span>
                <button type="button" disabled={opening !== null} onClick={() => void openReport(scan.id)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 text-xs font-bold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50/60 disabled:opacity-50">
                  {opening === scan.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Open report
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {error ? <p className="mt-3 text-xs font-semibold text-rose-700" role="alert">{error}</p> : null}
    </section>
  );
}
