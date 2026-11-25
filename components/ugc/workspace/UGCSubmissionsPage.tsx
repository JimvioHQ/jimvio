"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Clock, ExternalLink, Eye, Wallet, X } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import type { UGCSubmission } from "@/types/ugc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { UGCVerifiedBadge } from "./UGCVerifiedBadge";
import { ViewVerificationPanel, type VerificationFields } from "@/components/ugc/verification/ViewVerificationPanel";
import {
  UGCFilterBar,
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
  UGCStatusPill,
} from "./UGCPageShell";

type PayoutInfo = { status: string; amount: number; release_at: string | null; paid_at: string | null };
type Row = UGCSubmission & {
  latest_views?: number | null;
  baseline_views?: number | null;
  verified_views?: number | null;
  verification_status?: string | null;
  verification_note?: string | null;
  thumbnail_url?: string | null;
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Under review" },
  { id: "revision_requested", label: "Revisions" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "paid", label: "Paid" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

function submissionLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Under Review";
    case "revision_requested":
      return "Revision Required";
    case "approved":
      return "Approved";
    case "rejected":
    case "removed":
      return "Rejected";
    case "draft":
      return "Draft";
    default:
      return status.replaceAll("_", " ");
  }
}

function timeLeft(at: string | null): string | null {
  if (!at) return null;
  const ms = Date.parse(at) - Date.now();
  if (!Number.isFinite(ms)) return null;
  if (ms <= 0) return "any minute now";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.max(1, Math.round((ms % 3_600_000) / 60_000));
  return h > 0 ? `in ${h}h ${m}m` : `in ${m} min`;
}

const fmt = (n: number | null | undefined) => (n == null ? "—" : Number(n).toLocaleString("en-US"));

