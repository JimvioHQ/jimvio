import { useRouter } from "next/navigation";
import { useWorkspace } from "@/components/community/workspace-context";

export function CommunityProgressCard() {
  const router = useRouter();
  const { slug, points, overview, memberCount } = useWorkspace();

  const level = points?.level ?? 1;
  const pct = points
    ? Math.round(
        ((points.total_points - points.level_start_xp) /
          Math.max(1, points.next_level_xp - points.level_start_xp)) *
          100
      )
    : 0;

  const stats = [
    { label: "Challenges", value: (overview?.progressBreakdown?.challenges ?? 0).toString() },
    { label: "Missions", value: (overview?.progressBreakdown?.riddles ?? 0).toString() },
    { label: "Members", value: (memberCount ?? 0).toLocaleString() },
    { label: "Top %", value: `${overview?.progressBreakdown?.rankPercent ?? 12}%` },
  ];

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-4 flex flex-col justify-between">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Community Progress</h3>
          <span className="text-xs font-bold text-orange-500">Level {level}</span>
        </div>
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
          <div className="h-full rounded-full bg-orange-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="mb-4 grid grid-cols-4 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg bg-gray-50 dark:bg-white/5 p-2 text-center">
              <p className="text-sm font-bold text-gray-900 dark:text-white">{s.value}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <button
          type="button"
          onClick={() => router.push(`/c/${slug}/missions`)}
          className="w-full rounded-lg border border-gray-200 dark:border-white/10 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 outline-none"
        >
          View full progress
        </button>
      </div>
    </div>
  );
}
