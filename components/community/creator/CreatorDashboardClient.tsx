"use client";

import React from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function CreatorRevenueChart({
  data,
}: {
  data: { date: string; amount: number }[];
}) {
  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center rounded-sm border border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
        No payment data in the last 30 days.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} />
          <YAxis tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} />
          <Tooltip
            contentStyle={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "12px",
            }}
          />
          <Line type="monotone" dataKey="amount" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CreatorSettingsButton({ communityId }: { communityId: string }) {
  return (
    <Link
      href={`/creator/${communityId}/spaces`}
      className="inline-flex items-center rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-bold text-[var(--color-text-primary)] hover:border-[var(--color-accent)]"
    >
      Settings
    </Link>
  );
}

