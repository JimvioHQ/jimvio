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

const STATUS_TABS = ["all", "pending", "revision_requested", "approved", "rejected"] as const;

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
      titleKey="submissions"
      subtitleKey="submissionsSubtitle"
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
              {s === "all" ? "All status" : s.replace("_", " ")}
            </option>
          ))}
        </select>
      </UGCFilterBar>

      {loading ? <UGCPageLoading /> : null}
      {!loading && error ? <UGCPageError message={error} onRetry={load} /> : null}
      {!loading && !error && filtered.length === 0 ? (
        <UGCPageEmpty
          title="No submissions yet"
          description="Your submitted campaign content will appear here."
          illustration="campaigns"
          action={
            <Button asChild className="rounded-xl bg-[#FF5A1F]">
              <Link href="/ugc/campaigns">Go to My Campaigns</Link>
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
                      className="mt-1 flex items-center gap-1 text-[14px] font-bold text-[#111827] hover:text-[#FF5A1F]"
                    >
                      {sub.platform.toUpperCase()} post
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <p className="mt-1 text-[12px] text-[#6B7280]">
                      Submitted {new Date(sub.created_at).toLocaleDateString()} ·{" "}
                      {submissionLabel(sub.status)}
                      {Number(sub.total_earnings) > 0
                        ? ` · ${formatMoney(Number(sub.total_earnings) || 0, "USD")}`
                        : ""}
                    </p>
                    {sub.rejection_reason ? (
                      <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
                        Revision requested: {sub.rejection_reason}
                      </p>
                    ) : null}
                  </div>
                  <UGCStatusPill status={sub.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {camp?.id && sub.status === "rejected" ? (
                    <Button asChild size="sm" className="rounded-xl bg-[#FF5A1F]">
                      <Link href={`/ugc/${camp.id}/submit`}>Resubmit</Link>
                    </Button>
                  ) : null}
                  {sub.status === "revision_requested" ? (
                    <RevisionAction submissionId={sub.id} onDone={load} />
                  ) : null}
                  {camp?.id ? (
                    <Button asChild size="sm" variant="outline" className="rounded-xl">
                      <Link href={`/ugc/${camp.id}/`}>Project</Link>
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
