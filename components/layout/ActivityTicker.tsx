"use client";
import React from "react";
import { TICKER_ITEMS } from "@/data/dashboard";

export function ActivityTicker() {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface p-2">
      <div style={{ whiteSpace: "nowrap", display: "flex", gap: 24, animation: "marquee 18s linear infinite" }}>
        {TICKER_ITEMS.map((t, i) => (
          <div key={i} className="text-sm text-text-primary" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontWeight: 700, color: "var(--color-accent)" }}>{t.text}</span>
            <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>{t.time}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}</style>
    </div>
  );
}

export default ActivityTicker;
