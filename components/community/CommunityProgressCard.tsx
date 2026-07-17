import { COMMUNITY_JOURNEY } from "@/lib/community/dashboard-mock-data";

export function CommunityProgressCard() {
  const { level, xp, xpGoal, challengesCompleted, riddlesCompleted, membersTotal, rank } =
    COMMUNITY_JOURNEY;
  const pct = Math.round((xp / xpGoal) * 100);

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Community Progress</h3>
        <span className="text-xs font-semibold text-orange-500">Level {level}</span>
      </div>
      <div className="mb-1 flex items-center justify-between text-[11px] text-gray-500">
        <span>
          {xp.toLocaleString()} / {xpGoal.toLocaleString()} XP
        </span>
        <span>{pct}%</span>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-orange-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="mb-4 grid flex-1 grid-cols-2 gap-2">
        {[
          { label: "Challenges", value: String(challengesCompleted), hint: "Completed" },
          { label: "Riddles", value: String(riddlesCompleted), hint: "Completed" },
          { label: "Members", value: membersTotal, hint: "Total" },
          { label: "Rank", value: rank, hint: "Community" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-gray-50 px-2.5 py-2.5 text-center">
            <p className="text-sm font-semibold text-gray-900">{s.value}</p>
            <p className="text-[10px] font-medium text-gray-500">{s.label}</p>
            <p className="text-[9px] text-gray-400">{s.hint}</p>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="w-full rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        View full progress
      </button>
    </div>
  );
}
