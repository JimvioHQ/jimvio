"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Zap, Eye, DollarSign, Loader2, TrendingUp, Search, 
  Filter, Play, ShoppingBag, ArrowRight, ShieldCheck,
  Video, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export default function InfluencerBrowseCampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("influencer_campaigns")
        .select(`
          *, 
          vendors ( business_name, business_slug, rating ),
          products ( name, slug, images, price, affiliate_commission_rate )
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      
      setCampaigns(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = campaigns.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    c.vendors?.business_name.toLowerCase().includes(search.toLowerCase()) ||
    c.products?.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent)]" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)]">Campaign Marketplace</h1>
          <p className="text-sm text-muted-c mt-1">Discover high-paying campaigns from verified vendors</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-c" />
            <Input 
              placeholder="Search campaigns..." 
              className="pl-9 w-64" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map((c) => {
          const product = c.products;
          const vendor = c.vendors;
          const commissionRate = c.commission_rate || product?.affiliate_commission_rate || 5;

          return (
            <Card key={c.id} hover className="overflow-hidden border border-[var(--color-border)] group">
              <div className="relative aspect-video">
                <img 
                  src={product?.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=60"} 
                  alt={product?.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-darker/60 to-transparent" />
                <div className="absolute top-3 left-3 flex gap-2">
                  <Badge className="bg-white/90 text-text-primary border-none font-bold">
                    {c.campaign_type === "promotion" ? "Affiliate" : "Sponsorship"}
                  </Badge>
                  {c.is_featured && (
                    <Badge className="bg-amber-400 text-amber-950 border-none font-bold">
                      <Zap className="h-3 w-3 mr-1 fill-current" /> Featured
                    </Badge>
                  )}
                </div>
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <p className="text-xs font-bold capitalize tracking-widest opacity-80 mb-1">{vendor?.business_name}</p>
                  <h3 className="text-lg font-black leading-tight line-clamp-1">{c.title}</h3>
                </div>
              </div>

              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] text-muted-c capitalize font-bold tracking-wider mb-1">Commission</p>
                    <p className="text-xl font-black text-emerald-600">{commissionRate}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-c capitalize font-bold tracking-wider mb-1">Price</p>
                    <p className="text-lg font-black text-[var(--color-text-primary)]">{formatCurrency(product?.price || 0)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-subtle/50 rounded-xl p-3 border border-base">
                    <div className="flex items-center gap-1.5 text-muted-c mb-1 text-[10px] font-bold capitalize">
                      <Eye className="h-3 w-3" /> Total Views
                    </div>
                    <p className="text-sm font-black text-[var(--color-text-primary)]">{(c.total_views || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-subtle/50 rounded-xl p-3 border border-base">
                    <div className="flex items-center gap-1.5 text-muted-c mb-1 text-[10px] font-bold capitalize">
                      <TrendingUp className="h-3 w-3" /> Conv. (All)
                    </div>
                    <p className="text-sm font-black text-[var(--color-text-primary)]">{c.total_conversions || 0}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] font-black rounded-xl">
                    Apply Now
                  </Button>
                  <Button variant="outline" size="icon" className="rounded-xl" asChild>
                    <Link href={`/marketplace/${product?.slug}`}>
                      <ShoppingBag className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 bg-subtle border border-dashed border-base rounded-2xl">
          <Zap className="h-12 w-12 text-muted-c mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[var(--color-text-primary)]">No campaigns found</h3>
          <p className="text-sm text-muted-c mt-1">Try adjusting your search or check back later.</p>
        </div>
      )}
    </div>
  );
}
