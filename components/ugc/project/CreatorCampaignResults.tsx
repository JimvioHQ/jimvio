"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  ChevronDown,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  MessageSquare,
  Plus,
  RotateCcw,
  Wallet,
  XCircle,
} from "lucide-react";
import type { UGCCampaign, UGCSubmission } from "@/types/ugc";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";
import { getCampaignRewardLine } from "@/components/ugc/workspace/ugc-campaign-utils";
import { ViewVerificationPanel, type VerificationFields } from "@/components/ugc/verification/ViewVerificationPanel";

type Payout = { id: string; amount: number; status: string; created_at: string; paid_at: string | null; submission_id: string };

type Sub = UGCSubmission &
  VerificationFields & {
    baseline_views?: number | null;
    latest_views?: number | null;
  };

type Step = { label: string; state: "done" | "current" | "todo" | "bad" };

function formatDate(s?: string | null) {
  return s ? new Date(s).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";
}

function stepsFor(sub: Sub, payout: Payout | undefined): Step[] {
  const reviewedBad = sub.status === "rejected" || sub.status === "removed";
  const revision = sub.status === "revision_requested";
  const approved = sub.status === "approved";
  const checked = sub.verification_status === "verified" || sub.verification_status === "unsupported";
  return [
    { label: "Submitted", state: "done" },
    { label: "Views checked", state: checked ? "done" : approved || reviewedBad ? "done" : "current" },
    {
      label: reviewedBad ? "Not approved" : revision ? "Changes asked" : "Approved",
      state: reviewedBad ? "bad" : revision ? "current" : approved ? "done" : "todo",
    },
    {
      label: "Paid to wallet",
      state: payout?.status === "paid" ? "done" : approved && payout ? "current" : "todo",
    },
  ];
}

function Timeline({ steps }: { steps: Step[] }) {
  return (
    <ol className="flex items-center gap-1.5">
      {steps.map((s, i) => (
        <li key={s.label} className="flex min-w-0 flex-1 items-center gap-1.5">
          <span
            className={cn(
              "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold",
              s.state === "done" && "bg-emerald-600 text-white",
              s.state === "current" && "bg-[#FF5A1F] text-white",
              s.state === "bad" && "bg-rose-600 text-white",
              s.state === "todo" && "bg-[#E5E7EB] text-[#9CA3AF]",
            )}
          >
            {s.state === "done" ? "✓" : s.state === "bad" ? "✕" : i + 1}
          </span>
          <span
            className={cn(
              "truncate text-[11.5px] font-medium",
              s.state === "todo" ? "text-[#9CA3AF]" : s.state === "bad" ? "text-rose-700" : "text-[#374151]",
            )}
          >
            {s.label}
          </span>
          {i < steps.length - 1 ? <span className="hidden h-px flex-1 bg-[#E5E7EB] sm:block" /> : null}
        </li>
      ))}
    </ol>
  );
}

/**
 * The creator's view of one campaign: what they earned, what is on the way,
 * and every post with its result, the reason when it wasn't approved, the
 * views that counted and the money added to their wallet.
 */
