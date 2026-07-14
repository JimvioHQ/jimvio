"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Target, Loader2, Search, ChevronRight, CheckCircle2, Star, Shield, Zap, Clock, Flag } from "lucide-react";
import { HubBadge, HubCard, HubLinkButton, HubStatCard } from "@/components/community/hub/hub-ui";
import { cn } from "@/lib/utils";

type HubMission = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  points: number;
  completion_count: number;
  is_completed: boolean;
  community_name: string;
  community_slug: string;
  href: string;
  difficulty?: "easy" | "medium" | "hard";
  category?: string;
};

export default function HubMissionsPage() {
  const [loading, setLoading] = useState(true);
  const [missions, setMissions] = useState<HubMission[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/c/missions");
        if (!res.ok) return;
        const json = (await res.json()) as { missions: HubMission[] };
        if (!cancelled) setMissions(json.missions ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    return missions
      .filter((mission) => {
        const matchesSearch =
          mission.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          mission.community_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter =
          filter === "all" ||
          (filter === "completed" && mission.is_completed) ||
          (filter === "active" && !mission.is_completed);
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
        if (a.due_date && b.due_date) {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        return 0;
      });
  }, [missions, searchQuery, filter]);

  const stats = useMemo(() => ({
    total: missions.length,
    active: missions.filter(m => !m.is_completed).length,
    completed: missions.filter(m => m.is_completed).length,
    totalPoints: missions.reduce((sum, m) => sum + m.points, 0),
  }), [missions]);

  return (
    <div className="min-h-full bg-[var(--color-bg)]"
         style={{
           backgroundImage: `radial-gradient(circle at 50% -20%, var(--color-accent)/5, transparent 50%), radial-gradient(circle at 100% 100%, var(--color-social)/3, transparent 40%)`,
         }}>
      <div className="mx-auto flex max-w-[1000px] flex-col gap-6 p-4 lg:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-[var(--color-text-primary)]">
              <Target className="h-5 w-5 text-[var(--color-accent)]" />
              Missions
            </h1>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Community challenges and tasks to complete
            </p>
          </div>
          <HubLinkButton href="/communities" variant="secondary">
            Find communities
          </HubLinkButton>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 animate-in stagger-children">
          <HubStatCard label="Total" value={stats.total} icon={<Target className="h-4 w-4" />} accent="var(--color-accent)" />
          <HubStatCard label="Active" value={stats.active} icon={<Flag className="h-4 w-4" />} accent="#4fc3f7" />
          <HubStatCard label="Completed" value={stats.completed} icon={<CheckCircle2 className="h-4 w-4" />} accent="#81c784" />
          <HubStatCard label="Total XP" value={stats.totalPoints.toLocaleString()} icon={<Star className="h-4 w-4" />} accent="#ffb74d" />
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col gap-3 sm:flex-row animate-in animate-slide-in-down">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search missions…"
              className="w-full rounded-xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur py-2.5 pl-10 pr-4 text-[13px] transition-colors focus:border-[var(--color-accent)]/40 focus:outline-none focus:bg-[var(--color-surface)]"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "active", "completed"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-xl px-4 py-2 text-[12px] font-semibold capitalize transition-all",
                  filter === key
                    ? "bg-[var(--color-accent)] text-white shadow-[0_2px_8px_rgba(253,80,0,0.3)]"
                    : "border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-surface)]",
                )}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        {/* Missions list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-8 text-center animate-in animate-fade-in">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent)]/10">
              <Target className="h-7 w-7 text-[var(--color-accent)]" />
            </div>
            <p className="text-[14px] font-bold text-[var(--color-text-primary)]">No missions found</p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              {searchQuery || filter !== "all"
                ? "Try adjusting your search or filter"
                : "Your communities have no active missions right now."}
            </p>
          </div>
        ) : (
          <div className="space-y-3 animate-in stagger-children">
            {filtered.map((mission, index) => (
              <Link key={mission.id} href={mission.href}>
                <div className={cn(
                  "group relative overflow-hidden rounded-2xl border transition-all duration-300 hover-lift animate-in animate-fade-in-up",
                  mission.is_completed
                    ? "border-[var(--color-growth)]/30 bg-gradient-to-br from-[var(--color-growth)]/5 to-transparent"
                    : "border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur"
                )}>
                  {/* Completion overlay */}
                  {mission.is_completed && (
                    <div className="absolute inset-0 -z-10 opacity-10" style={{ background: "linear-gradient(135deg, var(--color-growth), transparent)" }} />
                  )}

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                            {mission.community_name}
                          </p>
                          {mission.difficulty && (
                            <HubBadge variant={mission.difficulty === "easy" ? "default" : mission.difficulty === "medium" ? "orange" : "live"}>
                              {mission.difficulty}
                            </HubBadge>
                          )}
                        </div>
                        <h2 className="mt-1 text-[15px] font-black leading-tight group-hover:text-[var(--color-accent)] transition-colors">
                          {mission.title}
                        </h2>
                        {mission.description && (
                          <p className="mt-2 line-clamp-2 text-[12px] text-[var(--color-text-secondary)]">
                            {mission.description}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-[var(--color-text-muted)]">
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-[var(--color-events)]" />
                            {mission.points} XP {mission.points}
                          </span>
                          <span className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            {mission.completion_count} completions
                          </span>
                          {mission.due_date && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Due {new Date(mission.due_date).toLocaleDateString()}
                            </span>
                          )}
                          {mission.category && (
                            <HubBadge variant="default">{mission.category}</HubBadge>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {mission.is_completed ? (
                          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span className="text-[11px] font-bold">Completed</span>
                          </div>
                        ) : (
                          <HubBadge variant="new">Active</HubBadge>
                        )}
                        <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors" />
                      </div>
                    </div>
                  </div>

                  {/* Progress indicator for active missions */}
                  {!mission.is_completed && mission.due_date && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-events)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}