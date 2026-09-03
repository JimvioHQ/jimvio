"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Users, Wallet } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { Button } from "@/components/ui/button";
import { UGCPageEmpty, UGCPageError, UGCPageLoading, UGCPageShell } from "@/components/ugc/workspace/UGCPageShell";
import { Pill } from "@/components/ugc/campaign-detail/campaign-detail-ui";
import { cn } from "@/lib/utils";
import { useUgcBrandWorkspace } from "@/components/ugc/workspace/UgcBrandWorkspaceProvider";
import { withBrandQuery } from "@/lib/ugc/client/with-brand-query";

type AttentionItem = {
  id: string;
  kind: string;
  title: string;
  reason: string;
  campaignId: string;
  campaignTitle: string;
  href: string;
  actionLabel: string;
};

type ActiveCampaignCard = {
  id: string;
  title: string;
  status: string;
  bannerUrl: string | null;
  rewardLabel: string | null;
  creators: number;
  submissions: number;
  approvals: number;
  views: number;
  nextDateLabel: string | null;
  nextDate: string | null;
  href: string;
};

type UpcomingItem = {
  id: string;
  date: string;
  label: string;
  campaignId: string;
  campaignTitle: string;
  href: string;
};

type PerformanceRow = {
  id: string;
  title: string;
  status: string;
  views: number;
  creators: number;
  submissions: number;
  approvals: number;
  spend: number | null;
};

type ActivityItem = {
  id: string;
  title: string;
  message: string;
  campaignTitle: string | null;
  href: string | null;
  createdAt: string | null;
};

type DashboardStats = {
  needsProfile?: boolean;
  summary?: {
    activeCampaigns: number;
    draftCampaigns: number;
    pendingReview: number;
    totalSpend: number | null;
    totalViews: number;
    totalCreators: number;
  };
  attention?: AttentionItem[];
  activeCampaigns?: ActiveCampaignCard[];
  upcoming?: UpcomingItem[];
  campaignPerformance?: PerformanceRow[];
  activity?: ActivityItem[];
  fundableDraft?: { id: string; title: string } | null;
};

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusPill(status: string) {
  if (status === "active") return <Pill tone="success">Active</Pill>;
  if (status === "draft") return <Pill tone="warning">Draft</Pill>;
  if (status === "paused") return <Pill tone="info">Paused</Pill>;
  if (status === "completed") return <Pill tone="neutral">Completed</Pill>;
  if (status === "cancelled") return <Pill tone="danger">Archived</Pill>;
  return <Pill tone="neutral">{status}</Pill>;
}

