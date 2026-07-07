import Link from "next/link";
import { Check } from "lucide-react";
import { COMMUNITY_FEATURES, MOCK_COMMUNITY } from "@/lib/community/dashboard-mock-data";

export function AboutCommunityCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold text-gray-900">About {MOCK_COMMUNITY.name}</h3>
      <p className="mb-3 text-sm leading-relaxed text-gray-600">
        A community for UGC creators, traders, and digital entrepreneurs. Learn, collaborate, and earn together through
        live sessions, missions, and shared resources.
      </p>
      <ul className="mb-3 space-y-1.5">
        {COMMUNITY_FEATURES.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
            {f}
          </li>
        ))}
      </ul>
      <Link href="#" className="text-sm font-medium text-orange-500 hover:underline">
        Learn about us
      </Link>
    </div>
  );
}
