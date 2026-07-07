"use client";

import { ChevronDown } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, XAxis } from "recharts";
import { RightRailCard } from "@/components/shell/RightRailCard";
import { CREATOR_INSIGHTS, INSIGHTS_CHART_DATA } from "@/lib/feed/mock-data";

export function CreatorInsightsCard() {
  return (
    <RightRailCard title="Creator Insights" headerExtra={
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-100"
        >
          This Month
          <ChevronDown className="h-3 w-3" />
        </button>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-3">
        {CREATOR_INSIGHTS.map((metric) => (
          <div key={metric.label}>
            <p className="text-lg font-semibold tabular-nums text-gray-900">{metric.value}</p>
            <div className="flex items-center justify-between gap-1">
              <p className="text-[11px] text-gray-500">{metric.label}</p>
              <span className="text-[11px] font-medium text-green-500">{metric.delta}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={INSIGHTS_CHART_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="insightGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F97316" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#F97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fill: "#9CA3AF" }}
              interval="preserveStartEnd"
            />
            <Area
              type="monotone"
              dataKey="v"
              stroke="#F97316"
              strokeWidth={2}
              fill="url(#insightGrad)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </RightRailCard>
  );
}
