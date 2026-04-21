"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MemberRow = {
  user_id: string;
  role: string;
  total_points: number;
  level: number;
  joined_at: string | null;
  profile: { full_name: string | null; avatar_url: string | null; username: string | null } | null;
};

function roleLabel(role: string) {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  if (role === "moderator") return "Moderator";
  return "Member";
}

const FILTERS = ["All", "Admins", "Online"] as const;

export function WorkspaceMembersClient({ slug, members }: { slug: string; members: MemberRow[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const filtered = useMemo(() => {
    if (filter === "Online") return [];
    return members.filter((m) => {
      if (filter === "Admins") {
        const r = m.role;
        if (!["owner", "admin", "moderator"].includes(r)) return false;
      }
      const name = (m.profile?.full_name || m.profile?.username || "").toLowerCase();
      if (q.trim() && !name.includes(q.trim().toLowerCase())) return false;
      return true;
    });
  }, [members, q, filter]);

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
        <h1 className="text-xl font-black text-[var(--color-text-primary)]">Members</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">People in this community</p>
        <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <Input
            placeholder="Search by nameâ€¦"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-md rounded-none border-[var(--color-border)]"
          />
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-none text-xs font-black",
                  filter === f ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]" : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
                )}
              >
                {f}
                {f === "Online" && <span className="text-[10px] ml-1 opacity-70">(soon)</span>}
              </button>
            ))}
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-4">
        {filter === "Online" ? (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-12">Online presence is coming soon.</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-12">No members match your search.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((m) => (
              <div key={m.user_id} className="rounded-none border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-none flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-none overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)] shrink-0">
                    {m.profile?.avatar_url ? (
                      <Image src={m.profile.avatar_url} alt="" width={48} height={48} className="object-cover h-full w-full" unoptimized />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center font-black text-[var(--color-accent)]">
                        {(m.profile?.full_name || m.profile?.username || "?")[0]}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-[var(--color-text-primary)] truncate">{m.profile?.full_name || m.profile?.username || "Member"}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-none bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]">
                        {roleLabel(m.role)}
                      </span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-none bg-[var(--color-accent-light)] text-[var(--color-accent)]">Lvl {m.level}</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">{m.total_points.toLocaleString()} pts</p>
                    {m.joined_at && (
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Joined {new Date(m.joined_at).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
                <Button asChild variant="outline" className="rounded-none border-[var(--color-border)] font-bold w-full">
                  <Link href="/dashboard/messages">
                    <MessageCircle className="h-4 w-4 mr-2" /> Message
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

