"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UGCCampaign } from "@/types/ugc";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/context/CurrencyContext";
import {
  getCampaignRewardLine,
} from "@/components/ugc/workspace/ugc-campaign-utils";
import {
  UGCFilterBar,
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
  UGCStatusPill,
} from "./UGCPageShell";
import { cn } from "@/lib/utils";

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
    payment_model?: string | null;
    fixed_rate?: number | null;
    rate_per_1k_views?: number | null;
    vendor?: { business_name: string; business_logo?: string | null };
  } | null;
};

type SubmissionLite = {
  id: string;
  campaign_id: string;
  status: string;
};

type KanbanColumnId =
  | "applied"
  | "approved"
  | "in_progress"
  | "submitted"
  | "completed"
  | "rejected";

const COLUMNS: {
  id: KanbanColumnId;
  label: string;
  tone: string;
}[] = [
  { id: "applied", label: "Applied", tone: "border-amber-200 bg-amber-50/40" },
  { id: "approved", label: "Approved", tone: "border-sky-200 bg-sky-50/40" },
  { id: "in_progress", label: "In Progress", tone: "border-orange-200 bg-orange-50/40" },
  { id: "submitted", label: "Submitted", tone: "border-violet-200 bg-violet-50/40" },
  { id: "completed", label: "Completed", tone: "border-emerald-200 bg-emerald-50/40" },
  { id: "rejected", label: "Rejected", tone: "border-rose-200 bg-rose-50/40" },
];

function columnFor(
  row: ParticipantRow,
  byCampaign: Map<string, SubmissionLite[]>,
): KanbanColumnId {
  if (row.status === "rejected") return "rejected";
  if (row.status === "pending" || row.status === "waitlisted") return "applied";
  if (row.status === "withdrawn") return "rejected";

  if (row.status === "accepted") {
    const campStatus = row.campaign?.status;
    if (campStatus === "completed" || campStatus === "cancelled") return "completed";
    const subs = byCampaign.get(row.campaign?.id ?? "") ?? [];
    if (subs.some((s) => s.status === "approved")) return "completed";
    if (subs.some((s) => s.status === "pending")) return "submitted";
    if (subs.length > 0) return "in_progress";
    // Freshly approved — no submission yet
    const joinedMs = new Date(row.joined_at).getTime();
    const days = (Date.now() - joinedMs) / (1000 * 60 * 60 * 24);
    if (days < 2) return "approved";
    return "in_progress";
  }

  return "applied";
}

