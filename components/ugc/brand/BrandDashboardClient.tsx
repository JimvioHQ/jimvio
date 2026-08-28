"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Megaphone, PlusCircle, Sparkles, Users, Wallet, Bell } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { Button } from "@/components/ui/button";
import { UGCPageEmpty, UGCPageError, UGCPageLoading, UGCPageShell } from "@/components/ugc/workspace/UGCPageShell";
import { MetricTile, Pill, SectionCard } from "@/components/ugc/campaign-detail/campaign-detail-ui";
import { cn } from "@/lib/utils";

type DashboardStats = {
  needsProfile?: boolean;
  summary?: {
    activeCampaigns: number;
    draftCampaigns: number;
    pendingFunding: number;
    totalSpend: number | null;
    totalViews: number;
    totalCreators: number;
    activeApplications: number;
    conversionRate: number; // 0-100
  };
  campaignPerformance?: {
    topCampaigns: Array<{
      id: string;
      title: string;
      status: string;
      views: number;
      spend: number | null;
      submissions: number;
      approvals: number;
    }>;
  };
  notifications?: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    category: string | null;
    actionUrl: string | null;
    createdAt: string | null;
    isRead: boolean;
  }>;
  drafts?: Array<{ id: string; title: string }>;
};

function formatStatusPill(status: string) {
  if (status === "active") return <Pill tone="success">Active</Pill>;
  if (status === "draft") return <Pill tone="warning">Draft</Pill>;
  if (status === "paused") return <Pill tone="info">Paused</Pill>;
  if (status === "completed") return <Pill tone="neutral">Completed</Pill>;
  if (status === "cancelled") return <Pill tone="danger">Archived</Pill>;
  return <Pill tone="neutral">{status}</Pill>;
}

