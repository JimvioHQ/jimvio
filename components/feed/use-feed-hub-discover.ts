"use client";

import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from "react";
import type { FeedSidebarLiveCreator, FeedSidebarPopularUser } from "@/lib/feed/load-feed-sidebar";
import type { TrendingCommunity } from "@/components/feed/FeedDiscoverRail";
import { useFeedUser } from "@/lib/feed/use-feed-user";

export type HubDiscoverClientPayload = {
  live?: Array<
    FeedSidebarLiveCreator & {
      subtitle?: string;
      image?: string | null;
      badge?: string;
    }
  > | null;
  popularUsers?: FeedSidebarPopularUser[] | null;
  communities?: TrendingCommunity[] | null;
};

type DiscoverCache = {
  at: number;
  live: FeedSidebarLiveCreator[];
  popularUsers: FeedSidebarPopularUser[];
  communities: TrendingCommunity[];
  /** False when the last fetch failed — keeps last good data, retries sooner. */
  ok: boolean;
};

let cache: DiscoverCache | null = null;
let inflight: Promise<DiscoverCache | null> | null = null;
const CACHE_MS = 20_000;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function mapLiveRows(rows: HubDiscoverClientPayload["live"]): FeedSidebarLiveCreator[] {
  return (rows ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    hostName: s.hostName,
    hostAvatarUrl: s.hostAvatarUrl ?? s.image ?? null,
    href: s.href,
    viewerCount: s.viewerCount ?? null,
    thumbnailUrl: s.thumbnailUrl ?? s.image ?? null,
  }));
}

function toCache(json: HubDiscoverClientPayload, previous: DiscoverCache | null): DiscoverCache {
  return {
    at: Date.now(),
    live: json.live ? mapLiveRows(json.live) : previous?.live ?? [],
    // Never replace a good list with an empty one from a degraded response.
    popularUsers:
      json.popularUsers && json.popularUsers.length
        ? json.popularUsers
        : previous?.popularUsers ?? json.popularUsers ?? [],
    communities:
      json.communities && json.communities.length
        ? json.communities
        : previous?.communities ?? json.communities ?? [],
    ok: true,
  };
}

const HubDiscoverInitialContext = createContext<HubDiscoverClientPayload | null>(null);

/**
 * Server-rendered discover payload so Trending, Popular Users and Live render
 * in the first paint (no client round trip). Context — not module state — so
 * nothing is shared between requests during SSR.
 */
export function HubDiscoverProvider({
  initial,
  children,
}: {
  initial: HubDiscoverClientPayload | null | undefined;
  children: ReactNode;
}) {
  if (typeof window !== "undefined" && initial && !cache) {
    cache = toCache(initial, null);
  }
  return createElement(HubDiscoverInitialContext.Provider, { value: initial ?? null }, children);
}

export async function loadHubDiscover(force = false): Promise<DiscoverCache | null> {
  if (!force && cache?.ok && Date.now() - cache.at < CACHE_MS) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch("/api/c/hub/discover", { cache: "no-store" });
      if (!res.ok) throw new Error("discover failed");
      const json = (await res.json()) as HubDiscoverClientPayload;
      cache = toCache(json, cache);
    } catch {
      // Keep last good rails; retry on the next tick rather than caching failure.
      cache = cache
        ? { ...cache, ok: false }
        : { at: Date.now(), live: [], popularUsers: [], communities: [], ok: false };
    } finally {
      inflight = null;
    }
    notify();
    return cache;
  })();
  return inflight;
}

/** Shared discover payload for feed sidebar + in-feed modules (one request). */
export function useFeedHubDiscover() {
  const { user } = useFeedUser();
  const initial = useContext(HubDiscoverInitialContext);
  const [snapshot, setSnapshot] = useState<DiscoverCache | null>(() =>
    typeof window !== "undefined" && cache ? cache : initial ? toCache(initial, null) : null,
  );
  const [loading, setLoading] = useState(snapshot == null);

  useEffect(() => {
    let cancelled = false;
    const sync = () => {
      if (cancelled || !cache) return;
      setSnapshot(cache);
      setLoading(false);
    };
    listeners.add(sync);
    void loadHubDiscover().then(sync);
    const interval = window.setInterval(() => {
      void loadHubDiscover(true);
    }, 30_000);
    return () => {
      cancelled = true;
      listeners.delete(sync);
      window.clearInterval(interval);
    };
  }, []);

  const viewerId = user?.id ?? null;
  const popularUsers = (snapshot?.popularUsers ?? [])
    .filter((u) => u.userId !== viewerId)
    .slice(0, 5);

  return {
    live: snapshot?.live ?? [],
    popularUsers,
    communities: snapshot?.communities ?? [],
    loading,
    popularReady: !loading || popularUsers.length > 0,
  };
}
