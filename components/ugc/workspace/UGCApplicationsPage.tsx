"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  UGCFilterBar,
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
  UGCStatusPill,
} from "./UGCPageShell";

type ParticipantRow = {
  id: string;
  status: string;
  joined_at: string;
  reviewed_at?: string | null;
  review_feedback?: string | null;
  eligibility_score?: number | null;
  campaign?: {
    id: string;
    title: string;
    status: string;
    ends_at?: string | null;
    vendor?: { business_name: string; business_logo?: string | null };
  };
};

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "waitlisted", label: "Waitlisted" },
  { id: "accepted", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "withdrawn", label: "Withdrawn" },
] as const;

export function UGCApplicationsPage() {
  const [rows, setRows] = useState<ParticipantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = status !== "all" ? `?status=${status}` : "";
      const res = await fetch(`/api/ugc/participants${qs}`, { cache: "no-store" });
      if (res.status === 401) {
        setError("sign_in");
        setRows([]);
        return;
      }
      if (!res.ok) throw new Error("Failed to load applications");
      const json = await res.json();
      if (json.needsProfile) {
        setNeedsProfile(true);
        setRows([]);
        return;
      }
      setRows(json.data ?? []);
    } catch {
      setError("Could not load your applications. Check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.campaign?.title?.toLowerCase().includes(q) ||
        r.campaign?.vendor?.business_name?.toLowerCase().includes(q),
    );
  }, [rows, search]);

  return (
    <UGCPageShell
      title="My Applications"
      subtitle="Track pending, approved, and rejected campaign applications."
    >
      <UGCFilterBar search={search} onSearchChange={setSearch}>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
        >
          {STATUS_TABS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </UGCFilterBar>

      {loading ? <UGCPageLoading /> : null}
      {!loading && error === "sign_in" ? (
        <UGCPageEmpty
          title="Sign in required"
          description="Log in to view your campaign applications."
          action={
            <Button asChild className="rounded-xl bg-[#FF5A1F]">
              <Link href="/login?redirect=/ugc/applications">Sign in</Link>
            </Button>
          }
        />
      ) : null}
      {!loading && error && error !== "sign_in" ? <UGCPageError message={error} onRetry={load} /> : null}
      {!loading && !error && needsProfile ? (
        <UGCPageEmpty
          title="Creator profile required"
          description="Complete your creator profile to apply to campaigns."
          action={
            <Button asChild className="rounded-xl bg-[#FF5A1F]">
              <Link href="/c/profile">Set up profile</Link>
            </Button>
          }
        />
      ) : null}
      {!loading && !error && !needsProfile && filtered.length === 0 ? (
        <UGCPageEmpty
          title="No applications yet"
          description="Discover campaigns and submit your first application."
          action={
            <Button asChild className="rounded-xl bg-[#FF5A1F]">
              <Link href="/ugc">Discover campaigns</Link>
            </Button>
          }
        />
      ) : null}

      {!loading && !error && filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((row) => (
            <div
              key={row.id}
              className="rounded-[16px] border border-[#EEF0F2] bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase text-[#9CA3AF]">
                    {row.campaign?.vendor?.business_name ?? "Brand"}
                  </p>
                  <h2 className="text-[15px] font-bold text-[#111827]">
                    {row.campaign?.title ?? "Campaign"}
                  </h2>
                  <p className="mt-1 text-[12px] text-[#6B7280]">
                    Applied {new Date(row.joined_at).toLocaleDateString()}
                    {row.reviewed_at
                      ? ` · Reviewed ${new Date(row.reviewed_at).toLocaleDateString()}`
                      : ""}
                  </p>
                  {row.review_feedback ? (
                    <p className="mt-2 text-[12px] text-[#6B7280]">{row.review_feedback}</p>
                  ) : null}
                </div>
                <UGCStatusPill status={row.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {row.status === "accepted" && row.campaign?.id ? (
                  <Button asChild size="sm" className="rounded-xl bg-[#FF5A1F]">
                    <Link href={`/ugc/${row.campaign.id}/dashboard`}>Open project</Link>
                  </Button>
                ) : null}
                {(row.status === "pending" || row.status === "waitlisted") && row.campaign?.id ? (
                  <Button asChild size="sm" variant="outline" className="rounded-xl">
                    <Link href={`/ugc/${row.campaign.id}/application`}>View status</Link>
                  </Button>
                ) : null}
                {row.status === "rejected" && row.campaign?.id ? (
                  <Button asChild size="sm" variant="outline" className="rounded-xl">
                    <Link href={`/ugc/${row.campaign.id}/join`}>Apply again</Link>
                  </Button>
                ) : null}
                {row.campaign?.id ? (
                  <Button asChild size="sm" variant="ghost" className="rounded-xl">
                    <Link href={`/ugc/${row.campaign.id}`}>Campaign brief</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </UGCPageShell>
  );
}
