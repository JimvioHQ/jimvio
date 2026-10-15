"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Search, Target } from "lucide-react";
import { HubBadge, HubCard, HubLinkButton } from "@/components/community/hub/hub-ui";

type HubMission = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  points: number;
  reward_type?: string;
  completion_count: number;
  is_completed: boolean;
  participant_status?: string;
  community_name: string;
  href: string;
  category?: string | null;
  status?: string;
};

const FILTERS = [
  ["all", "All"],
  ["active", "Active"],
  ["in_progress", "In progress"],
  ["completed", "Completed"],
] as const;

export default function HubMissionsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missions, setMissions] = useState<HubMission[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all");
  const [cursor, setCursor] = useState<number | null>(null);

  const load = useCallback(async (nextCursor = 0, append = false) => {
    setLoading(!append);
    setError(null);
    try {
      const params = new URLSearchParams({ filter, cursor: String(nextCursor) });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      const res = await fetch(`/api/c/missions?${params.toString()}`);
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) throw new Error("Sign in to view missions.");
      if (!res.ok) throw new Error(json.error || "Could not load missions");
      setMissions((current) => append ? [...current, ...(json.missions ?? [])] : (json.missions ?? []));
      setCursor(json.nextCursor ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load missions");
    } finally {
      setLoading(false);
    }
  }, [filter, searchQuery]);

  useEffect(() => {
    const handle = window.setTimeout(() => { void load(0, false); }, 200);
    return () => window.clearTimeout(handle);
  }, [load]);

  return (
    <div className="min-h-full bg-[var(--color-bg,#f4f4f5)]">
      <div className="w-full space-y-4 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-black tracking-tight">
              <Target className="h-5 w-5 text-[#fd5000]" />
              Missions
            </h1>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">Community challenges you can join, submit, and complete.</p>
          </div>
          <HubLinkButton href="/owner/communities" variant="secondary">Manage missions</HubLinkButton>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search missions…" className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-4 text-[13px]" />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {FILTERS.map(([key, label]) => (
              <button key={key} type="button" onClick={() => setFilter(key)} className={`rounded-xl px-3 py-2 text-[12px] font-semibold ${filter === key ? "bg-[#fd5000] text-white" : "border border-[var(--color-border)] bg-[var(--color-surface)]"}`}>{label}</button>
            ))}
          </div>
        </div>
        {loading ? <div className="grid gap-3 sm:grid-cols-2">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-200/70" />)}</div> : error ? (
          <HubCard className="py-10 text-center">
            <p className="font-bold">Missions could not be loaded</p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">{error}</p>
            <button type="button" className="mt-4 rounded-xl bg-[#fd5000] px-4 py-2 text-[12px] font-semibold text-white" onClick={() => void load(0, false)}>Try again</button>
          </HubCard>
        ) : missions.length === 0 ? (
          <HubCard className="py-12 text-center">
            <Target className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
            <p className="text-[14px] font-bold">No missions found</p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">Published missions from your communities, and public missions, appear here.</p>
          </HubCard>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {missions.map((mission) => (
              <Link key={mission.id} href={mission.href}>
                <HubCard className="h-full">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">{mission.community_name}</p>
                  <h2 className="mt-1 text-[15px] font-bold">{mission.title}</h2>
                  {mission.description ? <p className="mt-1 line-clamp-2 text-[12px] text-[var(--color-text-secondary)]">{mission.description}</p> : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[var(--color-text-muted)]">
                    {mission.reward_type === "none" ? <span>No reward</span> : <span>{mission.points} pts</span>}
                    {mission.due_date ? <span>Due {new Date(mission.due_date).toLocaleDateString()}</span> : null}
                    {mission.is_completed ? <HubBadge variant="orange"><CheckCircle2 className="mr-0.5 inline h-3 w-3" />Done</HubBadge> : <HubBadge variant="new">{mission.participant_status || "Active"}</HubBadge>}
                  </div>
                </HubCard>
              </Link>
            ))}
          </div>
        )}
        {cursor != null && !loading ? <button type="button" className="w-full rounded-xl border py-2 text-[12px] font-semibold" onClick={() => void load(cursor, true)}>Load more</button> : null}
      </div>
    </div>
  );
}
