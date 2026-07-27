"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  subscribePostgresChanges,
  unsubscribeRealtime,
} from "@/lib/supabase/realtime-subscribe";

/**
 * Follow / unfollow a Jimvio user (Live host).
 * Optimistic UI + realtime sync via user_follows.
 */
export function useFollowUser(targetUserId: string | null | undefined) {
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const target = targetUserId?.trim() || "";

  const load = useCallback(async () => {
    if (!target) {
      setFollowing(false);
      setFollowerCount(0);
      setReady(false);
      return;
    }
    try {
      const res = await fetch(`/api/users/${target}/follow`);
      const json = (await res.json()) as {
        following?: boolean;
        followerCount?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to load follow state");
      setFollowing(Boolean(json.following));
      setFollowerCount(Number(json.followerCount ?? 0));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Follow load failed");
    } finally {
      setReady(true);
    }
  }, [target]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!target) return;
    const supabase = createClient();
    let cancelled = false;
    let channel: Awaited<ReturnType<typeof subscribePostgresChanges>> = null;

    void (async () => {
      channel = await subscribePostgresChanges(
        supabase,
        `user_follows:${target}`,
        {
          event: "*",
          schema: "public",
          table: "user_follows",
          filter: `following_id=eq.${target}`,
        },
        () => {
          if (!cancelled) void load();
        },
        () => cancelled
      );
    })();

    return () => {
      cancelled = true;
      unsubscribeRealtime(supabase, channel, `user_follows:${target}`);
    };
  }, [target, load]);

  const toggle = useCallback(async () => {
    if (!target || busy) return;
    const prevFollowing = following;
    const prevCount = followerCount;
    const nextFollowing = !prevFollowing;
    setFollowing(nextFollowing);
    setFollowerCount(Math.max(0, prevCount + (nextFollowing ? 1 : -1)));
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${target}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle" }),
      });
      const json = (await res.json()) as {
        following?: boolean;
        followerCount?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Follow failed");
      setFollowing(Boolean(json.following));
      setFollowerCount(Number(json.followerCount ?? 0));
    } catch (e) {
      setFollowing(prevFollowing);
      setFollowerCount(prevCount);
      setError(e instanceof Error ? e.message : "Follow failed");
      throw e;
    } finally {
      setBusy(false);
    }
  }, [target, busy, following, followerCount]);

  return {
    following,
    followerCount,
    busy,
    ready,
    error,
    toggle,
    reload: load,
  };
}
