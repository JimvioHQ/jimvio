"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { applySpacesPage, shouldApplySpacesPage } from "@/lib/community/hub-spaces-page";
import { interpretSpacesResponse } from "@/lib/community/hub-spaces-response";

type HubSpace = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  community_avatar_url: string | null;
  community_name: string;
  community_slug: string;
  community_id?: string;
  member_count: number;
  href: string;
  access_type: string;
  last_message: string | null;
  last_message_at: string | null;
  is_member?: boolean;
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

function spaceCta(space: HubSpace): string {
  const access = accessLabel(space.access_type);
  if (space.is_member) return "Open Space";
  if (access.private) return "Request Access";
  return "Join Space";
}

function SpaceCard({ space }: { space: HubSpace }) {
  const avatarSrc = resolveSpaceAvatar(
    space.cover_url,
    space.community_avatar_url,
    null
  );
  const access = accessLabel(space.access_type);
  const cta = spaceCta(space);
  const lastActive = space.last_message_at
    ? formatDistanceToNow(new Date(space.last_message_at), { addSuffix: true })
    : null;

  return (
    <Link
      href={space.href}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-[var(--color-border,#e4e4e7)] bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#FF5A1F]/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40"
      aria-label={`${cta}: ${space.name}`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-[#FF5A1F]/[0.06] to-[#F8FAFC]">
        {avatarSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarSrc}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <HubAvatar name={space.name} src={null} size={56} />
          </div>
        )}
        <div className="absolute left-2 top-2">
          <HubBadge variant={access.private ? "default" : "orange"}>
            {access.private ? (
              <Lock className="mr-0.5 inline h-2.5 w-2.5" />
            ) : (
              <Globe className="mr-0.5 inline h-2.5 w-2.5" />
            )}
            {access.label}
          </HubBadge>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-2.5">
        <div>
          <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            {space.community_name}
          </p>
          <h2 className="truncate text-[13px] font-bold text-[#111827] group-hover:text-[#FF5A1F]">
            {space.name}
          </h2>
        </div>

        {space.description ? (
          <p className="line-clamp-2 text-[11px] leading-snug text-[var(--color-text-muted)]">
            {space.description}
          </p>
        ) : null}

        <div className="mt-auto space-y-2">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium text-[var(--color-text-muted)]">
            {space.member_count > 0 ? (
              <span className="inline-flex items-center gap-0.5">
                <Users className="h-3 w-3" />
                {space.member_count.toLocaleString()}
              </span>
            ) : null}
            {space.last_message ? (
              <span className="inline-flex min-w-0 items-center gap-0.5">
                <MessageSquare className="h-3 w-3 shrink-0" />
                <span className="truncate">{space.last_message}</span>
              </span>
            ) : null}
          </div>
          {lastActive ? (
            <p className="text-[10px] text-[var(--color-text-muted)]">Active {lastActive}</p>
          ) : null}
          <span className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-[#FF5A1F] px-2.5 py-1.5 text-[10px] font-bold text-white transition group-hover:bg-[#e54e1a]">
            {cta}
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function SpaceCardSkeleton() {
  return (
    <div className="flex h-full min-h-[180px] flex-col overflow-hidden rounded-xl border border-[var(--color-border,#e4e4e7)] bg-white">
      <div className="aspect-[4/3] animate-pulse bg-[#F1F5F9]" />
      <div className="space-y-2 p-2.5">
        <div className="h-2.5 w-1/3 animate-pulse rounded bg-[#F1F5F9]" />
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-[#F1F5F9]" />
        <div className="h-8 animate-pulse rounded bg-[#F1F5F9]" />
        <div className="h-7 animate-pulse rounded-lg bg-[#F1F5F9]" />
      </div>
    </div>
  );
}

const PAGE_SIZE = 30;

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

export default function HubSpacesPage() {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [spaces, setSpaces] = useState<HubSpace[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const spacesRef = useRef<HubSpace[]>([]);
  const queryRef = useRef(debouncedQuery);
  const pageQueryRef = useRef(debouncedQuery);
  const generationRef = useRef(0);
  const loadMoreAbortRef = useRef<AbortController | null>(null);
  spacesRef.current = spaces;
  queryRef.current = debouncedQuery;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const fetchPage = useCallback(
    async (
      offset: number,
      q: string,
      append: boolean,
      signal: AbortSignal | undefined,
      generation: number,
    ) => {
      const params = new URLSearchParams({
        offset: String(offset),
        limit: String(PAGE_SIZE),
      });
      if (q) params.set("q", q);

      const res = await fetch(`/api/c/spaces?${params.toString()}`, { signal });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        spaces?: HubSpace[];
        nextOffset?: number | null;
        total?: number;
      } | null;
      const gate = {
        aborted: Boolean(signal?.aborted),
        requestQuery: q,
        currentQuery: queryRef.current,
        requestGeneration: generation,
        currentGeneration: generationRef.current,
      };
      if (!shouldApplySpacesPage(gate)) {
        throw new DOMException("Aborted", "AbortError");
      }
      const parsed = interpretSpacesResponse(res.status, json);
      if (
        !shouldApplySpacesPage({
          ...gate,
          aborted: Boolean(signal?.aborted),
          currentQuery: queryRef.current,
          currentGeneration: generationRef.current,
        })
      ) {
        throw new DOMException("Aborted", "AbortError");
      }
      if (!parsed.ok) {
        if (!append) {
          spacesRef.current = [];
          pageQueryRef.current = q;
          setSpaces([]);
          setNextOffset(null);
          setTotal(0);
        }
        throw new Error(parsed.error);
      }

      const decision = applySpacesPage({
        aborted: Boolean(signal?.aborted),
        requestQuery: q,
        currentQuery: queryRef.current,
        requestGeneration: generation,
        currentGeneration: generationRef.current,
        append,
        previous: spacesRef.current,
        incoming: (parsed.spaces as HubSpace[]) ?? [],
        nextOffset: parsed.nextOffset,
        total: parsed.total,
      });
      if (!decision.apply) {
        throw new DOMException("Aborted", "AbortError");
      }

      pageQueryRef.current = q;
      spacesRef.current = decision.spaces;
      setError(null);
      setTotal(decision.total);
      setNextOffset(decision.nextOffset);
      setSpaces(decision.spaces);
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    loadMoreAbortRef.current?.abort();
    loadMoreAbortRef.current = null;
    const generation = ++generationRef.current;
    const timer = window.setTimeout(() => controller.abort(), 25000);
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadingMore(false);
      setError(null);
      try {
        await fetchPage(0, debouncedQuery, false, controller.signal, generation);
      } catch (err) {
        if (cancelled) return;
        if (generation !== generationRef.current || queryRef.current !== debouncedQuery) return;
        if (isAbortError(err)) {
          setError("Spaces are taking too long to load.");
          return;
        }
        setError(err instanceof Error ? err.message : "Could not load Spaces");
      } finally {
        window.clearTimeout(timer);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
      loadMoreAbortRef.current?.abort();
      loadMoreAbortRef.current = null;
    };
  }, [debouncedQuery, fetchPage, reloadKey]);

  useEffect(() => {
    if (loading || loadingMore || nextOffset == null) return;
    if (pageQueryRef.current !== debouncedQuery) return;
    const node = sentinelRef.current;
    if (!node) return;

    const controller = new AbortController();
    loadMoreAbortRef.current = controller;
    const generation = generationRef.current;
    const query = debouncedQuery;
    const offset = nextOffset;
    let started = false;

    const observer = new IntersectionObserver(
      (entries) => {
        if (started || !entries[0]?.isIntersecting) return;
        if (controller.signal.aborted || offset == null) return;
        started = true;
        setLoadingMore(true);
        void fetchPage(offset, query, true, controller.signal, generation)
          .catch((err: unknown) => {
            if (isAbortError(err)) return;
            if (generation !== generationRef.current || query !== queryRef.current) return;
            setError(err instanceof Error ? err.message : "Could not load more Spaces");
          })
          .finally(() => {
            if (controller.signal.aborted) return;
            if (generation !== generationRef.current || query !== queryRef.current) return;
            setLoadingMore(false);
          });
      },
      { rootMargin: "240px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [debouncedQuery, fetchPage, loading, loadingMore, nextOffset]);

  const hasSpaces = spaces.length > 0;
  const noSearchResults = !loading && total === 0 && debouncedQuery.length > 0;

  const countLabel = useMemo(() => {
    if (loading) return null;
    if (total === 0) return null;
    return `${spaces.length}${nextOffset != null ? ` of ${total}` : ""} ${total === 1 ? "space" : "spaces"}`;
  }, [loading, nextOffset, spaces.length, total]);

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <div className="mx-auto w-full max-w-[1600px] space-y-5 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-black tracking-tight text-[#111827]">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF5A1F]/10">
                <Layers className="h-5 w-5 text-[#FF5A1F]" />
              </span>
              Community Spaces
            </h1>
            <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-[var(--color-text-muted)]">
              One Space per community — click any card to open the discussion chat instantly.
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
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <li key={i}>
                <SpaceCardSkeleton />
              </li>
            ))}
          </ul>
        ) : error && !hasSpaces ? (
          <HubCard className="py-14 text-center">
            <Layers className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
            <p className="text-[15px] font-bold text-[#111827]">Spaces could not be loaded</p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="mt-4 rounded-xl bg-[#FF5A1F] px-4 py-2 text-[12px] font-semibold text-white"
            >
              Try again
            </button>
          </HubCard>
        ) : noSearchResults ? (
          <HubCard className="py-14 text-center">
            <Search className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
            <p className="text-[15px] font-bold text-[#111827]">No matching spaces</p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Try a different search term.
            </p>
          </HubCard>
        ) : !hasSpaces ? (
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
            {error ? (
              <p className="text-[12px] font-medium text-[#b45309]">{error}</p>
            ) : null}
            {countLabel ? (
              <p className="text-[12px] font-medium text-[var(--color-text-muted)]">
                {countLabel} available
              </p>
            ) : null}
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {spaces.map((space) => (
                <li key={space.id} className="min-h-[180px]">
                  <SpaceCard space={space} />
                </li>
              ))}
            </ul>
            <div ref={sentinelRef} className="flex justify-center py-6">
              {loadingMore ? (
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
              ) : nextOffset == null && spaces.length > 0 ? (
                <p className="text-[12px] text-[var(--color-text-muted)]">
                  You&apos;ve reached the end.
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
