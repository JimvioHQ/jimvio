"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Layers, Loader2, Search } from "lucide-react";
import { HubCard, HubAvatar, HubLinkButton } from "@/components/community/hub/hub-ui";
import { resolveSpaceAvatar } from "@/components/community/hub/messages/MessageEntityAvatar";

type HubSpace = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  community_avatar_url: string | null;
  community_name: string;
  community_slug: string;
  room_count: number;
  member_count: number;
  href: string;
};

type CommunityGroup = {
  community_slug: string;
  community_name: string;
  community_avatar_url: string | null;
  spaces: HubSpace[];
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
    return () => {
      cancelled = true;
    };
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

  const grouped = useMemo(() => {
    const map = new Map<string, CommunityGroup>();
    for (const space of filtered) {
      const key = space.community_slug || space.community_name;
      const existing = map.get(key);
      if (existing) {
        existing.spaces.push(space);
        continue;
      }
      map.set(key, {
        community_slug: space.community_slug,
        community_name: space.community_name,
        community_avatar_url: space.community_avatar_url,
        spaces: [space],
      });
    }
    return [...map.values()].sort((a, b) =>
      a.community_name.localeCompare(b.community_name)
    );
  }, [filtered]);

  const hasSpaces = spaces.length > 0;
  const noSearchResults = hasSpaces && filtered.length === 0;

  return (
    <div className="min-h-full bg-[var(--color-bg,#f4f4f5)]">
      <div className="w-full space-y-4 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-black tracking-tight">
              <Layers className="h-5 w-5 text-[#fd5000]" />
              Spaces & Communities
            </h1>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Spaces across your communities — discussions, announcements, and collaboration
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <HubLinkButton href="/communities/explore" variant="secondary">
              Explore communities
            </HubLinkButton>
            <HubLinkButton href="/communities/create">Create community</HubLinkButton>
          </div>
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
        ) : noSearchResults ? (
          <HubCard className="py-12 text-center">
            <Search className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
            <p className="text-[14px] font-bold">No matching spaces</p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Try a different search term.
            </p>
          </HubCard>
        ) : grouped.length === 0 ? (
          <HubCard className="py-12 text-center">
            <Layers className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
            <p className="text-[14px] font-bold">No Spaces yet</p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Join or create a Community to start using Spaces.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <HubLinkButton href="/communities/explore">Explore communities</HubLinkButton>
              <HubLinkButton href="/communities/create" variant="secondary">
                Create community
              </HubLinkButton>
            </div>
          </HubCard>
        ) : (
          <div className="space-y-6">
            {grouped.map((group) => (
              <section key={group.community_slug || group.community_name}>
                <div className="mb-3 flex items-center gap-2.5">
                  <HubAvatar
                    name={group.community_name}
                    src={group.community_avatar_url}
                    size={32}
                  />
                  <div className="min-w-0">
                    <h2 className="truncate text-[14px] font-bold text-[var(--color-text-primary)]">
                      {group.community_name}
                    </h2>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      {group.spaces.length}{" "}
                      {group.spaces.length === 1 ? "space" : "spaces"}
                    </p>
                  </div>
                </div>

                <ul className="space-y-1">
                  {group.spaces.map((space) => (
                    <li key={space.id}>
                      <Link
                        href={space.href}
                        className="group flex items-center gap-3 rounded-xl border border-transparent px-2 py-2 transition hover:border-[#fd5000]/20 hover:bg-white"
                      >
                        <HubAvatar
                          name={space.name}
                          src={resolveSpaceAvatar(
                            space.cover_url,
                            space.community_avatar_url
                          )}
                          size={36}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold group-hover:text-[#fd5000]">
                            {space.name}
                          </p>
                          {space.description ? (
                            <p className="truncate text-[11px] text-[var(--color-text-muted)]">
                              {space.description}
                            </p>
                          ) : (
                            <p className="text-[11px] text-[var(--color-text-muted)]">
                              {space.member_count.toLocaleString()} members
                              {space.room_count > 0
                                ? ` · ${space.room_count} rooms`
                                : ""}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 group-hover:text-[#fd5000]" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