function KanbanCard({
  row,
  column,
  formatMoney,
  onWithdraw,
}: {
  row: ParticipantRow;
  column: KanbanColumnId;
  formatMoney: (n: number, c?: string) => string;
  onWithdraw?: () => void;
}) {
  const campaign = row.campaign;
  const reward = campaign
    ? getCampaignRewardLine(campaign as UGCCampaign, formatMoney)
    : "—";
  const deadline = campaign?.ends_at
    ? new Date(campaign.ends_at).toLocaleDateString()
    : null;
  const [withdrawing, setWithdrawing] = useState(false);

  async function withdraw() {
    if (!campaign?.id) return;
    setWithdrawing(true);
    try {
      const res = await fetch(`/api/ugc/campaigns/${campaign.id}/application/withdraw`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Withdraw failed");
      }
      onWithdraw?.();
    } finally {
      setWithdrawing(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#EEF0F2] bg-white p-3.5 shadow-[0_4px_16px_rgba(17,24,39,0.04)] transition hover:border-[#FFE4D6] hover:shadow-[0_8px_24px_rgba(255,90,31,0.08)]">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF]">
        {campaign?.vendor?.business_name ?? "Brand"}
      </p>
      <h3 className="mt-0.5 line-clamp-2 text-[13px] font-bold leading-snug text-[#111827]">
        {campaign?.title ?? "Campaign"}
      </h3>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className="rounded-lg bg-[#FFF4EF] px-2 py-0.5 text-[11px] font-bold text-[#FF5A1F]">
          {reward}
        </span>
        <UGCStatusPill status={column === "completed" ? "completed" : row.status} />
      </div>
      {deadline ? (
        <p className="mt-2 text-[11px] text-[#6B7280]">Deadline · {deadline}</p>
      ) : (
        <p className="mt-2 text-[11px] text-[#9CA3AF]">No deadline set</p>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {column === "approved" || column === "in_progress" || column === "submitted"
          ? campaign?.id ? (
              <Button asChild size="sm" className="h-8 rounded-lg bg-[#FF5A1F] px-2.5 text-[11px]">
                <Link href={`/ugc/${campaign.id}/dashboard`}>Open project</Link>
              </Button>
            ) : null
          : null}
        {column === "applied" && campaign?.id ? (
          <>
            <Button asChild size="sm" variant="outline" className="h-8 rounded-lg px-2.5 text-[11px]">
              <Link href={`/ugc/${campaign.id}/application`}>View status</Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-lg px-2.5 text-[11px]"
              disabled={withdrawing}
              onClick={() => void withdraw()}
            >
              {withdrawing ? "Withdrawing…" : "Withdraw"}
            </Button>
          </>
        ) : null}
        {column === "submitted" && campaign?.id ? (
          <Button asChild size="sm" variant="outline" className="h-8 rounded-lg px-2.5 text-[11px]">
            <Link href={`/ugc/${campaign.id}/submit`}>Add content</Link>
          </Button>
        ) : null}
        {column === "rejected" && campaign?.id ? (
          <Button asChild size="sm" variant="outline" className="h-8 rounded-lg px-2.5 text-[11px]">
            <Link href={`/ugc/${campaign.id}`}>Browse similar</Link>
          </Button>
        ) : null}
        {campaign?.id ? (
          <Button asChild size="sm" variant="ghost" className="h-8 rounded-lg px-2 text-[11px]">
            <Link href={`/ugc/${campaign.id}`}>Brief</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function UGCApplicationsPage() {
  const { formatMoney } = useCurrency();
  const pathname = usePathname();
  const [rows, setRows] = useState<ParticipantRow[]>([]);
  const [subs, setSubs] = useState<SubmissionLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, sRes] = await Promise.all([
        fetch("/api/ugc/participants?limit=50", { cache: "no-store" }),
        fetch("/api/ugc/submissions?limit=50", { cache: "no-store" }),
      ]);
      if (pRes.status === 401) {
        setError("sign_in");
        setRows([]);
        return;
      }
      if (!pRes.ok) throw new Error("Failed to load applications");
      const json = await pRes.json();
      if (json.needsProfile === true) {
        setNeedsProfile(true);
        setMissingFields(
          Array.isArray(json.missing)
            ? (json.missing as Array<{ label?: string }>)
                .map((m) => m.label)
                .filter((label): label is string => Boolean(label))
            : [],
        );
        setRows([]);
        return;
      }
      setNeedsProfile(false);
      setMissingFields([]);
      setRows(json.data ?? []);
      if (sRes.ok) {
        const sJson = await sRes.json();
        setSubs(
          ((sJson.data ?? []) as Array<{ id: string; campaign_id?: string; status: string }>).map(
            (s) => ({
              id: s.id,
              campaign_id: s.campaign_id ?? "",
              status: s.status,
            }),
          ),
        );
      }
    } catch {
      setError("Could not load your applications. Check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, pathname]);

  const byCampaign = useMemo(() => {
    const m = new Map<string, SubmissionLite[]>();
    for (const s of subs) {
      if (!s.campaign_id) continue;
      const list = m.get(s.campaign_id) ?? [];
      list.push(s);
      m.set(s.campaign_id, list);
    }
    return m;
  }, [subs]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.campaign?.title?.toLowerCase().includes(q) ||
        r.campaign?.vendor?.business_name?.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const grouped = useMemo(() => {
    const buckets: Record<KanbanColumnId, ParticipantRow[]> = {
      applied: [],
      approved: [],
      in_progress: [],
      submitted: [],
      completed: [],
      rejected: [],
    };
    for (const row of filtered) {
      buckets[columnFor(row, byCampaign)].push(row);
    }
    return buckets;
  }, [filtered, byCampaign]);

  return (
    <UGCPageShell
      titleKey="applications"
      subtitleKey="applicationsSubtitle"
      actions={
        <Button asChild size="sm" className="rounded-xl bg-[#FF5A1F]">
          <Link href="/ugc">Discover campaigns</Link>
        </Button>
      }
    >
      <UGCFilterBar search={search} onSearchChange={setSearch} />

      {loading ? <UGCPageLoading /> : null}
      {!loading && error === "sign_in" ? (
        <UGCPageEmpty
          title="Sign in required"
          description="Log in to view your campaign applications."
          illustration="lock"
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
          description={
            missingFields.length > 0
              ? `Complete these remaining items: ${missingFields.join(", ")}.`
              : "Complete your creator profile to apply to campaigns."
          }
          illustration="profile"
          action={
            <Button asChild className="rounded-xl bg-[#FF5A1F]">
              <Link href="/identity/edit">Set up profile</Link>
            </Button>
          }
        />
      ) : null}
      {!loading && !error && !needsProfile && filtered.length === 0 ? (
        <UGCPageEmpty
          title="No applications yet"
          description="Discover campaigns and submit your first application. Your board will light up here."
          illustration="campaigns"
          action={
            <Button asChild className="rounded-xl bg-[#FF5A1F]">
              <Link href="/ugc">Discover campaigns</Link>
            </Button>
          }
        />
      ) : null}

      {!loading && !error && filtered.length > 0 ? (
        <div className="-mx-1 overflow-x-auto pb-2">
          <div className="flex flex-col gap-3 px-1 md:min-w-max md:flex-row">
            {COLUMNS.map((col) => {
              const items = grouped[col.id];
              return (
                <section
                  key={col.id}
                  className={cn(
                    "flex w-full shrink-0 flex-col rounded-2xl border p-2.5 md:w-[260px]",
                    col.tone,
                  )}
                >
                  <header className="mb-2 flex items-center justify-between px-1">
                    <h2 className="text-[12px] font-bold uppercase tracking-wide text-[#374151]">
                      {col.label}
                    </h2>
                    <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold tabular-nums text-[#6B7280]">
                      {items.length}
                    </span>
                  </header>
                  <div className="flex flex-1 flex-col gap-2.5">
                    {items.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-white/50 px-3 py-6 text-center text-[11px] text-[#9CA3AF]">
                        Empty
                      </div>
                    ) : (
                      items.map((row) => (
                        <KanbanCard
                          key={row.id}
                          row={row}
                          column={col.id}
                          formatMoney={formatMoney}
                          onWithdraw={load}
                        />
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : null}
    </UGCPageShell>
  );
}
