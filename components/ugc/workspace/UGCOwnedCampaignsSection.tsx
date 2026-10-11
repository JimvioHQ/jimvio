"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/context/CurrencyContext";
import type { UGCCampaign } from "@/types/ugc";
import { memberCan } from "@/lib/ugc/enterprise/permissions";
import { withBrandQuery } from "@/lib/ugc/client/with-brand-query";
import { useUgcBrandWorkspace } from "./UgcBrandWorkspaceProvider";
import { UGCPageEmpty, UGCPageError, UGCPageLoading } from "./UGCPageShell";
import { getCampaignRewardLine } from "./ugc-campaign-utils";

type LiveMetrics = {
  totalApplications?: number;
  pendingApplications?: number;
  activeCreators?: number;
  totalSubmissions?: number;
  pendingSubmissions?: number;
  approvedSubmissions?: number;
  rejectedSubmissions?: number;
  revisionRequested?: number;
  totalBudget?: number | null;
  spentBudget?: number | null;
  escrowHeld?: number | null;
  confirmedPayoutAmount?: number | null;
  confirmedPayoutCount?: number | null;
  views?: number;
};

type OwnedCampaign = UGCCampaign & {
  media?: Array<{ url?: string; usage?: string }>;
  vendor?: { business_name?: string; business_logo?: string | null };
};

function coverOf(campaign: OwnedCampaign) {
  return campaign.media?.find((m) => m.usage === "banner")?.url ?? campaign.media?.[0]?.url ?? null;
}

