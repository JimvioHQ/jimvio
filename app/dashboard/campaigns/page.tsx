"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Zap, Plus, Play, Pause, Users, Eye, DollarSign, Loader2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading]     = useState(true);
  const [vendor, setVendor]       = useState<Record<string, unknown> | null>(null);
  const [updating, setUpdating]   = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: vend } = await supabase.from("vendors").select("*").eq("user_id", user.id).single();
      setVendor(vend);

      if (vend) {
        const { data } = await supabase
          .from("influencer_campaigns")
          .select(`
            *, products ( name, slug, images ),
            influencers ( display_name, profile_image, social_platforms )
          `)
          .eq("vendor_id", vend.id)
          .order("created_at", { ascending: false });
        setCampaigns(data ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function toggleCampaign(id: string, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    setUpdating(id);
    const supabase = createClient();
    await supabase.from("influencer_campaigns").update({ status: newStatus }).eq("id", id);
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
    setUpdating(null);
  }

  const totalViews    = campaigns.reduce((s, c) => s + (c.total_views as number ?? 0), 0);
  const totalConvs    = campaigns.reduce((s, c) => s + (c.total_conversions as number ?? 0), 0);
  const totalRevenue  = campaigns.reduce((s, c) => s + Number(c.total_revenue ?? 0), 0);
  const activeCampaigns = campaigns.filter(c => c.status === "active").length;

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent)]" /></div>;

  if (!vendor) return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Campaigns</h1>
      <div className="bg-subtle border border-base rounded-xl p-8 text-center">
        <div className="text-4xl mb-3">🎯</div>
        <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">Activate Vendor Role First</h3>
        <Button asChild><Link href="/dashboard/roles">Activate Vendor Role</Link></Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Influencer Campaigns</h1>
          <p className="text-sm text-muted-c mt-0.5">Manage your viral marketing campaigns</p>
        </div>
        <Button onClick={async () => {
          const supabase = createClient();
          const { data } = await supabase.from("influencer_campaigns").insert({
            vendor_id: vendor.id, title: "New Campaign", status: "draft", campaign_type: "promotion",
          }).select().single();
          if (data) setCampaigns(prev => [data, ...prev]);
        }}>
          <Plus className="h-4 w-4" /> New Campaign
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Campaigns"   value={campaigns.length}               icon={<Zap        className="h-4 w-4" />} iconColor="from-pink-600 to-rose-600" />
        <StatCard title="Active"            value={activeCampaigns}                 icon={<Users      className="h-4 w-4" />} iconColor="from-purple-600 to-primary-600" />
        <StatCard title="Total Views"       value={totalViews.toLocaleString()}     icon={<Eye        className="h-4 w-4" />} iconColor="from-cyan-600 to-blue-600" />
        <StatCard title="Campaign Revenue"  value={formatCurrency(totalRevenue)}    icon={<DollarSign className="h-4 w-4" />} iconColor="from-amber-600 to-orange-600" />
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-subtle border border-base rounded-xl p-8 text-center">
          <div className="text-5xl mb-3">🎯</div>
          <h3 className="text-lg font-bold text-base mb-2">No campaigns yet</h3>
          <p className="text-sm text-muted-c mb-4">Create your first influencer campaign to start driving viral traffic to your products.</p>
          <Button onClick={async () => {
            const supabase = createClient();
            const { data } = await supabase.from("influencer_campaigns").insert({
              vendor_id: vendor.id, title: "My First Campaign", status: "draft", campaign_type: "promotion",
            }).select().single();
            if (data) setCampaigns([data]);
          }}>
            <Plus className="h-4 w-4" /> Create First Campaign
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {campaigns.map((c) => {
            const status = c.status as string;
            const budget = Number(c.budget ?? 0);
            const views  = c.total_views as number ?? 0;
            const convs  = c.total_conversions as number ?? 0;
            const rev    = Number(c.total_revenue ?? 0);
            const product= c.products as Record<string, unknown> | null;
            const isUpdating = updating === c.id;

            return (
              <Card key={c.id as string} hover>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant={status === "active" ? "success" : status === "draft" ? "secondary" : "warning"}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                        {!!c.start_date && <span className="text-xs text-muted-c">{c.start_date as string} → {(c.end_date as string) ?? "—"}</span>}
                      </div>
                      <h3 className="text-base font-bold text-base">{c.title as string}</h3>
                      {product && <p className="text-xs text-muted-c mt-0.5">Product: {product.name as string}</p>}
                    </div>
                    <div className="flex gap-1.5">
                      {status === "active" && (
                        <Button size="icon-sm" variant="outline" loading={isUpdating} onClick={() => toggleCampaign(c.id as string, status)}>
                          <Pause className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {status === "paused" && (
                        <Button size="icon-sm" variant="outline" loading={isUpdating} onClick={() => toggleCampaign(c.id as string, status)}>
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {status === "draft" && (
                        <Button size="sm" loading={isUpdating} onClick={() => toggleCampaign(c.id as string, "paused")}>
                          <Play className="h-3.5 w-3.5" /> Launch
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: "Views",   value: views > 0 ? `${(views/1000).toFixed(0)}K` : "0", icon: "👁" },
                      { label: "Conv.",   value: convs.toString(),                                  icon: "✅" },
                      { label: "Revenue", value: rev > 0 ? formatCurrency(rev) : "RWF 0",          icon: "💰" },
                    ].map((s, i) => (
                      <div key={i} className="bg-subtle rounded-xl p-2.5 text-center">
                        <div className="text-base mb-1">{s.icon}</div>
                        <div className="text-xs font-bold text-base">{s.value}</div>
                        <div className="text-xs text-muted-c">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {budget > 0 && (
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-c">Budget used</span>
                        <span className="text-base font-medium">{formatCurrency(rev)} / {formatCurrency(budget)}</span>
                      </div>
                      <Progress value={budget > 0 ? Math.min(100, (rev/budget)*100) : 0} className="h-2" />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