export default function BrandDashboardClient() {
  const { ugcFetch, brandId } = useUgcBrandWorkspace();
  const { formatMoney } = useCurrency();
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ugcFetch("/api/ugc/brand/dashboard", { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [ugcFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const s = data?.summary;
  const createHref = withBrandQuery("/ugc/campaign-center/create", brandId);
  const fundHref = data?.fundableDraft
    ? withBrandQuery(`/ugc/campaign-center/${data.fundableDraft.id}/fund`, brandId)
    : null;
  const inviteHref = withBrandQuery("/ugc/campaign-center/recruitment", brandId);

  if (loading) return <UGCPageLoading />;
  if (error) return <UGCPageError message={error} onRetry={load} />;
  if (data?.needsProfile || !s) {
    return (
      <UGCPageEmpty
        title="Brand account required"
        description="Complete vendor setup to manage campaigns and invite creators."
        illustration="profile"
        action={
          <Button asChild className="rounded-xl bg-[#FF5A1F]">
            <Link href="/activate/vendor">Activate vendor</Link>
          </Button>
        }
      />
    );
  }

  return (
    <UGCPageShell
      title="Brand Workspace"
      subtitle="Manage campaigns, creators, content and performance from one place."
      actions={
        <>
          <Button asChild size="sm" className="h-9 rounded-lg bg-[#FF5A1F] text-[13px] font-semibold hover:bg-[#E54E18]">
            <Link href={createHref}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden />
              Create Campaign
            </Link>
          </Button>
          {fundHref ? (
            <Button asChild size="sm" variant="outline" className="h-9 rounded-lg text-[13px]">
              <Link href={fundHref}>
                <Wallet className="mr-1.5 h-4 w-4" aria-hidden />
                Fund Campaign
              </Link>
            </Button>
          ) : null}
          <Button asChild size="sm" variant="outline" className="h-9 rounded-lg text-[13px]">
            <Link href={inviteHref}>
              <Users className="mr-1.5 h-4 w-4" aria-hidden />
              Invite Creators
            </Link>
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Kpi label="Active campaigns" value={String(s.activeCampaigns)} hint="Currently live" />
          <Kpi label="Drafts" value={String(s.draftCampaigns)} hint="Not yet launched" />
          <Kpi label="Pending review" value={String(s.pendingReview)} hint="Applications and submissions" />
          <Kpi
            label="Total spend"
            value={s.totalSpend == null ? "—" : formatMoney(s.totalSpend, "USD")}
            hint="Funded campaign spend"
          />
          <Kpi label="Total views" value={s.totalViews.toLocaleString()} hint="Tracked performance" />
          <Kpi label="Creators" value={s.totalCreators.toLocaleString()} hint="Participating creators" />
        </div>

        <section className="rounded-xl border border-[#E5E7EB] bg-white p-4 sm:p-5">
          <h2 className="text-[18px] font-semibold text-[#111827]">Needs your attention</h2>
          {(data.attention ?? []).length === 0 ? (
            <p className="mt-3 text-[13px] text-[#6B7280]">No action required</p>
          ) : (
            <ul className="mt-3 divide-y divide-[#F3F4F6]">
              {(data.attention ?? []).map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#111827]">{item.title}</p>
                    <p className="mt-0.5 text-[13px] text-[#6B7280]">{item.reason}</p>
                  </div>
                  <Link
                    href={withBrandQuery(item.href, brandId)}
                    className="shrink-0 text-[13px] font-semibold text-[#FF5A1F] hover:underline"
                  >
                    {item.actionLabel}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-[#111827]">Active campaigns</h2>
          {(data.activeCampaigns ?? []).length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-[#E5E7EB] bg-white px-4 py-8 text-center">
              <p className="text-[14px] font-semibold text-[#111827]">No active campaigns</p>
              <p className="mt-1 text-[13px] text-[#6B7280]">
                Your active campaigns will appear here once a campaign is launched.
              </p>
              <Link
                href={createHref}
                className="mt-3 inline-flex text-[13px] font-semibold text-[#FF5A1F] hover:underline"
              >
                Create Campaign
              </Link>
            </div>
          ) : (
            <ul className="mt-3 grid gap-3 md:grid-cols-2">
              {(data.activeCampaigns ?? []).map((c) => (
                <li key={c.id} className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
                  <div className="flex gap-3 p-3 sm:p-4">
                    <div
                      className="h-[72px] w-[72px] shrink-0 rounded-lg bg-[#F3F4F6] bg-cover bg-center"
                      style={c.bannerUrl ? { backgroundImage: `url(${c.bannerUrl})` } : undefined}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {statusPill(c.status)}
                        <h3 className="truncate text-[15px] font-semibold text-[#111827]">{c.title}</h3>
                      </div>
                      {c.rewardLabel ? (
                        <p className="mt-1 text-[13px] text-[#6B7280]">{c.rewardLabel}</p>
                      ) : null}
                      <p className="mt-2 text-[12px] text-[#6B7280]">
                        {c.creators} creators · {c.submissions} submissions · {c.approvals} approved
                        {c.views ? ` · ${c.views.toLocaleString()} views` : ""}
                      </p>
                      {c.nextDate ? (
                        <p className="mt-1 text-[12px] text-[#9CA3AF]">
                          {c.nextDateLabel ?? "Next date"} · {formatDate(c.nextDate)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="border-t border-[#F3F4F6] px-4 py-2.5">
                    <Link
                      href={withBrandQuery(c.href, brandId)}
                      className="text-[13px] font-semibold text-[#FF5A1F] hover:underline"
                    >
                      View campaign
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-[#E5E7EB] bg-white p-4 sm:p-5">
          <h2 className="text-[18px] font-semibold text-[#111827]">Upcoming</h2>
          {(data.upcoming ?? []).length === 0 ? (
            <p className="mt-3 text-[13px] text-[#6B7280]">No upcoming campaign dates.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {(data.upcoming ?? []).map((item) => (
                <li key={item.id}>
                  <Link
                    href={withBrandQuery(item.href, brandId)}
                    className="flex items-start gap-3 rounded-lg px-1 py-1.5 hover:bg-[#F8FAFC]"
                  >
                    <span className="w-14 shrink-0 pt-0.5 text-[12px] font-semibold text-[#6B7280]">
                      {formatDay(item.date)}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-medium text-[#111827]">{item.label}</span>
                      <span className="block text-[12px] text-[#6B7280]">{item.campaignTitle}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-[#111827]">Campaign performance</h2>
          {(data.campaignPerformance ?? []).length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-[#E5E7EB] bg-white px-4 py-8 text-center">
              <p className="text-[14px] font-semibold text-[#111827]">No campaign performance yet</p>
              <Link
                href={createHref}
                className="mt-3 inline-flex text-[13px] font-semibold text-[#FF5A1F] hover:underline"
              >
                Create Campaign
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-3 hidden overflow-hidden rounded-xl border border-[#E5E7EB] bg-white md:block">
                <table className="w-full text-left text-[13px]">
                  <thead className="border-b border-[#F3F4F6] bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Campaign</th>
                      <th className="px-3 py-2.5 font-semibold">Views</th>
                      <th className="px-3 py-2.5 font-semibold">Creators</th>
                      <th className="px-3 py-2.5 font-semibold">Submissions</th>
                      <th className="px-3 py-2.5 font-semibold">Approvals</th>
                      <th className="px-3 py-2.5 font-semibold">Spend</th>
                      <th className="px-4 py-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.campaignPerformance ?? []).map((row) => (
                      <tr key={row.id} className="border-b border-[#F3F4F6] last:border-0">
                        <td className="px-4 py-2.5">
                          <Link
                            href={withBrandQuery(`/ugc/campaign-center/${row.id}/edit`, brandId)}
                            className="font-medium text-[#111827] hover:text-[#FF5A1F]"
                          >
                            {row.title}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-[#6B7280]">{row.views.toLocaleString()}</td>
                        <td className="px-3 py-2.5 tabular-nums text-[#6B7280]">{row.creators}</td>
                        <td className="px-3 py-2.5 tabular-nums text-[#6B7280]">{row.submissions}</td>
                        <td className="px-3 py-2.5 tabular-nums text-[#6B7280]">{row.approvals}</td>
                        <td className="px-3 py-2.5 tabular-nums text-[#6B7280]">
                          {row.spend == null ? "—" : formatMoney(row.spend, "USD")}
                        </td>
                        <td className="px-4 py-2.5">{statusPill(row.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="mt-3 space-y-2 md:hidden">
                {(data.campaignPerformance ?? []).map((row) => (
                  <li key={row.id} className="rounded-xl border border-[#E5E7EB] bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={withBrandQuery(`/ugc/campaign-center/${row.id}/edit`, brandId)}
                        className="truncate text-[14px] font-semibold text-[#111827]"
                      >
                        {row.title}
                      </Link>
                      {statusPill(row.status)}
                    </div>
                    <p className="mt-2 text-[12px] text-[#6B7280]">
                      {row.views.toLocaleString()} views · {row.creators} creators · {row.submissions} submissions ·{" "}
                      {row.approvals} approved
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="rounded-xl border border-[#E5E7EB] bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[18px] font-semibold text-[#111827]">Recent campaign activity</h2>
            <Link href="/ugc/activity" className="text-[13px] font-semibold text-[#FF5A1F] hover:underline">
              View all
            </Link>
          </div>
          {(data.activity ?? []).length === 0 ? (
            <div className="mt-3">
              <p className="text-[14px] font-semibold text-[#111827]">No recent campaign activity</p>
              <p className="mt-1 text-[13px] text-[#6B7280]">
                Campaign activity will appear here as creators and campaigns progress.
              </p>
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {(data.activity ?? []).map((item) => {
                const inner = (
                  <div className={cn("rounded-lg px-1 py-1.5", item.href ? "hover:bg-[#F8FAFC]" : "")}>
                    <p className="text-[14px] font-medium text-[#111827]">{item.title}</p>
                    {item.message ? <p className="mt-0.5 text-[13px] text-[#6B7280]">{item.message}</p> : null}
                    <p className="mt-1 text-[12px] text-[#9CA3AF]">
                      {[item.campaignTitle, item.createdAt ? new Date(item.createdAt).toLocaleString() : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                );
                return (
                  <li key={item.id}>
                    {item.href ? <Link href={withBrandQuery(item.href, brandId)}>{inner}</Link> : inner}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </UGCPageShell>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">{label}</p>
      <p className="mt-1 text-[22px] font-semibold tabular-nums leading-none text-[#111827]">{value}</p>
      <p className="mt-1.5 text-[11px] text-[#6B7280]">{hint}</p>
    </div>
  );
}
