"use client";

import Link from "next/link";
import { CalendarClock, Loader2 } from "lucide-react";
import { useHubLiveRail } from "@/components/feed/use-hub-live-rail";

/** Compact upcoming lives — shared hub live data; hidden when empty. */
export function UpcomingLiveSessions() {
  const { upcoming, loading } = useHubLiveRail();

  if (loading) {
    return (
      <section className="flex justify-center rounded-xl border border-gray-200 bg-white py-4">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" aria-hidden />
      </section>
    );
  }
  if (upcoming.length === 0) return null;

  return (
    <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <h3 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-900">
        <CalendarClock className="h-3 w-3 text-gray-500" aria-hidden />
        Upcoming Live
      </h3>
      <ul className="divide-y divide-gray-100">
        {upcoming.map((session) => (
          <li key={session.id}>
            <Link
              href={session.href}
              className="flex items-center justify-between gap-2 py-1.5 transition-colors hover:bg-gray-50/80"
            >
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-gray-900">
                  {session.title}
                </p>
                <p className="truncate text-[10.5px] text-gray-500">
                  {session.subtitle ?? session.host}
                </p>
              </div>
              <span className="shrink-0 text-[11px] font-semibold text-[#FF5A1F]">View</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