export function UGCSubmissionsPage() {
  const { formatMoney } = useCurrency();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ pending: 0, revision_requested: 0, approved: 0, rejected: 0 });
  const [payoutBySubmission, setPayoutBySubmission] = useState<Record<string, PayoutInfo>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Paid is a payout state, so it lists every post and filters below.
      const params = new URLSearchParams({ page: String(page), limit: String(filter === "paid" ? 50 : limit), scope: "mine" });
      if (filter !== "all" && filter !== "paid") params.set("status", filter);
      const [res, payRes] = await Promise.all([
        fetch(`/api/ugc/submissions?${params}`, { cache: "no-store" }),
        fetch("/api/ugc/payouts/history", { cache: "no-store" }),
      ]);
      if (res.status === 401) {
        setError("Sign in to view submissions.");
        setRows([]);
        return;
      }
      if (!res.ok) throw new Error("load failed");
      const json = await res.json();
      setRows(json.data ?? []);
      setTotal(json.total ?? 0);
      if (json.counts) setCounts(json.counts);
      if (payRes.ok) {
        const payJson = await payRes.json();
        const map: Record<string, PayoutInfo> = {};
        for (const row of (payJson.data ?? []) as Array<{
          submission_id?: string;
          status?: string;
          amount?: number;
          release_at?: string | null;
          paid_at?: string | null;
        }>) {
          if (!row.submission_id) continue;
          map[row.submission_id] = {
            status: row.status ?? "",
            amount: Number(row.amount ?? 0),
            release_at: row.release_at ?? null,
            paid_at: row.paid_at ?? null,
          };
        }
        setPayoutBySubmission(map);
      }
    } catch {
      setError("Could not load submissions.");
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load submissions when filters change
    void load();
  }, [load]);

  // Keeps payout countdowns fresh.
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const payouts = Object.values(payoutBySubmission);
  const paidCount = payouts.filter((p) => p.status === "paid").length;
  const earned = payouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const onTheWay = payouts.filter((p) => p.status !== "paid").reduce((s, p) => s + p.amount, 0);

  const filtered = useMemo(() => {
    let list = rows;
    if (filter === "paid") list = list.filter((r) => payoutBySubmission[r.id]?.status === "paid");
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (r) =>
        r.platform.toLowerCase().includes(q) ||
        r.post_url.toLowerCase().includes(q) ||
        (r.campaign as { title?: string } | undefined)?.title?.toLowerCase().includes(q),
    );
  }, [rows, search, filter, payoutBySubmission]);

  const totalPages = filter === "paid" ? 1 : Math.max(1, Math.ceil(total / limit));
  const countFor: Record<FilterId, number | null> = {
    all: null,
    pending: counts.pending,
    revision_requested: counts.revision_requested,
    approved: counts.approved,
    rejected: counts.rejected,
    paid: paidCount,
  };

  return (
    <UGCPageShell
      title="Submissions"
      subtitle="Every post you submitted, what the brand decided, the views that counted and when you get paid."
    >
      {!error ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {FILTERS.filter((f) => f.id !== "all").map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setFilter(filter === f.id ? "all" : f.id);
                setPage(1);
              }}
              aria-pressed={filter === f.id}
              className={cn(
                "rounded-2xl border bg-white px-3 py-3 text-left transition hover:border-[#FFB89A]",
                filter === f.id ? "border-[#FF5A1F] ring-2 ring-[#FF5A1F]/15" : "border-[#E5E7EB]",
              )}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">{f.label}</p>
              <p className="mt-1 text-[20px] font-bold tabular-nums text-[#111827]">{loading ? "·" : countFor[f.id]}</p>
            </button>
          ))}
        </div>
      ) : null}

      {!error && (earned > 0 || onTheWay > 0) ? (
        <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-2xl bg-[#111827] px-4 py-3 text-[13px] text-white/80">
          <span className="inline-flex items-center gap-1.5">
            <Wallet className="h-4 w-4 text-white" /> Paid to wallet <b className="text-white">{formatMoney(earned, "USD")}</b>
          </span>
          {onTheWay > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-white" /> On the way <b className="text-white">{formatMoney(onTheWay, "USD")}</b>
            </span>
          ) : null}
          <Link href="/ugc/earnings" className="ml-auto font-semibold text-white hover:underline">
            Earnings →
          </Link>
        </div>
      ) : null}

      <UGCFilterBar search={search} onSearchChange={setSearch}>
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as FilterId);
            setPage(1);
          }}
          className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
        >
          {FILTERS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.id === "all" ? "All status" : f.label}
            </option>
          ))}
        </select>
      </UGCFilterBar>

      {loading ? <UGCPageLoading /> : null}
      {!loading && error ? <UGCPageError message={error} onRetry={load} /> : null}
      {!loading && !error && filtered.length === 0 ? (
        <UGCPageEmpty
          title={filter === "all" ? "No submissions yet" : "Nothing here"}
          description={filter === "all" ? "Join a campaign, post your video, then submit the link." : "No submissions match this filter."}
          illustration="campaigns"
          action={
            <Button asChild className="rounded-xl bg-[#FF5A1F]">
              <Link href="/ugc">Discover campaigns</Link>
            </Button>
          }
        />
      ) : null}

      {!loading && !error && filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((sub) => {
            const camp = sub.campaign as {
              id?: string;
              title?: string;
              payment_model?: string;
              vendor?: { business_name?: string; verification_status?: string | null } | null;
            } | undefined;
            const payout = payoutBySubmission[sub.id];
            const paid = payout?.status === "paid";
            const verified = sub.verification_status === "verified";
            const gained =
              verified && sub.latest_views != null && sub.baseline_views != null ? Math.max(0, sub.latest_views - sub.baseline_views) : null;
            const perViews = camp?.payment_model === "per_views";
            return (
              <article key={sub.id} className="rounded-[18px] border border-[#EEF0F2] bg-white p-4 shadow-sm">
                <div className="flex gap-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#F3F4F6]">
                    {sub.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={sub.thumbnail_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-[10px] font-bold uppercase text-[#9CA3AF]">{sub.platform}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-bold text-[#111827]">{camp?.title ?? "Campaign"}</p>
                        <p className="text-[12px] text-[#6B7280]">
                          {camp?.vendor?.business_name ?? "Brand"}
                          {camp?.vendor?.verification_status === "verified" ? <UGCVerifiedBadge className="ml-1 inline h-3.5 w-3.5" /> : null}
                          {" · "}
                          <a href={sub.post_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium capitalize hover:text-[#FF5A1F]">
                            {sub.platform} post <ExternalLink className="h-3 w-3" />
                          </a>
                          {" · "}
                          {new Date(sub.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <UGCStatusPill status={sub.status} />
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="rounded-xl bg-[#F9FAFB] px-3 py-2">
                        <dt className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                          <Eye className="h-3 w-3" /> Views now
                        </dt>
                        <dd className="text-[14px] font-bold tabular-nums text-[#111827]">{fmt(sub.latest_views)}</dd>
                      </div>
                      <div className="rounded-xl bg-[#F9FAFB] px-3 py-2">
                        <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Real views</dt>
                        <dd className="flex items-center gap-1 text-[14px] font-bold tabular-nums text-[#111827]">
                          {gained != null ? fmt(gained) : "—"}
                          {verified ? <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" aria-label="Verified by Jimvio" /> : null}
                        </dd>
                      </div>
                      <div className="rounded-xl bg-[#F9FAFB] px-3 py-2">
                        <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Views paid</dt>
                        <dd className="text-[14px] font-bold tabular-nums text-[#111827]">{perViews ? fmt(sub.accepted_views) : "Fixed"}</dd>
                      </div>
                      <div className="rounded-xl bg-[#F9FAFB] px-3 py-2">
                        <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Earned</dt>
                        <dd className="text-[14px] font-bold tabular-nums text-[#111827]">
                          {payout ? formatMoney(payout.amount, "USD") : sub.status === "approved" ? formatMoney(Number(sub.total_earnings ?? 0), "USD") : "—"}
                        </dd>
                      </div>
                    </dl>

                    {payout ? (
                      <p className={cn("mt-2 flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px] font-medium", paid ? "bg-emerald-50 text-emerald-800" : "bg-[#FFF7F2] text-[#7C2D12]")}>
                        <Wallet className="h-4 w-4 shrink-0" />
                        {paid
                          ? `${formatMoney(payout.amount, "USD")} added to your wallet${payout.paid_at ? ` on ${new Date(payout.paid_at).toLocaleDateString()}` : ""}.`
                          : `${formatMoney(payout.amount, "USD")} reaches your wallet ${timeLeft(payout.release_at) ?? "soon"}.`}
                      </p>
                    ) : null}
                    {!verified && sub.verification_note ? (
                      <p className="mt-2 text-[12px] text-amber-800">{sub.verification_note}</p>
                    ) : null}
                    {sub.rejection_reason ? (
                      <p className="mt-2 rounded-lg bg-[#FFF8F5] px-3 py-2 text-[12px] text-[#9A3412]">
                        {sub.status === "revision_requested" ? "Feedback" : "Reason"}: {sub.rejection_reason}
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setOpenId(sub.id)}>
                        Details & feedback
                      </Button>
                      {camp?.id ? (
                        <Button asChild size="sm" variant="outline" className="rounded-xl">
                          <Link href={`/ugc/${camp.id}/dashboard`}>Campaign</Link>
                        </Button>
                      ) : null}
                      {sub.status === "revision_requested" ? <RevisionAction submissionId={sub.id} onDone={load} /> : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
          {totalPages > 1 ? (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-[12px] text-[#6B7280]">
                Page {page} of {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      {openId ? <SubmissionDrawer id={openId} payout={payoutBySubmission[openId]} onClose={() => setOpenId(null)} /> : null}
    </UGCPageShell>
  );
}

function SubmissionDrawer({
  id,
  payout,
  onClose,
}: {
  id: string;
  payout?: { status: string; amount: number };
  onClose: () => void;
}) {
  const { formatMoney } = useCurrency();
  const [detail, setDetail] = useState<UGCSubmission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/ugc/submissions/${id}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setError((json as { error?: string }).error || "Could not open this submission.");
        return;
      }
      setDetail((json as { submission?: UGCSubmission }).submission ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  const camp = detail?.campaign as { title?: string; description?: string } | undefined;
  return (
    <div className="fixed inset-0 z-[120] flex justify-end bg-black/40" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Submission details"
        className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-[#111827]">Submission</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl">
            <X className="h-4 w-4" />
          </button>
        </div>
        {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
        {!detail && !error ? <p className="mt-4 text-sm text-[#6B7280]">Loading…</p> : null}
        {detail ? (
          <div className="mt-4 space-y-3 text-[13px] text-[#374151]">
            <p className="font-semibold text-[#111827]">{camp?.title ?? "Campaign"}</p>
            <p>
              {submissionLabel(detail.status)} ·{" "}
              {payout?.status === "paid"
                ? `Paid ${formatMoney(payout.amount, "USD")}`
                : payout?.status === "approved"
                  ? "Approved, not paid"
                  : payout?.status === "pending"
                    ? "Payout pending"
                    : "No payout yet"}
            </p>
            <p>Claimed views: {detail.claimed_views == null ? "Not available" : detail.claimed_views.toLocaleString()}</p>
            <ViewVerificationPanel
              submission={detail as unknown as VerificationFields}
              viewer="creator"
              onChecked={() => setReloadKey((k) => k + 1)}
            />
            <p>
              Accepted views: {detail.accepted_views == null ? "Not reviewed" : detail.accepted_views.toLocaleString()}
            </p>
            <p>
              Eligible reward:{" "}
              {detail.status === "approved"
                ? formatMoney(Number(detail.total_earnings ?? 0), "USD")
                : "Not approved yet"}
            </p>
            {detail.status === "approved" && payout?.status !== "paid" ? (
              <p>Approved does not mean paid. Payout follows the campaign reward rules.</p>
            ) : null}
            <a href={detail.post_url} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-[#FF5A1F]">
              {detail.post_url}
            </a>
            {camp?.description ? <p className="whitespace-pre-wrap text-[#4B5563]">{camp.description}</p> : null}
            {detail.rejection_reason ? (
              <p className="rounded-xl bg-[#FFF8F5] px-3 py-2 text-[#9A3412]">Feedback: {detail.rejection_reason}</p>
            ) : (
              <p className="text-[#6B7280]">No brand feedback on this submission yet.</p>
            )}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function RevisionAction({
  submissionId,
  onDone,
}: {
  submissionId: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [postUrl, setPostUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/ugc/submissions/${submissionId}/revision`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_url: postUrl.trim() || undefined,
          creator_response: notes.trim() || "Updated content submitted.",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not submit revision");
      setOpen(false);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit revision");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" className="rounded-xl bg-[#FF5A1F]" onClick={() => setOpen(true)}>
        Submit revision
      </Button>
    );
  }

  return (
    <div className="w-full space-y-2 rounded-xl border border-[#FFE4D6] bg-[#FFF8F5] p-3">
      <input
        value={postUrl}
        onChange={(e) => setPostUrl(e.target.value)}
        placeholder="Updated post URL (optional)"
        className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#FF5A1F]"
      />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="What did you change?"
        rows={2}
        className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#FF5A1F]"
      />
      {error ? <p className="text-[12px] text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <Button size="sm" className="rounded-xl bg-[#FF5A1F]" disabled={saving} onClick={() => void submit()}>
          {saving ? "Sending…" : "Send revision"}
        </Button>
        <Button size="sm" variant="outline" className="rounded-xl" disabled={saving} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
