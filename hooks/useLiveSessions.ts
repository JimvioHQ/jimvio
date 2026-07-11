"use client";

import { useState, useEffect, useCallback } from "react";
import type { LiveSessionItem } from "@/lib/community/hub-live-types";

interface UseLiveSessionsOptions {
  communitySlug?: string;
  spaceId?: string;
  status?: ("live" | "upcoming" | "ended")[];
  autoRefresh?: number;
}

export function useLiveSessions(options: UseLiveSessionsOptions = {}) {
  const { communitySlug, spaceId, status, autoRefresh = 30000 } = options;
  const [sessions, setSessions] = useState<LiveSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (communitySlug) params.set("communitySlug", communitySlug);
      if (spaceId) params.set("spaceId", spaceId);
      if (status?.length) params.set("status", status.join(","));

      const res = await fetch(`/api/c/live?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch sessions");

      const { data } = await res.json();
      setSessions(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, [communitySlug, spaceId, status]);

  useEffect(() => {
    fetchSessions();
    if (autoRefresh > 0) {
      const interval = setInterval(fetchSessions, autoRefresh);
      return () => clearInterval(interval);
    }
  }, [fetchSessions, autoRefresh]);

  return { sessions, loading, error, refetch: fetchSessions };
}

export async function createLiveSession(input: {
  spaceId: string;
  title: string;
  description?: string;
  privacy?: "public" | "private" | "members_only";
  maxViewers?: number;
}): Promise<{ id: string } | { error: string }> {
  const res = await fetch("/api/c/live", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await res.json();
  if (!res.ok) return { error: data.error || "Failed to create session" };
  return data;
}