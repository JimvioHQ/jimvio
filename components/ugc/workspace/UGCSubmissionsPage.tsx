"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import type { UGCSubmission } from "@/types/ugc";
import { Button } from "@/components/ui/button";
import {
  UGCFilterBar,
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
  UGCStatusPill,
} from "./UGCPageShell";

const STATUS_TABS = ["all", "pending", "approved", "rejected"] as const;

export function UGCSubmissionsPage() {
  const { formatMoney } = useCurrency();
  const [rows, setRows] = useState<UGCSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/ugc/submissions?${params}`, { cache: "no-store" });
      if (res.status === 403) {
        setError("Creator profile required to view submissions.");
        setRows([]);
        return;
      }
      if (!res.ok) throw new Error("load failed");
      const json = await res.json();
      setRows(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch {
      setError("Could not load submissions.");
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.platform.toLowerCase().includes(q) ||
        r.post_url.toLowerCase().includes(q) ||
        (r.campaign as { title?: string } | undefined)?.title?.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <UGCPageShell
      title="Submissions"
      subtitle="Track draft, submitted, under review, approved, and rejected content."
    >
      <UGCFilterBar search={search} onSearchChange={setSearch}>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
        >
          {STATUS_TABS.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All status" : s}
            </option>
          ))}
        </select>
      </UGCFilterBar>

      {loading ? <UGCPageLoading /> : null}
      {!loading && error ? <UGCPageError message={error} onRetry={load} /> : null}
      {!loading && !error && filtered.length === 0 ? (
        <UGCPageEmpty
          title="No submissions yet"
          description="Submit your first piece of content from an active project."
          action={
            <Button asChild className="rounded-xl bg-[var(--color-accent)]">
              <Link href="/ugc/campaigns">View active projects</Link>
            </Button>
          }
        />
      ) : null}

      {!loading && !error && filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((sub) => {
            const camp = sub.campaign as { id?: string; title?: string } | undefined;
            return (
              <div
                key={sub.id}
                className="rounded-[16px] border border-[#EEF0F2] bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-[#9CA3AF]">
                      {camp?.title ?? "Campaign"}
                    </p>
                    <a
                      href={sub.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 flex items-center gap-1 text-[14px] font-bold text-[#111827] hover:text-[var(--color-accent)]"
                    >
                      {sub.platform.toUpperCase()} post
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <p className="mt-1 text-[12px] text-[#6B7280]">
                      Submitted {new Date(sub.created_at).toLocaleDateString()} ·{" "}
                      {(sub.total_views_earned ?? 0).toLocaleString()} views ·{" "}
                      {formatMoney(Number(sub.total_earnings) || 0, "USD")}
                    </p>
                    {sub.rejection_reason ? (
                      <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
                        Revision requested: {sub.rejection_reason}
                      </p>
                    ) : null}
                  </div>
                  <UGCStatusPill status={sub.status} />
                </div>
                <div className="mt-3 flex gap-2">
                  {camp?.id && sub.status === "rejected" ? (
                    <Button asChild size="sm" className="rounded-xl bg-[var(--color-accent)]">
                      <Link href={`/ugc/${camp.id}/submit`}>Resubmit</Link>
                    </Button>
                  ) : null}
                  {camp?.id ? (
                    <Button asChild size="sm" variant="outline" className="rounded-xl">
                      <Link href={`/ugc/${camp.id}/dashboard`}>Project</Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
          {totalPages > 1 ? (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-[12px] text-[#6B7280]">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </UGCPageShell>
  );
}
