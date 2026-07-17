import Link from "next/link";
import { Circle, Mic, Users } from "lucide-react";
import { TOP_MISSIONS } from "@/lib/feed/mock-data";

const MISSION_ICONS = {
  circle: Circle,
  mic: Mic,
  users: Users,
} as const;

export function TopMissionsList() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-gray-900">Top Missions</h3>
        <Link href="/communities/missions" className="text-xs font-medium text-orange-500 hover:underline">
          View all
        </Link>
      </div>

      <ul className="space-y-3">
        {TOP_MISSIONS.map((mission) => {
          const Icon = MISSION_ICONS[mission.icon as keyof typeof MISSION_ICONS] ?? Circle;
          return (
            <li key={mission.name}>
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <Icon className="h-3.5 w-3.5 text-gray-500" strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                  {mission.name}
                </span>
                <span className="shrink-0 text-xs font-semibold text-[#2D8A4E]">{mission.reward}</span>
              </div>
              <div className="mt-1.5 ml-[42px] h-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gray-400"
                  style={{ width: `${mission.progress}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
