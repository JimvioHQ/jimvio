"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Loader2, Search } from "lucide-react";
import { HubBadge, HubCard, HubLinkButton } from "@/components/community/hub/hub-ui";

type HubEvent = {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  location: string | null;
  image_url: string | null;
  attendee_count: number;
  is_going: boolean;
  kind: string;
  format?: string;
  visibility?: string;
  status?: string;
  href: string;
  community_name?: string | null;
  registration_status?: string | null;
  timezone?: string;
};

function formatEventDateTime(value: string, timezone?: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      ...(timezone ? { timeZone: timezone } : {}),
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

const FILTERS = [
  ["upcoming", "Upcoming"],
  ["past", "Past"],
  ["registered", "Registered"],
  ["organized", "Organized"],
] as const;

export default function EventsPageWrapper() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-zinc-400" /></div>}>
      <EventsPage />
    </Suspense>
  );
}

function EventsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const legacyTab = searchParams.get("tab");
  const communitySlug = searchParams.get("community")?.trim() || "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("upcoming");
  const [kind, setKind] = useState("");
  const [events, setEvents] = useState<HubEvent[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (legacyTab === "missions") router.replace("/communities/missions");
    if (legacyTab === "courses") router.replace("/communities/courses");
    if (legacyTab === "spaces") router.replace("/communities/spaces");
  }, [legacyTab, router]);

  const load = useCallback(async (nextCursor = 0, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ discover: "1", filter, cursor: String(nextCursor) });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (kind) params.set("kind", kind);
      if (communitySlug) params.set("community", communitySlug);
      const res = await fetch(`/api/c/events?${params.toString()}`);
      if (res.status === 401) {
        setAuthRequired(true);
        setEvents([]);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not load events");
      setAuthRequired(false);
      setEvents((current) => append ? [...current, ...(data.events ?? [])] : (data.events ?? []));
      setCursor(data.nextCursor ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load events");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [communitySlug, filter, kind, searchQuery]);

  useEffect(() => {
    const handle = window.setTimeout(() => { void load(0, false); }, 200);
    return () => window.clearTimeout(handle);
  }, [load]);

  return (
    <div className="min-h-full bg-[var(--color-bg,#f4f4f5)]">
      <div className="w-full space-y-4 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-black tracking-tight">
              <Calendar className="h-5 w-5 text-[#fd5000]" />
              Events
            </h1>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Public workshops, webinars, and meetups. Private events stay off this list.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <HubLinkButton href="/communities/missions" variant="secondary">Missions</HubLinkButton>
            <HubLinkButton href="/owner/communities" variant="secondary">Manage events</HubLinkButton>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search events…" className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-4 text-[13px] focus:border-[#fd5000]/40 focus:outline-none" />
          </div>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px]" aria-label="Category">
            <option value="">All categories</option>
            {["workshop", "webinar", "ama", "meetup", "launch", "other"].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {FILTERS.map(([key, label]) => (
            <button key={key} type="button" onClick={() => setFilter(key)} className={`rounded-xl px-4 py-2 text-[12px] font-semibold ${filter === key ? "bg-[#fd5000] text-white" : "border border-[var(--color-border)] bg-[var(--color-surface)]"}`}>
              {label}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-zinc-200/70" />)}</div>
        ) : error ? (
          <HubCard className="py-10 text-center">
            <p className="text-[14px] font-bold">Events could not be loaded</p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">{error}</p>
            <button type="button" className="mt-4 rounded-xl bg-[#fd5000] px-4 py-2 text-[12px] font-semibold text-white" onClick={() => void load(0, false)}>Try again</button>
          </HubCard>
        ) : authRequired ? (
          <HubCard className="py-12 text-center">
            <p className="text-[14px] font-bold">Sign in to view events</p>
            <HubLinkButton href="/login?redirect=/communities/events" className="mt-4">Sign in</HubLinkButton>
          </HubCard>
        ) : events.length === 0 ? (
          <HubCard className="py-12 text-center">
            <Calendar className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
            <p className="text-[14px] font-bold">No events found</p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              {filter === "organized" ? "Events you organize appear here after you publish them from a community you manage." : "Published public events will show up here. Private events are available only with an invitation."}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <HubLinkButton href="/communities">Explore communities</HubLinkButton>
              <HubLinkButton href="/communities/create" variant="secondary">Start a community</HubLinkButton>
            </div>
          </HubCard>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {events.map((event) => (
              <Link key={event.id} href={event.href}>
                <HubCard className="h-full overflow-hidden p-0">
                  {event.image_url ? <img src={event.image_url} alt="" className="h-32 w-full object-cover" /> : <div className="h-20 bg-orange-50" />}
                  <div className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <HubBadge variant="orange">{event.kind}</HubBadge>
                      {event.is_going ? <HubBadge variant="new">Registered</HubBadge> : null}
                    </div>
                    <h2 className="text-[15px] font-bold">{event.title}</h2>
                    <p className="text-[12px] text-[var(--color-text-muted)]">
                      {formatEventDateTime(event.start_date, event.timezone)} · {event.format || "online"}
                      {event.community_name ? ` · ${event.community_name}` : ""}
                    </p>
                  </div>
                </HubCard>
              </Link>
            ))}
          </div>
        )}
        {cursor != null && !loading ? (
          <button type="button" disabled={loadingMore} onClick={() => void load(cursor, true)} className="w-full rounded-xl border border-[var(--color-border)] py-2 text-[12px] font-semibold">
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
