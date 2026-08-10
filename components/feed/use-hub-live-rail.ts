"use client";

import { useEffect, useState } from "react";

export type HubLiveRailSession = {
  id: string;
  title: string;
  host: string;
  href: string;
  imageUrl?: string | null;
  live: boolean;
  subtitle?: string | null;
};

type HubLiveApi = {
  session?: {
    title?: string;
    host?: string;
    href?: string;
    liveSessionId?: string | null;
    liveStatus?: "live" | "ended" | "scheduled" | "offline";
  };
  featuredLive?: {
    id: string;
    title: string;
    hostName: string;
    href: string;
    watchingLabel?: string | null;
  } | null;
  upcomingSessions?: Array<{
    id: string;
    title: string;
    host: string;
    start_date: string;
    href: string;
  }>;
};

let cache: { at: number; live: HubLiveRailSession | null; upcoming: HubLiveRailSession[] } | null =
  null;
const CACHE_MS = 15_000;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

async function loadHubLiveRail(force = false) {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache;

  try {
    const res = await fetch("/api/c/live", { cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as HubLiveApi;
    const session = json.session;
    const featured = json.featuredLive;

    let live: HubLiveRailSession | null = null;
    if (session?.liveStatus === "live" && session.liveSessionId) {
      live = {
        id: session.liveSessionId,
        title: session.title ?? "Live now",
        host: session.host ?? "Creator",
        href: session.href ?? `/communities/live/${session.liveSessionId}`,
        live: true,
        subtitle: "Live now",
      };
    } else if (featured) {
      live = {
        id: featured.id,
        title: featured.title,
        host: featured.hostName,
        href: featured.href,
        live: false,
        subtitle: featured.watchingLabel ?? null,
      };
    }

    const upcoming = (json.upcomingSessions ?? []).slice(0, 2).map((s) => ({
      id: s.id,
      title: s.title,
      host: s.host,
      href: s.href,
      live: false,
      subtitle: s.start_date
        ? new Date(s.start_date).toLocaleString(undefined, {
            weekday: "short",
            hour: "numeric",
            minute: "2-digit",
          })
        : "Scheduled",
    }));

    cache = { at: Date.now(), live, upcoming };
  } catch {
    cache = { at: Date.now(), live: null, upcoming: [] };
  }

  notify();
  return cache;
}

/** Shared live rail data — one request for Live Now + Upcoming. */
export function useHubLiveRail() {
  const [live, setLive] = useState<HubLiveRailSession | null>(cache?.live ?? null);
  const [upcoming, setUpcoming] = useState<HubLiveRailSession[]>(cache?.upcoming ?? []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let cancelled = false;

    const sync = () => {
      if (cancelled || !cache) return;
      setLive(cache.live);
      setUpcoming(cache.upcoming);
      setLoading(false);
    };

    listeners.add(sync);
    void loadHubLiveRail().then(() => {
      if (!cancelled) sync();
    });

    const t = setInterval(() => void loadHubLiveRail(true), 20_000);
    return () => {
      cancelled = true;
      listeners.delete(sync);
      clearInterval(t);
    };
  }, []);

  return { live, upcoming, loading };
}
