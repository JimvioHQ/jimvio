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

type TabId = "attention" | "active" | "upcoming" | "completed" | "schedule";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [tab, setTab] = useState<TabId>(initialTab);
  const [eventsByCampaign, setEventsByCampaign] = useState<Record<string, CampaignScheduleEvent[]>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => startOfLocalMonth(new Date()));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, sRes] = await Promise.all([
        fetch("/api/ugc/participants?limit=50", { cache: "no-store" }),
        fetch("/api/ugc/submissions?limit=50", { cache: "no-store" }),
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
      if (sRes.ok) {
        const sJson = await sRes.json();
        setSubs(
          ((sJson.data ?? []) as Array<{ id: string; campaign_id?: string; status: string }>).map((s) => ({
            id: s.id,
            campaign_id: s.campaign_id ?? "",
            status: s.status,
          })),
        );
      }
    } catch {
      setError("Could not load your campaigns.");
    } finally {
      setLoading(false);
    }
  }, []);

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
    const active: ParticipantRow[] = [];
    const upcoming: ParticipantRow[] = [];
    const completed: ParticipantRow[] = [];
    for (const row of rows) {
      const campaignSubs = byCampaign.get(row.campaign?.id ?? "") ?? [];
      if (isCompleted(row, campaignSubs)) {
        completed.push(row);
        continue;
      }
      if (isUpcoming(row)) {
        upcoming.push(row);
        if (needsAttention(row, campaignSubs)) attention.push(row);
        continue;
      }
      if (needsAttention(row, campaignSubs)) attention.push(row);
      if (row.status === "accepted" || row.status === "pending" || row.status === "waitlisted") {
        active.push(row);
      }
    }
    return { attention, active, upcoming, completed };
  }, [rows, byCampaign]);

  const visible =
    tab === "attention"
      ? grouped.attention
      : tab === "upcoming"
        ? grouped.upcoming
        : tab === "completed"
          ? grouped.completed
          : grouped.active;

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

  return (
    <UGCPageShell
      title="My Campaigns"
      subtitle="Campaigns you joined, applications in review, and what needs action."
      actions={
        <Button asChild size="sm" className="rounded-xl bg-[#FF5A1F]">
          <Link href="/ugc">Discover Campaigns</Link>
        </Button>
      }
    >
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["attention", "Needs attention", grouped.attention.length],
            ["active", "Active", grouped.active.length],
            ["upcoming", "Upcoming", grouped.upcoming.length],
            ["completed", "Completed", grouped.completed.length],
            ["schedule", "Schedule", null],
          ] as const
        ).map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold",
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
              <Link href="/login?redirect=/ugc/campaigns">Sign in</Link>
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
            const progress = `${submittedCount(campaignSubs)} submitted`;
            const cta =
              row.status === "pending" || row.status === "waitlisted"
                ? { href: `/ugc/${campaign.id}/application`, label: "View status" }
                : campaignSubs.some((s) => s.status === "revision_requested")
                  ? { href: `/ugc/${campaign.id}/submit`, label: "Revise" }
                  : { href: `/ugc/${campaign.id}/dashboard`, label: "Continue" };
            return (
              <article
                key={row.id}
                className="flex flex-col gap-3 rounded-[14px] border border-[#E8EAED] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-[#64748B]">
                    {campaign.vendor?.business_name ?? "Brand"}
                  </p>
                  <h2 className="mt-0.5 text-[16px] font-bold text-[#111827]">{campaign.title}</h2>
                  <div className="mt-2 flex flex-wrap gap-2 text-[12px] text-[#64748B]">
                    <span className="rounded-full bg-[#F8FAFC] px-2 py-0.5 font-medium">
                      {lifecycleLabel(lifecycle)}
                    </span>
                    <span>{progress}</span>
                    {days !== null ? <span>{days === 0 ? "Due today" : `Deadline ${days}d`}</span> : null}
                    <span>{getCampaignRewardLine(campaign, formatMoney)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" className="rounded-xl bg-[#FF5A1F]">
                    <Link href={cta.href}>{cta.label}</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="rounded-xl">
                    <Link href={`/ugc/${campaign.id}`}>Brief</Link>
                  </Button>
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
