"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, Eye, Users } from "lucide-react";
import type { UGCCampaign } from "@/types/ugc";
import { useCurrency } from "@/context/CurrencyContext";

export default function CampaignCenterAnalyticsPage() {
  const { formatMoney } = useCurrency();
  const [campaigns, setCampaigns] = useState<UGCCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ugc/campaigns?status=all&limit=50&mine=true")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setCampaigns(j.data ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(() => {
    return {
      campaigns: campaigns.length,
      active: campaigns.filter((c) => c.status === "active").length,
      views: campaigns.reduce((s, c) => s + (c.total_views_tracked ?? 0), 0),
      spent: campaigns.reduce((s, c) => s + (c.spent_budget ?? 0), 0),
      budget: campaigns.reduce((s, c) => s + (c.total_budget ?? 0), 0),
      creators: campaigns.reduce((s, c) => s + (c.approved_count ?? 0), 0),
    };
  }, [campaigns]);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#FF5A1F]">
        Campaign Center
      </p>
      <h1 className="mt-1 text-[24px] font-bold tracking-tight text-[#111827] sm:text-[28px]">
        Analytics
      </h1>
      <p className="mt-1 text-[13px] text-[#6B7280]">
        Performance overview across your owned campaigns.
      </p>

      {loading ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-[#F3F4F6]" />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={BarChart3} label="Campaigns" value={String(totals.campaigns)} />
            <Stat icon={Eye} label="Views tracked" value={totals.views.toLocaleString()} />
            <Stat
              icon={Users}
              label="Approved creators"
              value={totals.creators.toLocaleString()}
            />
            <Stat
              icon={BarChart3}
              label="Spend"
              value={`${formatMoney(totals.spent, "USD")} / ${formatMoney(totals.budget, "USD")}`}
            />
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-[#EEF0F2] bg-white">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#F9FAFB] text-[11px] uppercase tracking-wide text-[#9CA3AF]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Campaign</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Views</th>
                  <th className="px-4 py-3 font-semibold">Spend</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-t border-[#F3F4F6]">
                    <td className="px-4 py-3">
                      <Link href={`/ugc/${c.id}`} className="font-semibold text-[#111827] hover:text-[#FF5A1F]">
                        {c.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 capitalize text-[#6B7280]">{c.status}</td>
                    <td className="px-4 py-3 tabular-nums">{(c.total_views_tracked ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatMoney(c.spent_budget ?? 0, "USD")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#EEF0F2] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[#9CA3AF]">
        <Icon className="h-4 w-4" />
        <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-[20px] font-bold tabular-nums text-[#111827]">{value}</p>
    </div>
  );
}
