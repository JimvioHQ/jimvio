"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Target, Loader2, Search, ChevronRight, CheckCircle2 } from "lucide-react";
import { HubBadge, HubCard, HubLinkButton } from "@/components/community/hub/hub-ui";

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

  return (
    <div className="min-h-full bg-[var(--color-bg,#f4f4f5)]">
      <div className="mx-auto max-w-[960px] space-y-4 p-4 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-black tracking-tight">
              <Target className="h-5 w-5 text-[#fd5000]" />
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

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search missions…"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-4 text-[13px] focus:border-[#fd5000]/40 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "active", "completed"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-xl px-3 py-2 text-[12px] font-semibold capitalize transition-colors ${
                  filter === key
                    ? "bg-[#fd5000] text-white"
                    : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[#fd5000]/30"
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : filtered.length === 0 ? (
          <HubCard className="py-12 text-center">
            <Target className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
            <p className="text-[14px] font-bold">No missions found</p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Your communities have no active missions right now.
            </p>
          </HubCard>
        ) : (
          <div className="space-y-3">
            {filtered.map((mission) => (
              <Link key={mission.id} href={mission.href}>
                <HubCard className="group transition hover:border-[#fd5000]/30 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                        {mission.community_name}
                      </p>
                      <h2 className="mt-0.5 text-[15px] font-bold group-hover:text-[#fd5000]">{mission.title}</h2>
                      {mission.description && (
                        <p className="mt-1.5 line-clamp-2 text-[12px] text-[var(--color-text-secondary)]">
                          {mission.description}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-semibold text-[var(--color-text-muted)]">
                        <span>{mission.points} pts</span>
                        <span>{mission.completion_count} completions</span>
                        {mission.due_date && (
                          <span>Due {new Date(mission.due_date).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {mission.is_completed ? (
                        <HubBadge variant="orange">
                          <CheckCircle2 className="mr-0.5 inline h-3 w-3" />
                          Done
                        </HubBadge>
                      ) : (
                        <HubBadge variant="new">Active</HubBadge>
                      )}
                      <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-[#fd5000]" />
                    </div>
                  </div>
                </HubCard>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
