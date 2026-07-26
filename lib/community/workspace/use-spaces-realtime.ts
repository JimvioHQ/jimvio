"use client";

/**
 * Live Space list updates for a community (member joins do not fan out here —
 * membership is community-scoped; this tracks space row mutations).
 */

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  subscribePostgresChangesMany,
  unsubscribeRealtime,
} from "@/lib/supabase/realtime-subscribe";

type Options = {
  communityId: string | null | undefined;
  enabled?: boolean;
  onChange: () => void;
};

export function useSpacesRealtime({
  communityId,
  enabled = true,
  onChange,
}: Options) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !communityId) return;

    const supabase = createClient();
    let cancelled = false;
    let channel: Awaited<ReturnType<typeof subscribePostgresChangesMany>> = null;
    const channelName = `spaces_live:${communityId}`;

    const remember = (key: string) => {
      if (seenRef.current.has(key)) return false;
      seenRef.current.add(key);
      if (seenRef.current.size > 200) {
        seenRef.current = new Set([...seenRef.current].slice(-100));
      }
      return true;
    };

    void (async () => {
      channel = await subscribePostgresChangesMany(
        supabase,
        channelName,
        [
          {
            config: {
              event: "*",
              schema: "public",
              table: "spaces",
              filter: `community_id=eq.${communityId}`,
            },
            onChange: (payload) => {
              const row = (payload?.new ?? payload?.old ?? {}) as {
                id?: string;
                updated_at?: string;
                archived_at?: string | null;
              };
              const key = `${payload?.eventType}:${row.id}:${row.updated_at ?? row.archived_at ?? ""}`;
              if (!remember(key)) return;
              onChangeRef.current();
            },
          },
        ],
        () => cancelled
      );
    })();

    return () => {
      cancelled = true;
      unsubscribeRealtime(supabase, channel, channelName);
    };
  }, [communityId, enabled]);
}
