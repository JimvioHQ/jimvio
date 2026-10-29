"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/context/CurrencyContext";
import { ViewVerificationPanel, type VerificationFields } from "@/components/ugc/verification/ViewVerificationPanel";

type Detail = VerificationFields & {
  id: string;
  funding?: { state?: string; remainingUsd?: number } | null;
  post_url: string;
  platform: string;
  status: string;
  caption?: string | null;
  created_at?: string;
  claimed_views?: number | null;
  accepted_views?: number | null;
  total_views_earned?: number | null;
  total_earnings?: number | null;
  last_synced_at?: string | null;
  rejection_reason?: string | null;
  reviewed_at?: string | null;
  media?: Array<{ type?: string; url: string; thumbnail_url?: string | null }>;
  influencer?: { display_name?: string; profile_image?: string | null } | null;
  campaign?: {
    title?: string;
    payment_model?: string;
    rate_per_1k_views?: number;
    fixed_rate?: number;
    total_budget?: number;
    spent_budget?: number;
  } | null;
};

function countLabel(value: number | null | undefined, empty: string) {
  if (value == null || Number.isNaN(Number(value))) return empty;
  return Number(value).toLocaleString();
}

export function SubmissionReviewDrawer({
  id,
  onClose,
  onDone,
}: {
  id: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { formatMoney } = useCurrency();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [views, setViews] = useState("");
  const [quote, setQuote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/ugc/submissions/${id}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setError(json.error || "Could not open this submission.");
        return;
      }
      const row = (json.submission ?? null) as Detail | null;
      setDetail(row);
      if (row?.accepted_views != null) setViews(String(row.accepted_views));
      else if (row?.verification_status === "verified" && row.verified_views != null) {
        setViews((current) => current || String(row.verified_views));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  const model = detail?.campaign?.payment_model;
  const perViews = model === "per_views";
  const reviewable = detail?.status === "pending" || detail?.status === "revision_requested";
  const remaining =
    detail?.funding?.remainingUsd != null
      ? detail.funding.remainingUsd
      : detail?.campaign?.total_budget != null
      ? Math.max(0, Number(detail.campaign.total_budget) - Number(detail.campaign.spent_budget ?? 0))
      : null;

  async function preview() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/ugc/submissions/${id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preview: true,
          acceptedViews: perViews ? Number(views) : undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not calculate the reward.");
      setQuote(
        `Eligible reward ${formatMoney(Number(json.payable ?? 0), "USD")}${
          json.cappedBy ? ` (limited by ${json.cappedBy === "budget" ? "remaining budget" : "max payout"})` : ""
        }. Approval is not payment.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not calculate the reward.");
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!window.confirm("Approve this submission and record the eligible reward?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/ugc/submissions/${id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptedViews: perViews ? Number(views) : undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Approval failed");
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approval failed");
    } finally {
      setBusy(false);
    }
  }

  async function decline() {
    const reason = window.prompt("Why are you declining this post? The creator sees this.", "Does not meet the campaign brief");
    if (reason == null) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/ugc/submissions/${id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || "Does not meet the campaign brief" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not decline");
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not decline");
    } finally {
      setBusy(false);
    }
  }

  const media = detail?.media?.[0];

  return (
    <div className="fixed inset-0 z-[120] flex justify-end bg-black/40" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Review submission"
        className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-[#111827]">Review submission</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl">
            <X className="h-4 w-4" />
          </button>
        </div>
        {error ? <p className="mt-3 text-[13px] text-rose-700">{error}</p> : null}
        {!detail && !error ? <p className="mt-4 text-sm text-[#6B7280]">Loading…</p> : null}
        {detail ? (
          <div className="mt-4 space-y-4 text-[13px] text-[#374151]">
            <section>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">Submission</p>
              <p className="mt-1 font-semibold text-[#111827]">{detail.influencer?.display_name ?? "Creator"}</p>
              <p>{detail.campaign?.title ?? "Campaign"}</p>
              <p className="break-all text-[12px] text-[#6B7280]">{detail.id}</p>
              <p className="mt-1 capitalize">
                {detail.platform} · {detail.status.replaceAll("_", " ")} ·{" "}
                {detail.created_at ? new Date(detail.created_at).toLocaleString() : "Date unavailable"}
              </p>
              <a href={detail.post_url} target="_blank" rel="noreferrer" className="mt-2 block break-all font-medium text-[#FF5A1F]">
                Open content
              </a>
              {media?.url ? (
                media.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={media.url} alt="" className="mt-2 max-h-48 w-full rounded-xl object-cover" />
                ) : (
                  <video src={media.url} controls className="mt-2 w-full rounded-xl bg-black" />
                )
              ) : (
                <p className="mt-2 text-[12px] text-[#6B7280]">No uploaded preview. Use the content URL.</p>
              )}
            </section>

            <section>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">Performance</p>
              <p className="mt-1">Claimed views: {countLabel(detail.claimed_views, "Not available")}</p>
              <p>Owner-accepted views: {countLabel(detail.accepted_views, "Not reviewed")}</p>
              <div className="mt-2">
                <ViewVerificationPanel
                  submission={detail}
                  viewer="brand"
                  onChecked={() => setReloadKey((k) => k + 1)}
                />
              </div>
            </section>

            <section>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">Reward</p>
              <p className="mt-1 capitalize">{model === "per_views" ? "Per 1,000 views" : model === "fixed_per_content" ? "Fixed per clip" : model || "Unknown model"}</p>
              {perViews ? (
                <p>Rate: {formatMoney(Number(detail.campaign?.rate_per_1k_views ?? 0), "USD")} / 1K views</p>
              ) : (
                <p>Rate: {formatMoney(Number(detail.campaign?.fixed_rate ?? 0), "USD")} per approved clip</p>
              )}
              <p>Recorded eligible reward: {detail.total_earnings == null ? "Not available" : formatMoney(Number(detail.total_earnings), "USD")}</p>
              {remaining != null ? <p>Payable from escrow: {formatMoney(remaining, "USD")}</p> : null}
              {detail.funding && detail.funding.state !== "funded" ? (
                <p className="text-[12px] text-amber-700">
                  {detail.funding.state === "awaiting_funds"
                    ? "No money is held in escrow for this campaign yet. Fund it before approving paid views."
                    : "Only part of the budget is held in escrow. Rewards are limited to the money held."}
                </p>
              ) : null}
              {quote ? <p className="mt-1 text-[#9A3412]">{quote}</p> : null}
            </section>

            {reviewable && perViews ? (
              <label className="block">
                <span className="text-[12px] font-semibold text-[#111827]">Eligible views to accept</span>
                <input
                  inputMode="numeric"
                  value={views}
                  onChange={(e) => setViews(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-[#E5E7EB] px-3"
                />
              </label>
            ) : null}

            {detail.rejection_reason ? (
              <p className="rounded-xl bg-[#FFF8F5] px-3 py-2 text-[#9A3412]">Feedback: {detail.rejection_reason}</p>
            ) : null}

            {reviewable ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" className="rounded-xl" disabled={busy} onClick={() => void preview()}>
                  Calculate reward
                </Button>
                <Button type="button" size="sm" className="rounded-xl bg-[#FF5A1F]" disabled={busy} onClick={() => void approve()}>
                  Approve
                </Button>
                <Button type="button" size="sm" variant="outline" className="rounded-xl border-rose-200 text-rose-700" disabled={busy} onClick={() => void decline()}>
                  Decline
                </Button>
              </div>
            ) : (
              <p>Approved does not mean paid. Payout status follows the payment record.</p>
            )}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
