"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
 */
export function useCommunityRoster(communityId: string | null | undefined) {
  const [members, setMembers] = useState<RosterMember[]>([]);
  const [loading, setLoading] = useState(Boolean(communityId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!communityId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    async function load() {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from("community_memberships")
        .select(
          `
          user_id, role, subscribed_at,
          profiles(id, full_name, username, avatar_url)
        `
        )
        .eq("community_id", communityId)
        .eq("status", "active")
        .order("subscribed_at", { ascending: false, nullsFirst: false })
        .limit(100);

      if (cancelled) return;

      if (err) {
        setError(err.message);
        setMembers([]);
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
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [communityId]);

  return { members, loading, error };
}
