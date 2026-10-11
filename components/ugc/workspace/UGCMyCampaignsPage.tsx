"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/context/CurrencyContext";
import type { UGCCampaign } from "@/types/ugc";
import {
  buildCampaignSchedule,
  getCampaignLifecycleStatus,
  lifecycleLabel,
  type CampaignScheduleEvent,
} from "@/lib/ugc/campaign-schedule";
import {
  formatCalendarDayHeading,
  localDateKey,
  parseCalendarDate,
  weekdayLabels,
  weekStartForLocale,
  monthOffset,
  startOfLocalMonth,
} from "@/lib/ugc/calendar";
import { getCampaignRewardLine, getDaysRemaining } from "./ugc-campaign-utils";
import { UGCDateDetailPanel } from "./UGCDateDetailPanel";
import {
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
} from "./UGCPageShell";
import { loginUrlForReturnPath } from "@/lib/ugc/join-auth";
import { UGCVerifiedBadge } from "./UGCVerifiedBadge";
import { cn } from "@/lib/utils";

type ParticipantRow = {
  id: string;
  status: string;
  joined_at: string;
  campaign?: (UGCCampaign & {
    vendor?: { business_name?: string; business_logo?: string | null };
  }) | null;
};

type SubmissionLite = {
  id: string;
  campaign_id: string;
  status: string;
};

type TabId =
  | "attention"
  | "pending"
  | "active"
  | "upcoming"
  | "completed"
  | "revisions"
  | "rejected"
  | "schedule";

type PayoutLite = { campaign_id: string; amount: number; status: string };

function submittedCount(subs: SubmissionLite[]): number {
  return subs.filter((s) => s.status !== "rejected").length;
}

function needsAttention(row: ParticipantRow, subs: SubmissionLite[]): boolean {
  if (row.status === "pending" || row.status === "waitlisted") return true;
  if (subs.some((s) => s.status === "revision_requested")) return true;
  if (row.status === "accepted") {
    const days = getDaysRemaining(row.campaign?.submission_deadline ?? row.campaign?.ends_at ?? null);
    if (days !== null && days <= 3 && days >= 0) return true;
    if (subs.length === 0) return true;
  }
  return false;
}

function isUpcoming(row: ParticipantRow): boolean {
  const campaign = row.campaign;
  if (!campaign) return false;
  return getCampaignLifecycleStatus(campaign) === "upcoming";
}

function isCompleted(row: ParticipantRow, subs: SubmissionLite[]): boolean {
  const status = row.campaign?.status;
  if (status === "completed" || status === "cancelled") return true;
  if (getCampaignLifecycleStatus(row.campaign ?? { status: "active", starts_at: null, ends_at: null }) === "ended") {
    return true;
  }
  return row.status === "accepted" && subs.some((s) => s.status === "approved") && subs.length > 0 &&
    !subs.some((s) => s.status === "pending" || s.status === "revision_requested");
}

