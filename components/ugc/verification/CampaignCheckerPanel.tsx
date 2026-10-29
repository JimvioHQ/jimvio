"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, BadgeCheck, Eye, Loader2, ShieldCheck, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { VERDICT_LABELS, type CampaignPerformance, type PerformanceVerdict } from "@/lib/ugc/verification/campaign-performance";
import type { CampaignFunding } from "@/lib/ugc/escrow-funding";
import { FLAG_LABELS, type VerificationFlag } from "@/lib/ugc/verification/signals";

type Row = {
  id: string;
  status: string;
  platform: string;
  postUrl: string;
  creator: string;
  verdict: PerformanceVerdict;
  baselineViews: number | null;
  latestViews: number | null;
  gainedViews: number | null;
  acceptedViews: number | null;
  flags: string[];
  note: string | null;
};

type Payload = {
  campaign: { paymentModel: string; ratePer1k: number };
  funding: CampaignFunding;
  performance: CampaignPerformance;
  submissions: Row[];
};

const VERDICT_TONE: Record<PerformanceVerdict, string> = {
  real: "bg-emerald-50 text-emerald-700",
  held: "bg-amber-50 text-amber-800",
  not_verified: "bg-slate-100 text-slate-600",
  manual: "bg-sky-50 text-sky-700",
  checking: "bg-slate-100 text-slate-600",
};

function fmt(n: number | null | undefined) {
  return n == null ? "—" : Number(n).toLocaleString("en-US");
}

function usd(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Jimvio's checker for a campaign owner: one summary in plain words, the
 * money held, and every post marked real, on hold or not verified.
 */
export function CampaignCheckerPanel({ campaignId, onOpen }: { campaignId: string; onOpen?: (submissionId: string) => void }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/ugc/brand/campaigns/${campaignId}/performance`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not load the checker.");
      setData(json as Payload);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the checker.");
    }
  }, [campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <p className="rounded-xl bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{error}</p>;
  if (!data) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-[#EEF0F2] bg-white p-4 text-[13px] text-[#6B7280]">
        <Loader2 className="h-4 w-4 animate-spin text-[#FF5A1F]" /> Checking views…
      </div>
    );
  }

  const { performance: p, funding: f } = data;
  const perViews = data.campaign.paymentModel === "per_views";

  return (
    <section aria-label="View checker" className="space-y-3 rounded-2xl border border-[#EEF0F2] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-[#FF5A1F]" aria-hidden="true" />
        <h2 className="text-[15px] font-bold text-[#111827]">Jimvio view checker</h2>
        <span className="ml-auto text-[11px] text-[#9CA3AF]">Official platform APIs · rechecked every 6 hours</span>
      </div>

      <p className="rounded-xl bg-[#F9FAFB] px-3 py-2.5 text-[13px] leading-relaxed text-[#374151]">{p.summary}</p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat icon={BadgeCheck} label="Real views" value={fmt(p.realViews)} tone="text-emerald-700" />
        <Stat icon={AlertTriangle} label="Views on hold" value={fmt(p.heldViews)} tone="text-amber-700" />
        <Stat icon={Eye} label="Posts checked" value={`${p.counts.real + p.counts.held}/${p.total}`} />
        <Stat
          icon={Wallet}
          label={perViews ? "Cost of real views" : "Payable from escrow"}
          value={perViews ? usd(p.estimatedCostUsd) : usd(f.remainingUsd)}
        />
      </div>

      <div className="grid gap-2 rounded-xl border border-[#F3F4F6] p-3 text-[12px] text-[#4B5563] sm:grid-cols-3">
        <p>
          Held in escrow: <span className="font-semibold text-[#111827]">{usd(f.heldUsd)}</span>
        </p>
        <p>
          Paid / reserved: <span className="font-semibold text-[#111827]">{usd(f.spentUsd)}</span>
        </p>
        <p>
          Left to pay: <span className="font-semibold text-[#111827]">{usd(f.remainingUsd)}</span>
          {f.state !== "funded" ? <span className="ml-1 text-amber-700">({f.state === "awaiting_funds" ? "not funded" : `${f.coveragePct}% funded`})</span> : null}
        </p>
      </div>

      {data.submissions.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[12.5px]">
            <thead className="text-[11px] uppercase tracking-wide text-[#9CA3AF]">
              <tr>
                <th className="py-2 pr-3 font-semibold">Creator</th>
                <th className="py-2 pr-3 font-semibold">Result</th>
                <th className="py-2 pr-3 text-right font-semibold">At submit</th>
                <th className="py-2 pr-3 text-right font-semibold">Now</th>
                <th className="py-2 pr-3 text-right font-semibold">Real gained</th>
                <th className="py-2 pr-3 font-semibold">Why</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {data.submissions.map((r) => (
                <tr
                  key={r.id}
                  className={cn("align-top", onOpen && "cursor-pointer hover:bg-[#FAFAFA]")}
                  onClick={() => onOpen?.(r.id)}
                >
                  <td className="py-2 pr-3">
                    <p className="font-semibold text-[#111827]">{r.creator}</p>
                    <p className="capitalize text-[11px] text-[#9CA3AF]">
                      {r.platform} · {r.status.replace("_", " ")}
                    </p>
                  </td>
                  <td className="py-2 pr-3">
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", VERDICT_TONE[r.verdict])}>
                      {VERDICT_LABELS[r.verdict]}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmt(r.baselineViews)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmt(r.latestViews)}</td>
                  <td className="py-2 pr-3 text-right font-semibold tabular-nums text-[#111827]">{fmt(r.gainedViews)}</td>
                  <td className="py-2 pr-3 text-[11.5px] text-[#6B7280]">
                    {r.flags.length
                      ? r.flags.map((fl) => FLAG_LABELS[fl as VerificationFlag] ?? fl).join(" ")
                      : r.note ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-[#F3F4F6] p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#6B7280]">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
      </p>
      <p className={cn("mt-1 text-[18px] font-bold tabular-nums text-[#111827]", tone)}>{value}</p>
    </div>
  );
}
