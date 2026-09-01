"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Megaphone,
  DollarSign,
  Eye,
  FileVideo,
  Plus,
  BarChart3,
  Trash2,
  FileCheck,
  Video,
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
  CAMPAIGN_TYPE_LABELS,
  CampaignBudgetBar,
  CampaignFilterBar,
  CampaignTableSkeleton,
  CampaignTypeBadge,
  compactCampaignViews,
  countCampaignsByStatus,
  formatCampaignUsd,
  sortCampaigns,
} from "@/components/campaigns/campaign-board-shared";
import { adminBtnPrimary, adminBtnSecondary, adminTableShell } from "@/lib/admin/ui";
import { cn, relativeTime } from "@/lib/utils";
import { toast } from "sonner";
import { useCurrency } from "@/context/CurrencyContext";

export function VendorCampaignsClient() {
  const { formatMoney } = useCurrency();
  const [campaigns, setCampaigns] = useState<UGCCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"all" | UGCCampaignStatus>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"recent" | "budget" | "views">("recent");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ugc/campaigns?status=all&limit=50&mine=true")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setCampaigns(j.data ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDeleteCampaign(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/ugc/campaigns/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCampaigns((prev) => prev.filter((c) => c.id !== id));
        toast.success("Campaign removed");
      } else {
        const json = await res.json();
        toast.error(json.error || "Could not delete campaign");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  const counts = useMemo(() => countCampaignsByStatus(campaigns), [campaigns]);

  const totals = useMemo(() => {
    const active = campaigns.filter((c) => c.status === "active");
    return {
      active: active.length,
      spent: campaigns.reduce((s, c) => s + (c.spent_budget ?? 0), 0),
      budget: campaigns.reduce((s, c) => s + (c.total_budget ?? 0), 0),
      views: campaigns.reduce((s, c) => s + (c.total_views_tracked ?? 0), 0),
      pending: campaigns.reduce(
        (s, c) => s + Math.max(0, (c.submission_count ?? 0) - (c.approved_count ?? 0)),
        0,
      ),
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
          c.campaign_type.toLowerCase().includes(q),
      );
    }
    return sortCampaigns(rows, sort);
  }, [campaigns, status, search, sort]);

  const formatBudget = (amount: number) => formatMoney(amount, "USD");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vendor"
        title="Campaigns"
        subtitle="Run UGC and clipping campaigns, review submissions, and track spend."
        actions={
          <>
            <Link href="/ugc/campaign-center/campaigns/analytics" className={adminBtnSecondary}>
              <BarChart3 className="h-3.5 w-3.5" />
              Analytics
            </Link>
            <Link href="/ugc/campaign-center/campaigns/new" className={adminBtnPrimary}>
              <Plus className="h-3.5 w-3.5" />
              New campaign
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          label="Active"
          value={totals.active.toLocaleString()}
          sublabel={`${counts.all ?? 0} total`}
          icon={Video}
          tone="success"
        />
        <Tile
          label="Spent"
          value={formatBudget(totals.spent)}
          sublabel={totals.budget > 0 ? `${formatBudget(totals.budget)} allocated` : undefined}
          icon={DollarSign}
        />
        <Tile
          label="Views"
          value={compactCampaignViews(totals.views)}
          icon={Eye}
        />
        <Tile
          label="To review"
          value={totals.pending.toLocaleString()}
          sublabel="Pending submissions"
          icon={FileCheck}
          tone={totals.pending > 0 ? "warn" : "default"}
        />
      </div>

      <CampaignFilterBar
        status={status}
        onStatusChange={setStatus}
        counts={counts}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search title or type…"
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
              preset="campaigns"
              presetContext={{
                query: search,
                filtered: campaigns.length > 0 || status !== "all",
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
                  <Th>Type</Th>
                  <Th align="right">Views</Th>
                  <Th>Budget</Th>
                  <Th align="right">Subs</Th>
                  <Th>Status</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]/50">
                {filtered.map((c) => {
                  const pendingReviews = Math.max(
                    0,
                    (c.submission_count ?? 0) - (c.approved_count ?? 0),
                  );
                  const manageHref =
                    c.status === "draft"
                      ? `/ugc/campaign-center/campaigns/${c.id}`
                      : `/ugc/campaign-center/campaigns/${c.id}/submissions`;

                  return (
                    <tr
                      key={c.id}
                      className="group hover:bg-[var(--color-surface-secondary)]/35 transition-colors"
                    >
                      <td className="min-w-[200px] px-3 py-3">
                        <Link
                          href={manageHref}
                          className="line-clamp-1 font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent)]"
                        >
                          {c.title}
                        </Link>
                        <p className="mt-0.5 text-[10.5px] text-[var(--color-text-muted)]">
                          Created {relativeTime(c.created_at)}
                          {c.ends_at ? ` · ends ${relativeTime(c.ends_at)}` : ""}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <CampaignTypeBadge type={c.campaign_type} />
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-[var(--color-text-primary)]">
                        {(c.total_views_tracked ?? 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-3">
                        <CampaignBudgetBar
                          spent={c.spent_budget ?? 0}
                          total={c.total_budget ?? 0}
                          formatValue={formatBudget}
                        />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="font-medium tabular-nums text-[var(--color-text-primary)]">
                          {c.submission_count ?? 0}
                        </span>
                        {pendingReviews > 0 && (
                          <span className="mt-0.5 block text-[10px] font-medium text-amber-600 dark:text-amber-400">
                            {pendingReviews} to review
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <StatusPill status={c.status} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={manageHref}
                            className={cn(
                              adminBtnSecondary,
                              "h-8 px-2.5",
                              pendingReviews > 0 && "border-amber-500/30 text-amber-700 dark:text-amber-400",
                            )}
                          >
                            {c.status === "draft" ? "Setup" : "Review"}
                            {pendingReviews > 0 && (
                              <span className="rounded-full bg-amber-500 px-1.5 text-[9px] font-bold text-white">
                                {pendingReviews}
                              </span>
                            )}
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteCampaign(c.id, c.title)}
                            className="inline-flex size-8 items-center justify-center rounded-md text-[var(--color-text-muted)] opacity-100 transition-colors hover:bg-rose-500/10 hover:text-rose-600 sm:opacity-0 sm:group-hover:opacity-100"
                            aria-label={`Delete ${c.title}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <RowArrow href={manageHref} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
