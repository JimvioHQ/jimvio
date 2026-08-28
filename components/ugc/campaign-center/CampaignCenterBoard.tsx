"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  Copy,
  Eye,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import type { UGCCampaign, UGCCampaignStatus } from "@/types/ugc";
import { useCurrency } from "@/context/CurrencyContext";
import { cn, relativeTime } from "@/lib/utils";
import { useUgcBrandWorkspace } from "@/components/ugc/workspace/UgcBrandWorkspaceProvider";
import { withBrandQuery } from "@/lib/ugc/client/with-brand-query";

type FilterStatus = "all" | UGCCampaignStatus;

type CampaignCenterBoardProps = {
  title: string;
  subtitle?: string;
  initialStatus?: FilterStatus;
  showCreateCta?: boolean;
};

async function patchCampaign(
  id: string,
  body: Record<string, unknown>,
  request: (input: string, init?: RequestInit) => Promise<Response>,
) {
  const res = await request(`/api/ugc/campaigns/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Update failed");
  return json.campaign as UGCCampaign;
}

export function CampaignCenterBoard({
  title,
  subtitle = "Create, publish, and manage your UGC & clipping campaigns.",
  initialStatus = "all",
  showCreateCta = true,
}: CampaignCenterBoardProps) {
  const { ugcFetch, brandId } = useUgcBrandWorkspace();

  const router = useRouter();
  const { formatMoney } = useCurrency();
  const [campaigns, setCampaigns] = useState<UGCCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ugcFetch("/api/ugc/campaigns?status=all&limit=50&mine=true");
      const json = await res.json();
      setCampaigns(json.data ?? []);
    } catch {
      toast.error("Could not load campaigns");
    } finally {
      setLoading(false);
    }
  }, [ugcFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (initialStatus === "all") return campaigns;
    return campaigns.filter((c) => c.status === initialStatus);
  }, [campaigns, initialStatus]);

  const runAction = async (id: string, action: () => Promise<void>) => {
    setBusyId(id);
    setMenuId(null);
    try {
      await action();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const duplicate = async (c: UGCCampaign) => {
    await runAction(c.id, async () => {
      const res = await ugcFetch(`/api/ugc/campaigns/${c.id}/duplicate`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Duplicate failed");
      toast.success("Campaign duplicated as draft");
      router.push(json.redirectTo || `/ugc/campaign-center/create?duplicate=${json.campaign?.id}`);
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#FF5A1F]">
            Campaign Center
          </p>
          <h1 className="mt-1 text-[24px] font-bold tracking-tight text-[#111827] sm:text-[28px]">
            {title}
          </h1>
          <p className="mt-1 max-w-xl text-[13px] text-[#6B7280]">{subtitle}</p>
        </div>
        {showCreateCta ? (
          <Link
            href={withBrandQuery("/ugc/campaign-center/create", brandId)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#FF5A1F] px-4 text-[13px] font-bold text-white shadow-[0_6px_18px_rgba(255,90,31,0.35)] transition hover:bg-[#E54E18]"
          >
            <Plus className="h-4 w-4" />
            Create Campaign
          </Link>
        ) : null}
      </div>

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-[#F3F4F6]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-white px-6 py-16 text-center">
          <p className="text-[15px] font-semibold text-[#111827]">No campaigns here yet</p>
          <p className="mt-1 text-[13px] text-[#6B7280]">
            Launch your first campaign to recruit creators and track performance.
          </p>
          <Link
            href={withBrandQuery("/ugc/campaign-center/create", brandId)}
            className="mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#FF5A1F] px-4 text-[13px] font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            Create Campaign
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((c) => {
            const busy = busyId === c.id;
            return (
              <li
                key={c.id}
                className="relative rounded-2xl border border-[#EEF0F2] bg-white p-4 shadow-[0_1px_2px_rgba(17,24,39,0.04)] transition hover:shadow-[0_6px_20px_rgba(17,24,39,0.06)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/ugc/${c.id}`}
                        className="truncate text-[15px] font-bold text-[#111827] hover:text-[#FF5A1F]"
                      >
                        {c.title}
                      </Link>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-[12.5px] text-[#6B7280]">
                      {c.description || "No description"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#9CA3AF]">
                      <span>{c.campaign_type.replace(/_/g, " ")}</span>
                      <span>
                        Budget {formatMoney(c.total_budget ?? 0, "USD")}
                      </span>
                      <span>{c.submission_count ?? 0} submissions</span>
                      <span>Updated {relativeTime(c.updated_at ?? c.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <Link
                      href={`/ugc/campaign-center/${c.id}/edit`}
                      className="inline-flex h-9 items-center gap-1 rounded-full border border-[#E5E7EB] px-3 text-[12px] font-semibold text-[#374151] hover:bg-[#F9FAFB]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                    <button
                      type="button"
                      aria-label="More actions"
                      onClick={() => setMenuId((m) => (m === c.id ? null : c.id))}
                      className="grid h-9 w-9 place-items-center rounded-full border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {menuId === c.id ? (
                  <div className="absolute right-4 top-14 z-10 w-48 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white py-1 shadow-lg">
                    {c.status === "draft" ? (
                      <Link
                        href={`/ugc/campaign-center/${c.id}/fund`}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] font-medium text-[#374151] hover:bg-[#F9FAFB]"
                        onClick={() => setMenuId(null)}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Fund & Activate
                      </Link>
                    ) : null}
                    {c.status === "active" ? (
                      <MenuItem
                        icon={Pause}
                        label="Pause"
                        disabled={busy}
                        onClick={() =>
                          void runAction(c.id, async () => {
                            await patchCampaign(c.id, { status: "paused" }, ugcFetch);
                            toast.success("Campaign paused");
                          })
                        }
                      />
                    ) : null}
                    {c.status === "paused" ? (
                      <MenuItem
                        icon={Play}
                        label="Resume"
                        disabled={busy}
                        onClick={() =>
                          void runAction(c.id, async () => {
                            await patchCampaign(c.id, { status: "active" }, ugcFetch);
                            toast.success("Campaign resumed");
                          })
                        }
                      />
                    ) : null}
                    <MenuItem
                      icon={Copy}
                      label="Duplicate"
                      disabled={busy}
                      onClick={() => void duplicate(c)}
                    />
                    <MenuItem
                      icon={Archive}
                      label="Archive"
                      disabled={busy}
                      onClick={() =>
                        void runAction(c.id, async () => {
                          await patchCampaign(c.id, { status: "cancelled" }, ugcFetch);
                          toast.success("Campaign archived");
                        })
                      }
                    />
                    <Link
                      href={`/ugc/${c.id}`}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] font-medium text-[#374151] hover:bg-[#F9FAFB]"
                      onClick={() => setMenuId(null)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View public page
                    </Link>
                    <MenuItem
                      icon={Trash2}
                      label="Delete"
                      danger
                      disabled={busy}
                      onClick={() => {
                        if (!confirm(`Delete "${c.title}"? This cannot be undone.`)) return;
                        void runAction(c.id, async () => {
                          const res = await ugcFetch(`/api/ugc/campaigns/${c.id}`, {
                            method: "DELETE",
                          });
                          const json = await res.json().catch(() => ({}));
                          if (!res.ok) throw new Error(json.error || "Delete failed");
                          toast.success("Campaign deleted");
                        });
                      }}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: UGCCampaignStatus }) {
  const label = status === "draft" ? "Pending Funding" : status;
  const styles: Record<UGCCampaignStatus, string> = {
    draft: "bg-[#FFF0E8] text-[#C2410C]",
    active: "bg-[#ECFDF5] text-[#059669]",
    paused: "bg-[#FFF7ED] text-[#C2410C]",
    completed: "bg-[#EEF2FF] text-[#4338CA]",
    cancelled: "bg-[#FEF2F2] text-[#B91C1C]",
  };
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        styles[status] ?? styles.draft,
      )}
    >
      {label}
    </span>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: typeof Copy;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] font-medium hover:bg-[#F9FAFB] disabled:opacity-50",
        danger ? "text-red-600" : "text-[#374151]",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
