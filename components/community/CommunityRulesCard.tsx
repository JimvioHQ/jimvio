import { COMMUNITY_RULES_PRIMARY } from "@/lib/community/dashboard-mock-data";

export function CommunityRulesCard() {
  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Community Rules</h3>
      <ol className="mb-4 flex-1 space-y-2.5">
        {COMMUNITY_RULES_PRIMARY.map((rule, i) => (
          <li key={rule} className="flex gap-2.5 text-sm leading-snug text-gray-700">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-gray-500">
              {i + 1}
            </span>
            <span>{rule}</span>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="text-left text-sm font-medium text-orange-500 hover:underline"
      >
        View all rules
      </button>
    </div>
  );
}
