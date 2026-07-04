import { COMMUNITY_RULES } from "@/lib/community/dashboard-mock-data";
import { Shield } from "lucide-react";

export function CommunityRulesCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Community Rules</h3>
      <ul className="mb-3 space-y-2">
        {COMMUNITY_RULES.map((rule) => (
          <li key={rule} className="flex items-start gap-2 text-sm text-gray-700">
            <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
            {rule}
          </li>
        ))}
      </ul>
      <button type="button" className="text-sm font-medium text-orange-500 hover:underline">
        View all rules
      </button>
    </div>
  );
}
