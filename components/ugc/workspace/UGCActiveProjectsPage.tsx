"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getDaysRemaining } from "@/lib/ugc/campaign-detail";
import {
  UGCFilterBar,
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
} from "./UGCPageShell";

type ParticipantRow = {
  id: string;
  joined_at: string;
  campaign?: {
    id: string;
    title: string;
    status: string;
    ends_at?: string | null;
    campaign_type?: string;
    vendor?: { business_name: string };
  };
};

export function UGCActiveProjectsPage() {
  const [rows, setRows] = useState<ParticipantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ugc/participants?status=accepted", { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      const json = await res.json();
      setRows(json.data ?? []);
    } catch {
      setError("Could not load active projects.");
    } finally {
      setLoading(false);
    }
  }, []);

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
      titleKey="projects"
      actions={
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/ugc/creator-copilot">Creator Copilot</Link>
        </Button>
      }
    >
      <UGCFilterBar search={search} onSearchChange={setSearch} />

      {loading ? <UGCPageLoading /> : null}
      {!loading && error ? <UGCPageError message={error} onRetry={load} /> : null}
      {!loading && !error && filtered.length === 0 ? (
        <UGCPageEmpty
          title="No active projects"
          description="Join a campaign and get approved to unlock your creator workspace."
          action={
            <Button asChild className="rounded-xl bg-[#FF5A1F]">
              <Link href="/ugc">Discover campaigns</Link>
            </Button>
          }
        />
      ) : null}

      {!loading && !error && filtered.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((row) => {
            const days = getDaysRemaining(row.campaign?.ends_at ?? null);
            return (
              <div
                key={row.id}
                className="rounded-[16px] border border-[#EEF0F2] bg-white p-4"
              >
                <p className="text-[11px] font-semibold uppercase text-[#9CA3AF]">
                  {row.campaign?.vendor?.business_name}
                </p>
                <h2 className="mt-1 text-[15px] font-bold text-[#111827]">{row.campaign?.title}</h2>
                <p className="mt-1 text-[12px] text-[#6B7280]">
                  Joined {new Date(row.joined_at).toLocaleDateString()}
                  {days !== null && days > 0 ? ` · ${days}d left` : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild size="sm" className="rounded-xl bg-[#FF5A1F]">
                    <Link href={`/ugc/${row.campaign?.id}/`}>Open workspace</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="rounded-xl">
                    <Link href={`/ugc/${row.campaign?.id}/submit`}>Submit</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="rounded-xl">
                    <Link href="/ugc/creator-copilot">Creator Copilot</Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </UGCPageShell>
  );
}
