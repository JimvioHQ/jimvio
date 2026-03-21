"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { MousePointer, Globe, TrendingUp, ArrowRight, BarChart3, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";

export default function AffiliateClicksPage() {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const affRes = await supabase.from("affiliates").select("id").eq("user_id", user.id).maybeSingle();
      if (affRes.data) {
        const { data: lnks } = await supabase
          .from("affiliate_links")
          .select("*, products(name, images)")
          .eq("affiliate_id", affRes.data.id)
          .order("total_clicks", { ascending: false });
        
        setLinks(lnks || []);

        // Mock chart data for clicks over time
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        setChartData(months.map(m => ({
          month: m,
          revenue: Math.floor(Math.random() * 5000), // reusing revenue field for clicks in chart
          orders: Math.floor(Math.random() * 200),
          affiliate: 0
        })));
      }
      setLoading(false);
    }
    load();
  }, []);

  const totalClicks = links.reduce((s, l) => s + (l.total_clicks || 0), 0);
  const totalUnique = links.reduce((s, l) => s + (l.unique_clicks || 0), 0);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Traffic Analytics</h1>
          <p className="text-sm text-muted-c mt-0.5">Understand how your audience interacts with your links.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Live Tracking Active</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total Clicks"   value={totalClicks.toLocaleString()} change={15.2} icon={<MousePointer className="h-4 w-4" />} iconColor="from-blue-600 to-cyan-600" />
        <StatCard title="Unique Visitors" value={totalUnique.toLocaleString()} change={12.8} icon={<Globe className="h-4 w-4" />} iconColor="from-emerald-600 to-teal-600" />
        <StatCard title="Click-Through"  value="4.5%" change={0.8} icon={<TrendingUp className="h-4 w-4" />} iconColor="from-amber-600 to-orange-600" />
        <StatCard title="Device Split"   value="72% Mobile" change={2.1} icon={<BarChart3 className="h-4 w-4" />} iconColor="from-purple-600 to-pink-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader className="pt-4 px-4 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Click Traffic (Last 12 Months)</CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold capitalize tracking-wider text-muted-c">
                  <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" /> Total Clicks
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-5 pt-0">
            <RevenueChart data={chartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pt-4 px-4 pb-0"><CardTitle>Top Referrals</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4 pt-4 space-y-4">
            {links.slice(0, 5).map((l, i) => (
              <div key={l.id} className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[var(--color-text-primary)] truncate max-w-[150px]">{l.products?.name || l.link_code}</span>
                  <span className="text-muted-c">{(l.total_clicks || 0).toLocaleString()} clicks</span>
                </div>
                <div className="h-1.5 bg-subtle rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-1000" 
                    style={{ width: `${Math.min(100, ((l.total_clicks || 0) / (links[0]?.total_clicks || 1)) * 100)}%` }} 
                  />
                </div>
              </div>
            ))}
            {links.length === 0 && <p className="text-center text-sm text-muted-c py-10">No click data yet</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pt-4 px-4 pb-3 flex flex-row items-center justify-between">
          <CardTitle>Detailed Breakdown</CardTitle>
          <Button variant="ghost" size="sm" className="text-xs font-bold"><Filter className="h-3.5 w-3.5 mr-2" /> Recent Only</Button>
        </CardHeader>
        <CardContent className="p-0">
           <div className="overflow-x-auto">
             <table className="table-base">
               <thead>
                 <tr>
                   <th className="pl-5">Campaign / Link</th>
                   <th className="text-right">Total Clicks</th>
                   <th className="text-right">Unique</th>
                   <th className="text-right">Bounce Rate</th>
                   <th>Status</th>
                   <th className="pr-5" />
                 </tr>
               </thead>
               <tbody>
                 {links.map(l => (
                   <tr key={l.id} className="hover:bg-subtle/30 transition-colors">
                     <td className="pl-5 py-3">
                       <p className="text-sm font-bold text-[var(--color-text-primary)]">{l.products?.name || "Global Link"}</p>
                       <p className="text-[10px] font-mono text-accent capitalize">{l.link_code}</p>
                     </td>
                     <td className="text-right font-bold text-sm">{(l.total_clicks || 0).toLocaleString()}</td>
                     <td className="text-right text-sm text-muted-c">{(l.unique_clicks || 0).toLocaleString()}</td>
                     <td className="text-right text-sm text-muted-c">24%</td>
                     <td><Badge variant="success" className="text-[10px]">Active</Badge></td>
                     <td className="pr-5 text-right"><Button variant="ghost" size="icon" className="h-8 w-8"><ArrowRight className="h-4 w-4" /></Button></td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
