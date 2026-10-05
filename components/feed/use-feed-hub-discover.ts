"use client";

import { useEffect, useState } from "react";
import type { FeedSidebarLiveCreator, FeedSidebarPopularUser } from "@/lib/feed/load-feed-sidebar";
import type { TrendingCommunity } from "@/components/feed/FeedDiscoverRail";

type HubDiscoverPayload = {
  live?: Array<
    FeedSidebarLiveCreator & {
      subtitle?: string;
      image?: string | null;
      badge?: string;
    }
  >;
  popularUsers?: FeedSidebarPopularUser[];
  communities?: TrendingCommunity[];
};

let cache: {
  at: number;
  live: FeedSidebarLiveCreator[];
  popularUsers: FeedSidebarPopularUser[];
  communities: TrendingCommunity[];
} | null = null;
const CACHE_MS = 20_000;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function mapLiveRows(rows: HubDiscoverPayload["live"]): FeedSidebarLiveCreator[] {
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

async function loadHubDiscover(force = false) {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache;

  try {
    const res = await fetch("/api/c/hub/discover", { cache: "no-store" });
    if (!res.ok) throw new Error("discover failed");
    const json = (await res.json()) as HubDiscoverPayload;
    cache = {
      at: Date.now(),
      live: mapLiveRows(json.live),
      popularUsers: json.popularUsers ?? [],
      communities: json.communities ?? [],
    };
  } catch {
    cache = { at: Date.now(), live: [], popularUsers: [], communities: [] };
  }

  notify();
  return cache;
}

/** Shared discover payload for feed sidebar + in-feed modules. */
export function useFeedHubDiscover() {
  const [live, setLive] = useState<FeedSidebarLiveCreator[]>(cache?.live ?? []);
  const [popularUsers, setPopularUsers] = useState<FeedSidebarPopularUser[]>(
    cache?.popularUsers ?? []
  );
  const [communities, setCommunities] = useState<TrendingCommunity[]>(
    cache?.communities ?? []
  );
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let cancelled = false;

    const sync = () => {
      if (cancelled || !cache) return;
      setLive(cache.live);
      setPopularUsers(cache.popularUsers);
      setCommunities(cache.communities);
      setLoading(false);
    };

    listeners.add(sync);
    void loadHubDiscover().then(() => {
      if (!cancelled) sync();
    });

    const interval = window.setInterval(() => {
      void loadHubDiscover(true);
    }, 30_000);

    return () => {
      cancelled = true;
      listeners.delete(sync);
      window.clearInterval(interval);
    };
  }, []);

  const popularReady = !loading || popularUsers.length > 0;

  return { live, popularUsers, communities, loading, popularReady };
}
