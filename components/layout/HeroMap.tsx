"use client";
import React, { useEffect, useState } from "react";

type GlobeEvent = {
  id: string;
  iconEmoji: string;
  iconBg: string;
  event: string;
  city: string;
  country: string;
  amount?: string;
  lat: number;
  lng: number;
  createdAt: string;
};

type GlobeStats = {
  totalUsers: number;
  totalOrders: number;
  activeCountries: number;
};

export function HeroMap() {
  const [events, setEvents] = useState<GlobeEvent[]>([]);
  const [stats, setStats] = useState<GlobeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch("/api/globe-data");
        const data = await res.json();
        if (!mounted) return;
        setEvents(Array.isArray(data.events) ? data.events : []);
        setStats(data.stats ?? null);
      } catch (e) {
        if (!mounted) return;
        setEvents([]);
        setStats(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="p-6 rounded-2xl" style={{ background: "var(--color-surface)" }}>
      <div className="flex gap-4 items-start">
        <div style={{ minWidth: 220 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Live Activity</h3>
          <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: 13 }}>Recent marketplace events</p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>Users</div>
              <div className="font-semibold">{loading ? "—" : stats?.totalUsers ?? "—"}</div>
            </div>
            <div className="text-center">
              <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>Orders</div>
              <div className="font-semibold">{loading ? "—" : stats?.totalOrders ?? "—"}</div>
            </div>
            <div className="text-center">
              <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>Countries</div>
              <div className="font-semibold">{loading ? "—" : stats?.activeCountries ?? "—"}</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ height: 220, borderRadius: 10, overflow: "hidden", background: "linear-gradient(180deg, rgba(0,0,0,0.03), transparent)" }}>
            {/* Lightweight placeholder map area: keep simple and performant */}
            <div style={{ padding: 12, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ width: 44, height: 44, borderRadius: 8, background: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700 }}>🌍</div>
                <div>
                  <div style={{ fontWeight: 700 }}>Global Snapshot</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{loading ? "Loading…" : `${events.length} recent events`}</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ flex: 1, height: 6, background: "rgba(0,0,0,0.06)", borderRadius: 6 }}>
                  <div style={{ width: `${Math.min(100, (events.length / 10) * 100)}%`, height: 6, background: "var(--color-accent)", borderRadius: 6 }} />
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{Math.min(10, events.length)} shown</div>
              </div>
            </div>
          </div>

          <div className="mt-3" style={{ maxHeight: 160, overflowY: "auto" }}>
            {loading ? (
              <div style={{ color: "var(--color-text-muted)" }}>Loading events…</div>
            ) : events.length === 0 ? (
              <div style={{ color: "var(--color-text-muted)" }}>No recent activity</div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {events.slice(0, 10).map((e) => (
                  <li key={e.id} style={{ display: "flex", gap: 10, padding: 8, alignItems: "center", borderBottom: "1px solid var(--color-border)" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: e.iconBg || "#eee", display: "flex", alignItems: "center", justifyContent: "center" }}>{e.iconEmoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{e.event}{e.amount ? ` — ${e.amount}` : ""}</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{e.city || e.country}</div>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{new Date(e.createdAt).toLocaleTimeString()}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeroMap;
