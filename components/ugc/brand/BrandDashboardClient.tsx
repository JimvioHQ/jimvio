"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarClock,
  Clock,
  FileStack,
  Plus,
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
    upcomingCampaigns: number;
    pendingApplications: number;
    pendingSubmissions: number;
    pendingFunding: number;
    totalSpend: number | null;
    totalViews: number;
    paidViews?: number;
    remainingBudget?: number | null;
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
  const reviewHref = "/ugc/review";

  return (
    <UGCPageShell
      title="Brand Workspace"
      subtitle="Your campaigns, creators, posts and money in one place."
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
        {/* Money and reach at a glance */}
        <section className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
          <div className="relative overflow-hidden rounded-2xl bg-[#111827] p-5 text-white">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#FF5A1F]/25 blur-2xl" aria-hidden />
            <p className="text-[12px] font-semibold uppercase tracking-wide text-white/60">Held in escrow, left to pay creators</p>
            <p className="mt-1 text-[32px] font-extrabold tabular-nums leading-tight">
              {s.remainingBudget == null ? "—" : formatMoney(s.remainingBudget, "USD")}
            </p>
            <p className="text-[12.5px] text-white/70">
              Across {s.activeCampaigns} live campaign{s.activeCampaigns === 1 ? "" : "s"}
              {s.totalSpend != null ? ` · ${formatMoney(s.totalSpend, "USD")} paid or reserved so far` : ""}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <HeroStat label="Real views" value={s.totalViews.toLocaleString()} hint="verified by Jimvio" />
              <HeroStat label="Views paid" value={(s.paidViews ?? 0).toLocaleString()} hint="approved by you" />
              <HeroStat label="Creators" value={s.totalCreators.toLocaleString()} hint="joined" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ActionTile
              icon={FileStack}
              label="Posts to review"
              value={s.pendingSubmissions}
              href={reviewHref}
              cta="Review now"
              hot={s.pendingSubmissions > 0}
            />
            <ActionTile
              icon={UserPlus}
              label="Join requests"
              value={s.pendingApplications}
              href={reviewHref}
              cta="Decide"
              hot={s.pendingApplications > 0}
            />
            <ActionTile icon={Wallet} label="Drafts to fund" value={s.pendingFunding} href={fundHref ?? createHref} cta={fundHref ? "Fund" : "Create"} />
            <ActionTile icon={CalendarClock} label="Starting soon" value={s.upcomingCampaigns} href={withBrandQuery("/ugc/campaign-center/campaigns", brandId)} cta="See all" />
          </div>
        </section>

        {attention.length ? (
          <section className="rounded-2xl border border-[#FFE1D3] bg-[#FFF8F4] p-4 sm:p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-bold text-[#111827]">
              <AlertCircle className="h-4 w-4 text-[#FF5A1F]" aria-hidden /> Needs your attention
            </h2>
            <ul className="mt-3 grid gap-2 md:grid-cols-2">
              {attention.map((item) => {
                const Icon = ATTENTION_ICONS[item.kind] ?? AlertCircle;
                return (
                  <li key={item.id} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-[0_1px_2px_rgba(17,24,39,0.05)]">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#FFF1EA] text-[#FF5A1F]">
                      <Icon className="h-[18px] w-[18px]" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold text-[#111827]">{item.title}</p>
                      <p className="truncate text-[12px] text-[#6B7280]">{item.reason}</p>
                    </div>
                    <Link
                      href={withBrandQuery(item.href, brandId)}
                      className="inline-flex h-8 shrink-0 items-center rounded-full bg-[#111827] px-3 text-[12px] font-semibold text-white hover:bg-black"
                    >
                      {item.actionLabel}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <section>
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-[17px] font-bold text-[#111827]">Live campaigns</h2>
            <Link href={withBrandQuery("/ugc/campaign-center/campaigns", brandId)} className="text-[13px] font-semibold text-[#FF5A1F] hover:underline">
              All campaigns
            </Link>
          </div>
          {active.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-[#E5E7EB] bg-white px-4 py-10 text-center">
              <p className="text-[15px] font-semibold text-[#111827]">No live campaigns</p>
              <p className="mt-1 text-[13px] text-[#6B7280]">Create a campaign and fund it. It goes live as soon as the money is held.</p>
              <Link href={createHref} className="mt-4 inline-flex h-9 items-center rounded-full bg-[#FF5A1F] px-4 text-[13px] font-semibold text-white hover:bg-[#E54E18]">
                Create Campaign
              </Link>
            </div>
          ) : (
            <ul className="mt-3 grid gap-3 md:grid-cols-2">
              {active.map((c) => {
                const used = c.budget && c.budget > 0 && c.remaining != null ? Math.min(100, Math.round(((c.budget - c.remaining) / c.budget) * 100)) : null;
                return (
                  <li key={c.id} className="flex flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
                    <div className="flex gap-3 p-4">
                      <div
                        className="h-[76px] w-[76px] shrink-0 rounded-xl bg-[#F3F4F6] bg-cover bg-center"
                        style={c.bannerUrl ? { backgroundImage: `url(${c.bannerUrl})` } : undefined}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {statusPill(c.status)}
                          {c.rewardLabel ? <span className="text-[12px] font-semibold text-[#FF5A1F]">{c.rewardLabel}</span> : null}
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
                            <b className="text-[#111827]">{formatMoney(c.remaining ?? 0, "USD")}</b> left of {formatMoney(c.budget ?? 0, "USD")}
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
                      <MiniStat label="Real views" value={c.views} />
                    </dl>
                    <div className="mt-3 flex items-center gap-2 border-t border-[#F3F4F6] px-4 py-2.5">
                      <Link
                        href={`/ugc/review?campaign=${c.id}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#FF5A1F] px-3 text-[12px] font-bold text-white hover:bg-[#E54E18]"
                      >
                        Review posts
                        {c.pendingReview ? <span className="rounded-full bg-white/25 px-1.5 text-[11px]">{c.pendingReview}</span> : null}
                      </Link>
                      <Link href={withBrandQuery(c.href, brandId)} className="text-[12.5px] font-semibold text-[#374151] hover:text-[#FF5A1F]">
                        Manage
                      </Link>
                      <Link href={`/ugc/${c.id}`} className="ml-auto text-[12.5px] font-medium text-[#6B7280] hover:text-[#111827]">
                        Public page
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
          <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4 sm:p-5">
            <h2 className="text-[15px] font-bold text-[#111827]">Upcoming</h2>
            {(data.upcoming ?? []).length === 0 ? (
              <p className="mt-3 text-[13px] text-[#6B7280]">No upcoming campaign dates.</p>
            ) : (
              <ul className="mt-3 divide-y divide-[#F3F4F6]">
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

          <section className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
            <h2 className="px-4 pt-4 text-[15px] font-bold text-[#111827] sm:px-5">Campaign performance</h2>
            {(data.campaignPerformance ?? []).length === 0 ? (
              <p className="px-5 py-6 text-[13px] text-[#6B7280]">No campaign performance yet.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-[13px]">
                  <thead className="border-y border-[#F3F4F6] bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Campaign</th>
                      <th className="px-3 py-2.5 font-semibold">Real views</th>
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
                          <Link href={withBrandQuery(`/ugc/campaign-center/${row.id}/edit`, brandId)} className="font-medium text-[#111827] hover:text-[#FF5A1F]">
                            {row.title}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-[#374151]">{row.views.toLocaleString()}</td>
                        <td className="px-3 py-2.5 tabular-nums text-[#374151]">{row.submissions}</td>
                        <td className="px-3 py-2.5 tabular-nums text-[#374151]">{row.approvals}</td>
                        <td className="px-3 py-2.5 tabular-nums text-[#374151]">{row.spend == null ? "—" : formatMoney(row.spend, "USD")}</td>
                        <td className="px-4 py-2.5">{statusPill(row.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </UGCPageShell>
  );
}

function HeroStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl bg-white/10 px-3 py-2">
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-white/60">{label}</p>
      <p className="text-[18px] font-bold tabular-nums">{value}</p>
      <p className="text-[10.5px] text-white/50">{hint}</p>
    </div>
  );
}

function ActionTile({
  icon: Icon,
  label,
  value,
  href,
  cta,
  hot = false,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  href: string;
  cta: string;
  hot?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col justify-between rounded-2xl border bg-white p-3.5 transition hover:border-[#FFB89A] hover:shadow-sm",
        hot ? "border-[#FFB89A]" : "border-[#E5E7EB]",
      )}
    >
      <span className="flex items-center gap-2 text-[11.5px] font-semibold text-[#6B7280]">
        <span className={cn("grid h-7 w-7 place-items-center rounded-lg", hot ? "bg-[#FF5A1F] text-white" : "bg-[#F8FAFC] text-[#111827]")}>
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        {label}
      </span>
      <span className="mt-2 flex items-end justify-between">
        <span className="text-[26px] font-bold tabular-nums leading-none text-[#111827]">{value}</span>
        <span className="text-[12px] font-semibold text-[#FF5A1F] group-hover:underline">{cta} →</span>
      </span>
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
