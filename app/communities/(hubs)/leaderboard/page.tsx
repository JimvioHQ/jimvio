"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Crown, Loader2, Trophy } from "lucide-react";
import { HubCard } from "@/components/community/hub/hub-ui";
import { cn } from "@/lib/utils";

type BoardTab = "creators" | "affiliates" | "ugc" | "communities" | "brands";

type RankRow = {
  id: string;
  name: string;
  subtitle?: string;
  score: number;
  href: string;
  rank: number;
};

const TABS: { id: BoardTab; label: string }[] = [
  { id: "creators", label: "Top creators" },
  { id: "affiliates", label: "Top affiliates" },
  { id: "ugc", label: "Top UGC" },
  { id: "communities", label: "Top communities" },
  { id: "brands", label: "Top brands" },
];

export default function CommunityLeaderboardPage() {
  const [tab, setTab] = useState<BoardTab>("creators");
  const [rows, setRows] = useState<RankRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [monthLabel, setMonthLabel] = useState("");

  useEffect(() => {
    setMonthLabel(
      new Date().toLocaleString("en-US", { month: "long", year: "numeric" })
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/c/hub/leaderboard?tab=${tab}`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          if (!res.ok) {
            setRows([]);
            setError(data.error || "Could not load leaderboard");
          } else {
            setRows(Array.isArray(data.rows) ? data.rows : []);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setRows([]);
          setError(err instanceof Error ? err.message : "Could not load leaderboard");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, reloadKey]);

  return (
    <div className="min-h-full bg-[var(--color-bg,#f4f4f5)]">
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-4 sm:px-6 lg:py-6">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black tracking-tight">
            <Trophy className="h-5 w-5 text-[#fd5000]" />
            Leaderboard
          </h1>
          <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
            Monthly rankings · {monthLabel || "This month"}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "h-8 rounded-full px-3 text-[11px] font-semibold",
                tab === t.id
                  ? "bg-[#111827] text-white"
                  : "border border-[var(--color-border)] bg-white text-[var(--color-text-muted)]"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : error ? (
          <HubCard className="py-10 text-center">
            <p className="font-bold">Leaderboard could not be loaded</p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">{error}</p>
            <button
              type="button"
              className="mt-4 rounded-xl bg-[#fd5000] px-4 py-2 text-[12px] font-semibold text-white"
              onClick={() => setReloadKey((key) => key + 1)}
            >
              Try again
            </button>
          </HubCard>
        ) : rows.length === 0 ? (
          <HubCard className="py-12 text-center">
            <Trophy className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
            <p className="text-[14px] font-bold">Rankings warming up</p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Keep creating — monthly scores appear as activity grows.
            </p>
          </HubCard>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <Link key={row.id} href={row.href}>
                <HubCard className="flex items-center gap-3 transition hover:border-[#fd5000]/30">
                  <span
                    className={cn(
                      "grid h-9 w-9 place-items-center rounded-xl text-[13px] font-black",
                      row.rank === 1 && "bg-[#FFF0E8] text-[#fd5000]",
                      row.rank === 2 && "bg-zinc-100 text-zinc-700",
                      row.rank === 3 && "bg-amber-50 text-amber-700",
                      row.rank > 3 && "bg-[#F9FAFB] text-[#6B7280]"
                    )}
                  >
                    {row.rank === 1 ? <Crown className="h-4 w-4" /> : row.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-[#111827]">{row.name}</p>
                    {row.subtitle ? (
                      <p className="truncate text-[11px] text-[var(--color-text-muted)]">
                        {row.subtitle}
                      </p>
                    ) : null}
                  </div>
                  <p className="text-[13px] font-bold tabular-nums text-[#fd5000]">
                    {row.score.toLocaleString()}
                  </p>
                </HubCard>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
