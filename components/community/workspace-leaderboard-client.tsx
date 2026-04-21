"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export type LeaderRow = {
  user_id: string;
  total_points: number;
  level: number;
  last_active_at: string | null;
  created_at: string | null;
  profile: { full_name: string | null; avatar_url: string | null; username: string | null } | null;
};

const TABS = ["This Week", "This Month", "All Time"] as const;

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = x.getDate() - day + (day === 0 ? -6 : 1);
  x.setDate(diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function WorkspaceLeaderboardClient({
  rows,
  currentUserId,
}: {
  rows: LeaderRow[];
  currentUserId: string;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("All Time");

  const filtered = useMemo(() => {
    const now = new Date();
    if (tab === "All Time") return rows;
    const start = tab === "This Week" ? startOfWeek(now) : startOfMonth(now);
    return rows.filter((r) => {
      const ref = r.last_active_at || r.created_at;
      if (!ref) return true;
      return new Date(ref) >= start;
    });
  }, [rows, tab]);

  const ranked = useMemo(
    () => [...filtered].sort((a, b) => (b.total_points ?? 0) - (a.total_points ?? 0)),
    [filtered]
  );

  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
        <h1 className="text-xl font-black text-[var(--color-text-primary)]">Community Leaderboard</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Top members {tab === "All Time" ? "(all time)" : tab.toLowerCase()}</p>
        <div className="flex gap-2 mt-4 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-black",
                tab === t ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]" : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        {top3.length > 0 && (
          <div className="flex justify-center items-end gap-3 sm:gap-6">
            {top3[1] && (
              <Podium place={2} row={top3[1]} currentUserId={currentUserId} />
            )}
            {top3[0] && (
              <Podium place={1} row={top3[0]} currentUserId={currentUserId} large />
            )}
            {top3[2] && (
              <Podium place={3} row={top3[2]} currentUserId={currentUserId} />
            )}
          </div>
        )}

        <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60">
                <th className="text-left py-2 px-3 text-[10px] font-black uppercase text-[var(--color-text-muted)]">Rank</th>
                <th className="text-left py-2 px-3 text-[10px] font-black uppercase text-[var(--color-text-muted)]">Member</th>
                <th className="text-right py-2 px-3 text-[10px] font-black uppercase text-[var(--color-text-muted)]">Level</th>
                <th className="text-right py-2 px-3 text-[10px] font-black uppercase text-[var(--color-text-muted)]">Points</th>
                <th className="text-right py-2 px-3 text-[10px] font-black uppercase text-[var(--color-text-muted)] hidden sm:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r, i) => (
                <tr
                  key={r.user_id}
                  className={cn(
                    "border-b border-[var(--color-border)] last:border-0",
                    r.user_id === currentUserId && "bg-[var(--color-accent-light)]/50"
                  )}
                >
                  <td className="py-2 px-3 font-black text-[var(--color-text-muted)]">{i + 1}</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                        {r.profile?.avatar_url ? (
                          <Image src={r.profile.avatar_url} alt="" width={32} height={32} className="object-cover h-full w-full" unoptimized />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[10px] font-black text-[var(--color-accent)]">
                            {(r.profile?.full_name || r.profile?.username || "?")[0]}
                          </div>
                        )}
                      </div>
                      <span className="font-bold text-[var(--color-text-primary)] truncate">
                        {r.profile?.full_name || r.profile?.username || "Member"}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right font-bold">{r.level}</td>
                  <td className="py-2 px-3 text-right font-black text-[var(--color-accent)]">{r.total_points.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right text-[var(--color-text-muted)] text-xs hidden sm:table-cell">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : "â€”"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Podium({
  place,
  row,
  large,
  currentUserId,
}: {
  place: number;
  row: LeaderRow;
  large?: boolean;
  currentUserId: string;
}) {
  const h = large ? "h-36" : "h-28";
  return (
    <div className={cn("flex flex-col items-center text-center", large && "order-2 sm:order-none")}>
      <div
        className={cn(
          "relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-sm flex flex-col items-center",
          h,
          row.user_id === currentUserId && "ring-2 ring-[var(--color-accent)]"
        )}
      >
        <div className="h-14 w-14 rounded-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
          {row.profile?.avatar_url ? (
            <Image src={row.profile.avatar_url} alt="" width={56} height={56} className="object-cover h-full w-full" unoptimized />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-lg font-black text-[var(--color-accent)]">
              {(row.profile?.full_name || row.profile?.username || "?")[0]}
            </div>
          )}
        </div>
        <p className="text-xs font-black mt-2 truncate max-w-[120px]">{row.profile?.full_name || row.profile?.username}</p>
        <p className="text-[10px] font-black text-[var(--color-accent)]">{row.total_points.toLocaleString()} pts</p>
      </div>
      <div className="mt-2 text-lg font-black text-[var(--color-text-muted)]">#{place}</div>
    </div>
  );
}