export default function BrandDashboardClient() {
  const { formatMoney } = useCurrency();
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ugc/brand/dashboard", { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const s = data?.summary;
  const topCampaigns = data?.campaignPerformance?.topCampaigns ?? [];
  const notifications = data?.notifications ?? [];
  const drafts = data?.drafts ?? [];

  const firstDraft = useMemo(() => drafts[0], [drafts]);

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
            <Link href="/dashboard/activate/vendor">Activate vendor</Link>
          </Button>
        }
      />
    );
  }

  return (
    <UGCPageShell
      title="Brand Dashboard"
      subtitle="Active campaigns, creator pipeline, and conversion performance."
      actions={
        <>
          <Button asChild size="sm" className="rounded-xl bg-[#FF5A1F]">
            <Link href="/ugc/campaign-center/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Campaign
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            className={cn(
              "rounded-xl",
              firstDraft ? "bg-[#FF5A1F]" : "bg-[#F3F4F6] text-[#9CA3AF]",
            )}
          >
            <Link
              href={firstDraft ? `/ugc/campaign-center/${firstDraft.id}/fund` : "#"}
              aria-disabled={!firstDraft}
              onClick={(e) => {
                if (!firstDraft) e.preventDefault();
              }}
            >
              <Wallet className="mr-2 h-4 w-4" />
              Fund Campaign
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="rounded-xl">
            <Link href="/ugc/campaign-center/recruitment">
              <Users className="mr-2 h-4 w-4" />
              Invite Creators
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="rounded-xl">
            <Link href="/ugc/campaign-center/reports">
              <Download className="mr-2 h-4 w-4" />
              Export Reports
            </Link>
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <MetricTile label="Active Campaigns" value={String(s.activeCampaigns)} />
          <MetricTile label="Draft Campaigns" value={String(s.draftCampaigns)} />
          <MetricTile label="Pending Funding" value={String(s.pendingFunding)} />
          <MetricTile
            label="Total Spend"
            value={s.totalSpend == null ? "—" : formatMoney(s.totalSpend, "USD")}
            sub="Across owned campaigns"
          />
          <MetricTile
            label="Total Views"
            value={s.totalViews.toLocaleString()}
            sub="Tracked performance"
          />
          <MetricTile
            label="Total Creators"
            value={s.totalCreators.toLocaleString()}
            sub="Distinct invited creators"
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.3fr_0.7fr]">
          <SectionCard>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#FF5A1F]">
                  Conversion Metrics
                </p>
                <h2 className="mt-1 text-[18px] font-bold text-[#111827]">Your approval funnel</h2>
                <p className="mt-1 text-[13px] text-[#6B7280]">
                  Active applications and approval conversion rate.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="brand">Approval {s.conversionRate}%</Pill>
                <Pill tone="neutral">{s.activeApplications} active applications</Pill>
              </div>
            </div>

            <div className="mt-4 rounded-[16px] border border-[#EEF0F2] bg-[#FAFAFA] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF]">
                    Conversion summary
                  </p>
                  <p className="mt-1 text-[13px] text-[#374151]">
                    Higher conversion comes from clearer requirements and faster review cycles.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF]">
                    Recommended action
                  </p>
                  <Link
                    href="/ugc/campaign-center/recruitment"
                    className="mt-1 inline-flex items-center gap-2 text-[12px] font-semibold text-[#FF5A1F] hover:underline"
                  >
                    <Megaphone className="h-4 w-4" />
                    Improve outreach
                  </Link>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#FF5A1F]" />
              <h2 className="text-[15px] font-bold text-[#111827]">Notifications</h2>
            </div>
            <p className="mt-1 text-[13px] text-[#6B7280]">Recent campaign updates</p>

            {notifications.length === 0 ? (
              <p className="mt-4 text-[13px] text-[#6B7280]">
                You&apos;re all caught up. New applications and campaign updates will appear here.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {notifications.map((n) => (
                  <Link
                    key={n.id}
                    href={n.actionUrl ?? "#"}
                    onClick={(e) => {
                      if (!n.actionUrl) e.preventDefault();
                    }}
                    className={cn(
                      "block rounded-xl border p-3 transition",
                      n.isRead
                        ? "border-[#EEF0F2] bg-white hover:border-[#FFE4D6]"
                        : "border-[#FFE4D6] bg-[#FFF8F5] hover:border-[#FF5A1F]/40",
                    )}
                  >
                    <p className="text-[13px] font-semibold text-[#111827]">{n.title}</p>
                    {n.message ? (
                      <p className="mt-1 line-clamp-2 text-[12px] text-[#6B7280]">{n.message}</p>
                    ) : null}
                    {n.createdAt ? (
                      <p className="mt-1 text-[11px] text-[#9CA3AF]">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </p>
                    ) : null}
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
          <SectionCard>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#FF5A1F]">
                  Campaign Performance
                </p>
                <h2 className="mt-1 text-[18px] font-bold text-[#111827]">Top campaigns</h2>
              </div>
              <div className="flex items-center gap-2 text-[13px] text-[#6B7280]">
                <Sparkles className="h-4 w-4 text-[#FF5A1F]" />
              </div>
            </div>

            {topCampaigns.length === 0 ? (
              <p className="mt-4 text-[13px] text-[#6B7280]">
                No campaign performance yet. Create and fund a campaign to begin tracking.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {topCampaigns.map((c) => (
                  <Link
                    key={c.id}
                    href={`/ugc/campaign-center/${c.id}/edit`}
                    className="block rounded-xl border border-[#EEF0F2] bg-white p-3 hover:border-[#FFE4D6] hover:bg-[#FFF8F5]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold text-[#111827] truncate">{c.title}</p>
                        <p className="mt-1 text-[11px] text-[#6B7280]">
                          {c.views.toLocaleString()} views · {c.submissions} submissions · {c.approvals} approvals
                        </p>
                      </div>
                      <div className="text-right">
                        {c.spend == null ? "—" : formatMoney(c.spend, "USD")}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {formatStatusPill(c.status)}
                      <Pill tone="neutral">{c.views > 0 ? "Tracked" : "Tracking"}</Pill>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#FF5A1F]">
              Recent Activity
            </p>
            <h2 className="mt-1 text-[18px] font-bold text-[#111827]">What&apos;s happening now</h2>
            <p className="mt-1 text-[13px] text-[#6B7280]">Latest application and campaign updates</p>

            {notifications.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-[#E5E7EB] bg-[#FAFAFA] p-4 text-center">
                <p className="text-[13px] font-semibold text-[#111827]">No activity yet</p>
                <p className="mt-1 text-[12px] text-[#6B7280]">
                  Funding and creator pipeline updates will appear as notifications.
                </p>
                <Link
                  href="/ugc/campaign-center/recruitment"
                  className="mt-3 inline-flex text-[12px] font-semibold text-[#FF5A1F] hover:underline"
                >
                  Invite creators →
                </Link>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {notifications.slice(0, 6).map((n) => (
                  <div key={`activity-${n.id}`} className="rounded-xl border border-[#EEF0F2] bg-white p-3">
                    <p className="text-[13px] font-semibold text-[#111827]">{n.title}</p>
                    <p className="mt-1 line-clamp-2 text-[12px] text-[#6B7280]">{n.message}</p>
                    {n.createdAt ? (
                      <p className="mt-1 text-[11px] text-[#9CA3AF]">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </UGCPageShell>
  );
}

