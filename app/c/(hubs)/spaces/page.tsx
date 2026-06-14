"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Layers, Loader2, Search, Users, ChevronRight } from "lucide-react";
import { HubCard, HubLinkButton } from "@/components/community/hub/hub-ui";

type HubSpace = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  community_name: string;
  community_slug: string;
  room_count: number;
  member_count: number;
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

  return (
    <div className="min-h-full bg-[var(--color-bg,#f4f4f5)]">
      <div className="mx-auto max-w-[960px] space-y-4 p-4 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-black tracking-tight">
              <Layers className="h-5 w-5 text-[#fd5000]" />
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

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search spaces or communities…"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-4 text-[13px] focus:border-[#fd5000]/40 focus:outline-none"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : filtered.length === 0 ? (
          <HubCard className="py-12 text-center">
            <Layers className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
            <p className="text-[14px] font-bold">No spaces yet</p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Join a community to access its spaces and rooms.
            </p>
            <HubLinkButton href="/communities" className="mt-4">
              Browse communities
            </HubLinkButton>
          </HubCard>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((space) => (
              <Link key={space.id} href={space.href}>
                <HubCard className="group h-full transition hover:border-[#fd5000]/30 hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-bold group-hover:text-[#fd5000]">{space.name}</p>
                      <p className="text-[11px] text-[var(--color-text-muted)]">{space.community_name}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 group-hover:text-[#fd5000]" />
                  </div>
                  {space.description && (
                    <p className="mt-2 line-clamp-2 text-[12px] text-[var(--color-text-secondary)]">{space.description}</p>
                  )}
                  <div className="mt-3 flex items-center gap-4 text-[10px] font-semibold text-[var(--color-text-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {space.member_count.toLocaleString()} members
                    </span>
                    <span>{space.room_count} rooms</span>
                  </div>
                </HubCard>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
