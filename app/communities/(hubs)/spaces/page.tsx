"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Globe,
  Layers,
  Loader2,
  Lock,
  MessageSquare,
  Search,
  Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { HubCard, HubAvatar, HubLinkButton, HubBadge } from "@/components/community/hub/hub-ui";
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
  access_type: string;
  last_message: string | null;
  last_message_at: string | null;
  message_count: number;
};

function accessLabel(accessType: string): { label: string; private: boolean } {
  const t = accessType.toLowerCase();
  if (t === "paid" || t === "premium" || t === "members") {
    return { label: "Members", private: true };
  }
  if (t === "private" || t === "invite") {
    return { label: "Private", private: true };
  }
  return { label: "Public", private: false };
}

function SpaceCard({ space }: { space: HubSpace }) {
  const avatarSrc = resolveSpaceAvatar(space.cover_url, space.community_avatar_url);
  const access = accessLabel(space.access_type);
  const lastActive = space.last_message_at
    ? formatDistanceToNow(new Date(space.last_message_at), { addSuffix: true })
    : null;

  return (
    <Link
      href={space.href}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border,#e4e4e7)] bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#FF5A1F]/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40"
    >
      <div className="relative flex items-start gap-3 border-b border-[var(--color-border,#e4e4e7)]/80 bg-gradient-to-br from-[#FF5A1F]/[0.04] to-transparent p-4">
        <div className="relative shrink-0">
          <HubAvatar name={space.community_name} src={space.community_avatar_url} size={44} />
          <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#FF5A1F]/10 shadow-sm">
            <HubAvatar name={space.name} src={avatarSrc} size={24} />
          </span>
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            {space.community_name}
          </p>
          <h2 className="truncate text-[15px] font-bold text-[#111827] group-hover:text-[#FF5A1F]">
            {space.name}
          </h2>
          {space.description ? (
            <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[var(--color-text-muted)]">
              {space.description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-secondary,#f4f4f5)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-muted)]">
            <Users className="h-3 w-3" />
            {space.member_count.toLocaleString()} members
          </span>
          {space.message_count > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-secondary,#f4f4f5)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-muted)]">
              <MessageSquare className="h-3 w-3" />
              {space.message_count.toLocaleString()} messages
            </span>
          ) : null}
          <HubBadge variant={access.private ? "default" : "orange"}>
            {access.private ? (
              <Lock className="mr-0.5 inline h-2.5 w-2.5" />
            ) : (
              <Globe className="mr-0.5 inline h-2.5 w-2.5" />
            )}
            {access.label}
          </HubBadge>
        </div>

        {space.last_message ? (
          <div className="rounded-xl border border-[var(--color-border,#e4e4e7)]/60 bg-[#F8FAFC] px-3 py-2.5">
            <p className="line-clamp-2 text-[12px] leading-relaxed text-[#111827]/80">
              {space.last_message}
            </p>
            {lastActive ? (
              <p className="mt-1 text-[10px] font-medium text-[var(--color-text-muted)]">
                Active {lastActive}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-[12px] text-[var(--color-text-muted)]">
            Join the conversation — be the first to say hello.
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="text-[12px] font-semibold text-[#FF5A1F] opacity-0 transition-opacity group-hover:opacity-100">
            Open discussion
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-[#FF5A1F] px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition group-hover:bg-[#e54e1a]">
            Open Space
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

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
          space.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          space.last_message?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [spaces, searchQuery]
  );

  const hasSpaces = spaces.length > 0;
  const noSearchResults = hasSpaces && filtered.length === 0;

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <div className="mx-auto w-full max-w-7xl space-y-5 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-black tracking-tight text-[#111827]">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF5A1F]/10">
                <Layers className="h-5 w-5 text-[#FF5A1F]" />
              </span>
              Community Spaces
            </h1>
            <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-[var(--color-text-muted)]">
              One discussion Space per community — open any card to jump straight into the
              conversation.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <HubLinkButton href="/communities/explore" variant="secondary">
              Explore communities
            </HubLinkButton>
            <HubLinkButton href="/communities/create">Create community</HubLinkButton>
          </div>
        </div>

        <div className="relative max-w-xl">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search spaces, communities, or recent messages…"
            className="w-full rounded-xl border border-[var(--color-border,#e4e4e7)] bg-white py-2.5 pl-10 pr-4 text-[13px] shadow-sm focus:border-[#FF5A1F]/40 focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]/15"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-zinc-400" />
          </div>
        ) : noSearchResults ? (
          <HubCard className="py-14 text-center">
            <Search className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
            <p className="text-[15px] font-bold text-[#111827]">No matching spaces</p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Try a different search term.
            </p>
          </HubCard>
        ) : filtered.length === 0 ? (
          <HubCard className="py-14 text-center">
            <Layers className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
            <p className="text-[15px] font-bold text-[#111827]">No Spaces yet</p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Join or create a community to start collaborating in Spaces.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <HubLinkButton href="/communities/explore">Explore communities</HubLinkButton>
              <HubLinkButton href="/communities/create" variant="secondary">
                Create community
              </HubLinkButton>
            </div>
          </HubCard>
        ) : (
          <>
            <p className="text-[12px] font-medium text-[var(--color-text-muted)]">
              {filtered.length} {filtered.length === 1 ? "space" : "spaces"} available
            </p>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((space) => (
                <li key={space.id} className="min-h-[220px]">
                  <SpaceCard space={space} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