export function CreatorCampaignResults({
  campaign,
  campaignId,
  submissions,
  onReload,
}: {
  campaign: UGCCampaign;
  campaignId: string;
  submissions: UGCSubmission[];
  onReload: () => void;
}) {
  const { formatMoney } = useCurrency();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const subs = submissions as Sub[];
  const perViews = campaign.payment_model === "per_views";

  useEffect(() => {
    fetch("/api/ugc/payouts/history", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setPayouts(((j?.data ?? []) as (Payout & { campaign_id?: string })[]).filter((p) => p.campaign_id === campaignId)))
      .catch(() => undefined);
  }, [campaignId]);

  const payoutBySub = useMemo(() => {
    const m = new Map<string, Payout>();
    for (const p of payouts) m.set(p.submission_id, p);
    return m;
  }, [payouts]);

  const paid = payouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const onTheWay = payouts.filter((p) => p.status !== "paid").reduce((s, p) => s + p.amount, 0);
  const realViews = subs.reduce(
    (s, x) =>
      s +
      (x.verification_status === "verified" && x.latest_views != null && x.baseline_views != null
        ? Math.max(0, x.latest_views - x.baseline_views)
        : 0),
    0,
  );
  const counts = {
    approved: subs.filter((s) => s.status === "approved").length,
    review: subs.filter((s) => s.status === "pending").length,
    changes: subs.filter((s) => s.status === "revision_requested").length,
    rejected: subs.filter((s) => s.status === "rejected" || s.status === "removed").length,
  };

  return (
    <div className="min-w-0 space-y-5">
      {/* Money and results */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl bg-[#111827] p-4 text-white">
          <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-white/70">
            <Wallet className="h-3.5 w-3.5" /> In your wallet
          </p>
          <p className="mt-1 text-[24px] font-bold tabular-nums">{formatMoney(paid, "USD")}</p>
          <p className="text-[11px] text-white/60">Paid from this campaign</p>
        </div>
        <div className="rounded-2xl border border-[#EEF0F2] bg-white p-4">
          <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#6B7280]">
            <Clock className="h-3.5 w-3.5" /> On the way
          </p>
          <p className="mt-1 text-[24px] font-bold tabular-nums text-[#111827]">{formatMoney(onTheWay, "USD")}</p>
          <p className="text-[11px] text-[#9CA3AF]">Released 48h after approval</p>
        </div>
        <div className="rounded-2xl border border-[#EEF0F2] bg-white p-4">
          <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#6B7280]">
            <Eye className="h-3.5 w-3.5" /> Real views
          </p>
          <p className="mt-1 text-[24px] font-bold tabular-nums text-[#111827]">{realViews.toLocaleString("en-US")}</p>
          <p className="text-[11px] text-[#9CA3AF]">Verified, since you submitted</p>
        </div>
        <div className="rounded-2xl border border-[#EEF0F2] bg-white p-4">
          <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#6B7280]">
            <FileText className="h-3.5 w-3.5" /> Posts
          </p>
          <p className="mt-1 text-[24px] font-bold tabular-nums text-[#111827]">{subs.length}</p>
          <p className="text-[11px] text-[#9CA3AF]">
            {counts.approved} approved · {counts.review} in review{counts.rejected ? ` · ${counts.rejected} not approved` : ""}
          </p>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/ugc/${campaignId}/submit`}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-[#FF5A1F] px-5 text-[13.5px] font-bold text-white shadow-[0_8px_20px_rgba(255,90,31,0.25)] hover:bg-[#E54E18]"
        >
          <Plus className="h-4 w-4" /> Submit a post
        </Link>
        <Link
          href={`/ugc/${campaignId}`}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 text-[13px] font-semibold text-[#374151]"
        >
          <FileText className="h-4 w-4" /> Brief
        </Link>
        <Link
          href={`/ugc/${campaignId}/chat`}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 text-[13px] font-semibold text-[#374151]"
        >
          <MessageSquare className="h-4 w-4" /> Message the brand
        </Link>
        <span className="ml-auto text-[12.5px] font-semibold text-[#6B7280]">{getCampaignRewardLine(campaign, formatMoney)}</span>
      </div>

      {/* Posts */}
      <section className="space-y-3">
        <h2 className="text-[16px] font-bold text-[#111827]">Your posts</h2>
        {subs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-white p-8 text-center">
            <p className="text-[14px] font-semibold text-[#111827]">No posts yet</p>
            <p className="mt-1 text-[13px] text-[#6B7280]">
              Post your video, then submit the link here. {perViews ? "Only views gained after you submit are paid — submit right after posting." : ""}
            </p>
          </div>
        ) : (
          subs.map((sub) => {
            const payout = payoutBySub.get(sub.id);
            const gained =
              sub.latest_views != null && sub.baseline_views != null ? Math.max(0, sub.latest_views - sub.baseline_views) : null;
            const bad = sub.status === "rejected" || sub.status === "removed";
            const revision = sub.status === "revision_requested";
            const approved = sub.status === "approved";
            const expanded = open === sub.id;
            const releaseOn = payout && payout.status !== "paid" ? new Date(Date.parse(payout.created_at) + 48 * 3_600_000) : null;
            return (
              <article key={sub.id} className="overflow-hidden rounded-2xl border border-[#EEF0F2] bg-white shadow-sm">
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <a
                        href={sub.post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-full items-center gap-1 truncate text-[14px] font-semibold capitalize text-[#111827] hover:text-[#FF5A1F]"
                      >
                        {sub.platform} post <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      </a>
                      <p className="text-[12px] text-[#9CA3AF]">Submitted {formatDate(sub.created_at)}</p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11.5px] font-bold",
                        approved && "bg-emerald-50 text-emerald-700",
                        bad && "bg-rose-50 text-rose-700",
                        revision && "bg-amber-50 text-amber-800",
                        sub.status === "pending" && "bg-sky-50 text-sky-700",
                      )}
                    >
                      {approved ? "Approved" : bad ? "Not approved" : revision ? "Changes requested" : "In review"}
                    </span>
                  </div>

                  <Timeline steps={stepsFor(sub, payout)} />

                  {bad || revision ? (
                    <div className={cn("rounded-xl px-3 py-2.5", bad ? "bg-rose-50" : "bg-amber-50")}>
                      <p className={cn("flex items-center gap-1.5 text-[12.5px] font-bold", bad ? "text-rose-800" : "text-amber-900")}>
                        <XCircle className="h-4 w-4" /> {bad ? "Why it wasn't approved" : "What the brand wants changed"}
                      </p>
                      <p className={cn("mt-1 text-[13px]", bad ? "text-rose-800" : "text-amber-900")}>
                        {sub.rejection_reason || "The brand did not leave a reason. Message them to ask."}
                      </p>
                      <Link
                        href={`/ugc/${campaignId}/submit`}
                        className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#111827] hover:underline"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> {revision ? "Fix and resubmit" : "Submit a new post"}
                      </Link>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#F9FAFB] p-2.5 text-center">
                    <div>
                      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Real views</p>
                      <p className="text-[15px] font-bold tabular-nums text-[#111827]">
                        {gained != null ? gained.toLocaleString("en-US") : "—"}
                      </p>
                      {sub.verification_status === "verified" ? (
                        <p className="inline-flex items-center gap-0.5 text-[10.5px] font-semibold text-emerald-700">
                          <BadgeCheck className="h-3 w-3" /> verified
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Views paid</p>
                      <p className="text-[15px] font-bold tabular-nums text-[#111827]">
                        {perViews ? (sub.accepted_views != null ? sub.accepted_views.toLocaleString("en-US") : "—") : "Fixed"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Earned</p>
                      <p className="text-[15px] font-bold tabular-nums text-[#111827]">
                        {payout ? formatMoney(payout.amount, "USD") : approved ? formatMoney(Number(sub.total_earnings ?? 0), "USD") : "—"}
                      </p>
                    </div>
                  </div>

                  {payout ? (
                    <p
                      className={cn(
                        "flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px] font-medium",
                        payout.status === "paid" ? "bg-emerald-50 text-emerald-800" : "bg-[#FFF7F2] text-[#7C2D12]",
                      )}
                    >
                      <Wallet className="h-4 w-4" />
                      {payout.status === "paid"
                        ? `${formatMoney(payout.amount, "USD")} added to your wallet${payout.paid_at ? ` on ${formatDate(payout.paid_at)}` : ""}.`
                        : `${formatMoney(payout.amount, "USD")} will be added to your wallet${releaseOn ? ` around ${formatDate(releaseOn.toISOString())}` : ""}.`}
                    </p>
                  ) : approved ? (
                    <p className="rounded-xl bg-[#F9FAFB] px-3 py-2 text-[12.5px] text-[#6B7280]">Approved. No payment was due for this post.</p>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : sub.id)}
                    aria-expanded={expanded}
                    className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#6B7280] hover:text-[#111827]"
                  >
                    View check details <ChevronDown className={cn("h-3.5 w-3.5 transition", expanded && "rotate-180")} />
                  </button>
                  {expanded ? <ViewVerificationPanel submission={sub} viewer="creator" onChecked={onReload} /> : null}
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
