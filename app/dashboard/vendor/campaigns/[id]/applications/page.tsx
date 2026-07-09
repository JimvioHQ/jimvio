"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ParticipantRow = {
  id: string;
  status: string;
  joined_at: string;
  eligibility_score?: number | null;
  application_message?: string | null;
  application_data?: Record<string, unknown> | null;
  review_feedback?: string | null;
  influencer?: {
    display_name: string;
    profile_image?: string | null;
    total_followers?: number | null;
    is_verified?: boolean | null;
  };
};

export default function VendorCampaignApplicationsPage() {
  const { id } = useParams<{ id: string }>();
  const [rows, setRows] = useState<ParticipantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ugc/campaigns/${id}/participants`);
      if (!res.ok) throw new Error("load failed");
      const json = await res.json();
      setRows(json.data ?? []);
    } catch {
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = rows;
    if (filter !== "all") list = list.filter((r) => r.status === filter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        r.influencer?.display_name?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, filter, search]);

  const review = async (action: "approve" | "reject" | "waitlist", participantId: string, feedback?: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/ugc/campaigns/${id}/participants`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId, action, feedback }),
      });
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error ?? "Action failed");
        return;
      }
      toast.success(`Application ${action}d`);
      await load();
      setSelected(new Set());
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(false);
    }
  };

  const bulk = async (action: "approve" | "reject" | "waitlist") => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/ugc/campaigns/${id}/participants`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantIds: [...selected], action }),
      });
      if (!res.ok) {
        toast.error("Bulk action failed");
        return;
      }
      toast.success(`Bulk ${action} complete`);
      await load();
      setSelected(new Set());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={`/dashboard/vendor/campaigns/${id}`}
            className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-[#6B7280]"
          >
            <ArrowLeft className="h-4 w-4" />
            Campaign
          </Link>
          <h1 className="text-2xl font-bold text-[#111827]">Applications</h1>
          <p className="text-sm text-[#6B7280]">Review, approve, or waitlist creators</p>
        </div>
        {selected.size > 0 ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => bulk("approve")} disabled={busy}>
              Approve ({selected.size})
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulk("waitlist")} disabled={busy}>
              Waitlist
            </Button>
            <Button size="sm" variant="destructive" onClick={() => bulk("reject")} disabled={busy}>
              Reject
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {["all", "pending", "waitlisted", "accepted", "rejected", "invited"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-full px-3 py-1.5 text-[12px] font-semibold capitalize",
              filter === s ? "bg-[#FF5A1F] text-white" : "bg-[#F3F4F6] text-[#374151]",
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

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF5A1F]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-10 text-center text-sm text-[#6B7280]">
          No applications in this view.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => (
            <div
              key={row.id}
              className="rounded-[16px] border border-[#EEF0F2] bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={(e) => {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(row.id);
                        else next.delete(row.id);
                        return next;
                      });
                    }}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-bold text-[#111827]">
                      {row.influencer?.display_name ?? "Creator"}
                    </p>
                    <p className="text-[12px] capitalize text-[#6B7280]">
                      {row.status} · Score {row.eligibility_score ?? "—"}% ·{" "}
                      {row.influencer?.total_followers?.toLocaleString() ?? 0} followers
                    </p>
                    {row.application_message ? (
                      <p className="mt-2 text-[13px] text-[#4B5563]">{row.application_message}</p>
                    ) : null}
                  </div>
                </div>
                {row.status === "pending" || row.status === "waitlisted" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={busy}
                      onClick={() => review("approve", row.id)}
                    >
                      <Check className="mr-1 h-3.5 w-3.5" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => review("waitlist", row.id)}
                    >
                      Waitlist
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={() => review("reject", row.id, "Does not meet campaign requirements")}
                    >
                      <X className="mr-1 h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
