"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Megaphone,
  DollarSign,
  Eye,
  FileVideo,
  ArrowUpRight,
} from "lucide-react";
import type { UGCCampaign, UGCCampaignStatus } from "@/types/ugc";
import { Tile } from "@/components/ui/admin-tile";
import {
  PageHeader,
  StatusPill,
  Th,
  RowArrow,
} from "@/components/ui/admin";
import { EmptyState } from "@/components/empty-states";
import {
  CampaignBudgetBar,
  CampaignFilterBar,
  CampaignTableSkeleton,
  CampaignTypeBadge,
  compactCampaignViews,
  countCampaignsByStatus,
  formatCampaignUsd,
  sortCampaigns,
} from "@/components/campaigns/campaign-board-shared";
import { adminBtnPrimary, adminTableShell } from "@/lib/admin/ui";
import { relativeTime } from "@/lib/utils";

type AdminOverview = {
  campaigns?: Record<string, number>;
  pendingSubmissions?: number;
  reportsCount?: number;
  escrow?: { held?: number; total?: number };
  suspiciousSubmissions?: unknown[] | number;
};

export function AdminCampaignsClient() {
  const [campaigns, setCampaigns] = useState<UGCCampaign[]>([]);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"all" | UGCCampaignStatus>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"recent" | "budget" | "views">("recent");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/ugc/campaigns?status=all&limit=200").then((r) => r.json()),
      fetch("/api/ugc/admin/overview").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ])
      .then(([j, ov]) => {
        if (cancelled) return;
        setCampaigns(j.data ?? []);
        setOverview(ov?.data ?? ov ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => countCampaignsByStatus(campaigns), [campaigns]);

  const totals = useMemo(() => {
    const active = campaigns.filter((c) => c.status === "active");
    return {
      active: active.length,
      budget: campaigns.reduce((s, c) => s + (c.total_budget ?? 0), 0),
      spent: campaigns.reduce((s, c) => s + (c.spent_budget ?? 0), 0),
      views: campaigns.reduce((s, c) => s + (c.total_views_tracked ?? 0), 0),
      submissions: campaigns.reduce((s, c) => s + (c.submission_count ?? 0), 0),
    };
  }, [campaigns]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = campaigns;
    if (status !== "all") rows = rows.filter((c) => c.status === status);
    if (q) {
      rows = rows.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          (c.vendor?.business_name ?? "").toLowerCase().includes(q) ||
          c.campaign_type.toLowerCase().includes(q),
      );
    }
    return sortCampaigns(rows, sort);
  }, [campaigns, status, search, sort]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Moderation"
        title="Campaigns"
        subtitle="UGC and clipping campaigns across vendors — budget, reach, and submission volume."
        actions={
          <Link href="/admin/ugc/submissions?status=pending" className={adminBtnPrimary}>
            Submission queue
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          label="Live campaigns"
          value={(overview?.campaigns?.active ?? totals.active).toLocaleString()}
          sublabel={`${overview?.campaigns?.total ?? counts.all ?? 0} total on platform`}
          icon={Megaphone}
          tone="success"
        />
        <Tile
          label="Budget pool"
          value={formatCampaignUsd(totals.budget)}
          sublabel={
            overview?.escrow?.held != null
              ? `${formatCampaignUsd(overview.escrow.held)} in escrow`
              : `${formatCampaignUsd(totals.spent)} paid out`
          }
          icon={DollarSign}
        />
        <Tile
          label="Pending reviews"
          value={(overview?.pendingSubmissions ?? totals.submissions).toLocaleString()}
          sublabel={
            Array.isArray(overview?.suspiciousSubmissions)
              ? `${overview.suspiciousSubmissions.length} flagged`
              : "Queue + tracked volume"
          }
          icon={FileVideo}
        />
        <Tile
          label="Tracked views"
          value={compactCampaignViews(totals.views)}
          sublabel={
            overview?.reportsCount != null
              ? `${overview.reportsCount} open reports`
              : "All campaigns"
          }
          icon={Eye}
        />
      </div>

      <CampaignFilterBar
        status={status}
        onStatusChange={setStatus}
        counts={counts}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search title or brand…"
        sort={sort}
        onSortChange={setSort}
        showSort
      />

      <div className={adminTableShell}>
        <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-3">
          <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
            {loading ? "Loading…" : `${filtered.length} campaign${filtered.length === 1 ? "" : "s"}`}
          </p>
          {!loading && search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-[11.5px] font-medium text-[var(--color-accent)] hover:underline"
            >
              Clear search
            </button>
          )}
        </div>

        {loading ? (
          <CampaignTableSkeleton />
        ) : filtered.length === 0 ? (
          <div className="p-4 sm:p-6">
            <EmptyState
              variant="section"
              preset="campaigns-admin"
              presetContext={{
                query: search,
                filtered: campaigns.length > 0 || status !== "all" || Boolean(search),
                onReset:
                  status !== "all" || search
                    ? () => {
                        setStatus("all");
                        setSearch("");
                      }
                    : undefined,
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40">
                  <Th>Campaign</Th>
                  <Th>Brand</Th>
                  <Th>Type</Th>
                  <Th align="right">Views</Th>
                  <Th>Budget</Th>
                  <Th align="right">Subs</Th>
                  <Th>Status</Th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]/50">
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="group hover:bg-[var(--color-surface-secondary)]/35 transition-colors"
                  >
                    <td className="min-w-[200px] px-3 py-3">
                      <Link
                        href={`/dashboard/vendor/campaigns/${c.id}`}
                        className="line-clamp-1 font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent)]"
                      >
                        {c.title}
                      </Link>
                      <p className="mt-0.5 text-[10.5px] text-[var(--color-text-muted)]">
                        Created {relativeTime(c.created_at)}
                        {c.ends_at ? ` · ends ${relativeTime(c.ends_at)}` : ""}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-[var(--color-text-secondary)]">
                      {c.brand_id ? (
                        <Link
                          href={`/admin/vendors/${c.brand_id}`}
                          className="hover:text-[var(--color-text-primary)]"
                        >
                          {c.vendor?.business_name ?? "Vendor"}
                        </Link>
                      ) : (
                        (c.vendor?.business_name ?? "—")
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <CampaignTypeBadge type={c.campaign_type} />
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-[var(--color-text-primary)]">
                      {(c.total_views_tracked ?? 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-3">
                      <CampaignBudgetBar spent={c.spent_budget ?? 0} total={c.total_budget ?? 0} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="font-medium tabular-nums text-[var(--color-text-primary)]">
                        {c.submission_count ?? 0}
                      </span>
                      {(c.approved_count ?? 0) > 0 && (
                        <span className="mt-0.5 block text-[10px] tabular-nums text-[var(--color-text-muted)]">
                          {c.approved_count} approved
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill status={c.status} />
                    </td>
                    <td className="px-3 py-3">
                      <RowArrow href={`/dashboard/vendor/campaigns/${c.id}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
