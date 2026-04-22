"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  ChevronDown,
  Check,
  MessageCircle,
  Youtube,
  Instagram,
  Loader2,
  X,
  Play,
  TrendingUp,
  Eye,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TikTokFeed } from "@/components/influencer/tiktok-feed";
import { UGCPostCard } from "@/components/ugc/ugc-post-card";

// â"€â"€ DESIGN TOKENS â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
// Light mode palette
// Surface:   #FFFFFF / #F8F7F4 / #F1EFE8
// Border:    #E2DFD8 / #CCC9C0
// Text:      #1A1917 / #4A4843 / #8A8780
// Accent:    #1A1917 (ink) / #D85A30 (coral) for CTAs

export default function ContentHubPage() {
  const [filterType, setFilterType] = useState<"all" | "clipping" | "ugc">("all");
  const [sortBy, setSortBy] = useState<"views" | "recent">("views");
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState<any>(null);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const supabase = createClient();
      let clipsData: any[] = [];
      let ugcData: any[] = [];

      if (filterType === "all" || filterType === "clipping") {
        let query = supabase
          .from("viral_clips")
          .select("*, influencers(*), products(*)")
          .eq("is_active", true)
          .order(sortBy === "recent" ? "created_at" : "total_views", { ascending: false })
          .limit(16);
        if (debouncedQuery) query = query.ilike("title", `%${debouncedQuery}%`);
        const { data } = await query;
        clipsData = (data || []).map((c: any) => ({
          ...c,
          itemType: "clipping",
          hubTitle: c.title || "Viral Clip",
          hubImage: c.thumbnail_url,
          hubViews: c.total_views || 0,
          hubLikes: c.total_likes || 0,
          hubComments: c.total_comments || 0,
          hubAvatar: c.influencers?.avatar_url,
          hubCreator: c.influencers?.full_name || "Creator",
          hubMetricLabel: "Sales Driven",
          hubMetric: `${c.total_conversions || 0} Orders`,
          hubSubLabel: "Promoting",
          hubRate: c.products?.name || "Marketplace Item",
        }));
      }

      if (filterType === "all" || filterType === "ugc") {
        let query = supabase
          .from("ugc_posts")
          .select("*, profiles(*), ugc_post_product_tags(products(*)), ugc_post_hashtags(ugc_hashtags(*))")
          .eq("is_published", true)
          .eq("moderation_status", "approved")
          .order(sortBy === "recent" ? "created_at" : "view_count", { ascending: false })
          .limit(16);
        if (debouncedQuery) query = query.ilike("caption", `%${debouncedQuery}%`);
        const { data } = await query;
        ugcData = (data || []).map((u: any) => ({
          ...u,
          itemType: "ugc",
          hubTitle: u.caption?.substring(0, 50) || "Community Review",
          hubImage: u.media?.[0]?.url || u.media?.[0],
          hubViews: u.view_count || 0,
          hubLikes: u.like_count || 0,
          hubComments: u.comment_count || 0,
          hubAvatar: u.profiles?.avatar_url,
          hubCreator: u.profiles?.full_name || u.profiles?.username || "Community Member",
          hubMetricLabel: "Engagement",
          hubMetric: `${(u.like_count || 0) + (u.comment_count || 0)} Interactions`,
          hubSubLabel: "Tags",
          hubRate:
            u.ugc_post_product_tags?.length > 0
              ? `${u.ugc_post_product_tags.length} Products`
              : "General Post",
        }));
      }

      const combined = [...clipsData, ...ugcData];
      if (sortBy === "recent") {
        combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } else {
        combined.sort((a, b) => b.hubViews - a.hubViews);
      }

      setItems(combined);
      setLoading(false);
    }
    loadData();
  }, [filterType, debouncedQuery, sortBy]);

  const featured = items.slice(0, 3);
  const remaining = items.slice(3);

  const FILTER_OPTIONS = [
    { id: "all", label: "All Content" },
    { id: "clipping", label: "Viral Clips" },
    { id: "ugc", label: "UGC Reviews" },
  ];

  const SORT_OPTIONS = [
    { id: "views", label: "Most Views" },
    { id: "recent", label: "Most Recent" },
  ];

  return (
    <div className="min-h-screen bg-[#F8F7F4]">

      {/* â"€â"€ HEADER â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <div className="sticky top-[var(--navbar-height,0px)] z-40 bg-[#F8F7F4]/90 backdrop-blur-xl border-b border-[#E2DFD8]">
        <div className="max-w-[var(--container-max,1400px)] mx-auto px-5 sm:px-8 py-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">

          {/* Search */}
          <div className="relative flex-1 max-w-2xl group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-[#8A8780] group-focus-within:text-[#1A1917] transition-colors pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campaigns, creators, content…"
              className="w-full h-10 pl-10 pr-4 bg-white dark:bg-surface border border-[#E2DFD8] rounded-none text-[14px] text-[#1A1917] placeholder:text-[#8A8780] focus:outline-none focus:border-[#1A1917] focus:ring-2 focus:ring-[#1A1917]/6 transition-all font-medium"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 shrink-0">

            {/* Content Type */}
            <div className="relative">
              <button
                onClick={() => { setTypeDropdownOpen(!typeDropdownOpen); setSortDropdownOpen(false); }}
                className="h-10 px-4 flex items-center gap-2 rounded-none bg-white dark:bg-surface border border-[#E2DFD8] text-[13px] font-semibold text-[#1A1917] hover:border-[#CCC9C0] hover:bg-[#F8F7F4] transition-all whitespace-nowrap"
              >
                {FILTER_OPTIONS.find(o => o.id === filterType)?.label}
                <ChevronDown className={`h-3.5 w-3.5 text-[#8A8780] transition-transform duration-200 ${typeDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {typeDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setTypeDropdownOpen(false)} />
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-surface border border-[#E2DFD8] rounded-none shadow-none shadow-black/5 z-50 overflow-hidden py-1">
                    {FILTER_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => { setFilterType(opt.id as any); setTypeDropdownOpen(false); }}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-[13px] font-medium text-[#1A1917] hover:bg-[#F8F7F4] transition-colors"
                      >
                        {opt.label}
                        {filterType === opt.id && <Check className="h-3.5 w-3.5 text-[#D85A30]" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Sort */}
            <div className="relative">
              <button
                onClick={() => { setSortDropdownOpen(!sortDropdownOpen); setTypeDropdownOpen(false); }}
                className="h-10 px-4 flex items-center gap-2 rounded-none bg-white dark:bg-surface border border-[#E2DFD8] text-[13px] font-semibold text-[#1A1917] hover:border-[#CCC9C0] hover:bg-[#F8F7F4] transition-all whitespace-nowrap"
              >
                {SORT_OPTIONS.find(o => o.id === sortBy)?.label}
                <ChevronDown className={`h-3.5 w-3.5 text-[#8A8780] transition-transform duration-200 ${sortDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {sortDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSortDropdownOpen(false)} />
                  <div className="absolute top-full left-0 mt-2 w-44 bg-white dark:bg-surface border border-[#E2DFD8] rounded-none shadow-none shadow-black/5 z-50 overflow-hidden py-1">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => { setSortBy(opt.id as any); setSortDropdownOpen(false); }}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-[13px] font-medium text-[#1A1917] hover:bg-[#F8F7F4] transition-colors"
                      >
                        {opt.label}
                        {sortBy === opt.id && <Check className="h-3.5 w-3.5 text-[#D85A30]" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Platform icons */}
            <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-[#E2DFD8] ml-1">
              <button className="h-9 w-9 rounded-none bg-white dark:bg-surface border border-[#E2DFD8] flex items-center justify-center text-[#8A8780] hover:text-[#FF0000] hover:border-[#CCC9C0] transition-all">
                <Youtube className="h-[15px] w-[15px]" />
              </button>
              <button className="h-9 w-9 rounded-none bg-white dark:bg-surface border border-[#E2DFD8] flex items-center justify-center text-[#8A8780] hover:text-black hover:border-[#CCC9C0] transition-all">
                <svg className="h-[15px] w-[15px] fill-current" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.34 2.88 2.88 0 0 1 2.9-4.22h.42V9.31a6.33 6.33 0 0 0-6.19 6.35 6.33 6.33 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.25-6.34v-5.2a8.21 8.21 0 0 0 2.7.46Z" /></svg>
              </button>
              <button className="h-9 w-9 rounded-none bg-white dark:bg-surface border border-[#E2DFD8] flex items-center justify-center text-[#8A8780] hover:text-[#E1306C] hover:border-[#CCC9C0] transition-all">
                <Instagram className="h-[15px] w-[15px]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* â"€â"€ CONTENT â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <div className="max-w-[var(--container-max,1400px)] mx-auto px-5 sm:px-8 py-10">

        {loading ? (
          <div className="flex justify-center items-center py-40">
            <Loader2 className="h-8 w-8 animate-spin text-[#8A8780]" />
          </div>
        ) : (
          <>
            {/* Featured */}
            {featured.length > 0 && (
              <section className="mb-14">
                <SectionHeader title="Featured" />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-5">
                  {featured.map((item, i) => (
                    <ContentCard key={`feat-${item.id}-${i}`} item={item} onSelect={setActiveItem} featured />
                  ))}
                </div>
              </section>
            )}

            {/* All Campaigns */}
            <section>
              <SectionHeader title="All Campaigns" count={remaining.length} />
              {remaining.length === 0 && featured.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                  {remaining.map((item, i) => (
                    <ContentCard key={`all-${item.id}-${i}`} item={item} onSelect={setActiveItem} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* â"€â"€ MODAL â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      {activeItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1A1917]/80 backdrop-blur-sm">
          {activeItem.itemType === "clipping" ? (
            <div className="relative w-full h-full flex flex-col">
              <button
                onClick={() => setActiveItem(null)}
                className="absolute top-5 right-5 z-50 h-10 w-10 bg-white dark:bg-surface/10 hover:bg-white dark:bg-surface/20 text-white rounded-none flex items-center justify-center transition-all border border-white/20"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex-1 w-full h-full bg-black">
                {(() => {
                  const clippingItems = items.filter((i) => i.itemType === "clipping");
                  const clickIndex = clippingItems.findIndex((i) => i.id === activeItem.id);
                  return <TikTokFeed clips={clippingItems} initialIndex={clickIndex > -1 ? clickIndex : 0} onClose={() => setActiveItem(null)} className="h-full w-full" />;
                })()}
              </div>
            </div>
          ) : (
            <>
              <div className="absolute inset-0" onClick={() => setActiveItem(null)} />
              <div className="relative w-full max-w-lg max-h-[90vh] p-4 flex flex-col">
                <button
                  onClick={() => setActiveItem(null)}
                  className="absolute -top-4 right-4 h-9 w-9 bg-white dark:bg-surface text-[#1A1917] rounded-none flex items-center justify-center shadow-none hover:shadow-none transition-all z-10"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="bg-white dark:bg-surface rounded-none overflow-hidden shadow-none border border-[#E2DFD8]">
                  <div className="overflow-y-auto w-full max-h-[85vh]">
                    <UGCPostCard post={activeItem} className="border-none shadow-none rounded-none w-full" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// â"€â"€ SUB-COMPONENTS â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-baseline gap-3 mb-6">
      <h2 className="text-[18px] font-bold text-[#1A1917] tracking-tight">{title}</h2>
      {count !== undefined && (
        <span className="text-[13px] font-medium text-[#8A8780]">{count} results</span>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-28 text-center border-2 border-dashed border-[#E2DFD8] rounded-none bg-white dark:bg-surface/50">
      <Search className="h-8 w-8 text-[#CCC9C0] mx-auto mb-3" />
      <p className="font-semibold text-[#8A8780] text-[15px]">No content matches your filters</p>
      <p className="text-[13px] text-[#B5B2AA] mt-1">Try adjusting your search or filter settings</p>
    </div>
  );
}

function ContentCard({
  item,
  onSelect,
  featured = false,
}: {
  item: any;
  onSelect: (item: any) => void;
  featured?: boolean;
}) {
  const isUGC = item.itemType === "ugc";

  return (
    <button
      onClick={() => onSelect(item)}
      className={`text-left group flex flex-col bg-white dark:bg-surface border border-[#E2DFD8] hover:border-[#CCC9C0] rounded-none overflow-hidden transition-all duration-300 w-full hover:shadow-none hover:shadow-black/5 appearance-none outline-none focus-visible:ring-2 focus-visible:ring-[#1A1917]/20`}
    >
      {/* Image */}
      <div className={`relative w-full ${featured ? "aspect-[16/10]" : "aspect-[4/3]"} bg-[#F1EFE8] overflow-hidden`}>
        <img
          src={item.hubImage || "https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=800"}
          alt={item.hubTitle}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
        />
        {/* Subtle overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

        {/* Type badge */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-surface/95 backdrop-blur-md rounded-none text-[11px] font-semibold text-[#1A1917] tracking-wide uppercase">
            {isUGC ? <MessageCircle className="h-3 w-3 text-[#D85A30]" /> : <Play className="h-3 w-3 text-[#D85A30]" />}
            {isUGC ? "UGC" : "Clip"}
          </span>
        </div>

        {/* Views on hover */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-md rounded-none text-[11px] font-semibold text-white">
            <Eye className="h-3 w-3" />
            {item.hubViews >= 1000 ? `${(item.hubViews / 1000).toFixed(0)}K` : item.hubViews}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4">
        {/* Creator row */}
        <div className="flex items-center gap-2.5 mb-3">
          <Avatar className="h-7 w-7 shrink-0 ring-1 ring-[#E2DFD8]">
            <AvatarImage src={item.hubAvatar} />
            <AvatarFallback className="bg-[#F1EFE8] text-[#4A4843] text-[10px] font-bold">
              {item.hubCreator.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span className="text-[12px] font-medium text-[#4A4843] truncate">{item.hubCreator}</span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-[#1A1917] text-[14px] leading-snug line-clamp-2 mb-4 group-hover:text-[#D85A30] transition-colors">
          {item.hubTitle}
        </h3>

        {/* Metrics */}
        <div className="mt-auto pt-3 border-t border-[#F1EFE8] flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-[#8A8780] uppercase tracking-wider mb-0.5">
              {item.hubMetricLabel}
            </p>
            <p className="text-[13px] font-bold text-[#1A1917]">{item.hubMetric}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold text-[#8A8780] uppercase tracking-wider mb-0.5">
              {item.hubSubLabel}
            </p>
            <p className="text-[12px] font-medium text-[#4A4843] truncate max-w-[100px]">{item.hubRate}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-[3px] bg-[#F1EFE8] rounded-none overflow-hidden">
          <div
            className={`h-full rounded-none ${isUGC ? "bg-[#D85A30]/60" : "bg-[#1A1917]/40"}`}
            style={{ width: "72%" }}
          />
        </div>
      </div>
    </button>
  );
}
