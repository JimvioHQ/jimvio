import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { COMMUNITY_ABOUT, MOCK_COMMUNITY } from "@/lib/community/dashboard-mock-data";

export function AboutCommunityCard() {
  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold text-gray-900">
        About {MOCK_COMMUNITY.name}
      </h3>
      <p className="mb-3 text-sm leading-relaxed text-gray-600">
        {COMMUNITY_ABOUT.summary}
      </p>
      <ul className="mb-4 flex-1 space-y-1.5">
        {COMMUNITY_ABOUT.highlights.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" strokeWidth={2.5} />
            {f}
          </li>
        ))}
      </ul>
      <Link
        href="#"
        className="inline-flex items-center gap-1 text-sm font-medium text-orange-500 hover:underline"
      >
        Learn more about us
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
