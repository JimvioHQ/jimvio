import { RightRailCard } from "@/components/shell/RightRailCard";
import { UPCOMING_LIVE } from "@/lib/feed/mock-data";
import { getInitials } from "@/lib/utils";

export function UpcomingLiveSessions() {
  return (
    <RightRailCard title="Upcoming Live Sessions" action={{ label: "View all", href: "/communities/events" }}>
      <ul className="space-y-3">
        {UPCOMING_LIVE.map((session) => (
          <li key={session.id} className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
              {getInitials(session.host)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{session.title}</p>
              <p className="text-xs text-gray-500">
                {session.host} · {session.time}
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Join
            </button>
          </li>
        ))}
      </ul>
    </RightRailCard>
  );
}
