"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, Loader2 } from "lucide-react";

type LiveHit = {
  id: string;
  title: string;
  subtitle?: string | null;
  href: string;
};

/** Upcoming public lives — real discovery data; hidden when empty. */
export function UpcomingLiveSessions() {
  const [items, setItems] = useState<LiveHit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/discover/recommendations?entity=live&limit=6");
        const json = (await res.json().catch(() => ({}))) as {
          results?: LiveHit[];
          hits?: LiveHit[];
          shelves?: Array<{ items?: LiveHit[] }>;
        };
        if (cancelled) return;
        const hits =
          json.results ??
          json.hits ??
          json.shelves?.flatMap((s) => s.items ?? []) ??
          [];
        const upcoming = hits.filter(
          (h) => !(h.subtitle ?? "").toLowerCase().includes("live now")
        );
        setItems((upcoming.length ? upcoming : hits).slice(0, 4));
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="flex justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" aria-hidden />
      </section>
    );
  }
  if (items.length === 0) return null;

  return (
    <section>
      <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-900">
        <CalendarClock className="h-3.5 w-3.5" aria-hidden />
        Upcoming Live
      </h3>
      <ul className="space-y-2">
        {items.map((session) => (
          <li key={session.id}>
            <Link
              href={session.href}
              className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5 ring-1 ring-gray-100 transition hover:bg-gray-50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{session.title}</p>
                <p className="truncate text-xs text-gray-500">{session.subtitle ?? "Scheduled"}</p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-orange-600">View</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
