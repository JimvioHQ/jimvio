'use client';

import React, { useEffect, useState, useCallback } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { BarChart3, Users, MessageSquare, ShieldCheck, Activity, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CommunityAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/community/analytics");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">Community Engine</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Monitor group growth, member interactions, and active engagement metrics.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-[var(--color-border)]">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500"><Users className="h-6 w-6" /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Total Members</p>
                <p className="text-2xl font-black text-[var(--color-text-primary)]">{data?.totalMembers ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-[var(--color-border)]">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500"><MessageSquare className="h-6 w-6" /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Forum Posts</p>
                <p className="text-2xl font-black text-[var(--color-text-primary)]">{data?.totalPosts ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-[var(--color-border)]">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500"><Activity className="h-6 w-6" /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Act. Rate</p>
                <p className="text-2xl font-black text-[var(--color-text-primary)]">{data?.activityRate ?? 0}%</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-[var(--color-border)]">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-violet-500/10 text-violet-500"><ShieldCheck className="h-6 w-6" /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Moderators</p>
                <p className="text-2xl font-black text-[var(--color-text-primary)]">{data?.moderatorCount ?? 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-[var(--color-border)] overflow-hidden shadow-sm">
          <CardHeader className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/30 pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-[var(--color-text-primary)]">
              <BarChart3 className="h-5 w-5 text-amber-500" />
              Growth & Interaction Pulse (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 h-[400px]">
            {data?.chartData && data.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'var(--color-surface-secondary)' }}
                    contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 16, fontSize: 13, fontWeight: "bold" }}
                  />
                  <Bar dataKey="engagement" name="Total Interactions" stackId="a" fill="var(--color-accent)" radius={[0, 0, 6, 6]} />
                  <Bar dataKey="members" name="New Members" stackId="a" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center p-20 text-center text-[var(--color-text-muted)]">No historical data available</div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
