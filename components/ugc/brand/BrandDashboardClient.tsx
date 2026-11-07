"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  Clock,
  FileStack,
  FolderKanban,
  ImageIcon,
  Plus,
  Settings2,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
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
  paidViews?: number;
  pendingReview?: number;
  budget?: number | null;
  remaining?: number | null;
  nextDateLabel: string | null;
  nextDate: string | null;
  href: string;
};

type UpcomingItem = {
  id: string;
  date: string;
  label: string;
  kind?: string;
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

type DashboardStats = {
  needsProfile?: boolean;
  summary?: {
    totalCampaigns?: number;
    activeCampaigns: number;
    upcomingCampaigns: number;
    pendingApplications: number;
    pendingSubmissions: number;
    pendingFunding: number;
    totalSpend: number | null;
    totalViews: number;
    paidViews?: number;
    remainingBudget?: number | null;
    confirmedEscrow?: number | null;
    approvedRewards?: number | null;
    totalCreators: number;
  };
  attention?: AttentionItem[];
  activeCampaigns?: ActiveCampaignCard[];
  upcoming?: UpcomingItem[];
  campaignPerformance?: PerformanceRow[];
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

function countdownLabel(iso: string) {
  const days = Math.ceil((Date.parse(iso) - Date.now()) / (1000 * 60 * 60 * 24));
  if (Number.isNaN(days)) return null;
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

function eventTypeLabel(kind?: string, fallback?: string) {
  switch (kind) {
    case "campaign_start":
      return "Campaign start";
    case "submission_deadline":
    case "content_deadline":
      return "Content deadline";
    case "review_start":
    case "review_end":
      return "Review period";
    case "campaign_end":
      return "Campaign end";
    case "live_date":
      return "Creator submissions open";
    case "payment":
      return "Payment";
    default:
      return fallback ?? "Campaign date";
  }
}

const ATTENTION_ICONS: Record<string, LucideIcon> = {
  funding: Wallet,
  application_review: UserPlus,
  submission_review: FileStack,
  deadline: Clock,
  ending: AlertCircle,
};

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
  const campaignsHref = withBrandQuery("/ugc/campaign-center/campaigns", brandId);
  const assetsHref = withBrandQuery("/ugc/campaign-center/assets", brandId);
  const escrowHref = withBrandQuery("/ugc/campaign-center/escrow", brandId);
  const analyticsHref = withBrandQuery("/ugc/campaign-center/analytics", brandId);
  const teamHref = withBrandQuery("/ugc/campaign-center/team", brandId);
  const reviewHref = "/ugc/review";

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

  const active = data.activeCampaigns ?? [];
  const attention = data.attention ?? [];
  const totalCampaigns = s.totalCampaigns ?? s.activeCampaigns + s.pendingFunding;

  return (
    <UGCPageShell
      title="Brand Workspace"
      subtitle="Campaigns, creators, reviews, and escrow — scoped to your brand."
      actions={
        <>
          <Button asChild size="sm" className="h-9 rounded-lg bg-[#FF5A1F] text-[13px] font-semibold hover:bg-[#E54E18]">
            <Link href={createHref}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden />
              Create Campaign
            </Link>
          </Button>
          {fundHref ? (
            <Button asChild size="sm" variant="outline" className="h-9 rounded-lg border-[#FFD4C2] text-[13px] text-[#FF5A1F]">
              <Link href={fundHref}>
                <Wallet className="mr-1.5 h-4 w-4" aria-hidden />
                Fund draft
              </Link>
            </Button>
          ) : null}
        </>
      }
    >
      <div className="space-y-10">
        {/* Overview */}
        <section aria-labelledby="bw-overview">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#FF5A1F]">Overview</p>
              <h2 id="bw-overview" className="mt-1 text-[20px] font-bold tracking-tight text-[#111827]">
                Workspace at a glance
              </h2>
            </div>
            <nav className="flex flex-wrap gap-2" aria-label="Workspace sections">
              {[
                { href: campaignsHref, label: "Campaigns" },
                { href: reviewHref, label: "Reviews" },
                { href: escrowHref, label: "Funding" },
                { href: analyticsHref, label: "Performance" },
                { href: assetsHref, label: "Assets" },
                { href: teamHref, label: "Settings" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-[#E8EAED] bg-white px-3 py-1.5 text-[12px] font-medium text-[#4B5563] transition hover:border-[#FFB89A] hover:text-[#FF5A1F]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total campaigns" value={String(totalCampaigns)} href={campaignsHref} />
            <MetricCard label="Live" value={String(s.activeCampaigns)} href={withBrandQuery("/ugc/campaign-center/active", brandId)} accent />
            <MetricCard label="Drafts awaiting funding" value={String(s.pendingFunding)} href={fundHref ?? createHref} hot={s.pendingFunding > 0} />
            <MetricCard label="Submissions awaiting review" value={String(s.pendingSubmissions)} href={reviewHref} hot={s.pendingSubmissions > 0} />
            <MetricCard label="Joined creators" value={String(s.totalCreators)} href={inviteHref} />
            <MetricCard
              label="Confirmed escrow"
              value={s.confirmedEscrow == null ? "—" : formatMoney(s.confirmedEscrow, "USD")}
              href={escrowHref}
            />
            <MetricCard
              label="Approved creator rewards"
              value={s.approvedRewards == null ? "—" : formatMoney(s.approvedRewards, "USD")}
              href={escrowHref}
            />
            <MetricCard label="Real views tracked" value={s.totalViews.toLocaleString()} href={analyticsHref} />
          </div>
        </section>

        {attention.length ? (
          <section aria-labelledby="bw-attention" className="rounded-2xl border border-[#FFE1D3] bg-[#FFF8F4] p-4 sm:p-5">
            <h2 id="bw-attention" className="flex items-center gap-2 text-[15px] font-bold text-[#111827]">
              <AlertCircle className="h-4 w-4 text-[#FF5A1F]" aria-hidden />
              Needs attention
            </h2>
            <ul className="mt-3 grid gap-2 md:grid-cols-2">
              {attention.map((item) => {
                const Icon = ATTENTION_ICONS[item.kind] ?? AlertCircle;
                return (
                  <li key={item.id} className="flex items-center gap-3 rounded-xl border border-white bg-white p-3 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#FFF1EA] text-[#FF5A1F]">
                      <Icon className="h-[18px] w-[18px]" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold text-[#111827]">{item.title}</p>
                      <p className="truncate text-[12px] text-[#6B7280]">{item.reason}</p>
                    </div>
                    <Link
                      href={withBrandQuery(item.href, brandId)}
                      className="inline-flex h-8 shrink-0 items-center rounded-full bg-[#FF5A1F] px-3 text-[12px] font-semibold text-white hover:bg-[#E54E18]"
                    >
                      {item.actionLabel}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {/* Campaigns */}
        <section aria-labelledby="bw-campaigns">
          <SectionHeader
            id="bw-campaigns"
            eyebrow="Campaigns"
            title="Live campaigns"
            href={campaignsHref}
            linkLabel="All campaigns"
          />
          {active.length === 0 ? (
            <EmptyPanel
              title="No live campaigns yet"
              body="Create a campaign and fund at least $100 USD equivalent. It goes live once escrow is confirmed."
              ctaHref={createHref}
              ctaLabel="Create Campaign"
            />
          ) : (
            <ul className="mt-3 grid gap-3 md:grid-cols-2">
              {active.map((c) => {
                const used =
                  c.budget && c.budget > 0 && c.remaining != null
                    ? Math.min(100, Math.round(((c.budget - c.remaining) / c.budget) * 100))
                    : null;
                return (
                  <li
                    key={c.id}
                    className="flex flex-col overflow-hidden rounded-2xl border border-[#E8EAED] bg-white shadow-[0_1px_2px_rgba(17,24,39,0.04)]"
                  >
                    <div className="flex gap-3 p-4">
                      <div
                        className="h-[76px] w-[76px] shrink-0 rounded-xl bg-[#F3F4F6] bg-cover bg-center"
                        style={c.bannerUrl ? { backgroundImage: `url(${c.bannerUrl})` } : undefined}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {statusPill(c.status)}
                          {c.rewardLabel ? (
                            <span className="text-[12px] font-semibold text-[#FF5A1F]">{c.rewardLabel}</span>
                          ) : null}
                        </div>
                        <h3 className="mt-1 line-clamp-2 text-[15px] font-bold leading-snug text-[#111827]">{c.title}</h3>
                        {c.nextDate ? (
                          <p className="mt-1 text-[11.5px] text-[#9CA3AF]">
                            {c.nextDateLabel ?? "Next date"} · {formatDate(c.nextDate)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {used != null ? (
                      <div className="px-4">
                        <div className="flex justify-between text-[11.5px] text-[#6B7280]">
                          <span>
                            <b className="text-[#111827]">{formatMoney(c.remaining ?? 0, "USD")}</b> left of{" "}
                            {formatMoney(c.budget ?? 0, "USD")}
                          </span>
                          <span>{used}% used</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#F3F4F6]">
                          <div className="h-full rounded-full bg-[#FF5A1F]" style={{ width: `${used}%` }} />
                        </div>
                      </div>
                    ) : null}
                    <dl className="mt-3 grid grid-cols-4 gap-1 px-4 text-center">
                      <MiniStat label="Creators" value={c.creators} />
                      <MiniStat label="Posts" value={c.submissions} />
                      <MiniStat label="Approved" value={c.approvals} />
                      <MiniStat label="Views" value={c.views} />
                    </dl>
                    <div className="mt-3 flex items-center gap-2 border-t border-[#F3F4F6] px-4 py-2.5">
                      <Link
                        href={`/ugc/review?campaign=${c.id}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#FF5A1F] px-3 text-[12px] font-bold text-white hover:bg-[#E54E18]"
                      >
                        Review
                        {c.pendingReview ? (
                          <span className="rounded-full bg-white/25 px-1.5 text-[11px]">{c.pendingReview}</span>
                        ) : null}
                      </Link>
                      <Link
                        href={withBrandQuery(c.href, brandId)}
                        className="text-[12.5px] font-semibold text-[#374151] hover:text-[#FF5A1F]"
                      >
                        Manage
                      </Link>
                      <Link
                        href={`/ugc/${c.id}`}
                        className="ml-auto text-[12.5px] font-medium text-[#6B7280] hover:text-[#111827]"
                      >
                        Public page
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Creators + Funding shortcuts */}
        <section className="grid gap-4 lg:grid-cols-2" aria-label="Creators and funding">
          <div className="rounded-2xl border border-[#E8EAED] bg-white p-5">
            <SectionHeader
              id="bw-creators"
              eyebrow="Creators"
              title="Recruit & join requests"
              as="h2"
              className="mb-3"
            />
            <p className="text-[13px] text-[#6B7280]">
              {s.pendingApplications > 0
                ? `${s.pendingApplications} join request${s.pendingApplications === 1 ? "" : "s"} waiting.`
                : `${s.totalCreators} creator${s.totalCreators === 1 ? "" : "s"} have joined your campaigns.`}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={inviteHref}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#FF5A1F] px-4 text-[13px] font-semibold text-white hover:bg-[#E54E18]"
              >
                <Users className="h-3.5 w-3.5" aria-hidden />
                Invite creators
              </Link>
              <Link
                href={reviewHref}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#E8EAED] px-4 text-[13px] font-semibold text-[#374151] hover:border-[#FFB89A]"
              >
                Review requests
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E8EAED] bg-white p-5">
            <SectionHeader
              id="bw-funding"
              eyebrow="Funding & escrow"
              title="Confirmed balances"
              as="h2"
              className="mb-3"
            />
            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#FFF8F4] px-3 py-3">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Escrow held</dt>
                <dd className="mt-1 text-[18px] font-bold tabular-nums text-[#111827]">
                  {s.confirmedEscrow == null ? "—" : formatMoney(s.confirmedEscrow, "USD")}
                </dd>
              </div>
              <div className="rounded-xl bg-[#F8FAFC] px-3 py-3">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Left to pay</dt>
                <dd className="mt-1 text-[18px] font-bold tabular-nums text-[#111827]">
                  {s.remainingBudget == null ? "—" : formatMoney(s.remainingBudget, "USD")}
                </dd>
              </div>
            </dl>
            <Link
              href={escrowHref}
              className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-[#FF5A1F] hover:underline"
            >
              Open escrow ledger <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </section>

        {/* Performance + Upcoming */}
        <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
          <section className="rounded-2xl border border-[#E8EAED] bg-white p-4 sm:p-5" aria-labelledby="bw-upcoming">
            <SectionHeader id="bw-upcoming" eyebrow="Schedule" title="Upcoming" as="h2" className="mb-3" />
            {(data.upcoming ?? []).length === 0 ? (
              <p className="text-[13px] text-[#6B7280]">No upcoming campaign dates.</p>
            ) : (
              <ul className="divide-y divide-[#F3F4F6]">
                {(data.upcoming ?? []).map((item) => (
                  <li key={item.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="w-[64px] shrink-0">
                      <p className="text-[13px] font-semibold text-[#111827]">{formatDay(item.date)}</p>
                      <p className="text-[11px] text-[#9CA3AF]">{countdownLabel(item.date)}</p>
                    </div>
                    <Link href={withBrandQuery(item.href, brandId)} className="min-w-0 flex-1 hover:text-[#FF5A1F]">
                      <p className="truncate text-[13.5px] font-medium text-[#111827]">{item.campaignTitle}</p>
                      <p className="text-[12px] text-[#6B7280]">{eventTypeLabel(item.kind, item.label)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#E8EAED] bg-white" aria-labelledby="bw-perf">
            <div className="px-4 pt-4 sm:px-5">
              <SectionHeader
                id="bw-perf"
                eyebrow="Campaign performance"
                title="Real results"
                as="h2"
                href={analyticsHref}
                linkLabel="Analytics"
              />
            </div>
            {(data.campaignPerformance ?? []).length === 0 ? (
              <p className="px-5 py-6 text-[13px] text-[#6B7280]">No campaign performance yet.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-[13px]">
                  <thead className="border-y border-[#F3F4F6] bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Campaign</th>
                      <th className="px-3 py-2.5 font-semibold">Views</th>
                      <th className="px-3 py-2.5 font-semibold">Posts</th>
                      <th className="px-3 py-2.5 font-semibold">Approved</th>
                      <th className="px-3 py-2.5 font-semibold">Spend</th>
                      <th className="px-4 py-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.campaignPerformance ?? []).map((row) => (
                      <tr key={row.id} className="border-b border-[#F3F4F6] last:border-0">
                        <td className="max-w-[220px] truncate px-4 py-2.5">
                          <Link
                            href={withBrandQuery(`/ugc/campaign-center/${row.id}/edit`, brandId)}
                            className="font-medium text-[#111827] hover:text-[#FF5A1F]"
                          >
                            {row.title}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-[#374151]">{row.views.toLocaleString()}</td>
                        <td className="px-3 py-2.5 tabular-nums text-[#374151]">{row.submissions}</td>
                        <td className="px-3 py-2.5 tabular-nums text-[#374151]">{row.approvals}</td>
                        <td className="px-3 py-2.5 tabular-nums text-[#374151]">
                          {row.spend == null ? "—" : formatMoney(row.spend, "USD")}
                        </td>
                        <td className="px-4 py-2.5">{statusPill(row.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Assets & settings */}
        <section aria-labelledby="bw-assets" className="rounded-2xl border border-[#E8EAED] bg-white p-5">
          <SectionHeader id="bw-assets" eyebrow="Brand assets & settings" title="Library and team" as="h2" className="mb-4" />
          <div className="grid gap-3 sm:grid-cols-3">
            <ShortcutCard href={assetsHref} icon={ImageIcon} title="Brand assets" body="Creative kits and media for campaigns." />
            <ShortcutCard href={teamHref} icon={Settings2} title="Team & roles" body="Members who can manage this brand." />
            <ShortcutCard href={campaignsHref} icon={FolderKanban} title="Campaign board" body="Drafts, live, and completed work." />
          </div>
        </section>
      </div>
    </UGCPageShell>
  );
}

function SectionHeader({
  id,
  eyebrow,
  title,
  href,
  linkLabel,
  as: Tag = "h2",
  className,
}: {
  id: string;
  eyebrow: string;
  title: string;
  href?: string;
  linkLabel?: string;
  as?: "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-3", className)}>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#FF5A1F]">{eyebrow}</p>
        <Tag id={id} className="mt-0.5 text-[17px] font-bold text-[#111827]">
          {title}
        </Tag>
      </div>
      {href && linkLabel ? (
        <Link href={href} className="text-[13px] font-semibold text-[#FF5A1F] hover:underline">
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  href,
  accent = false,
  hot = false,
}: {
  label: string;
  value: string;
  href: string;
  accent?: boolean;
  hot?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-2xl border bg-white p-4 transition hover:border-[#FFB89A] hover:shadow-[0_4px_16px_rgba(255,90,31,0.08)]",
        hot ? "border-[#FFB89A]" : "border-[#E8EAED]",
        accent ? "bg-[#FFF8F4]" : "",
      )}
    >
      <p className="text-[11.5px] font-medium text-[#6B7280]">{label}</p>
      <p className="mt-1.5 text-[24px] font-bold tabular-nums leading-none text-[#111827]">{value}</p>
    </Link>
  );
}

function EmptyPanel({
  title,
  body,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  body: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="mt-3 rounded-2xl border border-dashed border-[#E5E7EB] bg-white px-4 py-10 text-center">
      <p className="text-[15px] font-semibold text-[#111827]">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-[13px] text-[#6B7280]">{body}</p>
      <Link
        href={ctaHref}
        className="mt-4 inline-flex h-9 items-center rounded-full bg-[#FF5A1F] px-4 text-[13px] font-semibold text-white hover:bg-[#E54E18]"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}

function ShortcutCard({
  href,
  icon: Icon,
  title,
  body,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-[#E8EAED] bg-[#F8FAFC] p-4 transition hover:border-[#FFB89A] hover:bg-white"
    >
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-[#FF5A1F] shadow-[0_1px_2px_rgba(17,24,39,0.06)]">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <p className="mt-3 text-[14px] font-semibold text-[#111827] group-hover:text-[#FF5A1F]">{title}</p>
      <p className="mt-0.5 text-[12.5px] text-[#6B7280]">{body}</p>
    </Link>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[#F9FAFB] px-1 py-1.5">
      <dd className="text-[14px] font-bold tabular-nums text-[#111827]">{value.toLocaleString()}</dd>
      <dt className="text-[10px] font-medium text-[#9CA3AF]">{label}</dt>
    </div>
  );
}
