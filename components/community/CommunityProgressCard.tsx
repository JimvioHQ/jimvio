import { MOCK_COMMUNITY } from "@/lib/community/dashboard-mock-data";

export function CommunityProgressCard() {
  const pct = Math.round((MOCK_COMMUNITY.xp / MOCK_COMMUNITY.xpGoal) * 100);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Community Progress</h3>
        <span className="text-xs font-medium text-orange-500">Level {MOCK_COMMUNITY.level}</span>
      </div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-orange-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="mb-3 grid grid-cols-4 gap-2">
        {[
          { label: "Challenges", value: "24" },
          { label: "Missions", value: "18" },
          { label: "Members", value: "2.1K" },
          { label: "Top %", value: "12%" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-gray-50 p-2 text-center">
            <p className="text-sm font-semibold text-gray-900">{s.value}</p>
            <p className="text-[10px] text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>
      <button type="button" className="w-full rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
        View full progress
      </button>
    </div>
  );
}