export function UGCMyCampaignsPage() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("view") === "schedule" ? "schedule" : "active") as TabId;
  const { formatMoney } = useCurrency();
  const [rows, setRows] = useState<ParticipantRow[]>([]);
  const [subs, setSubs] = useState<SubmissionLite[]>([]);
  const [payouts, setPayouts] = useState<PayoutLite[]>([]);
  const [submissionCounts, setSubmissionCounts] = useState<{ pending: number; approved: number } | null>(null);
  const [totalJoined, setTotalJoined] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [tab, setTab] = useState<TabId>(initialTab);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "deadline">("newest");
  const [eventsByCampaign, setEventsByCampaign] = useState<Record<string, CampaignScheduleEvent[]>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => startOfLocalMonth(new Date()));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, sRes, payRes] = await Promise.all([
        fetch("/api/ugc/participants?limit=50", { cache: "no-store" }),
        fetch("/api/ugc/submissions?limit=50", { cache: "no-store" }),
        fetch("/api/ugc/payouts/history", { cache: "no-store" }),
      ]);
      if (pRes.status === 401) {
        setError("sign_in");
        setRows([]);
        return;
      }
      if (!pRes.ok) throw new Error("Could not load campaigns.");
      const json = await pRes.json();
      if (json.needsProfile === true) {
        setNeedsProfile(true);
        setRows([]);
        return;
      }
      setNeedsProfile(false);
      setRows(json.data ?? []);
      setTotalJoined(Number(json.total ?? (json.data ?? []).length));
      if (sRes.ok) {
        const sJson = await sRes.json();
        setSubs(
          ((sJson.data ?? []) as Array<{ id: string; campaign_id?: string; status: string }>).map((s) => ({
            id: s.id,
            campaign_id: s.campaign_id ?? "",
            status: s.status,
          })),
        );
        const counts = sJson.counts as { pending?: number; approved?: number } | undefined;
        setSubmissionCounts(
          counts
            ? { pending: Number(counts.pending ?? 0), approved: Number(counts.approved ?? 0) }
            : null,
        );
      } else {
        setSubmissionCounts(null);
      }
      if (payRes.ok) {
        const payJson = await payRes.json();
        setPayouts(
          ((payJson.data ?? []) as Array<{ campaign_id?: string; amount?: number; status?: string }>).map((p) => ({
            campaign_id: p.campaign_id ?? "",
            amount: Number(p.amount ?? 0),
            status: p.status ?? "",
          })),
        );
      } else {
        setPayouts([]);
      }
    } catch {
      setError("Could not load your campaigns.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync schedule deep-link from URL
    if (searchParams.get("view") === "schedule") setTab("schedule");
  }, [searchParams]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load campaigns on mount
    void load();
  }, [load]);

  useEffect(() => {
    const accepted = rows.filter((r) => r.campaign?.id && r.status !== "rejected" && r.status !== "withdrawn");
    if (accepted.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        accepted.map(async (row) => {
          const id = row.campaign!.id;
          try {
            const res = await fetch(`/api/ugc/campaigns/${id}/schedule`, { cache: "no-store" });
            if (!res.ok) {
              return [id, buildCampaignSchedule(row.campaign as UGCCampaign)] as const;
            }
            const json = await res.json();
            return [id, (json.events ?? []) as CampaignScheduleEvent[]] as const;
          } catch {
            return [id, buildCampaignSchedule(row.campaign as UGCCampaign)] as const;
          }
        }),
      );
      if (cancelled) return;
      setEventsByCampaign(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [rows]);

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

  const grouped = useMemo(() => {
    const attention: ParticipantRow[] = [];
    const pending: ParticipantRow[] = [];
    const active: ParticipantRow[] = [];
    const upcoming: ParticipantRow[] = [];
    const completed: ParticipantRow[] = [];
    const revisions: ParticipantRow[] = [];
    const rejected: ParticipantRow[] = [];
    for (const row of rows) {
      const campaignSubs = byCampaign.get(row.campaign?.id ?? "") ?? [];
      if (row.status === "rejected") {
        rejected.push(row);
        continue;
      }
      if (campaignSubs.some((s) => s.status === "revision_requested")) revisions.push(row);
      if (isCompleted(row, campaignSubs)) {
        completed.push(row);
        continue;
      }
      if (row.status === "pending" || row.status === "waitlisted") {
        pending.push(row);
        if (needsAttention(row, campaignSubs)) attention.push(row);
        continue;
      }
      if (isUpcoming(row)) {
        upcoming.push(row);
        if (needsAttention(row, campaignSubs)) attention.push(row);
        continue;
      }
      if (needsAttention(row, campaignSubs)) attention.push(row);
      if (row.status === "accepted") active.push(row);
    }
    return { attention, pending, active, upcoming, completed, revisions, rejected };
  }, [rows, byCampaign]);

  const visibleBase =
    tab === "attention"
      ? grouped.attention
      : tab === "pending"
        ? grouped.pending
        : tab === "upcoming"
          ? grouped.upcoming
          : tab === "completed"
            ? grouped.completed
            : tab === "revisions"
              ? grouped.revisions
              : tab === "rejected"
                ? grouped.rejected
                : grouped.active;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? visibleBase.filter((row) => {
          const title = row.campaign?.title?.toLowerCase() ?? "";
          const brand = row.campaign?.vendor?.business_name?.toLowerCase() ?? "";
          return title.includes(q) || brand.includes(q);
        })
      : visibleBase;
    return [...filtered].sort((a, b) => {
      if (sort === "deadline") {
        const da = new Date(a.campaign?.submission_deadline ?? a.campaign?.ends_at ?? 0).getTime();
        const db = new Date(b.campaign?.submission_deadline ?? b.campaign?.ends_at ?? 0).getTime();
        return da - db;
      }
      return new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime();
    });
  }, [visibleBase, search, sort]);

  const scheduleCampaigns = rows
    .map((r) => r.campaign)
    .filter((c): c is NonNullable<typeof c> => Boolean(c?.id));

  const eventsOnSelected = useMemo(() => {
    if (!selectedDate) return [];
    return scheduleCampaigns.filter((c) =>
      (eventsByCampaign[c.id] ?? []).some((event) => {
        const parsed = parseCalendarDate(event.date);
        return parsed ? localDateKey(parsed) === selectedDate : false;
      }),
    );
  }, [selectedDate, scheduleCampaigns, eventsByCampaign]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const weekStart = weekStartForLocale("en");
  const offset = monthOffset(year, month, weekStart);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const labels = weekdayLabels("en", weekStart);
  const todayKey = localDateKey(new Date());

  const eventDates = useMemo(() => {
    const set = new Set<string>();
    for (const events of Object.values(eventsByCampaign)) {
      for (const event of events) {
        const parsed = parseCalendarDate(event.date);
        if (parsed) set.add(localDateKey(parsed));
      }
    }
    return set;
  }, [eventsByCampaign]);

  const paidEarnings = payouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const pendingEarnings = payouts.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);
  const approvedEarnings = payouts.filter((p) => p.status === "approved").reduce((s, p) => s + p.amount, 0);
  const awaitingReview = submissionCounts?.pending ?? subs.filter((s) => s.status === "pending").length;
  const approvedSubs = submissionCounts?.approved ?? subs.filter((s) => s.status === "approved").length;

  return (
    <UGCPageShell
      title="My Campaigns"
      subtitle="Your creator workspace for joined campaigns, applications, submissions, and confirmed earnings."
      actions={
        <Button asChild size="sm" className="rounded-xl bg-[#FF5A1F]">
          <Link href="/ugc">Discover Campaigns</Link>
        </Button>
      }
    >
      {!loading && !error && !needsProfile ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {[
            ["Joined", String(totalJoined)],
            ["Active", String(grouped.active.length)],
            ["Applications", String(grouped.pending.length)],
            ["In review", String(awaitingReview)],
            ["Approved", String(approvedSubs)],
            ["Completed", String(grouped.completed.length)],
            ["Paid", formatMoney(paidEarnings, "USD")],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-[#E5E7EB] bg-white px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">{label}</p>
              <p className="mt-1 text-[16px] font-bold text-[#111827]">{value}</p>
            </div>
          ))}
        </div>
      ) : null}
      {!loading && !error && !needsProfile && (pendingEarnings > 0 || approvedEarnings > 0 || totalJoined > rows.length) ? (
        <p className="text-[12px] text-[#6B7280]">
          Confirmed paid earnings are {formatMoney(paidEarnings, "USD")}.
          {approvedEarnings > 0 ? ` Approved and not yet paid: ${formatMoney(approvedEarnings, "USD")}.` : ""}
          {pendingEarnings > 0 ? ` Pending payout: ${formatMoney(pendingEarnings, "USD")}.` : ""}
          {totalJoined > rows.length ? " Showing the latest 50 campaigns." : ""}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search campaigns or brands"
          aria-label="Search campaigns"
          className="h-10 min-w-0 flex-1 rounded-xl border border-[#E5E7EB] bg-white px-3 text-[13px] outline-none focus:border-[#FF5A1F]"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "newest" | "deadline")}
          aria-label="Sort campaigns"
          className="h-10 rounded-xl border border-[#E5E7EB] bg-white px-3 text-[13px]"
        >
          <option value="newest">Newest</option>
          <option value="deadline">Deadline</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["attention", "Needs attention", grouped.attention.length],
            ["pending", "Applications pending", grouped.pending.length],
            ["active", "Active", grouped.active.length],
            ["upcoming", "Upcoming", grouped.upcoming.length],
            ["revisions", "Revisions requested", grouped.revisions.length],
            ["completed", "Completed", grouped.completed.length],
            ["rejected", "Rejected", grouped.rejected.length],
            ["schedule", "Schedule", null],
          ] as const
        ).map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5A1F]",
              tab === id ? "bg-[#111827] text-white" : "bg-white text-[#64748B] ring-1 ring-[#E5E7EB]",
            )}
          >
            {label}
            {count !== null ? <span className="tabular-nums opacity-80">{count}</span> : null}
          </button>
        ))}
      </div>

      {loading ? <UGCPageLoading /> : null}
      {!loading && error === "sign_in" ? (
        <UGCPageEmpty
          title="Sign in required"
          description="Log in to see campaigns you have joined."
          illustration="lock"
          action={
            <Button asChild className="rounded-xl bg-[#FF5A1F]">
              <Link href={loginUrlForReturnPath("/ugc/campaigns")}>Sign in</Link>
            </Button>
          }
        />
      ) : null}
      {!loading && error && error !== "sign_in" ? <UGCPageError message={error} onRetry={load} /> : null}
      {!loading && !error && needsProfile ? (
        <UGCPageEmpty
          title="Create your creator profile"
          description="Complete your profile to join campaigns and track your work."
          illustration="profile"
          action={
            <Button asChild className="rounded-xl bg-[#FF5A1F]">
              <Link href="/identity/edit">Create creator profile</Link>
            </Button>
          }
        />
      ) : null}

      {!loading && !error && !needsProfile && tab !== "schedule" && rows.length === 0 ? (
        <UGCPageEmpty
          title="No campaigns yet"
          description="Discover campaigns that match your content and start earning."
          illustration="campaigns"
          action={
            <Button asChild className="rounded-xl bg-[#FF5A1F]">
              <Link href="/ugc">Discover Campaigns</Link>
            </Button>
          }
        />
      ) : null}

      {!loading && !error && !needsProfile && tab !== "schedule" && rows.length > 0 && visible.length === 0 ? (
        <UGCPageEmpty
          title={
            tab === "attention"
              ? "Nothing needs attention"
              : tab === "pending"
                ? "No applications waiting"
                : tab === "revisions"
                  ? "No revisions requested"
                  : tab === "rejected"
                    ? "No rejected applications"
                    : tab === "upcoming"
                      ? "No upcoming campaigns"
                      : tab === "completed"
                        ? "No completed campaigns yet"
                        : "No active campaigns"
          }
          description={
            tab === "attention"
              ? "You're caught up. Open Active to continue work already in progress."
              : "Browse Discover Campaigns to find your next opportunity."
          }
          illustration="campaigns"
          action={
            <Button asChild className="rounded-xl bg-[#FF5A1F]">
              <Link href="/ugc">Discover Campaigns</Link>
            </Button>
          }
        />
      ) : null}

      {!loading && !error && !needsProfile && tab !== "schedule" && visible.length > 0 ? (
        <div className="grid gap-3">
          {visible.map((row) => {
            const campaign = row.campaign;
            if (!campaign) return null;
            const campaignSubs = byCampaign.get(campaign.id) ?? [];
            const days = getDaysRemaining(campaign.submission_deadline ?? campaign.ends_at ?? null);
            const lifecycle = getCampaignLifecycleStatus(campaign);
            const cover = campaign.media?.find((m) => m.usage === "banner")?.url ?? campaign.media?.[0]?.url;
            const canSubmit = row.status === "accepted" && campaign.status === "active";
            const hasRevision = campaignSubs.some((s) => s.status === "revision_requested");
            const hasPendingSub = campaignSubs.some((s) => s.status === "pending");
            const campaignPay = payouts.filter((p) => p.campaign_id === campaign.id);
            const paid = campaignPay.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
            const cta =
              canSubmit && hasRevision
                ? { href: `/ugc/${campaign.id}/submit`, label: "Resubmit content" }
                : canSubmit && hasPendingSub
                  ? { href: "/ugc/submissions", label: "View submission" }
                  : canSubmit && campaignSubs.length === 0
                    ? { href: `/ugc/${campaign.id}/submit`, label: "Submit content" }
                    : canSubmit
                      ? { href: "/ugc/submissions", label: "View submission" }
                      : row.status === "pending" || row.status === "waitlisted"
                        ? { href: `/ugc/${campaign.id}/application`, label: "Continue application" }
                        : { href: `/ugc/${campaign.id}/application`, label: "View application" };
            return (
              <article
                key={row.id}
                className="flex flex-col gap-3 rounded-2xl border border-[#E8EAED] bg-white p-4 sm:flex-row"
              >
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt="" className="h-20 w-full rounded-xl object-cover sm:h-24 sm:w-32" />
                ) : (
                  <div className="h-20 w-full rounded-xl bg-[#F8FAFC] sm:h-24 sm:w-32" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {campaign.vendor?.business_logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={campaign.vendor.business_logo} alt="" className="h-6 w-6 rounded-full object-cover" />
                    ) : null}
                    <p className="truncate text-[12px] font-semibold text-[#64748B]">
                      {campaign.vendor?.business_name ?? "Brand"}
                    </p>
                    {campaign.vendor?.verification_status === "verified" ? (
                      <UGCVerifiedBadge className="h-4 w-4" />
                    ) : null}
                  </div>
                  <h2 className="mt-1 text-[16px] font-bold text-[#111827]">{campaign.title}</h2>
                  <div className="mt-2 flex flex-wrap gap-2 text-[12px] text-[#64748B]">
                    <span className="rounded-full bg-[#F8FAFC] px-2 py-0.5 font-medium capitalize">
                      {campaign.campaign_type?.replaceAll("_", " ") ?? "Campaign"}
                    </span>
                    <span className="rounded-full bg-[#F8FAFC] px-2 py-0.5 font-medium">
                      {lifecycleLabel(lifecycle)}
                    </span>
                    <span className="rounded-full bg-[#FFF8F5] px-2 py-0.5 font-medium capitalize text-[#9A3412]">
                      {row.status.replaceAll("_", " ")}
                    </span>
                    <span>{submittedCount(campaignSubs)} submitted</span>
                    {days !== null ? <span>{days === 0 ? "Due today" : `Deadline ${days}d`}</span> : null}
                    <span>{getCampaignRewardLine(campaign, formatMoney)}</span>
                    {paid > 0 ? <span>Paid {formatMoney(paid, "USD")}</span> : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
                  <Button asChild size="sm" className="rounded-xl bg-[#FF5A1F]">
                    <Link href={cta.href}>{cta.label}</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="rounded-xl">
                    <Link href={`/ugc/${campaign.id}`}>View campaign</Link>
                  </Button>
                  {paid > 0 ? (
                    <Button asChild size="sm" variant="outline" className="rounded-xl">
                      <Link href="/ugc/earnings">View earnings</Link>
                    </Button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {!loading && !error && !needsProfile && tab === "schedule" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <div className="rounded-[16px] border border-[#E8EAED] bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-[#111827]">
                {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </h2>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="rounded-lg border border-[#E5E7EB] px-2 py-1 text-[12px]"
                  onClick={() => setCursor(new Date(year, month - 1, 1))}
                >
                  Prev
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-[#E5E7EB] px-2 py-1 text-[12px]"
                  onClick={() => setCursor(startOfLocalMonth(new Date()))}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-[#E5E7EB] px-2 py-1 text-[12px]"
                  onClick={() => setCursor(new Date(year, month + 1, 1))}
                >
                  Next
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-[#94A3B8]">
              {labels.map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {Array.from({ length: offset }).map((_, i) => (
                <div key={`e-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const key = localDateKey(new Date(year, month, day));
                const has = eventDates.has(key);
                const isToday = key === todayKey;
                const selected = key === selectedDate;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDate(key)}
                    className={cn(
                      "flex min-h-11 flex-col items-center justify-center rounded-[10px] text-[13px]",
                      selected
                        ? "bg-[#FF5A1F] font-bold text-white"
                        : isToday
                          ? "bg-[#FFF0E8] font-semibold text-[#FF5A1F]"
                          : "text-[#111827] hover:bg-[#F8FAFC]",
                    )}
                  >
                    {day}
                    {has ? (
                      <span
                        className={cn(
                          "mt-0.5 h-1 w-1 rounded-full",
                          selected ? "bg-white" : "bg-[#FF5A1F]",
                        )}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
          {selectedDate ? (
            <UGCDateDetailPanel
              dateKey={selectedDate}
              dateLabel={formatCalendarDayHeading(new Date(`${selectedDate}T12:00:00`), "en")}
              campaigns={eventsOnSelected as UGCCampaign[]}
              eventsByCampaign={eventsByCampaign}
              onClose={() => setSelectedDate(null)}
            />
          ) : (
            <div className="rounded-[16px] border border-dashed border-[#E5E7EB] bg-white p-6 text-[13px] text-[#64748B]">
              Click a date to see every campaign deadline, live event, and brief in one place.
            </div>
          )}
        </div>
      ) : null}
    </UGCPageShell>
  );
}
