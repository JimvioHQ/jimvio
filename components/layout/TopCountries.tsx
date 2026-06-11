"use client";
import React from "react";

type Event = { id: string; country?: string | null; city?: string | null };

export function TopCountries({ events }: { events: Event[] }) {
  const counts: Record<string, number> = {};
  for (const e of events) {
    const c = (e.country || e.city || "Unknown").toString();
    counts[c] = (counts[c] || 0) + 1;
  }
  const list = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <h4 className="text-sm font-semibold mb-2">Top Countries</h4>
      <ul className="text-sm text-text-primary space-y-1">
        {list.map(([country, n]) => (
          <li key={country} className="flex justify-between">
            <span className="truncate">{country}</span>
            <span className="text-text-muted">{n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TopCountries;
