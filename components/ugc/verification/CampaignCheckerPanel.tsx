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
  username?: string | null;
  verdict: PerformanceVerdict;
  baselineViews: number | null;
  latestViews: number | null;
  gainedViews: number | null;
  acceptedViews: number | null;
  flags: string[];
  note: string | null;
  content?: { aiGeneratedLikelihood?: number | null; qualityScore?: number | null; summary?: string | null } | null;
  estimatedReward?: number | null;
  publicViews?: number | null;
  thumbnail?: string | null;
  avatar?: string | null;
  createdAt?: string | null;
  earnings?: number | null;
  rejectionReason?: string | null;
};

type Payload = {
  campaign: { paymentModel: string; ratePer1k: number; reviewMode?: "manual" | "auto" };
  funding: CampaignFunding;
  performance: CampaignPerformance;
  submissions: Row[];
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
  const [savingMode, setSavingMode] = useState(false);

  async function setMode(mode: "manual" | "auto") {
    if (!data || data.campaign.reviewMode === mode) return;
    setSavingMode(true);
    const res = await fetch(`/api/ugc/brand/campaigns/${campaignId}/review-mode`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    setSavingMode(false);
    if (res.ok) setData({ ...data, campaign: { ...data.campaign, reviewMode: mode } });
  }

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
  // What approving every open, verified post would cost right now (caps included).
  const payableNow = data.submissions
    .filter((r) => r.status !== "rejected" && r.status !== "removed")
    .reduce((sum, r) => sum + (r.status === "approved" ? Number(r.earnings ?? 0) : Number(r.estimatedReward ?? 0)), 0);
  const perViews = data.campaign.paymentModel === "per_views";

  return (
    <section aria-label="View checker" className="space-y-3 rounded-2xl border border-[#EEF0F2] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-[#FF5A1F]" aria-hidden="true" />
        <h2 className="text-[15px] font-bold text-[#111827]">Jimvio view checker</h2>
        <span className="ml-auto text-[11px] text-[#9CA3AF]">Official platform APIs · rechecked every 6 hours</span>
      </div>

      <p className="rounded-xl bg-[#F9FAFB] px-3 py-2.5 text-[13px] leading-relaxed text-[#374151]">{p.summary}</p>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#F3F4F6] p-2.5">
        <span className="text-[12px] font-semibold text-[#374151]">Who reviews posts?</span>
        <div className="inline-flex rounded-full bg-[#F3F4F6] p-0.5" role="radiogroup" aria-label="Review mode">
          {(
            [
              ["manual", "I review myself"],
              ["auto", "Jimvio reviews for me"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={(data.campaign.reviewMode ?? "manual") === mode}
              disabled={savingMode}
              onClick={() => void setMode(mode)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12px] font-semibold transition",
                (data.campaign.reviewMode ?? "manual") === mode ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280]",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-[11.5px] text-[#6B7280]">
          {(data.campaign.reviewMode ?? "manual") === "auto"
            ? "Clean posts with verified real views are approved automatically after views settle (3 days; 1 day for fixed pay). Anything flagged waits for you."
            : "You approve or reject every post. The checker's results help you decide."}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat icon={BadgeCheck} label="Real views" value={fmt(p.realViews)} tone="text-emerald-700" />
        <Stat icon={AlertTriangle} label="Views on hold" value={fmt(p.heldViews)} tone="text-amber-700" />
        <Stat icon={Eye} label="Posts checked" value={`${p.counts.real + p.counts.held}/${p.total}`} />
        <Stat
          icon={Wallet}
          label="Cost of real views"
          value={usd(Math.round(payableNow * 100) / 100)}
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
        <ul className="grid gap-3">
          {data.submissions.map((r) => (
            <SubmissionCard key={r.id} row={r} perViews={perViews} onOpen={onOpen} />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-[#E5E7EB] p-6 text-center text-[13px] text-[#6B7280]">
          No posts submitted yet. They appear here as soon as creators submit.
        </p>
      )}
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

const STATUS_LABEL: Record<string, string> = {
  pending: "Waiting for review",
  approved: "Approved",
  rejected: "Declined",
  revision_requested: "Changes requested",
  removed: "Removed",
};

function chip(tone: "good" | "warn" | "bad" | "neutral") {
  return {
    good: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    warn: "bg-amber-50 text-amber-800 ring-amber-200",
    bad: "bg-rose-50 text-rose-700 ring-rose-200",
    neutral: "bg-slate-50 text-slate-600 ring-slate-200",
  }[tone];
}

/** One post: who, what it earned, whether the views are real, and the AI read. */
function SubmissionCard({ row: r, perViews, onOpen }: { row: Row; perViews: boolean; onOpen?: (id: string) => void }) {
  const verdictTone: "good" | "warn" | "bad" | "neutral" =
    r.verdict === "real" ? "good" : r.verdict === "held" ? "bad" : r.verdict === "manual" ? "neutral" : "warn";
  const ai = r.content?.aiGeneratedLikelihood;
  const q = r.content?.qualityScore;
  const views = r.gainedViews ?? null;
  return (
    <li className="overflow-hidden rounded-2xl border border-[#EEF0F2] bg-white">
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <a href={r.postUrl} target="_blank" rel="noopener noreferrer" className="relative block h-24 w-full shrink-0 overflow-hidden rounded-xl bg-[#F3F4F6] sm:h-20 sm:w-36">
          {r.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.thumbnail} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center text-[11px] font-semibold uppercase text-[#9CA3AF]">{r.platform}</span>
          )}
          <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">{r.platform}</span>
        </a>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {r.username ? (
              <a href={`/u/${r.username}`} className="text-[14px] font-bold text-[#111827] hover:text-[#FF5A1F]">
                {r.creator}
              </a>
            ) : (
              <span className="text-[14px] font-bold text-[#111827]">{r.creator}</span>
            )}
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1", chip(verdictTone))}>{VERDICT_LABELS[r.verdict]}</span>
            <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[11px] font-medium text-[#4B5563]">{STATUS_LABEL[r.status] ?? r.status}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#4B5563]">
            <span>
              At submit <b className="tabular-nums text-[#111827]">{fmt(r.baselineViews)}</b>
            </span>
            <span>
              Now <b className="tabular-nums text-[#111827]">{fmt(r.latestViews ?? r.publicViews)}</b>
            </span>
            <span>
              Real views gained <b className="tabular-nums text-emerald-700">{fmt(views)}</b>
            </span>
            {ai != null ? (
              <span className={cn("rounded-full px-1.5 font-semibold ring-1", chip(ai >= 70 ? "bad" : ai <= 30 ? "good" : "warn"))}>AI {ai}%</span>
            ) : null}
            {q != null ? (
              <span className={cn("rounded-full px-1.5 font-semibold ring-1", chip(q >= 70 ? "good" : q < 45 ? "bad" : "warn"))}>Quality {q}</span>
            ) : null}
          </div>
          {r.flags.length || r.note || r.rejectionReason ? (
            <p className={cn("mt-1 text-[11.5px]", r.flags.length ? "text-rose-700" : "text-[#6B7280]")}>
              {r.flags.length
                ? r.flags.map((fl) => FLAG_LABELS[fl as VerificationFlag] ?? fl).join(" ")
                : r.rejectionReason ?? r.note}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-row items-center justify-between gap-3 sm:flex-col sm:items-end">
          <div className="text-right">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
              {r.status === "approved" ? "Earned" : "Pay if approved"}
            </p>
            <p className="text-[18px] font-bold tabular-nums text-[#111827]">
              {r.status === "approved" && r.earnings != null
                ? usd(Number(r.earnings))
                : r.estimatedReward != null
                  ? usd(r.estimatedReward)
                  : perViews
                    ? "—"
                    : "—"}
            </p>
            {perViews && r.estimatedReward == null && r.status !== "approved" ? (
              <p className="text-[10.5px] text-[#9CA3AF]">after views are verified</p>
            ) : null}
          </div>
          {onOpen && (r.status === "pending" || r.status === "revision_requested") ? (
            <button
              type="button"
              onClick={() => onOpen(r.id)}
              className="inline-flex h-9 items-center rounded-full bg-[#FF5A1F] px-4 text-[12.5px] font-bold text-white hover:bg-[#E54E18]"
            >
              Review
            </button>
          ) : onOpen ? (
            <button type="button" onClick={() => onOpen(r.id)} className="text-[12px] font-semibold text-[#6B7280] hover:underline">
              Details
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}
