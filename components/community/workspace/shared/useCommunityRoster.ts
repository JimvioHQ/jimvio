"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  subscribePostgresChanges,
  unsubscribeRealtime,
} from "@/lib/supabase/realtime-subscribe";
import type { ChannelMemberRow } from "@/components/community/workspace/channel/panels/MembersPanel";

type RosterMember = ChannelMemberRow & {
  username?: string | null;
  joinedAt?: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type MembershipRow = {
  user_id: string;
  role: string | null;
  subscribed_at: string | null;
  profiles: ProfileRow | ProfileRow[] | null;
};

/**
 * Shared community roster for Group + Channel Members tabs.
 * One fetch pattern — avoids duplicate ad-hoc queries in panels.
 * Realtime membership changes update the list without a full page refresh.
 */
export function useCommunityRoster(communityId: string | null | undefined) {
  const [members, setMembers] = useState<RosterMember[]>([]);
  const [loading, setLoading] = useState(Boolean(communityId));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id: string, soft = false) => {
    if (!soft) {
      setLoading(true);
      setError(null);
    }
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("community_memberships")
      .select(
        `
          user_id, role, subscribed_at,
          profiles(id, full_name, username, avatar_url)
        `
      )
      .eq("community_id", id)
      .eq("status", "active")
      .order("subscribed_at", { ascending: false, nullsFirst: false })
      .limit(100);

    if (err) {
      setError(err.message);
      if (!soft) setMembers([]);
      setLoading(false);
      return;
    }

    const rows: RosterMember[] = ((data ?? []) as MembershipRow[]).map(
      (m: MembershipRow): RosterMember => {
        const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
        const name =
          profile?.full_name?.trim() ||
          profile?.username?.trim() ||
          "Member";
        return {
          id: m.user_id,
          name,
          username: profile?.username ?? null,
          avatarUrl: profile?.avatar_url ?? null,
          role: m.role ?? "member",
          status: "active",
          joinedAt: m.subscribed_at ?? null,
        };
      }
    );

    setMembers(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!communityId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    void load(communityId, false).then(() => {
      if (cancelled) return;
    });

    const supabase = createClient();
    let channel: Awaited<ReturnType<typeof subscribePostgresChanges>> = null;
    const channelName = `community_memberships:${communityId}`;
    let reloadTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleReload = () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => {
        if (!cancelled) void load(communityId, true);
      }, 200);
    };

    void (async () => {
      channel = await subscribePostgresChanges(
        supabase,
        channelName,
        {
          event: "*",
          schema: "public",
          table: "community_memberships",
          filter: `community_id=eq.${communityId}`,
        },
        () => {
          if (!cancelled) scheduleReload();
        },
        () => cancelled,
        {
          onStatus: (status) => {
            if (status === "SUBSCRIBED" && !cancelled) {
              void load(communityId, true);
            }
          },
        }
      );
    })();

    return () => {
      cancelled = true;
      if (reloadTimer) clearTimeout(reloadTimer);
      unsubscribeRealtime(supabase, channel, channelName);
    };
  }, [communityId, load]);

  return { members, loading, error };
}
