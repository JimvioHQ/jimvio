// components/workspace/sections/MembersSection.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Crown, Search, Trophy, Users as UsersIcon } from "lucide-react";
import type { WorkspaceCommunity, WorkspaceView } from "@/types/workspace";

interface Member {
  user_id: string;
  role: string;
  subscribed_at: string | null;
  profiles: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface Props {
  community: WorkspaceCommunity;
  currentUserId: string;
  view: WorkspaceView;
  isAdmin: boolean;
}

export function MembersSection({ community, currentUserId, view, isAdmin }: Props) {
  const supabase = createClient();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from("community_memberships")
        .select(`
          user_id, role, subscribed_at,
          profiles(id, full_name, username, avatar_url)
        `)
        .eq("community_id", community.id)
        .eq("status", "active")
        .order("subscribed_at", { ascending: false, nullsFirst: false })
        .limit(50);
      if (!cancelled) {
        setMembers((data ?? []) as unknown as Member[]);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [community.id, supabase]);

  const filtered = members.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.profiles?.full_name?.toLowerCase().includes(q) ||
      m.profiles?.username?.toLowerCase().includes(q)
    );
  });

  // For now, "leaderboard" is just first 3 by join date — wire to XP later
  const top = members.slice(0, 3);

  return (
    <div className="flex flex-col gap-4">
      {/* Top performers */}
      <div className="bg-surface border border-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-3.5 h-3.5 text-[#fd5000]" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-primary">
            Top this week
          </span>
        </div>
        {loading ? (
          <div className="flex gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex-1 h-16 rounded-lg bg-surface-secondary animate-pulse" />
            ))}
          </div>
        ) : top.length === 0 ? (
          <p className="text-[12px] text-text-muted text-center py-4">Leaderboard coming soon</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {top.map((m, i) => {
              const name = m.profiles?.full_name ?? m.profiles?.username ?? "Member";
              const isFirst = i === 0;
              return (
                <div
                  key={m.user_id}
                  className={`text-center p-3 rounded-xl ${
                    isFirst ? "bg-[#fd5000]/10 ring-1 ring-[#fd5000]/30" : "bg-surface-secondary"
                  }`}
                >
                  <div className="relative inline-block mb-2">
                    {m.profiles?.avatar_url ? (
                      <img
                        src={m.profiles.avatar_url}
                        alt={name}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-border"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ring-2 ring-border" style={{ background: "#fd5000" }}>
                        {name[0]?.toUpperCase()}
                      </div>
                    )}
                    {isFirst && (
                      <Crown className="absolute -top-2 -right-1 w-4 h-4 text-[#fd5000]" fill="#fd5000" />
                    )}
                  </div>
                  <p className="text-[11px] font-semibold text-text-primary truncate">{name}</p>
                  <p className="text-[10px] text-text-muted">#{i + 1}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Search + count */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members..."
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-[12px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#fd5000]/50 focus:ring-2 focus:ring-[#fd5000]/10 transition-all"
          />
        </div>
        <span className="text-[11px] font-semibold text-text-muted">
          {community.member_count.toLocaleString()} members
        </span>
      </div>

      {/* Member list */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-surface-secondary animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-12 flex flex-col items-center text-center">
          <UsersIcon className="w-7 h-7 text-text-muted mb-2" />
          <p className="text-[12px] text-text-muted">No members match "{search}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((m) => <MemberCard key={m.user_id} member={m} canModerate={isAdmin && view === "admin"} />)}
        </div>
      )}
    </div>
  );
}

function MemberCard({ member, canModerate }: { member: Member; canModerate: boolean }) {
  const p = member.profiles;
  const name = p?.full_name ?? p?.username ?? "Member";
  const isStaff = member.role === "admin" || member.role === "moderator" || member.role === "owner";

  return (
    <Link
      href={p?.username ? `/u/${p.username}` : "#"}
      className="group bg-surface border border-border rounded-xl p-3 flex flex-col items-center text-center hover:border-[#fd5000]/30 transition-all"
    >
      <div className="relative mb-2">
        {p?.avatar_url ? (
          <img
            src={p.avatar_url}
            alt={name}
            className="w-12 h-12 rounded-full object-cover ring-2 ring-border group-hover:ring-[#fd5000]/40 transition-all"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ring-2 ring-border group-hover:ring-[#fd5000]/40 transition-all"
            style={{ background: `hsl(${name.charCodeAt(0) % 360}, 65%, 50%)` }}
          >
            {name[0]?.toUpperCase()}
          </div>
        )}
        {isStaff && (
          <div className="absolute -bottom-1 -right-1 bg-[#fd5000] text-white text-[8px] font-bold tracking-wider px-1.5 py-0.5 rounded-full">
            {member.role.toUpperCase()}
          </div>
        )}
      </div>
      <p className="text-[12px] font-semibold text-text-primary truncate w-full group-hover:text-[#fd5000] transition-colors">
        {name}
      </p>
      {p?.username && (
        <p className="text-[10px] text-text-muted truncate w-full">@{p.username}</p>
      )}
      {canModerate && (
        <span className="mt-2 text-[9px] font-bold text-[#fd5000] uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
          Manage →
        </span>
      )}
    </Link>
  );
}