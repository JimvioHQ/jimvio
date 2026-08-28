"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Trophy } from "lucide-react";
import {
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
} from "./UGCPageShell";

type Milestone = { id: string; label: string; done: boolean };
type Badge = {
  id: string;
  name?: string;
  description?: string;
  earned_at?: string;
  badge?: { id?: string; name?: string; description?: string } | null;
  badge_id?: string;
};

type AchievementsResponse = {
  xp?: number;
  level?: number;
  milestones?: Milestone[];
  badges?: Badge[] | string[];
  progress?: {
    approvals?: number;
    earnings?: number;
    next_level_xp?: number;
  };
};

export function UGCAchievementsPage() {
  const pathname = usePathname();
  const [data, setData] = useState<AchievementsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ugc/achievements", { cache: "no-store" });
      if (res.status === 403) {
        setError("Creator profile required for achievements.");
        setData(null);
        return;
      }
      if (!res.ok) throw new Error("load failed");
      setData(await res.json());
    } catch {
      setError("Could not load achievements.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, pathname]);

  const badges = (data?.badges ?? []).map((b) => {
    if (typeof b === "string") return { id: b, name: b.replace(/_/g, " ") };
    return {
      id: b.badge?.id || b.badge_id || b.id,
      name: b.badge?.name || b.name || (b.badge_id || b.id).replace(/_/g, " "),
      description: b.badge?.description || b.description,
      earned_at: b.earned_at,
    };
  });
  const milestones = data?.milestones ?? [];
  const xp = data?.xp ?? 0;
  const level = data?.level ?? 1;
  const nextXp = data?.progress?.next_level_xp ?? level * 500;
  const progressPct = Math.min(100, Math.round((xp / Math.max(1, nextXp)) * 100));

  return (
    <UGCPageShell
      titleKey="achievements"
      subtitleKey="achievementsSubtitle"
    >
      {loading ? <UGCPageLoading /> : null}
      {!loading && error ? <UGCPageError message={error} onRetry={load} /> : null}
      {!loading && !error && !data ? (
        <UGCPageEmpty
          title="No achievements yet"
          description="Submit and get approved content to start leveling up."
          illustration="default"
        />
      ) : null}

      {!loading && !error && data ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
              <p className="text-[10px] font-semibold uppercase text-[#9CA3AF]">Level</p>
              <p className="mt-1 text-3xl font-bold text-[#111827]">{level}</p>
            </div>
            <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
              <p className="text-[10px] font-semibold uppercase text-[#9CA3AF]">XP</p>
              <p className="mt-1 text-3xl font-bold text-[#FF5A1F]">{xp.toLocaleString()}</p>
            </div>
            <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
              <p className="text-[10px] font-semibold uppercase text-[#9CA3AF]">Next level</p>
              <p className="mt-1 text-3xl font-bold text-[#111827]">{nextXp.toLocaleString()}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F3F4F6]">
                <div
                  className="h-full rounded-full bg-[#FF5A1F]"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
            <h2 className="flex items-center gap-2 text-[14px] font-bold text-[#111827]">
              <Trophy className="h-4 w-4 text-[#FF5A1F]" />
              Badges
            </h2>
            {badges.length === 0 ? (
              <p className="mt-2 text-[13px] text-[#6B7280]">No badges earned yet.</p>
            ) : (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {badges.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-xl border border-[#FFE4D6] bg-[#FFF8F5] px-3 py-3"
                  >
                    <p className="text-[13px] font-bold capitalize text-[#111827]">
                      {b.name ?? b.id.replace(/_/g, " ")}
                    </p>
                    {b.description ? (
                      <p className="mt-1 text-[12px] text-[#6B7280]">{b.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
            <h2 className="text-[14px] font-bold text-[#111827]">Milestones</h2>
            <ul className="mt-3 space-y-2">
              {milestones.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-xl border border-[#F3F4F6] px-3 py-2.5"
                >
                  <span className="text-[13px] font-medium text-[#374151]">{m.label}</span>
                  <span
                    className={`text-[11px] font-bold uppercase ${
                      m.done ? "text-emerald-600" : "text-[#9CA3AF]"
                    }`}
                  >
                    {m.done ? "Done" : "Locked"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </UGCPageShell>
  );
}
