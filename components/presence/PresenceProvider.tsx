"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  liveSessionForUser,
  pruneStalePresence,
  type LiveHost,
  type PresenceState,
} from "@/lib/presence/online-presence";

const HEARTBEAT_MS = 20_000;
const STALE_MS = 45_000;

type PresenceContextValue = {
  onlineIds: ReadonlySet<string>;
  liveSessionId: (userId: string | null | undefined) => string | null;
  openLive: (sessionId: string) => Promise<void>;
};

const PresenceContext = createContext<PresenceContextValue>({
  onlineIds: new Set(),
  liveSessionId: () => null,
  openLive: async () => undefined,
});

export function usePresence() {
  return useContext(PresenceContext);
}

export function PresenceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [onlineIds, setOnlineIds] = useState<ReadonlySet<string>>(new Set());
  const [hosts, setHosts] = useState<LiveHost[]>([]);

  const refreshHosts = useCallback(async () => {
    try {
      const res = await fetch("/api/live/active-hosts", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { hosts?: LiveHost[] };
      setHosts(Array.isArray(json.hosts) ? json.hosts : []);
    } catch {
      /* live badges stay on the last good snapshot */
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void refreshHosts(), 0);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshHosts();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(initial);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshHosts]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let heartbeat: number | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void supabase.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => {
      if (cancelled) return;
      const userId = data.user?.id ?? null;
      channel = supabase.channel("jimvio-online", {
        config: { presence: { key: userId ?? `view-${Math.random().toString(36).slice(2)}` } },
      });
      const publish = () => {
        const raw = channel?.presenceState() as PresenceState | undefined;
        const fresh = pruneStalePresence(raw, Date.now(), STALE_MS);
        const ids = new Set(
          Object.keys(fresh).filter((id) => id && !id.startsWith("view-") && (fresh[id]?.length ?? 0) > 0),
        );
        if (!cancelled) setOnlineIds(ids);
      };
      channel.on("presence", { event: "sync" }, publish);
      channel.on("presence", { event: "join" }, publish);
      channel.on("presence", { event: "leave" }, publish);
      void channel.subscribe(async (status: string) => {
        if (status !== "SUBSCRIBED" || cancelled || !userId || !channel) return;
        const beat = async () => {
          await channel?.track({ online_at: new Date().toISOString() });
        };
        await beat();
        heartbeat = window.setInterval(() => void beat(), HEARTBEAT_MS);
      });
    });

    const liveChannel = supabase
      .channel("jimvio-live-hosts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_sessions" },
        () => {
          void refreshHosts();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (heartbeat != null) window.clearInterval(heartbeat);
      if (channel) void supabase.removeChannel(channel);
      void supabase.removeChannel(liveChannel);
    };
  }, [refreshHosts]);

  const openLive = useCallback(
    async (sessionId: string) => {
      try {
        const res = await fetch(`/api/live/active-hosts?session=${encodeURIComponent(sessionId)}`, {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => ({}))) as { available?: boolean };
        if (json.available === false) {
          toast.message("This live has ended");
          void refreshHosts();
          return;
        }
      } catch {
        /* still try the session page; it has its own unavailable state */
      }
      router.push(`/communities/live/${sessionId}`);
    },
    [refreshHosts, router],
  );

  const value = useMemo<PresenceContextValue>(
    () => ({
      onlineIds,
      liveSessionId: (userId) => liveSessionForUser(hosts, userId),
      openLive,
    }),
    [hosts, onlineIds, openLive],
  );

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}
