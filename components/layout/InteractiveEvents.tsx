"use client";
import React, { useMemo, useState } from "react";

type GlobeEvent = {
  id: string;
  event: string;
  city?: string;
  country?: string;
  amount?: string;
  createdAt?: string;
  lat?: number;
  lng?: number;
};

export function InteractiveEvents({ events }: { events: GlobeEvent[] }) {
  const [filter, setFilter] = useState("");
  const filtered = useMemo(() => events.filter(e => !filter || (e.event || "").toLowerCase().includes(filter.toLowerCase())), [events, filter]);

  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold">Recent Events</h4>
        <input placeholder="Filter" value={filter} onChange={e => setFilter(e.target.value)} className="text-sm p-1 rounded border border-border" />
      </div>

      <div style={{ maxHeight: 180, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div className="text-text-muted text-sm">No events</div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {filtered.slice(0, 12).map(ev => (
              <li key={ev.id} className="py-2 border-b border-border flex justify-between items-center">
                <div>
                  <div className="font-medium text-sm">{ev.event}{ev.amount ? ` — ${ev.amount}` : ""}</div>
                  <div className="text-xs text-text-muted">{ev.city ?? ev.country}</div>
                </div>
                <div className="text-xs text-text-muted text-right">
                  {ev.createdAt ? new Date(ev.createdAt).toLocaleString() : ""}
                  <div className="text-[11px]">{ev.lat ? `${ev.lat.toFixed(2)}, ${ev.lng?.toFixed(2)}` : ""}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default InteractiveEvents;
