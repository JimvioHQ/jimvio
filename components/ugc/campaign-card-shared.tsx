"use client";

import React from "react";
import Link from "next/link";
import { TrendingUp, Play, Instagram, Youtube, Share2, CheckCircle, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, timeAgo as formatTimeAgo } from "@/lib/utils";

const PLATFORM_ICONS: Record<string, any> = {
  tiktok: Play,
  instagram: Instagram,
  youtube: Youtube,
  x: Share2,
};

export type SharedCampaignRow = {
  id: string;
  title: string;
  campaign_type: string;
  status: string;
  rate_per_1k_views: number;
  total_budget: number;
  spent_budget?: number;
  submission_count?: number;
  created_at?: string;
  allowed_platforms?: string[];
  media?: { url: string; usage: string }[];
  vendors?: { business_name: string; business_slug: string; logo_url: string; business_logo?: string };
  vendor?: { business_name: string; business_slug: string; logo_url: string; business_logo?: string }; // alias
};

interface CampaignCardProps {
  c: SharedCampaignRow;
}

export function SharedCampaignCard({ c }: CampaignCardProps) {
  const budgetPct = Math.min(100, ((c.spent_budget ?? 0) / (c.total_budget || 1)) * 100);
  const timeStr = c.created_at ? formatTimeAgo(c.created_at) : '';
  const banner = c.media?.find(m => m.usage === 'banner')?.url;
  const vendor = c.vendor || c.vendors;

  return (
    <Link
      href={`/ugc/campaigns/${c.id}`}
      className="group flex flex-col rounded-3xl bg-white border border-zinc-100/80 shadow-sm hover:shadow-xl hover:border-orange-200 transition-all duration-500 overflow-hidden h-full"
    >
      {/* Visual Header */}
      <div className="relative aspect-[4/3] overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 to-zinc-200" />
        {banner && (
          <img 
            src={banner} 
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            alt={c.title}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* Brand Overlay */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
            {vendor?.business_logo || vendor?.logo_url ? (
              <img src={vendor.business_logo || vendor.logo_url} className="w-4 h-4 rounded-full object-cover" alt="" />
            ) : (
              <div className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center text-[8px] font-black text-white">
                {vendor?.business_name?.[0] ?? 'B'}
              </div>
            )}
            <span className="text-[9px] font-black text-white truncate max-w-[70px]">
              {vendor?.business_name ?? 'Brand'}
            </span>
            <CheckCircle className="h-2 w-2 text-blue-400 fill-blue-400" />
          </div>
          
          <div className="flex gap-1">
            {(c.allowed_platforms ?? ['tiktok']).slice(0, 2).map((p) => {
              const Icon = PLATFORM_ICONS[p] || Share2;
              return (
                <div key={p} className="w-6 h-6 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white">
                  <Icon className="h-3 w-3" />
                </div>
              );
            })}
          </div>
        </div>

        <div className="absolute bottom-3 left-3 right-3 text-white">
          <Badge className="mb-1.5 bg-orange-500 text-white border-none font-black text-[9px] uppercase tracking-wider">
            {c.campaign_type || 'Active Mission'}
          </Badge>
          <h3 className="font-black text-sm leading-tight tracking-tight drop-shadow-md line-clamp-2">
            {c.title}
          </h3>
        </div>
      </div>

      {/* Info Body */}
      <div className="p-3 space-y-3 flex flex-col flex-1">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none">Payout Rate</p>
            <p className="text-[12px] font-black text-zinc-900">
              RWF {Number(c.rate_per_1k_views).toLocaleString()} <span className="text-[9px] text-zinc-400">/ 1k views</span>
            </p>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-orange-50 border border-orange-100">
            <TrendingUp className="h-2.5 w-2.5 text-orange-600" />
            <span className="text-[10px] font-black text-orange-700">{c.submission_count ?? 0}</span>
          </div>
        </div>

        <div className="space-y-1.5 mt-auto">
          <div className="flex justify-between items-center px-0.5">
            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Live Budget Pct</span>
            <span className="text-[9px] font-black text-zinc-900">{Math.round(budgetPct)}%</span>
          </div>
          <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-1000 ease-out" 
              style={{ width: `${budgetPct}%` }} 
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
