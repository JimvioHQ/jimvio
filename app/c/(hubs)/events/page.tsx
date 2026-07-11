"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Search, Clock, MapPin, Users, ChevronRight, Calendar, Filter, Award } from "lucide-react";
import { HubCard, HubBadge, HubLinkButton, HubStatCard, HubSectionTitle } from "@/components/community/hub/hub-ui";
import { cn } from "@/lib/utils";

type Event = {
  id: string;
  community_id: string;
  community_name: string;
  community_slug: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  attendee_count: number;
  max_attendees: number | null;
  kind: "task" | "campaign" | "event";
  image_url: string | null;
  status: "upcoming" | "past" | "live";
  href: string;
};

export default function HubEventsPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/c/events");
        if (!res.ok) return;
        const json = (await res.json()) as { events: Event[] };
        if (!cancelled) setEvents(json.events ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = events
    .filter((e) => {
      const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.community_name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "all" ||
        (filter === "upcoming" && e.status === "upcoming") ||
        (filter === "past" && e.status === "past");
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (a.status === "live" && b.status !== "live") return -1;
      if (b.status === "live" && a.status !== "live") return 1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

  const stats = {
    total: events.length,
    upcoming: events.filter(e => e.status === "upcoming").length,
    live: events.filter(e => e.status === "live").length,
    past: events.filter(e => e.status === "past").length,
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[var(--color-bg)]"
         style={{
           backgroundImage: `radial-gradient(circle at 50% -20%, var(--color-accent)/5, transparent 50%), radial-gradient(circle at 100% 100%, var(--color-berry)/3, transparent 40%)`,
         }}>
      <div className="mx-auto max-w-[960px] space-y-6 p-4 lg:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-[var(--color-text-primary)]">
              <Calendar className="h-5 w-5 text-[var(--color-accent)]" />
              Events
            </h1>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Community events, campaigns & meetups
            </p>
          </div>
          <HubLinkButton href="/communities" variant="secondary">
            Browse communities
          </HubLinkButton>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 animate-in stagger-children">
          <HubStatCard label="Upcoming" value={stats.upcoming} icon={<Calendar className="h-4 w-4" />} accent="#4fc3f7" />
          <HubStatCard label="Live now" value={stats.live} icon={<Radio className="h-4 w-4" />} accent="#fd5000" />
          <HubStatCard label="Past" value={stats.past} icon={<Award className="h-4 w-4" />} accent="#81c784" />
          <HubStatCard label="Total" value={stats.total} icon={<Users className="h-4 w-4" />} accent="#ffb74d" />
        </div>

        {/* Legacy tab redirect notice */}
        <div className="rounded-xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-3">
          <p className="text-[12px] text-[var(--color-text-secondary)]">
            <strong>Note:</strong> The old "Spaces" and "Live" tabs have moved. Use the main navigation:
            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-[var(--color-accent)] bg-[var(--color-accent)]/10">
              Live → /c/live
            </span>
            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-[var(--color-accent)] bg-[var(--color-accent)]/10">
              Spaces → /c/spaces
            </span>
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col gap-3 sm:flex-row animate-in animate-slide-in-down">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events…"
              className="w-full rounded-xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur py-2.5 pl-10 pr-4 text-[13px] transition-colors focus:border-[var(--color-accent)]/40 focus:outline-none focus:bg-[var(--color-surface)]"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "upcoming", "past"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-xl px-4 py-2 text-[12px] font-semibold capitalize transition-all",
                  filter === key
                    ? "bg-[var(--color-accent)] text-white shadow-[0_2px_8px_rgba(253,80,0,0.3)]"
                    : "border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-surface)]",
                )}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" />
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-8 text-center animate-in animate-fade-in">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent)]/10">
              <Calendar className="h-7 w-7 text-[var(--color-accent)]" />
            </div>
            <p className="text-[14px] font-bold text-[var(--color-text-primary)]">No events yet</p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              {search || filter !== "all"
                ? "Try adjusting your search or filter"
                : "No events scheduled yet. Check back soon!"}
            </p>
          </div>
        ) : (
          <div className="space-y-4 animate-in stagger-children">
            {events.map((event) => (
              <Link key={event.id} href={event.href}>
                <div className={cn(
                  "group relative overflow-hidden rounded-2xl border transition-all duration-300 hover-lift",
                  event.status === "live"
                    ? "border-[var(--color-accent)]/30 bg-gradient-to-br from-[var(--color-accent)]/5 to-transparent"
                    : event.status === "upcoming"
                    ? "border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur"
                    : "border-[var(--color-border)]/20 bg-[var(--color-surface)]/30 backdrop-blur opacity-70"
                )}>
                  <div className="relative">
                    {event.image_url ? (
                      <img src={event.image_url} alt="" className="aspect-video w-full object-cover" />
                    ) : (
                      <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                        <Calendar className="h-12 w-12 text-white/20" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <HubBadge variant={event.status === "live" ? "live" : event.kind === "campaign" ? "orange" : "default"}>
                        {event.status === "live" ? "LIVE" : event.kind}
                      </HubBadge>
                      {event.max_attendees && event.attendee_count >= event.max_attendees && (
                        <HubBadge variant="orange">Full</HubBadge>
                      )}
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 bg-gradient-to-t from-black/80 to-transparent p-3 rounded-b-xl">
                      <div className="flex items-center gap-2 text-white/90">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="text-[11px] font-medium truncate">{event.location ?? "Online"}</span>
                        <span className="h-3 w-px bg-white/20" />
                        <span className="flex items-center gap-1 text-[11px]">
                          <Users className="h-3 w-3" />
                          {event.attendee_count} going
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">{event.community_name}</span>
                      <span className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                            style={{ background: event.kind === "campaign" ? "var(--color-amber)/15" : "var(--color-ocean)/15", color: event.kind === "campaign" ? "var(--color-amber)" : "var(--color-ocean)" }}>
                        {event.kind}
                      </span>
                    </div>
                    <h3 className="mt-1 text-[15px] font-black leading-tight group-hover:text-[var(--color-accent)] transition-colors">{event.title}</h3>
                    {event.description && (
                      <p className="mt-2 line-clamp-2 text-[12px] text-[var(--color-text-secondary)]">{event.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-[var(--color-text-muted)]">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(event.date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {event.attendee_count} attending
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}