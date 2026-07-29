"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Check, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Pill } from "@/components/ugc/campaign-detail/campaign-detail-ui";
import { UGCPageLoading, UGCPageShell } from "@/components/ugc/workspace/UGCPageShell";

type ParticipantRow = {
  id: string;
  status: string;
  joined_at?: string | null;
  eligibility_score?: number | null;
  application_message?: string | null;
  application_data?: Record<string, unknown> | null;
  review_feedback?: string | null;
  influencer?: {
    id: string;
    display_name: string;
    profile_image?: string | null;
    total_followers?: number | null;
    engagement_rate?: number | null;
    is_verified?: boolean | null;
  } | null;
};

function safeString(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (v == null) return null;
  try {
    return JSON.stringify(v);
  } catch {
    return null;
  }
}

export default function CampaignParticipantsPage() {
  const { id } = useParams<{ id: string }>();
  const [rows, setRows] = useState<ParticipantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "waitlisted" | "accepted" | "rejected" | "invited"
  >("pending");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState("");
  const [feedbackById, setFeedbackById] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL(`/api/ugc/campaigns/${id}/participants`, window.location.origin);
      if (statusFilter !== "all") url.searchParams.set("status", statusFilter);
      const res = await fetch(url.toString(), { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed to load applications");
      setRows((json.data ?? []) as ParticipantRow[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, [id, statusFilter]);

  useEffect(() => {
    void load();
    setSelected(new Set());
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => (r.influencer?.display_name ?? "").toLowerCase().includes(q));
  }, [rows, search]);

  const review = useCallback(
    async (action: "approve" | "reject" | "waitlist", participantId: string) => {
      setBusy(true);
      try {
        const feedback = feedbackById[participantId] ?? "";
        const res = await fetch(`/api/ugc/campaigns/${id}/participants`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participantId, action, feedback: feedback.trim() ? feedback.trim() : undefined }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? "Action failed");
        toast.success(`Application ${action}d`);
        await load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Action failed");
      } finally {
        setBusy(false);
      }
    },
    [feedbackById, id, load],
  );

  const bulkReview = useCallback(
    async (action: "approve" | "reject" | "waitlist") => {
      if (selected.size === 0) return;
      setBusy(true);
      try {
        const participantIds = [...selected];
        const feedback = bulkFeedback.trim() ? bulkFeedback.trim() : undefined;
        const res = await fetch(`/api/ugc/campaigns/${id}/participants`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participantIds, action, feedback }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? "Bulk action failed");
        toast.success(`Bulk ${action} complete`);
        setSelected(new Set());
        setBulkFeedback("");
        await load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Bulk action failed");
      } finally {
        setBusy(false);
      }
    },
    [bulkFeedback, id, load, selected],
  );

  const counts = useMemo(() => {
    const base = rows;
    const pending = base.filter((r) => r.status === "pending").length;
    const waitlisted = base.filter((r) => r.status === "waitlisted").length;
    return { pending, waitlisted };
  }, [rows]);

  if (loading) return <UGCPageShell title="Applications" subtitle="Loading review queue..."><UGCPageLoading /></UGCPageShell>;

  return (
    <UGCPageShell
      title="Campaign Application Review"
      subtitle="Review creator applications, approve or reject, and message your decision."
      actions={
        <Button asChild size="sm" variant="outline" className="rounded-xl">
          <Link href="/ugc/campaign-center">Back to Campaign Center</Link>
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#FF5A1F]">Review Queue</p>
                <h2 className="mt-1 text-[18px] font-bold text-[#111827]">Applications</h2>
                <p className="mt-1 text-[13px] text-[#6B7280]">
                  {counts.pending > 0 ? `${counts.pending} pending` : "No pending"} ·{" "}
                  {counts.waitlisted > 0 ? `${counts.waitlisted} waitlisted` : "No waitlist"}
                </p>
              </div>
              {selected.size > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" className="rounded-xl bg-[#FF5A1F]" disabled={busy} onClick={() => void bulkReview("approve")}>
                    <Check className="mr-2 h-4 w-4" />
                    Approve ({selected.size})
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-xl" disabled={busy} onClick={() => void bulkReview("waitlist")}>
                    Waitlist
                  </Button>
                  <Button size="sm" variant="destructive" className="rounded-xl" disabled={busy} onClick={() => void bulkReview("reject")}>
                    Reject
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              {(["all", "pending", "waitlisted", "accepted", "rejected", "invited"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[12px] font-semibold capitalize",
                    statusFilter === s ? "bg-[#FF5A1F] text-white" : "bg-[#F3F4F6] text-[#374151]",
                  )}
                >
                  {s}
                </button>
              ))}
              <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search creators…"
                  className="h-10 w-full rounded-xl border border-[#E5E7EB] pl-9 pr-3 text-sm"
                />
              </div>
            </div>

            {selected.size > 0 ? (
              <div className="mt-3">
                <label className="text-[12px] font-semibold text-[#374151]">
                  Message creator (applies to bulk action)
                  <textarea
                    value={bulkFeedback}
                    onChange={(e) => setBulkFeedback(e.target.value)}
                    rows={2}
                    className="mt-2 w-full rounded-xl border border-[#E5E7EB] bg-white p-3 text-sm"
                    placeholder="Optional note to creators…"
                  />
                </label>
              </div>
            ) : null}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-[#E5E7EB] bg-white p-10 text-center">
            <p className="text-[14px] font-semibold text-[#111827]">No applications match this view</p>
            <p className="mt-1 text-[13px] text-[#6B7280]">Try a different filter or search term.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((row) => {
              const selectedOn = selected.has(row.id);
              const statusTone =
                row.status === "accepted"
                  ? "success"
                  : row.status === "rejected"
                    ? "danger"
                    : row.status === "waitlisted"
                      ? "info"
                      : row.status === "pending"
                        ? "warning"
                        : "neutral";
              const appData = row.application_data ?? {};
              const portfolioUrl =
                (appData.portfolio_url as string | undefined) ??
                (appData.portfolioUrl as string | undefined) ??
                (appData.portfolio as string | undefined) ??
                null;
              const statsAvgViews = safeString((appData.avg_views ?? appData.average_views) as unknown);

              return (
                <div key={row.id} className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedOn}
                        onChange={(e) => {
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(row.id);
                            else next.delete(row.id);
                            return next;
                          });
                        }}
                        className="mt-1"
                        aria-label={`Select application ${row.id}`}
                      />
                      <div className="h-12 w-12 rounded-2xl border border-[#FFE4D6] bg-[#FFF8F5] overflow-hidden grid place-items-center shrink-0">
                        {row.influencer?.profile_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.influencer.profile_image}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="font-bold text-[#FF5A1F]">{(row.influencer?.display_name ?? "C").slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-bold text-[#111827]">{row.influencer?.display_name ?? "Creator"}</p>
                        <p className="mt-0.5 text-[12px] capitalize text-[#6B7280]">
                          {row.status} · Score {row.eligibility_score ?? "—"}% ·{" "}
                          {row.influencer?.total_followers?.toLocaleString() ?? 0} followers
                        </p>
                        {row.application_message ? (
                          <p className="mt-2 text-[13px] text-[#4B5563]">{row.application_message}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Pill tone={statusTone as any}>{row.status}</Pill>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-[1fr_0.9fr]">
                    <div className="rounded-xl border border-[#EEF0F2] bg-[#FAFAFA] p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">Portfolio</p>
                      {portfolioUrl ? (
                        <a
                          href={portfolioUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex text-[13px] font-semibold text-[#FF5A1F] hover:underline"
                        >
                          View link
                        </a>
                      ) : (
                        <p className="mt-2 text-[13px] text-[#6B7280]">No portfolio provided</p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Pill tone="neutral">Engagement {row.influencer?.engagement_rate ?? "—"}%</Pill>
                        <Pill tone={row.influencer?.is_verified ? "success" : "neutral"}>
                          {row.influencer?.is_verified ? "Verified" : "Unverified"}
                        </Pill>
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#EEF0F2] bg-[#FAFAFA] p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">Statistics</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Pill tone="neutral">Avg views: {statsAvgViews ?? "—"}</Pill>
                        <Pill tone="neutral">Past work: {(row.influencer ? row.influencer.total_followers : 0) ? "Available" : "—"}</Pill>
                      </div>

                      <div className="mt-3">
                        <label className="text-[12px] font-semibold text-[#374151]">
                          Message creator
                          <textarea
                            rows={2}
                            value={feedbackById[row.id] ?? ""}
                            onChange={(e) => setFeedbackById((prev) => ({ ...prev, [row.id]: e.target.value }))}
                            className="mt-2 w-full rounded-xl border border-[#E5E7EB] bg-white p-3 text-sm"
                            placeholder="Optional note shown to the creator as review feedback…"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                        disabled={busy || !["pending", "waitlisted"].includes(row.status)}
                        onClick={() => void review("approve", row.id)}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        disabled={busy || !["pending", "waitlisted"].includes(row.status)}
                        onClick={() => void review("waitlist", row.id)}
                      >
                        Waitlist
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-xl"
                        disabled={busy || !["pending", "waitlisted"].includes(row.status)}
                        onClick={() => void review("reject", row.id)}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>

                    <p className="text-[12px] text-[#6B7280]">
                      {row.joined_at ? `Applied ${new Date(row.joined_at).toLocaleDateString()}` : null}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {busy ? (
          <div className="flex items-center justify-center gap-2 text-[13px] text-[#6B7280]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing review actions…
          </div>
        ) : null}
      </div>
    </UGCPageShell>
  );
}

