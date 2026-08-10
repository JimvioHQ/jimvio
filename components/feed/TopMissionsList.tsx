"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Target } from "lucide-react";

type HubMission = {
  id: string;
  title: string;
  points: number;
  is_completed: boolean;
  href: string;
  community_name: string;
};

/** Compact mission rows — real `/api/c/missions` data. */
export function TopMissionsList() {
  const [missions, setMissions] = useState<HubMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch("/api/c/missions", { cache: "no-store" });
        if (res.status === 401) {
          if (!cancelled) setMissions([]);
          return;
        }
        if (!res.ok) {
          if (!cancelled) {
            setMissions([]);
            setError(true);
          }
          return;
        }
        const json = (await res.json()) as { missions?: HubMission[] };
        const list = (json.missions ?? [])
          .filter((m) => !m.is_completed)
          .slice(0, 3);
        if (!cancelled) setMissions(list.length ? list : (json.missions ?? []).slice(0, 3));
      } catch {
        if (!cancelled) {
          setMissions([]);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h3 className="text-[12px] font-bold text-gray-900">Top Missions</h3>
        <Link
          href="/communities/missions"
          className="text-[11px] font-medium text-[#FF5A1F] hover:underline"
        >
          View all
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" aria-hidden />
        </div>
      ) : error ? (
        <p className="py-2 text-[11px] text-gray-500">Couldn’t load missions right now.</p>
      ) : missions.length === 0 ? (
        <p className="py-2 text-[11px] text-gray-500">No active missions yet.</p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {missions.map((mission) => (
            <li key={mission.id}>
              <Link
                href={mission.href || "/communities/missions"}
                className="flex items-center gap-2 py-1.5 transition-colors hover:bg-gray-50/80"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <Target className="h-3 w-3 text-gray-500" strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-medium text-gray-900">
                    {mission.title}
                  </span>
                  <span className="block truncate text-[10px] text-gray-400">
                    {mission.community_name}
                  </span>
                </span>
                <span className="shrink-0 text-[11px] font-semibold text-[#FF5A1F]">
                  +{mission.points} XP
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