export function UGCOwnedCampaignsSection() {
  const { ugcFetch, brandId, role, loading: brandLoading } = useUgcBrandWorkspace();
  const { formatMoney } = useCurrency();
  const canEdit = memberCan(role, "campaigns.manage");
  const canReview = memberCan(role, "campaigns.review");
  const canFinance = memberCan(role, "finance.view");

  const [campaigns, setCampaigns] = useState<OwnedCampaign[]>([]);
  const [total, setTotal] = useState(0);
  const [metrics, setMetrics] = useState<Record<string, LiveMetrics>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ugcFetch("/api/ugc/campaigns?status=all&limit=50&mine=true", { cache: "no-store" });
      if (res.status === 401) {
        setError("sign_in");
        setCampaigns([]);
        return;
      }
      if (!res.ok) throw new Error("Could not load campaigns you manage.");
      const json = await res.json();
      const rows = (json.data ?? []) as OwnedCampaign[];
      setCampaigns(rows);
      setTotal(Number(json.total ?? rows.length));

      const next: Record<string, LiveMetrics> = {};
      const chunk = 6;
      for (let i = 0; i < rows.length; i += chunk) {
        const slice = rows.slice(i, i + chunk);
        await Promise.all(
          slice.map(async (campaign) => {
            try {
              const live = await ugcFetch(`/api/ugc/campaigns/${campaign.id}/live`, { cache: "no-store" });
              if (!live.ok) return;
              const body = await live.json();
              if (body.metrics) next[campaign.id] = body.metrics as LiveMetrics;
            } catch {
              /* per-campaign metrics stay empty; the campaign row still renders */
            }
          }),
        );
      }
      setMetrics(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load campaigns you manage.");
    } finally {
      setLoading(false);
    }
  }, [ugcFetch]);

  useEffect(() => {
    if (brandLoading) return;
    void load();
  }, [brandLoading, load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return campaigns.filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (!q) return true;
      const brand = c.vendor?.business_name?.toLowerCase() ?? "";
      return c.title.toLowerCase().includes(q) || brand.includes(q);
    });
  }, [campaigns, search, status]);

  if (brandLoading || loading) return <UGCPageLoading />;
  if (error && error !== "sign_in") return <UGCPageError message={error} onRetry={load} />;
  if (campaigns.length === 0) {
    return (
      <UGCPageEmpty
        title="No campaigns to manage"
        description="Campaigns you own or manage appear here. Creating a campaign saves a draft and does not fund or activate it."
        illustration="campaigns"
        action={
          canEdit ? (
            <Button asChild className="rounded-xl bg-[#FF5A1F]">
              <Link href={withBrandQuery("/ugc/campaign-center/create", brandId)}>Create campaign</Link>
            </Button>
          ) : null
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {total > campaigns.length ? (
        <p className="text-[12px] text-[#6B7280]">
          Showing the latest {campaigns.length} of {total} campaigns. Counts on each card come from that campaign, not a partial page total.
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search campaigns you manage"
          aria-label="Search campaigns you manage"
          className="h-10 min-w-0 flex-1 rounded-xl border border-[#E5E7EB] bg-white px-3 text-[13px] outline-none focus:border-[#FF5A1F]"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by campaign status"
          className="h-10 rounded-xl border border-[#E5E7EB] bg-white px-3 text-[13px]"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        {canEdit ? (
          <Button asChild size="sm" className="h-10 rounded-xl bg-[#FF5A1F]">
            <Link href={withBrandQuery("/ugc/campaign-center/create", brandId)}>Create campaign</Link>
          </Button>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <UGCPageEmpty
          title="No campaigns match"
          description="Try another status or search."
          illustration="campaigns"
        />
      ) : (
        <div className="grid gap-3">
          {visible.map((campaign) => {
            const live = metrics[campaign.id];
            const cover = coverOf(campaign);
            const brand = campaign.vendor?.business_name ?? "Your brand";
            const pendingSubs = live?.pendingSubmissions ?? 0;
            const pendingApps = live?.pendingApplications ?? 0;
            const primary =
              canFinance && campaign.status === "draft"
                ? { href: withBrandQuery(`/ugc/campaign-center/${campaign.id}/fund`, brandId), label: "Fund campaign" }
                : canReview && pendingSubs > 0
                  ? { href: withBrandQuery(`/ugc/campaign-center/${campaign.id}/submissions`, brandId), label: "Review submitted content" }
                  : canReview && pendingApps > 0
                    ? { href: withBrandQuery(`/ugc/campaign-center/${campaign.id}/participants`, brandId), label: "View applications" }
                    : canEdit
                      ? { href: withBrandQuery(`/ugc/campaign-center/${campaign.id}/edit`, brandId), label: "Edit campaign" }
                      : { href: `/ugc/${campaign.id}`, label: "Preview campaign" };

            const links: Array<{ href: string; label: string }> = [
              { href: `/ugc/${campaign.id}`, label: "Preview" },
            ];
            if (canEdit) {
              links.push({
                href: withBrandQuery(`/ugc/campaign-center/${campaign.id}/edit`, brandId),
                label: "Edit",
              });
            }
            if (canReview) {
              links.push({
                href: withBrandQuery(`/ugc/campaign-center/${campaign.id}/participants`, brandId),
                label: "Applications",
              });
              links.push({
                href: withBrandQuery(`/ugc/campaign-center/${campaign.id}/submissions`, brandId),
                label: "Submissions",
              });
            }
            if (canFinance) {
              links.push({
                href: withBrandQuery(`/ugc/campaign-center/${campaign.id}/funding`, brandId),
                label: "Funding",
              });
              links.push({
                href: withBrandQuery(`/ugc/campaign-center/${campaign.id}/payments`, brandId),
                label: "Payments",
              });
            }
            links.push({
              href: withBrandQuery(`/ugc/campaign-center/${campaign.id}/live`, brandId),
              label: "Analytics",
            });

            return (
              <article key={campaign.id} className="rounded-2xl border border-[#E8EAED] bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt="" className="h-20 w-full rounded-xl object-cover sm:h-24 sm:w-32" />
                  ) : (
                    <div className="h-20 w-full rounded-xl bg-[#F8FAFC] sm:h-24 sm:w-32" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-[#64748B]">{brand}</p>
                    <h2 className="mt-0.5 text-[16px] font-bold text-[#111827]">{campaign.title}</h2>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[12px] text-[#64748B]">
                      <span className="rounded-full bg-[#F8FAFC] px-2 py-0.5 font-medium capitalize">
                        {campaign.campaign_type?.replaceAll("_", " ") ?? "Campaign"}
                      </span>
                      <span className="rounded-full bg-[#FFF8F5] px-2 py-0.5 font-medium capitalize text-[#9A3412]">
                        {campaign.status.replaceAll("_", " ")}
                      </span>
                      <span>{getCampaignRewardLine(campaign, formatMoney)}</span>
                      {typeof live?.views === "number" ? <span>{live.views.toLocaleString()} views</span> : null}
                    </div>
                    {live ? (
                      <p className="mt-2 text-[12px] leading-relaxed text-[#4B5563]">
                        {canReview ? (
                          <>
                            Applications {live.totalApplications ?? 0} · pending {live.pendingApplications ?? 0} · accepted{" "}
                            {live.activeCreators ?? 0}. Submissions {live.totalSubmissions ?? 0} · awaiting review{" "}
                            {live.pendingSubmissions ?? 0} · approved {live.approvedSubmissions ?? 0} · rejected{" "}
                            {live.rejectedSubmissions ?? 0} · revisions {live.revisionRequested ?? 0}.
                          </>
                        ) : (
                          <>Review totals are limited to members who can review this campaign.</>
                        )}
                        {canFinance && live.totalBudget != null ? (
                          <>
                            {" "}
                            Budget {formatMoney(live.totalBudget, "USD")} · spent {formatMoney(live.spentBudget ?? 0, "USD")}
                            {live.escrowHeld != null ? ` · escrow held ${formatMoney(live.escrowHeld, "USD")}` : ""}
                            {live.confirmedPayoutAmount != null
                              ? ` · confirmed paid ${formatMoney(live.confirmedPayoutAmount, "USD")} (${live.confirmedPayoutCount ?? 0})`
                              : ""}
                            . Approved submissions are not marked paid until a payout is confirmed.
                          </>
                        ) : null}
                      </p>
                    ) : (
                      <p className="mt-2 text-[12px] text-[#6B7280]">Live totals are unavailable for this campaign.</p>
                    )}
                  </div>
                  <div className="flex sm:flex-col">
                    <Button asChild size="sm" className="rounded-xl bg-[#FF5A1F]">
                      <Link href={primary.href}>{primary.label}</Link>
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-[#F3F4F6] pt-2">
                  {links
                    .filter((link) => link.href !== primary.href)
                    .map((link) => (
                      <Link
                        key={link.href + link.label}
                        href={link.href}
                        className="text-[12px] font-semibold text-[#374151] hover:text-[#FF5A1F]"
                      >
                        {link.label}
                      </Link>
                    ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
