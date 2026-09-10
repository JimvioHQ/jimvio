"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  subscribePostgresChanges,
  unsubscribeRealtime,
} from "@/lib/supabase/realtime-subscribe";
import type {
  PublicDestination,
  PublicDestinationSession,
  DestinationPlatform,
} from "@/lib/live/destinations/types";

const SELECTED_KEY = "jimvio-live-destinations-selected";

type CatalogEntry = {
  platform: DestinationPlatform;
  label: string;
  status: string;
  message: string | null;
  oauthConfigured: boolean;
  connectPath: string | null;
  canAddCustom: boolean;
  loginKitAvailable?: boolean;
  liveStreamingAllowed?: boolean;
};

export function useLiveDestinations(liveSessionId?: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const [destinations, setDestinations] = useState<PublicDestination[]>([]);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [sessionStatuses, setSessionStatuses] = useState<PublicDestinationSession[]>(
    []
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = sessionStorage.getItem(SELECTED_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as string[];
      return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [encryptionConfigured, setEncryptionConfigured] = useState(true);
  const startedForSession = useRef<string | null>(null);
  const cancelled = useRef(false);

  const refreshList = useCallback(async () => {
    const res = await fetch("/api/live/destinations");
    const json = (await res.json()) as {
      destinations?: PublicDestination[];
      catalog?: CatalogEntry[];
      encryptionConfigured?: boolean;
      error?: string;
    };
    if (!res.ok) throw new Error(json.error ?? "Failed to load destinations");
    setDestinations(json.destinations ?? []);
    setCatalog(json.catalog ?? []);
    setEncryptionConfigured(json.encryptionConfigured !== false);
  }, []);

  const refreshSessionStatuses = useCallback(async (sessionId: string) => {
    const res = await fetch(`/api/live/sessions/${sessionId}/destinations`);
    const json = (await res.json()) as {
      destinations?: PublicDestinationSession[];
      error?: string;
    };
    if (!res.ok) throw new Error(json.error ?? "Failed to load destination status");
    setSessionStatuses(json.destinations ?? []);
  }, []);

  useEffect(() => {
    cancelled.current = false;
    void refreshList()
      .catch((e) => {
        if (!cancelled.current) {
          setError(e instanceof Error ? e.message : "Load failed");
        }
      })
      .finally(() => {
        if (!cancelled.current) setLoading(false);
      });

    return () => {
      cancelled.current = true;
    };
  }, [refreshList]);

  const persistSelection = useCallback((ids: string[]) => {
    setSelectedIds(ids);
    try {
      sessionStorage.setItem(SELECTED_KEY, JSON.stringify(ids));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleSelected = useCallback(
    (id: string) => {
      const destRow = destinations.find((d) => d.id === id);
      // Never enable LIVE fan-out for approval-gated platforms (e.g. TikTok LIVE).
      if (destRow && destRow.liveStreamingAllowed === false) {
        return;
      }
      persistSelection(
        selectedIds.includes(id)
          ? selectedIds.filter((x) => x !== id)
          : [...selectedIds, id]
      );
    },
    [destinations, persistSelection, selectedIds]
  );

  const connect = useCallback((platform: DestinationPlatform) => {
    const returnPath =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "/identity/live-destinations";
    window.location.assign(
      `/api/integrations/${platform}/start?return=${encodeURIComponent(returnPath)}`
    );
  }, []);

  const addCustomRtmp = useCallback(
    async (input: { displayName: string; rtmpUrl: string; streamKey: string }) => {
      const res = await fetch("/api/live/destinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "custom_rtmp", ...input }),
      });
      const json = (await res.json()) as {
        destination?: PublicDestination;
        error?: string;
      };
      if (!res.ok || !json.destination) {
        throw new Error(json.error ?? "Failed to add Custom RTMP");
      }
      await refreshList();
      persistSelection([...selectedIds, json.destination.id]);
      return json.destination;
    },
    [persistSelection, refreshList, selectedIds]
  );

  const disconnect = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/live/destinations/${id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Disconnect failed");
      persistSelection(selectedIds.filter((x) => x !== id));
      await refreshList();
    },
    [persistSelection, refreshList, selectedIds]
  );

  const startForSession = useCallback(
    async (sessionId: string, ids?: string[]) => {
      const destinationIds = ids ?? selectedIds;
      if (destinationIds.length === 0) return { destinations: [] };
      const res = await fetch(`/api/live/sessions/${sessionId}/destinations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", destinationIds }),
      });
      const json = (await res.json()) as {
        destinations?: PublicDestinationSession[];
        failures?: Array<{ destinationId: string; error: string }>;
        error?: string;
        note?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to start destinations");
      setSessionStatuses(json.destinations ?? []);
      return json;
    },
    [selectedIds]
  );

  const retryDestination = useCallback(
    async (sessionId: string, destinationSessionId: string) => {
      const res = await fetch(`/api/live/sessions/${sessionId}/destinations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry", destinationSessionId }),
      });
      const json = (await res.json()) as {
        destinations?: PublicDestinationSession[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Retry failed");
      setSessionStatuses(json.destinations ?? []);
    },
    []
  );

  // Auto-start after Go Live navigation (once per session)
  useEffect(() => {
    if (!liveSessionId || startedForSession.current === liveSessionId) return;
    if (selectedIds.length === 0) return;
    startedForSession.current = liveSessionId;
    const timer = window.setTimeout(() => {
      void startForSession(liveSessionId).catch(() => {
        startedForSession.current = null;
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [liveSessionId, selectedIds, startForSession]);

  // Realtime destination session updates
  useEffect(() => {
    if (!liveSessionId) return;
    let cancelledSub = false;
    let channel: Awaited<ReturnType<typeof subscribePostgresChanges>> = null;

    void (async () => {
      await refreshSessionStatuses(liveSessionId).catch(() => undefined);
      channel = await subscribePostgresChanges(
        supabase,
        `live_destination_sessions:${liveSessionId}`,
        {
          event: "*",
          schema: "public",
          table: "live_destination_sessions",
          filter: `live_session_id=eq.${liveSessionId}`,
        },
        () => {
          void refreshSessionStatuses(liveSessionId).catch(() => undefined);
        },
        () => cancelledSub
      );
    })();

    return () => {
      cancelledSub = true;
      if (channel) void unsubscribeRealtime(supabase, channel);
    };
  }, [liveSessionId, refreshSessionStatuses, supabase]);

  return {
    destinations,
    catalog,
    sessionStatuses,
    selectedIds,
    loading,
    error,
    encryptionConfigured,
    toggleSelected,
    persistSelection,
    connect,
    addCustomRtmp,
    disconnect,
    startForSession,
    retryDestination,
    refreshList,
  };
}
