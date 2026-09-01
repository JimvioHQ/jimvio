"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Calendar, MapPin, Users, Loader2, Search, ChevronRight,
} from "lucide-react";
import { HubBadge, HubCard, HubLinkButton } from "@/components/community/hub/hub-ui";

type HubEvent = {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  image_url: string | null;
  attendee_count: number;
  is_going: boolean;
  is_interested?: boolean;
  kind: string;
  href: string | null;
  source?: string;
  community_name?: string | null;
};

const TAB_REDIRECTS: Record<string, string> = {
  spaces: "/communities/spaces",
  missions: "/communities/missions",
  courses: "/communities/courses",
};

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
  const [authRequired, setAuthRequired] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming");
  const [events, setEvents] = useState<HubEvent[]>([]);

  useEffect(() => {
    if (legacyTab && TAB_REDIRECTS[legacyTab]) {
      router.replace(TAB_REDIRECTS[legacyTab]);
    }
  }, [legacyTab, router]);

  useEffect(() => {
    if (legacyTab && TAB_REDIRECTS[legacyTab]) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const qs = communitySlug
          ? `?community=${encodeURIComponent(communitySlug)}`
          : "";
        const res = await fetch(`/api/c/events${qs}`);
        if (res.status === 401) {
          if (!cancelled) {
            setAuthRequired(true);
            setEvents([]);
          }
          return;
        }
        if (!res.ok) return;
        const data = (await res.json()) as { events: HubEvent[] };
        if (!cancelled) setEvents(data.events ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [legacyTab, communitySlug]);

  const filteredEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter((event) => {
        const eventDate = new Date(event.start_date);
        const matchesFilter = filter === "upcoming" ? eventDate >= now : eventDate < now;
        const matchesSearch =
          event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.description?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
      })
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  }, [events, filter, searchQuery]);

  if (legacyTab && TAB_REDIRECTS[legacyTab]) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

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
              {communitySlug
                ? "Events for this community"
                : "Workshops, webinars, AMAs, meetups, launches — plus missions on your calendar"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <HubLinkButton href="/communities/create" variant="secondary">Create community</HubLinkButton>
            <HubLinkButton href="/communities/missions" variant="secondary">Missions</HubLinkButton>
            <HubLinkButton href="/communities/courses" variant="secondary">Courses</HubLinkButton>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events…"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-4 text-[13px] focus:border-[#fd5000]/40 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            {(["upcoming", "past"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-xl px-4 py-2 text-[12px] font-semibold capitalize transition-colors ${
                  filter === key
                    ? "bg-[#fd5000] text-white"
                    : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[#fd5000]/30"
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : authRequired ? (
          <HubCard className="py-12 text-center">
            <Calendar className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
            <p className="text-[14px] font-bold">Sign in to view events</p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Your community calendar, RSVPs, and campaign deadlines appear here after you sign in.
            </p>
            <HubLinkButton href="/login?redirect=/communities/events" className="mt-4">
              Sign in
            </HubLinkButton>
          </HubCard>
        ) : filteredEvents.length === 0 ? (
          <HubCard className="py-12 text-center">
            <Calendar className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
            <p className="text-[14px] font-bold">No events found</p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              {filter === "upcoming"
                ? "No upcoming missions or campaigns yet. Check back soon!"
                : "No past events to show."}
            </p>
          </HubCard>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EventCard({ event }: { event: HubEvent }) {
  const eventDate = new Date(event.start_date);
  const isUpcoming = eventDate >= new Date();
  const [busy, setBusy] = useState(false);
  const [going, setGoing] = useState(event.is_going);

  const rsvp = async () => {
    if (event.source !== "event") return;
    setBusy(true);
    try {
      const res = await fetch("/api/c/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rsvp",
          eventId: event.id,
          status: going ? "declined" : "going",
        }),
      });
      if (res.ok) setGoing(!going);
    } finally {
      setBusy(false);
    }
  };

  const content = (
    <HubCard className="group transition hover:border-[#fd5000]/30 hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex h-32 w-full shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#fd5000]/15 to-[#fd5000]/5 sm:w-36">
          <Calendar className="h-10 w-10 text-[#fd5000]/40" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <HubBadge variant="orange">{event.kind}</HubBadge>
            {going && <HubBadge variant="live">Going</HubBadge>}
            {event.community_name ? (
              <span className="text-[11px] font-medium text-[var(--color-text-muted)]">
                {event.community_name}
              </span>
            ) : null}
          </div>
          <h2 className="text-[15px] font-bold group-hover:text-[#fd5000]">{event.title}</h2>
          {event.description && (
            <p className="mt-1.5 line-clamp-2 text-[12px] text-[var(--color-text-secondary)]">{event.description}</p>
          )}
          <div className="mt-3 space-y-1.5 text-[11px] text-[var(--color-text-muted)]">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              {eventDate.toLocaleDateString()} at{" "}
              {eventDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                {event.location}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />
              {event.attendee_count}{" "}
              {event.source === "event"
                ? "RSVPs"
                : event.kind === "task"
                  ? "completions"
                  : "submissions"}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {event.source === "event" && isUpcoming ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  void rsvp();
                }}
                disabled={busy}
                className="inline-flex h-8 items-center rounded-lg bg-[#fd5000] px-3 text-[11px] font-bold text-white disabled:opacity-60"
              >
                {going ? "Cancel RSVP" : "RSVP"}
              </button>
            ) : null}
            {isUpcoming && event.href ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#fd5000]">
                View details <ChevronRight className="h-3.5 w-3.5" />
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </HubCard>
  );

  if (event.href) {
    return <Link href={event.href} className="block">{content}</Link>;
  }

  return content;
}
