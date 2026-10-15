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
import { toast } from "sonner";
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
import { adminBtnGhost, adminBtnPrimary, adminTableShell } from "@/lib/admin/ui";
import { relativeTime } from "@/lib/utils";
import { canAdminActivateOverride } from "@/lib/ugc/admin-activate-override";
import { ugcLifecycleDecision, type UgcLifecycleAction } from "@/lib/admin/control-policy";
import { formatUgcFundingUsd, getClipRateBadge } from "@/components/ugc/workspace/ugc-campaign-utils";

type EscrowState = "unfunded" | "pending" | "held";

type AdminCampaign = UGCCampaign & {
  escrow_state?: EscrowState;
  admin_activator_name?: string | null;
};

type AdminOverview = {
  campaigns?: Record<string, number>;
  pendingSubmissions?: number;
  reportsCount?: number;
  escrow?: { held?: number; total?: number };
  suspiciousSubmissions?: unknown[] | number;
};

function fundingLabel(state: EscrowState | undefined) {
  if (state === "held") return "Funded";
  if (state === "pending") return "Pending funding";
  return "Unfunded";
}

export function AdminCampaignsClient() {
  const [campaigns, setCampaigns] = useState<AdminCampaign[]>([]);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"all" | UGCCampaignStatus>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"recent" | "budget" | "views">("recent");
  const [pending, setPending] = useState<AdminCampaign | null>(null);
  const [pendingAction, setPendingAction] = useState<"activate" | UgcLifecycleAction>("activate");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/admin/ugc/campaigns").then((r) => r.json()),
      fetch("/api/ugc/admin/overview").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ])
      .then(([j, ov]) => {
        if (cancelled) return;
        setCampaigns(Array.isArray(j?.data) ? j.data : []);
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

  function openAction(campaign: AdminCampaign, action: "activate" | UgcLifecycleAction) {
    setPending(campaign);
    setPendingAction(action);
    setReason("");
  }

  async function confirmAction() {
    if (!pending || reason.trim().length < 8) {
      toast.error("Enter a reason of at least 8 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const path = pendingAction === "activate" ? "activate" : "lifecycle";
      const res = await fetch(`/api/admin/ugc/campaigns/${pending.id}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingAction === "activate" ? { reason } : { action: pendingAction, reason }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof json.error === "string" ? json.error : "Could not update campaign.");
        return;
      }
      const nextStatus = pendingAction === "activate" ? "active" : (json.status as UGCCampaignStatus | undefined);
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === pending.id
            ? {
                ...c,
                ...(pendingAction === "activate" ? ((json.campaign as AdminCampaign | undefined) ?? {}) : {}),
                status: nextStatus ?? c.status,
                activated_by_admin: pendingAction === "activate" ? true : c.activated_by_admin,
              }
            : c,
        ),
      );
      toast.success(json.idempotent ? "Campaign was already in that state." : "Campaign updated. Funding records were not changed.");
      setPending(null);
      setReason("");
    } catch {
      toast.error("Could not update campaign.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="UGC & Clipping"
        title="Campaign Management"
        subtitle="Pause, resume, cancel, and complete never move escrow or payouts. Mark as Active is a separate override and does not record funding."
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
                  <Th>Payout</Th>
                  <Th>Funding</Th>
                  <Th>Status</Th>
                  <Th>Action</Th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]/50">
                {filtered.map((c) => {
                  const rate = getClipRateBadge(c);
                  const adminActivated = Boolean(c.activated_by_admin);
                  return (
                    <tr
                      key={c.id}
                      className="group transition-colors hover:bg-[var(--color-surface-secondary)]/35"
                    >
                      <td className="min-w-[200px] px-3 py-3">
                        <Link
                          href={`/ugc/campaign-center/campaigns/${c.id}`}
                          className="line-clamp-1 font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent)]"
                        >
                          {c.title}
                        </Link>
                        <p className="mt-0.5 text-[10.5px] text-[var(--color-text-muted)]">
                          Created {relativeTime(c.created_at)}
                          {c.admin_activated_at ? ` · activated ${relativeTime(c.admin_activated_at)}` : ""}
                          {c.admin_activator_name ? ` by ${c.admin_activator_name}` : ""}
                        </p>
                        {c.admin_activation_reason ? (
                          <p className="mt-0.5 line-clamp-1 text-[10.5px] text-[var(--color-text-muted)]" title={c.admin_activation_reason}>
                            Reason: {c.admin_activation_reason}
                          </p>
                        ) : null}
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
                      <td className="px-3 py-3 tabular-nums text-[var(--color-text-primary)]">
                        {rate ?? "—"}
                      </td>
                      <td className="min-w-[140px] px-3 py-3">
                        <CampaignBudgetBar spent={c.spent_budget ?? 0} total={c.total_budget ?? 0} />
                        <p className="mt-1 text-[10.5px] text-[var(--color-text-muted)]">
                          Spent {formatUgcFundingUsd(c.spent_budget ?? 0)} / budget{" "}
                          {formatUgcFundingUsd(c.total_budget ?? 0)}
                          {" · "}
                          Escrow: {fundingLabel(c.escrow_state)}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <StatusPill status={c.status} />
                          {adminActivated ? (
                            <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200">
                              Admin activated
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex max-w-[220px] flex-wrap gap-1">
                          {canAdminActivateOverride(c.status) ? (
                            <button type="button" onClick={() => openAction(c, "activate")} className="inline-flex h-8 items-center rounded-md bg-[#FF5A1F] px-2.5 text-[11px] font-semibold text-white hover:bg-[#E54E18]">
                              Mark as Active
                            </button>
                          ) : null}
                          {c.status === "active" && ugcLifecycleDecision({ action: "pause", status: c.status, escrowHeld: c.escrow_state === "held", adminActivated: Boolean(c.activated_by_admin) }).ok ? (
                            <button type="button" onClick={() => openAction(c, "pause")} className={adminBtnGhost}>Pause</button>
                          ) : null}
                          {ugcLifecycleDecision({ action: "resume", status: c.status, escrowHeld: c.escrow_state === "held", adminActivated: Boolean(c.activated_by_admin) }).ok && c.status === "paused" ? (
                            <button type="button" onClick={() => openAction(c, "resume")} className={adminBtnGhost}>Resume</button>
                          ) : null}
                          {ugcLifecycleDecision({ action: "complete", status: c.status, escrowHeld: c.escrow_state === "held", adminActivated: Boolean(c.activated_by_admin) }).ok && c.status !== "completed" ? (
                            <button type="button" onClick={() => openAction(c, "complete")} className={adminBtnGhost}>Complete</button>
                          ) : null}
                          {ugcLifecycleDecision({ action: "cancel", status: c.status, escrowHeld: c.escrow_state === "held", adminActivated: Boolean(c.activated_by_admin) }).ok && c.status !== "cancelled" ? (
                            <button type="button" onClick={() => openAction(c, "cancel")} className="inline-flex h-9 items-center rounded-md bg-rose-600 px-3 text-[12px] font-semibold text-white">Cancel</button>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <RowArrow href={`/ugc/campaign-center/campaigns/${c.id}`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pending ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="admin-activate-title">
          <div className="w-full max-w-md rounded-2xl bg-[var(--color-surface)] p-5 shadow-xl ring-1 ring-[var(--color-border)]">
            <h2 id="admin-activate-title" className="text-[16px] font-semibold text-[var(--color-text-primary)]">
              {pendingAction === "activate" ? "Mark campaign as active?" : `${pendingAction[0].toUpperCase()}${pendingAction.slice(1)} “${pending.title}”?`}
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
              {pendingAction === "activate"
                ? `This makes “${pending.title}” visible to eligible creators without recording funding. It does not add escrow or approve payouts.`
                : `This changes “${pending.title}” to ${pendingAction === "pause" ? "paused" : pendingAction === "resume" ? "active" : pendingAction === "cancel" ? "cancelled" : "completed"}. Escrow, spent budget, and payouts stay as they are.`}
            </p>
            <p className="mt-2 text-[12px] text-[var(--color-text-muted)]">
              Budget spent: {formatUgcFundingUsd(pending.spent_budget ?? 0)} / {formatUgcFundingUsd(pending.total_budget ?? 0)} · Escrow: {fundingLabel(pending.escrow_state)}
            </p>
            <label className="mt-4 block text-[12px] font-medium text-[var(--color-text-secondary)]">
              Reason (required)
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={500}
                className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[13px] text-[var(--color-text-primary)]"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className={adminBtnGhost}
                disabled={submitting}
                onClick={() => {
                  setPending(null);
                  setReason("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={adminBtnPrimary}
                onClick={() => void confirmAction()}
                disabled={submitting || reason.trim().length < 8}
              >
                {submitting ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
