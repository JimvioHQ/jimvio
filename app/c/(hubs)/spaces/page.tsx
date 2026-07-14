"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Layers, Loader2, Search, Users, ChevronRight, Hash, Globe, Lock } from "lucide-react";
import { HubCard, HubLinkButton, HubBadge, HubStatCard } from "@/components/community/hub/hub-ui";
import { cn } from "@/lib/utils";

type HubSpace = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  community_name: string;
  community_slug: string;
  room_count: number;
  member_count: number;
  access_type: "free" | "paid" | "premium";
  href: string;
};

export default function HubSpacesPage() {
  const [loading, setLoading] = useState(true);
  const [spaces, setSpaces] = useState<HubSpace[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/c/spaces");
        if (!res.ok) return;
        const json = (await res.json()) as { spaces: HubSpace[] };
        if (!cancelled) setSpaces(json.spaces ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(
    () =>
      spaces.filter(
        (space) =>
          space.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          space.community_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          space.description?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [spaces, searchQuery]
  );

  const stats = useMemo(() => ({
    total: spaces.length,
    members: spaces.reduce((sum, s) => sum + s.member_count, 0),
    rooms: spaces.reduce((sum, s) => sum + s.room_count, 0),
    free: spaces.filter(s => s.access_type === "free").length,
    paid: spaces.filter(s => s.access_type === "paid").length,
    premium: spaces.filter(s => s.access_type === "premium").length,
  }), [spaces]);

  return (
    <div className="min-h-full bg-[var(--color-bg)]"
         style={{
           backgroundImage: `radial-gradient(circle at 50% -20%, var(--color-accent)/5, transparent 50%), radial-gradient(circle at 100% 100%, var(--color-social)/3, transparent 40%)`,
         }}>
      <div className="mx-auto flex max-w-[1000px] flex-col gap-6 p-4 lg:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 animate-in animate-fade-in-up">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-[var(--color-text-primary)]">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-social)]/15 text-[var(--color-social)]">
                <Layers className="h-5 w-5" />
              </div>
              Spaces
            </h1>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Communities and rooms you belong to
            </p>
          </div>
          <HubLinkButton href="/communities" variant="secondary">
            Discover more
          </HubLinkButton>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 animate-in stagger-children">
          <HubStatCard label="Total" value={stats.total} icon={<Layers className="h-4 w-4" />} color="events" />
          <HubStatCard label="Members" value={stats.members.toLocaleString()} icon={<Users className="h-4 w-4" />} color="growth" />
          <HubStatCard label="Rooms" value={stats.rooms} icon={<Hash className="h-4 w-4" />} color="live" />
          <HubStatCard label="Free / Paid / Premium" value={`${stats.free} / ${stats.paid} / ${stats.premium}`} icon={<Globe className="h-4 w-4" />} color="social" />
        </div>

        {/* Search */}
        <div className="relative animate-in animate-slide-in-down">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search spaces or communities…"
            className="w-full rounded-xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur py-2.5 pl-10 pr-4 text-[13px] transition-colors focus:border-[var(--color-accent)]/40 focus:outline-none focus:bg-[var(--color-surface)]"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-8 text-center animate-in animate-fade-in">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent)]/10">
              <Layers className="h-7 w-7 text-[var(--color-accent)]" />
            </div>
            <p className="text-[14px] font-bold text-[var(--color-text-primary)]">No spaces found</p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              {searchQuery
                ? "Try adjusting your search"
                : "You haven't joined any spaces yet. Join a community to access its spaces and rooms."}
            </p>
            {!searchQuery && (
              <HubLinkButton href="/communities" className="mt-4">
                Browse communities
              </HubLinkButton>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-in stagger-children">
            {filtered.map((space) => (
              <Link key={space.id} href={space.href}>
                <div className={cn(
                  "group relative overflow-hidden rounded-2xl border transition-all duration-300 hover-lift",
                  space.access_type === "free"
                    ? "border-[var(--color-growth)]/30 bg-gradient-to-br from-[var(--color-growth)]/5 to-transparent"
                    : space.access_type === "paid"
                    ? "border-[var(--color-events)]/30 bg-gradient-to-br from-[var(--color-events)]/5 to-transparent"
                    : "border-[var(--color-social)]/30 bg-gradient-to-br from-[var(--color-social)]/5 to-transparent"
                )}>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-[14px] font-black group-hover:text-[var(--color-accent)] transition-colors">{space.name}</p>
                          {space.access_type === "paid" && (
                            <HubBadge variant="orange">Paid</HubBadge>
                          )}
                          {space.access_type === "premium" && (
                            <HubBadge variant="default">Premium</HubBadge>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{space.community_name}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors" />
                    </div>
                    {space.description && (
                      <p className="mt-2 line-clamp-2 text-[12px] text-[var(--color-text-secondary)]">{space.description}</p>
                    )}
                    <div className="mt-3 flex items-center gap-4 text-[10px] font-semibold text-[var(--color-text-muted)]">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {space.member_count.toLocaleString()} members
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        {space.room_count} rooms
                      </span>
                    </div>
                  </div>
                  {/* Access type indicator */}
                  <div className="absolute bottom-0 left-0 right-0 h-1.5"
                       style={{
                         background: space.access_type === "free"
                           ? "linear-gradient(90deg, var(--color-growth), var(--color-accent))"
                           : space.access_type === "paid"
                           ? "linear-gradient(90deg, var(--color-events), var(--color-accent))"
                           : "linear-gradient(90deg, var(--color-social), var(--color-live))",
                       }} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}